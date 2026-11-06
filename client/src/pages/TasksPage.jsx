import { useState } from 'react';
import { useLogout, useMe } from '../hooks/useAuth.js';
import { useTaskList } from '../hooks/useTasks.js';
import { useDebounced, useInfiniteScroll } from '../hooks/utils.js';
import { STATUSES, STATUS_LABEL } from '../lib/schemas.js';
import { Button, Spinner, inputCls } from '../components/ui.jsx';
import { TaskItem } from '../components/TaskItem.jsx';
import { TaskSheet } from '../components/TaskSheet.jsx';

const TABS = [['', 'ทั้งหมด'], ...STATUSES.map((s) => [s, STATUS_LABEL[s]])];

export default function TasksPage() {
  const { data: me } = useMe();
  const logout = useLogout();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [sheet, setSheet] = useState(null); // null = ปิด, {} = สร้างใหม่, { task } = แก้ไข
  const list = useTaskList({ status, q });
  const sentinel = useInfiniteScroll(
    () => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage(),
  );

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-28">
      <header className="sticky top-0 z-10 space-y-3 bg-slate-50/95 px-4 pb-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">สวัสดี {me?.name}</p>
            <h1 className="text-xl font-bold">งานของฉัน</h1>
          </div>
          <Button type="button" variant="ghost" onClick={() => logout.mutate()}>ออกจากระบบ</Button>
        </div>
        <input type="search" enterKeyHint="search" placeholder="ค้นหางาน…" aria-label="ค้นหางาน"
          value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {TABS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}
              className="min-h-11 shrink-0 rounded-full border border-slate-300 px-4 text-sm
                         aria-pressed:border-indigo-600 aria-pressed:bg-indigo-600 aria-pressed:text-white">
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <div className="py-12 text-center">
            <p className="mb-3 text-slate-600">{list.error.message}</p>
            <Button type="button" onClick={() => list.refetch()}>ลองใหม่</Button>
          </div>
        ) : list.data.tasks.length === 0 ? (
          <p className="py-12 text-center text-slate-500">
            {q || status ? 'ไม่พบงานที่ตรงกับเงื่อนไข' : 'ยังไม่มีงาน แตะ + เพื่อเริ่มต้น'}
          </p>
        ) : (
          <ul className={`space-y-2 transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
            {list.data.tasks.map((t) => (
              <TaskItem key={t._id} task={t} onOpen={(task) => setSheet({ task })} />
            ))}
          </ul>
        )}
        {/* sentinel สำหรับ infinite scroll และมีปุ่มสำรองไว้ให้คนใช้คีย์บอร์ดหรือ screen reader */}
        <div ref={sentinel} className="py-4 text-center">
          {list.hasNextPage && (
            <Button type="button" variant="ghost" disabled={list.isFetchingNextPage}
              onClick={() => list.fetchNextPage()}>
              {list.isFetchingNextPage ? 'กำลังโหลด…' : 'โหลดเพิ่ม'}
            </Button>
          )}
        </div>
      </main>

      <button type="button" aria-label="เพิ่มงานใหม่" onClick={() => setSheet({})}
        className="fixed right-4 bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] grid size-14
                   place-items-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg
                   active:scale-95 md:right-8">
        +
      </button>

      {sheet && (
        <TaskSheet key={sheet.task?._id ?? 'new'} task={sheet.task} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
