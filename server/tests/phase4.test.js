import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import Subscription from '../src/models/Subscription.js';
import { runDuePushJob } from '../src/jobs/pushScheduler.js';

const signup = async (email = 'alice@example.com') => {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ name: 'Alice', email, password: 'Passw0rd!' }).expect(201);
  return agent;
};

const sampleSub = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/sub-1',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ', auth: 'tBHItJI5svbpez7KI4CCXg' },
  tz: 'Asia/Bangkok',
};

describe('Phase 4: Web Push & Health', () => {
  it('TC-28 สมัคร Web Push ซ้ำด้วย endpoint เดิม → อัปเดต record เดิมไม่สร้างซ้ำ', async () => {
    const alice = await signup();
    await alice.post('/api/v1/push/subscribe').send(sampleSub).expect(201);
    await alice.post('/api/v1/push/subscribe').send({ ...sampleSub, tz: 'UTC' }).expect(201);

    const subs = await Subscription.find();
    expect(subs).toHaveLength(1);
    expect(subs[0].tz).toBe('UTC');
  });

  it('TC-29 runDuePushJob แจ้งเตือนเฉพาะคนที่มีงานด่วน และไม่ส่งซ้ำในวันเดียวกัน', async () => {
    const alice = await signup();
    await alice.post('/api/v1/push/subscribe').send(sampleSub).expect(201);
    await alice.post('/api/v1/tasks').send({ title: 'ส่งงานด่วน', dueDate: '2025-07-01T02:00:00Z' }).expect(201);

    const sender = { sendNotification: vi.fn().mockResolvedValue({}) };
    const now = new Date('2025-07-01T03:00:00Z'); // 10:00 น. ตามเวลาไทย

    expect(await runDuePushJob(now, sender)).toBe(1);
    expect(sender.sendNotification).toHaveBeenCalledTimes(1);

    // รันซ้ำในวันเดียวกันต้องไม่ส่งซ้ำ
    expect(await runDuePushJob(now, sender)).toBe(0);
    expect(sender.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('TC-30 ลบ subscription อัตโนมัติเมื่อ Push Service ตอบกลับ 410 Gone', async () => {
    const alice = await signup();
    await alice.post('/api/v1/push/subscribe').send(sampleSub).expect(201);
    await alice.post('/api/v1/tasks').send({ title: 'งานด่วน', dueDate: '2025-07-01T02:00:00Z' }).expect(201);

    const sender = {
      sendNotification: vi.fn().mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 })),
    };
    await runDuePushJob(new Date('2025-07-01T03:00:00Z'), sender);

    expect(await Subscription.countDocuments()).toBe(0);
  });

  it('TC-31 GET /health คืนสถานะฐานข้อมูลถูกต้อง', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });
});

describe('Vercel Cron endpoint', () => {
  it('TC-39 /cron/push ต้องมี CRON_SECRET ที่ถูกต้อง ไม่เช่นนั้น 401', async () => {
    await request(app).get('/api/v1/cron/push').expect(401);
    await request(app).get('/api/v1/cron/push').set('Authorization', 'Bearer wrong-secret').expect(401);
    const ok = await request(app).get('/api/v1/cron/push').set('Authorization', 'Bearer test-cron-secret').expect(200);
    expect(ok.body).toEqual({ sent: 0 });
  });
});
