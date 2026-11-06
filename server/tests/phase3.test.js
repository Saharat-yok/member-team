import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';

const API = '/api/v1/tasks';

const signup = async (email = 'alice@example.com') => {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ name: 'Tester', email, password: 'Passw0rd!' }).expect(201);
  return agent;
};

const walk = async (agent, query) => {
  const titles = [];
  let cursor = query.cursor;
  do {
    const { body } = await agent.get(API).query({ ...query, ...(cursor && { cursor }) }).expect(200);
    titles.push(...body.data.map((t) => t.title));
    cursor = body.meta.nextCursor;
  } while (cursor);
  return titles;
};

describe('Cursor pagination', () => {
  it('TC-19 เลื่อนครบทุกหน้า ไม่ซ้ำ ไม่ตกหล่น แม้มีงานใหม่เข้ามาระหว่างทาง', async () => {
    const alice = await signup();
    for (let i = 1; i <= 5; i++) await alice.post(API).send({ title: `T${i}` }).expect(201);
    const first = await alice.get(API).query({ limit: 2 }).expect(200);
    await alice.post(API).send({ title: 'NEW' }).expect(201); // งานใหม่เข้ามาระหว่างที่ผู้ใช้เลื่อน
    const rest = await walk(alice, { limit: 2, cursor: first.body.meta.nextCursor });
    expect([...first.body.data.map((t) => t.title), ...rest]).toEqual(['T5', 'T4', 'T3', 'T2', 'T1']);
  });

  it('TC-20 เรียง dueDate ที่มี null ปนได้ครบทั้งสองทิศทาง', async () => {
    const alice = await signup();
    await alice.post(API).send({ title: 'A', dueDate: '2030-01-02' });
    await alice.post(API).send({ title: 'B' });
    await alice.post(API).send({ title: 'C', dueDate: '2030-01-01' });
    await alice.post(API).send({ title: 'D' });
    expect(await walk(alice, { sort: 'dueDate', limit: 1 })).toEqual(['B', 'D', 'C', 'A']);
    expect(await walk(alice, { sort: '-dueDate', limit: 1 })).toEqual(['A', 'C', 'D', 'B']);
  });

  it('TC-21 cursor ปลอมหรือมี operator แทรก → 400', async () => {
    const alice = await signup();
    await alice.get(API).query({ cursor: 'not-a-cursor' }).expect(400);
    const forged = Buffer.from(JSON.stringify({ v: null, id: { $gt: '' } })).toString('base64url');
    await alice.get(API).query({ cursor: forged }).expect(400);
  });
});

describe('Due tasks', () => {
  afterEach(() => vi.useRealTimers());

  it('TC-22 แบ่งกลุ่มตามวันของเวลาไทย ไม่ใช่ UTC', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); // fake แค่ Date ส่วน timer ของ MongoDB driver ยังทำงานตามปกติ
    vi.setSystemTime(new Date('2025-07-01T03:00:00Z')); // 10:00 น. ของ 1 ก.ค. ตามเวลาไทย
    const alice = await signup();
    const make = (title, dueDate, status) => alice.post(API).send({ title, dueDate, status }).expect(201);

    await make('เลยกำหนด', '2025-07-01T02:00:00Z');       // 09:00 วันนี้ ซึ่งผ่านไปแล้ว
    await make('คืนนี้', '2025-07-01T16:59:59Z');          // 23:59 วันนี้
    await make('หลังเที่ยงคืน', '2025-07-01T17:30:00Z');   // 00:30 พรุ่งนี้ แต่ใน UTC ยังเป็น 1 ก.ค.
    await make('อีก 10 วัน', '2025-07-11T03:00:00Z');
    await make('เสร็จแล้ว', '2025-07-01T10:00:00Z', 'done');
    await alice.post(API).send({ title: 'ไม่มีกำหนด' });

    const { body } = await alice.get(`${API}/due`).query({ tz: 'Asia/Bangkok' }).expect(200);
    const titles = (g) => body.data[g].map((t) => t.title);
    expect(titles('overdue')).toEqual(['เลยกำหนด']);
    expect(titles('today')).toEqual(['คืนนี้']);
    expect(titles('upcoming')).toEqual(['หลังเที่ยงคืน']);
  });

  it('TC-23 tz ไม่ถูกต้อง → 400 / ไม่ส่ง tz → ใช้ค่า default', async () => {
    const alice = await signup();
    const res = await alice.get(`${API}/due`).query({ tz: 'Mars/Olympus' }).expect(400);
    expect(res.body.errors[0].field).toBe('tz');
    const ok = await alice.get(`${API}/due`).expect(200); // ถ้าเจอ /:id ก่อนจะได้ 400 "Invalid id"
    expect(ok.body.meta.tz).toBe('Asia/Bangkok');
  });
});
