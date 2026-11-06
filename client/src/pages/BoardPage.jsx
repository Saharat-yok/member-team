// src/pages/BoardPage.jsx
import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor,
  useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import { useTaskList, useUpdateTask } from '../hooks/useTasks.js';
import { useSheet } from '../hooks/useSheet.js';
import { STATUSES, STATUS_LABEL } from '../lib/schemas.js';
import { Button, Spinner } from '../components/ui.jsx';
import { TaskSummary } from '../components/TaskItem.jsx';
// คีย์บอร์ด: ลูกศรซ้าย/ขวาย้ายการ์ดไปคอลัมน์ถัดไปทีละคอลัมน์ ไม่ต้องกดทีละ 25px แบบค่า default
// currentCoordinates คือมุมซ้ายบนของการ์ด จึงวางไว้ที่ขอบซ้ายของคอลัมน์ + padding (p-3 = 12px)
const columnJump = (event, { context: { droppableRects }, currentCoordinates }) => {
  const dir = { ArrowRight: 1, ArrowLeft: -1 }[event.code];
  if (!dir) return undefined;
  event.preventDefault();
  const lefts = [...droppableRects.values()].map((r) => r.left).sort((a, b) => a - b);
  const target = lefts[lefts.findLastIndex((l) => l <= currentCoordinates.x) + dir];
  return target === undefined ? currentCoordinates : { ...currentCoordinates, x: target + 12 };
};
const colName = (id) => STATUS_LABEL[id] ?? id;
const a11y = {
  screenReaderInstructions: {
    draggable: 'กด Space เพื่อหยิบ ใช้ลูกศรซ้ายขวาเพื่อเลือกคอลัมน์ กด Space อีกครั้งเพื่อวาง หรือ Esc เพื่อยกเลิก',
  },
  announcements: {
    onDragStart: ({ active }) => `หยิบงาน ${active.data.current.task.title}`,
    onDragOver: ({ over }) => (over ? `อยู่เหนือคอลัมน์ ${colName(over.id)}` : 'ไม่ได้อยู่เหนือคอลัมน์ใด'),
    onDragEnd: ({ active, over }) =>
      over ? `ย้าย ${active.data.current.task.title} ไปที่ ${colName(over.id)}` : 'ยกเลิกการย้าย',
    onDragCancel: () => 'ยกเลิกการย้าย',
  },
};
function Card({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({ id: task._id, data: { task } });
  return (
    <li ref={setNodeRef}
      className={`flex items-start rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${isDragging ? 'opacity-40' : ''}`}>
      {/* ด้ามจับ: touch-none กันไม่ให้เบราว์เซอร์เลื่อนจอแทนการลาก และปิด callout ที่เด้งขึ้นตอนกดค้างบน iOS */}
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`ย้าย: ${task.title}`}
        className="grid size-11 shrink-0 cursor-grab touch-none select-none place-items-center text-slate-400 [-webkit-touch-callout:none]">
        ⠿
      </button>
      <button type="button" onClick={() => onOpen(task._id)} className="min-h-11 flex-1 py-2 pr-3 text-left">
        <TaskSummary task={task} />
      </button>
    </li>
  );
}
function Column({ status, onOpen }) {
  const list = useTaskList({ status });
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} aria-labelledby={`col-${status}`}
      className={`flex min-h-40 w-[85vw] shrink-0 snap-center flex-col gap-2 rounded-2xl bg-slate-100 p-3
                  md:w-auto ${isOver ? 'ring-2 ring-indigo-400' : ''}`}>
      <h2 id={`col-${status}`} className="flex justify-between font-semibold">
        {STATUS_LABEL[status]} <span className="text-sm text-slate-500">{list.data?.total ?? ''}</span>
      </h2>
      {list.isPending ? <Spinner /> : (
        <ul className="space-y-2">
          {list.data?.tasks.map((t) => <Card key={t._id} task={t} onOpen={onOpen} />)}
        </ul>
      )}
      {list.hasNextPage && (
        <Button type="button" variant="ghost" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
          {list.isFetchingNextPage ? 'กำลังโหลด…' : 'โหลดเพิ่ม'}
        </Button>
      )}
    </section>
  );
}
export default function BoardPage() {
  const [active, setActive] = useState(null);
  const update = useUpdateTask();
  const sheet = useSheet();
  // ใช้ Mouse กับ Touch แยกกันแทน PointerSensor เพื่อให้ตั้ง delay ให้ touch ได้โดยไม่กระทบเมาส์
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnJump }),
  );
  const onDragEnd = ({ active: a, over }) => {
    setActive(null);
    const task = a.data.current.task;
    if (over && over.id !== task.status) update.mutate({ task, patch: { status: over.id } });
  };
  return (
    <main className="px-4">
      <h1 className="mb-3 text-xl font-bold">บอร์ด</h1>
      <DndContext sensors={sensors} accessibility={a11y} onDragEnd={onDragEnd}
        onDragStart={({ active: a }) => setActive(a.data.current.task)} onDragCancel={() => setActive(null)}>
        {/* ปิด scroll-snap ระหว่างลาก ไม่งั้น snap จะดึงจอกลับขณะที่ระบบกำลังเลื่อนจอให้อัตโนมัติ */}
        <div className={`-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3
                         md:overflow-visible md:px-0 ${active ? '' : 'snap-x snap-mandatory'}`}>
          {STATUSES.map((s) => <Column key={s} status={s} onOpen={sheet.open} />)}
        </div>
        <DragOverlay>
          {active && (
            <div className="rounded-xl bg-white p-3 shadow-xl ring-2 ring-indigo-400"><TaskSummary task={active} /></div>
          )}
        </DragOverlay>
      </DndContext>
    </main>
  );
}
