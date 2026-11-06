import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const USER = { _id: 'u1', name: 'สมชาย', email: 'somchai@example.com' };
export const db = { user: null, tasks: [] };
export const resetDb = (state = {}) => Object.assign(db, { user: null, tasks: [] }, state);

const page = (data) => ({ data, meta: { page: 1, limit: 20, total: data.length, hasMore: false } });

export const server = setupServer(
  http.get('/api/v1/auth/me', () =>
    db.user
      ? HttpResponse.json({ user: db.user })
      : HttpResponse.json({ message: 'Authentication required' }, { status: 401 })),
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { password } = await request.json();
    if (password !== 'Passw0rd!') {
      return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
    db.user = USER;
    return HttpResponse.json({ user: USER });
  }),
  http.get('/api/v1/tasks', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return HttpResponse.json(page(db.tasks.filter((t) => t.title.includes(q))));
  }),
  http.post('/api/v1/tasks', async ({ request }) => {
    const task = {
      _id: `t${db.tasks.length + 1}`, description: '', status: 'todo',
      priority: 'medium', dueDate: null, ...(await request.json()),
    };
    db.tasks.unshift(task);
    return HttpResponse.json({ data: task }, { status: 201 });
  }),
);
