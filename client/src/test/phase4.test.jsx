import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteError, routes } from '../routes.jsx';
import { CACHE_KEY, createQueryClient } from '../lib/queryClient.js';
import { enableNotifications } from '../lib/notify.js';
import { USER, db, resetDb, server } from './server.js';

const setOnline = (value) =>
  act(() => {
    Object.defineProperty(navigator, 'onLine', { value, configurable: true });
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });

const renderApp = (path = '/', persist = false) => {
  const client = createQueryClient({ persist });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), client };
};

describe('Phase 4: Offline, Cache & Web Push', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDb({ user: USER, tasks: [{ _id: 't1', title: 'ประชุมทีม', description: '', status: 'todo', priority: 'high', dueDate: null }] });
  });

  it('TC-32 แสดง OfflineBanner เมื่อเน็ตหลุด และซ่อนเมื่อกลับมาออนไลน์', async () => {
    renderApp('/');
    await screen.findByText('ประชุมทีม');

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByText(/โหมดออฟไลน์/)).toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(screen.queryByText(/โหมดออฟไลน์/)).not.toBeInTheDocument());
  });

  it('TC-33 enableNotifications ขอ VAPID key และส่ง subscription ไปบันทึกที่ server', async () => {
    let savedBody = null;
    server.use(
      http.get('/api/v1/push/vapid-public-key', () => HttpResponse.json({ publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' })),
      http.post('/api/v1/push/subscribe', async ({ request }) => {
        savedBody = await request.json();
        return HttpResponse.json({ data: { id: 's1' } }, { status: 201 });
      }),
    );

    globalThis.Notification = { requestPermission: vi.fn().mockResolvedValue('granted'), permission: 'granted' };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            subscribe: vi.fn().mockResolvedValue({
              toJSON: () => ({ endpoint: 'https://push.example.com/1', keys: { p256dh: 'k1234567890', auth: 'a1234567890' } }),
            }),
          },
        }),
      },
    });

    expect(await enableNotifications()).toBe('granted');
    expect(savedBody).toMatchObject({ endpoint: 'https://push.example.com/1' });
  });

  it('TC-34 โหลดข้อมูลเริ่มต้นจาก persisted cache ใน localStorage ได้ทันที', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ts: Date.now(),
        queries: [
          [['me'], USER],
          [['tasks', 'list', {}], { pages: [{ data: [{ _id: 't9', title: 'งานจากแคช', status: 'todo', priority: 'low' }], meta: { total: 1 } }], pageParams: [null] }],
        ],
      }),
    );

    renderApp('/', true);
    expect(await screen.findByText('งานจากแคช')).toBeInTheDocument();
  });

  it('TC-35 ออกจากระบบแล้วล้าง persisted cache ใน localStorage ทันที', async () => {
    server.use(http.post('/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })));
    const { user } = renderApp('/', true);
    await screen.findByText('ประชุมทีม');
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'ออกจากระบบ' }));
    expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('TC-36 แก้งานตอนออฟไลน์ → UI เปลี่ยนทันที, ยังไม่ส่ง, แล้วส่งอัตโนมัติเมื่อกลับมาออนไลน์', async () => {
    let patched = 0;
    server.use(http.patch('/api/v1/tasks/:id', async ({ request, params }) => {
      patched++;
      Object.assign(db.tasks.find((t) => t._id === params.id), await request.json());
      return HttpResponse.json({ data: db.tasks[0] });
    }));
    const { user } = renderApp('/');
    const box = await screen.findByRole('checkbox', { name: /ประชุมทีม/ });

    await setOnline(false);
    await user.click(box);
    await waitFor(() => expect(box).toBeChecked());           // optimistic
    expect(await screen.findByText(/รอส่ง 1 รายการ/)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 200));
    expect(patched).toBe(0);                                  // ยังไม่ส่ง และไม่ rollback
    expect(box).toBeChecked();

    await setOnline(true);
    await waitFor(() => expect(patched).toBe(1));             // ส่งจากคิวหลังกลับมาออนไลน์
    expect(db.tasks[0].status).toBe('done');
    expect(await screen.findByRole('checkbox', { name: /ประชุมทีม/ })).toBeChecked();
  });

  it('TC-37 โหลดหน้าไม่สำเร็จ → แสดงข้อความภาษาไทยพร้อมปุ่มโหลดใหม่ ไม่ใช่หน้า error ดิบ', async () => {
    const Boom = () => { throw new TypeError('Failed to fetch dynamically imported module'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Boom />, errorElement: <RouteError /> }])} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('โหลดหน้านี้ไม่สำเร็จ');
    expect(screen.getByRole('button', { name: 'โหลดใหม่' })).toBeInTheDocument();
    expect(screen.queryByText(/Hey developer/)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('TC-38 เปิดแอปตอนออฟไลน์อยู่แล้ว (ไม่มี offline event) → แก้งานแล้วเข้าคิว ไม่ rollback', async () => {
    let patched = 0;
    server.use(http.patch('/api/v1/tasks/:id', async ({ request, params }) => {
      patched++;
      Object.assign(db.tasks.find((t) => t._id === params.id), await request.json());
      return HttpResponse.json({ data: db.tasks[0] });
    }));
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true }); // โหลดหน้ามาตอนไม่มีเน็ต ไม่มี event
    const { user } = renderApp('/');
    const box = await screen.findByRole('checkbox', { name: /ประชุมทีม/ });

    await user.click(box);
    await waitFor(() => expect(box).toBeChecked());
    await new Promise((r) => setTimeout(r, 300));
    expect(patched).toBe(0);
    expect(box).toBeChecked();

    await setOnline(true);
    await waitFor(() => expect(patched).toBe(1));
  });
});
