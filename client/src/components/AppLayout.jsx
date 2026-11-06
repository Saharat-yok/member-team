// src/components/AppLayout.jsx
import { Suspense, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useLogout, useMe } from '../hooks/useAuth.js';
import { useDueTasks, useTask } from '../hooks/useTasks.js';
import { useSheet } from '../hooks/useSheet.js';
import { notifyDueOnce } from '../lib/notify.js';
import { toast } from '../lib/toast.js';
import { Button, Spinner } from './ui.jsx';
import { TaskSheet } from './TaskSheet.jsx';
import { OfflineBanner } from './OfflineBanner.jsx';
const NAV = [['/', 'รายการ'], ['/board', 'บอร์ด'], ['/due', 'ใกล้ครบกำหนด']];
function SheetHost() {
  const sheet = useSheet();
  const id = sheet.value && sheet.value !== 'new' ? sheet.value : null;
  const { data: task, isError } = useTask(id);
  useEffect(() => {
    if (isError) { toast('ไม่พบงานนี้'); sheet.close(); }
  }, [isError]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sheet.value || (id && !task)) return null; // เปิดจาก deep link: รอโหลดงานก่อน
  return <TaskSheet key={sheet.value} task={task} onClose={sheet.close} />;
}
export default function AppLayout() {
  const { data: me } = useMe();
  const logout = useLogout();
  const sheet = useSheet();
  const due = useDueTasks();
  const urgent = due.data ? due.data.data.overdue.length + due.data.data.today.length : 0;
  useEffect(() => notifyDueOnce(urgent), [urgent]);
  return (
    <div className="mx-auto min-h-dvh max-w-5xl pb-[calc(9rem_+_env(safe-area-inset-bottom))] md:pb-12">
      <OfflineBanner />
      <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <p className="text-sm text-slate-500">สวัสดี {me?.name}</p>
        <Button type="button" variant="ghost" onClick={() => logout.mutate()}>ออกจากระบบ</Button>
      </div>
      {/* มือถือ: bottom nav / จอ ≥ 768px: แถบเมนูด้านบน */}
      <nav aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-slate-200 bg-white/95
                   pb-[env(safe-area-inset-bottom)] backdrop-blur
                   md:static md:mx-4 md:mb-4 md:flex md:gap-2 md:border-0 md:bg-transparent md:pb-0">
        {NAV.map(([to, label]) => (
          <NavLink key={to} to={to} end
            className={({ isActive }) =>
              `flex min-h-14 items-center justify-center gap-1 text-sm md:min-h-11 md:rounded-full md:px-4 ${
                isActive ? 'font-semibold text-indigo-600 md:bg-indigo-600 md:text-white' : 'text-slate-600'}`}>
            {label}
            {to === '/due' && urgent > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 text-xs text-white">
                {urgent}<span className="sr-only"> งานด่วน</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<Spinner />}><Outlet /></Suspense>
      <button type="button" aria-label="เพิ่มงานใหม่" onClick={() => sheet.open('new')}
        className="fixed right-4 bottom-[calc(5rem_+_env(safe-area-inset-bottom))] z-20 grid size-14
                   place-items-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg
                   active:scale-95 md:right-8 md:bottom-8">
        +
      </button>
      <SheetHost />
    </div>
  );
}
