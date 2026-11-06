// src/pages/DuePage.jsx
import { useState } from 'react';
import { useDueTasks } from '../hooks/useTasks.js';
import { useSheet } from '../hooks/useSheet.js';
import { canNotify, enableNotifications } from '../lib/notify.js';
import { Button, Spinner } from '../components/ui.jsx';
import { TaskItem } from '../components/TaskItem.jsx';
const GROUPS = [
  ['overdue', 'เลยกำหนด', 'text-red-600'],
  ['today', 'ครบกำหนดวันนี้', 'text-amber-600'],
  ['upcoming', '7 วันข้างหน้า', 'text-slate-700'],
];
function NotifyBanner() {
  const [perm, setPerm] = useState(() => (canNotify() ? Notification.permission : 'unsupported'));
  if (perm === 'granted') return null;
  return (
    <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">
      {perm === 'unsupported'
        ? 'เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน (บน iPhone ต้องเพิ่มแอปไปที่หน้าจอโฮมก่อน ซึ่งจะทำใน Phase 4)'
        : perm === 'denied'
          ? 'การแจ้งเตือนถูกปิดอยู่ เปิดได้ในการตั้งค่าของเบราว์เซอร์'
          : <Button type="button" onClick={async () => setPerm(await enableNotifications())}>เปิดการแจ้งเตือน</Button>}
    </div>
  );
}
export default function DuePage() {
  const due = useDueTasks();
  const sheet = useSheet();
  const groups = due.data?.data;
  return (
    <main className="px-4">
      <h1 className="mb-3 text-xl font-bold">ใกล้ครบกำหนด</h1>
      <NotifyBanner />
      {due.isPending ? <Spinner /> : due.isError ? (
        <div className="py-12 text-center">
          <p className="mb-3 text-slate-600">{due.error.message}</p>
          <Button type="button" onClick={() => due.refetch()}>ลองใหม่</Button>
        </div>
      ) : GROUPS.every(([g]) => groups[g].length === 0) ? (
        <p className="py-12 text-center text-slate-500">ไม่มีงานที่ใกล้ครบกำหนด</p>
      ) : (
        GROUPS.filter(([g]) => groups[g].length > 0).map(([g, label, cls]) => (
          <section key={g} aria-labelledby={`due-${g}`} className="mb-6">
            <h2 id={`due-${g}`} className={`mb-2 text-sm font-semibold ${cls}`}>{label} ({groups[g].length})</h2>
            <ul className="space-y-2">
              {groups[g].map((t) => <TaskItem key={t._id} task={t} onOpen={sheet.open} />)}
            </ul>
          </section>
        ))
      )}
      {due.data?.meta.truncated && <p className="text-center text-sm text-slate-500">แสดง 100 งานแรก</p>}
    </main>
  );
}
