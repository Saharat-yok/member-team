// src/pages/TasksPage.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTaskList } from '../hooks/useTasks.js';
import { useSheet, withParam } from '../hooks/useSheet.js';
import { useDebounced, useInfiniteScroll } from '../hooks/utils.js';
import { STATUSES, STATUS_LABEL } from '../lib/schemas.js';
import { Button, Spinner, inputCls } from '../components/ui.jsx';
import { TaskItem } from '../components/TaskItem.jsx';
const TABS = [['', 'ทั้งหมด'], ...STATUSES.map((s) => [s, STATUS_LABEL[s]])];
export default function TasksPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const q = useDebounced(search.trim());
  const sheet = useSheet();
  const list = useTaskList({ status, q });
  const sentinel = useInfiniteScroll(() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage());
  // ใช้ replace เพื่อไม่ให้เกิด history ใหม่ทุกครั้งที่เปลี่ยน filter
  const setFilter = (k, v) => setParams((p) => withParam(p, k, v), { replace: true });
  useEffect(() => {
    if ((params.get('q') ?? '') !== q) setFilter('q', q);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <header className="sticky top-0 z-10 space-y-3 bg-slate-50/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <h1 className="text-xl font-bold">งานของฉัน</h1>
        <input type="search" enterKeyHint="search" placeholder="ค้นหางาน…" aria-label="ค้นหางาน"
          value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls} />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {TABS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setFilter('status', value)}
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
            {list.data.tasks.map((t) => <TaskItem key={t._id} task={t} onOpen={sheet.open} />)}
          </ul>
        )}
        <div ref={sentinel} className="py-4 text-center">
          {list.hasNextPage && (
            <Button type="button" variant="ghost" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
              {list.isFetchingNextPage ? 'กำลังโหลด…' : 'โหลดเพิ่ม'}
            </Button>
          )}
        </div>
      </main>
    </>
  );
}
