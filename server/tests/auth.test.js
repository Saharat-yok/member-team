import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

const API = '/api/v1/auth';
const user = { name: 'สมชาย', email: 'somchai@example.com', password: 'Passw0rd!' };
const register = (body = user) => request(app).post(`${API}/register`).send(body);

describe('Auth API', () => {
  it('TC-01 สมัครสำเร็จ → 201 + HttpOnly cookie + ไม่ส่ง password กลับ', async () => {
    const res = await register().expect(201);
    expect(res.body.user).toMatchObject({ name: 'สมชาย', email: user.email });
    expect(res.body.user.password).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/^token=.+HttpOnly/);
  });

  it('TC-02 email ซ้ำ (ต่างแค่ตัวพิมพ์) → 409', async () => {
    await register();
    await register({ ...user, email: 'SOMCHAI@Example.com' }).expect(409);
  });

  it('TC-03 login แล้วใช้ cookie เรียก /me ได้', async () => {
    await register();
    const agent = request.agent(app);
    await agent.post(`${API}/login`).send({ email: user.email, password: user.password }).expect(200);
    const res = await agent.get(`${API}/me`).expect(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('TC-04 รหัสผ่านผิด / ไม่มี cookie → 401', async () => {
    await register();
    await request(app).post(`${API}/login`).send({ ...user, password: 'wrong-pass' }).expect(401);
    await request(app).get(`${API}/me`).expect(401);
  });

  it('TC-05 NoSQL injection ผ่าน login → 400', async () => {
    await request(app)
      .post(`${API}/login`)
      .send({ email: { $ne: null }, password: { $ne: null } })
      .expect(400);
  });

  it('TC-06 รหัสผ่านไทยเกิน 72 bytes → 400', async () => {
    await register({ ...user, password: 'ก'.repeat(25) }).expect(400); // 25 × 3 = 75 bytes
  });
});
