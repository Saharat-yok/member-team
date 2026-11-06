// src/test/phase3.test.jsx
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '../routes.jsx';
import { createQueryClient } from '../lib/queryClient.js';
import { applyChange } from '../hooks/useTasks.js';
import { Toaster } from '../components/ui.jsx';
import { USER, resetDb } from './server.js';
const task = (_id, title, extra = {}) => ({
  _id, title, description: '', status: 'todo', priority: 'medium', dueDate: '2025-07-01T10:00:00.000Z', ...extra,
});
const renderApp = (path = '/') => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), router };
};
describe('Phase 3', () => {
  it('TC-24 filter อยู่ใน URL', async () => {
    resetDb({ user: USER, tasks: [task('t1', 'ประชุมทีม'), task('t2', 'ส่งรายงาน', { status: 'done' })] });
    const { user, router } = renderApp('/?status=done');
    expect(await screen.findByText('ส่งรายงาน')).toBeInTheDocument();
    expect(screen.queryByText('ประชุมทีม')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เสร็จแล้ว', pressed: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ทั้งหมด' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(await screen.findByText('ประชุมทีม')).toBeInTheDocument();
  });
  it('TC-25 deep link เปิด sheet / กด Back แล้วปิด sheet', async () => {
    resetDb({ user: USER, tasks: [task('t1', 'ประชุมทีม')] });
    const { user, router } = renderApp('/?task=t1');
    const dialog = await screen.findByRole('dialog', { name: 'แก้ไขงาน' });
    expect(within(dialog).getByLabelText('ชื่องาน')).toHaveValue('ประชุมทีม');
    await user.click(within(dialog).getByRole('button', { name: 'ยกเลิก' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.search).toBe('');
    await user.click(await screen.findByRole('button', { name: /ประชุมทีม/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await act(() => router.navigate(-1)); // จำลองการกดปุ่ม Back
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/');
  });
  it('TC-26 applyChange: ย้ายคอลัมน์ / ลบ / ไม่ใส่งานผิดที่', () => {
    const t = task('t1', 'ประชุมทีม');
    const moved = { ...t, status: 'done' };
    const col = (data) => ({ pages: [{ data, meta: { total: data.length, nextCursor: null } }], pageParams: [null] });
    expect(applyChange(['tasks', 'list', { status: 'todo' }], col([t]), 't1', moved).pages[0])
      .toMatchObject({ data: [], meta: { total: 0 } });
    expect(applyChange(['tasks', 'list', { status: 'done' }], col([]), 't1', moved).pages[0])
      .toMatchObject({ data: [moved], meta: { total: 1 } });
    expect(applyChange(['tasks', 'list', { status: 'done', q: 'รายงาน' }], col([]), 't1', moved).pages[0].data)
      .toEqual([]);
    expect(applyChange(['tasks', 'list', {}], col([t]), 't1', null).pages[0])
      .toMatchObject({ data: [], meta: { total: 0 } });
  });
  it('TC-27 หน้าใกล้ครบกำหนด: แบ่งกลุ่ม + badge + ติ๊กแล้วงานหายไป', async () => {
    const a = task('t1', 'ส่งรายงาน');
    const b = task('t2', 'คืนหนังสือ');
    const c = task('t3', 'จองตั๋ว');
    resetDb({ user: USER, tasks: [a, b, c], due: { overdue: [a], today: [b], upcoming: [c] } });
    const { user } = renderApp('/due');
    expect(await screen.findByRole('heading', { name: /เลยกำหนด/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ใกล้ครบกำหนด/ })).toHaveTextContent('2');
    await user.click(screen.getByRole('checkbox', { name: /ส่งรายงาน/ }));
    await waitFor(() => expect(screen.queryByText('ส่งรายงาน')).not.toBeInTheDocument());
  });
});
