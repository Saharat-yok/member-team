import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../routes.jsx';
import { createQueryClient } from '../lib/queryClient.js';
import { Toaster } from '../components/ui.jsx';
import { USER, resetDb, server } from './server.js';

const renderApp = (path = '/') => {
  render(
    <QueryClientProvider client={createQueryClient()}> {/* client ใหม่ทุกเทสต์ ไม่ให้ cache รั่วข้ามกัน */}
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
      <Toaster />
    </QueryClientProvider>,
  );
  return userEvent.setup();
};

describe('Auth', () => {
  beforeEach(() => resetDb());

  it('TC-14 ไม่มี session → ถูกพาไปหน้าเข้าสู่ระบบ', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  });

  it('TC-15 validate ฝั่ง client → error จาก server → login สำเร็จ', async () => {
    const user = renderApp('/login');
    const submit = await screen.findByRole('button', { name: 'เข้าสู่ระบบ' });

    await user.click(submit);
    expect(screen.getByText('อีเมลไม่ถูกต้อง')).toBeInTheDocument();

    await user.type(screen.getByLabelText('อีเมล'), USER.email);
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'wrong');
    await user.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    await user.clear(screen.getByLabelText('รหัสผ่าน'));
    await user.type(screen.getByLabelText('รหัสผ่าน'), 'Passw0rd!');
    await user.click(submit);
    expect(await screen.findByRole('heading', { name: 'งานของฉัน' })).toBeInTheDocument();
  });
});

describe('Tasks', () => {
  beforeEach(() =>
    resetDb({
      user: USER,
      tasks: [{ _id: 't1', title: 'ประชุมทีม', description: '', status: 'todo', priority: 'high', dueDate: null }],
    }));

  it('TC-16 สร้างงาน: ดักชื่อว่าง → กรอกครบแล้วงานขึ้นในรายการ', async () => {
    const user = renderApp();
    await screen.findByText('ประชุมทีม');
    await user.click(screen.getByRole('button', { name: 'เพิ่มงานใหม่' }));

    const sheet = screen.getByRole('dialog', { name: 'งานใหม่' });
    await user.click(within(sheet).getByRole('button', { name: 'บันทึก' }));
    expect(within(sheet).getByText('กรุณาใส่ชื่องาน')).toBeInTheDocument();

    await user.type(within(sheet).getByLabelText('ชื่องาน'), 'ซื้อของ');
    await user.click(within(sheet).getByRole('button', { name: 'บันทึก' }));
    expect(await screen.findByText('ซื้อของ')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('TC-17 optimistic: ติ๊กแล้วเปลี่ยนทันที → server ตอบ 500 → ย้อนกลับพร้อม toast', async () => {
    server.use(http.patch('/api/v1/tasks/:id', async () => {
      await delay(150);
      return HttpResponse.json({ message: 'boom' }, { status: 500 });
    }));
    const user = renderApp();
    const box = await screen.findByRole('checkbox', { name: /ประชุมทีม/ });

    await user.click(box);
    await waitFor(() => expect(box).toBeChecked());     // เปลี่ยนก่อน server ตอบ
    await waitFor(() => expect(box).not.toBeChecked()); // rollback
    expect(await screen.findByText(/บันทึกไม่สำเร็จ/)).toBeInTheDocument();
  });

  it('TC-18 session หมดอายุระหว่างใช้งาน → กลับหน้าเข้าสู่ระบบ', async () => {
    server.use(http.patch('/api/v1/tasks/:id', () =>
      HttpResponse.json({ message: 'Invalid or expired session' }, { status: 401 })));
    const user = renderApp();
    await user.click(await screen.findByRole('checkbox', { name: /ประชุมทีม/ }));
    expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  });
});
