import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';

const API = '/api/v1/tasks';

const signup = async (email) => {
  const agent = request.agent(app); // agent เก็บ cookie ให้อัตโนมัติ
  await agent
    .post('/api/v1/auth/register')
    .send({ name: 'Tester', email, password: 'Passw0rd!' })
    .expect(201);
  return agent;
};

describe('Tasks API', () => {
  let alice;
  let bob;

  beforeEach(async () => {
    alice = await signup('alice@example.com');
    bob = await signup('bob@example.com');
  });

  it('TC-07 สร้างงาน → trim title + ค่า default ถูกต้อง', async () => {
    const res = await alice.post(API).send({ title: '  ซื้อของ  ' }).expect(201);
    expect(res.body.data).toMatchObject({
      title: 'ซื้อของ', status: 'todo', priority: 'medium', dueDate: null,
    });
  });

  it('TC-08 input ไม่ถูกต้อง → 400 พร้อมบอก field', async () => {
    const res = await alice.post(API).send({ title: '', status: 'doing' }).expect(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['title', 'status']));
  });

  it('TC-09 แนบ owner ของคนอื่น (mass assignment) → ถูกตัดทิ้ง', async () => {
    const { body: bobMe } = await bob.get('/api/v1/auth/me');
    const res = await alice.post(API).send({ title: 'X', owner: bobMe.user._id }).expect(201);
    expect(res.body.data.owner).not.toBe(bobMe.user._id);
  });

  it('TC-10 เข้าถึงงานของคนอื่น → 404 ไม่ใช่ 403', async () => {
    const { body } = await alice.post(API).send({ title: 'งานลับ' });
    const url = `${API}/${body.data._id}`;
    await bob.get(url).expect(404);
    await bob.patch(url).send({ status: 'done' }).expect(404);
    await bob.delete(url).expect(404);
  });

  it('TC-11 PATCH บางฟิลด์ / body ว่าง / id ผิดรูปแบบ', async () => {
    const { body } = await alice.post(API).send({ title: 'A', dueDate: '2030-01-31' });
    const url = `${API}/${body.data._id}`;
    const res = await alice.patch(url).send({ status: 'done', dueDate: null }).expect(200);
    expect(res.body.data).toMatchObject({ title: 'A', status: 'done', dueDate: null });
    await alice.patch(url).send({}).expect(400);
    await alice.get(`${API}/not-an-id`).expect(400);
  });

  it('TC-12 filter + ค้นหาไทยที่มีอักขระพิเศษ + pagination', async () => {
    for (const t of [
      { title: 'ประชุมทีม' },
      { title: 'ส่งรายงาน (ด่วน)' },
      { title: 'ออกกำลังกาย', status: 'done' },
    ]) {
      await alice.post(API).send(t).expect(201);
    }
    const done = await alice.get(API).query({ status: 'done' }).expect(200);
    expect(done.body.data).toHaveLength(1);

    const found = await alice.get(API).query({ q: '(ด่วน' }).expect(200); // ถ้าไม่ escape → 500
    expect(found.body.data.map((t) => t.title)).toEqual(['ส่งรายงาน (ด่วน)']);

    const page1 = await alice.get(API).query({ limit: 2 }).expect(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta).toMatchObject({ page: 1, total: 3, hasMore: true });
  });

  it('TC-13 ไม่ได้ login → 401', async () => {
    await request(app).get(API).expect(401);
  });
});
