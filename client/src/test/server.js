// src/test/server.js
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
export const USER = { _id: 'u1', name: 'สมชาย', email: 'somchai@example.com' };
export const db = { user: null, tasks: [], due: null };
export const resetDb = (state = {}) => Object.assign(db, { user: null, tasks: [], due: null }, state);
const list = (data) => ({ data, meta: { limit: 20, total: data.length, hasMore: false, nextCursor: null } });
const notFound = () => HttpResponse.json({ message: 'Task not found' }, { status: 404 });
export const server = setupServer(
  http.get('/api/v1/auth/me', () =>
    db.user ? HttpResponse.json({ user: db.user })
      : HttpResponse.json({ message: 'Authentication required' }, { status: 401 })),
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { password } = await request.json();
    if (password !== 'Passw0rd!') return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    db.user = USER;
    return HttpResponse.json({ user: USER });
  }),
  http.get('/api/v1/tasks', ({ request }) => {
    const sp = new URL(request.url).searchParams;
    const q = sp.get('q') ?? '';
    const status = sp.get('status');
    return HttpResponse.json(list(db.tasks.filter((t) => t.title.includes(q) && (!status || t.status === status))));
  }),
  // ต้องประกาศก่อน /tasks/:id เหมือนฝั่ง Express เพราะ MSW ใช้ handler ตัวแรกที่ match
  http.get('/api/v1/tasks/due', () =>
    HttpResponse.json({ data: db.due ?? { overdue: [], today: [], upcoming: [] }, meta: { truncated: false } })),
  http.get('/api/v1/tasks/:id', ({ params }) => {
    const task = db.tasks.find((t) => t._id === params.id);
    return task ? HttpResponse.json({ data: task }) : notFound();
  }),
  http.post('/api/v1/tasks', async ({ request }) => {
    const task = {
      _id: `t${db.tasks.length + 1}`, description: '', status: 'todo',
      priority: 'medium', dueDate: null, ...(await request.json()),
    };
    db.tasks.unshift(task);
    return HttpResponse.json({ data: task }, { status: 201 });
  }),
  http.patch('/api/v1/tasks/:id', async ({ params, request }) => {
    const patch = await request.json();
    const task = db.tasks.find((t) => t._id === params.id);
    if (!task) return notFound();
    Object.assign(task, patch);
    if (db.due && patch.status === 'done') {
      for (const g of Object.keys(db.due)) db.due[g] = db.due[g].filter((t) => t._id !== params.id);
    }
    return HttpResponse.json({ data: task });
  }),
);
