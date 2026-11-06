import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../routes.jsx';
import { CACHE_KEY, createQueryClient } from '../lib/queryClient.js';
import { enableNotifications } from '../lib/notify.js';
import { USER, resetDb, server } from './server.js';

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
});
