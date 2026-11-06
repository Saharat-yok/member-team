import { useUpdateTask } from '../hooks/useTasks.js';
import { PRIORITY_LABEL } from '../lib/schemas.js';
import { formatDue, isOverdue } from '../lib/date.js';

const PRIORITY_STYLE = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export function TaskItem({ task, onOpen }) {
  const update = useUpdateTask();
  const done = task.status === 'done';

  return (
    <li className="flex items-start gap-1 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
      {/* checkbox ขนาด 20px แต่ label รอบนอกให้พื้นที่แตะ 44×44px */}
      <label className="grid size-11 shrink-0 place-items-center">
        <input type="checkbox" checked={done} aria-label={`เสร็จแล้ว: ${task.title}`}
          onChange={() => update.mutate({ id: task._id, status: done ? 'todo' : 'done' })}
          className="size-5 accent-indigo-600" />
      </label>
      <button type="button" onClick={() => onOpen(task)} className="min-h-11 flex-1 py-1.5 pr-2 text-left">
        {/* leading-relaxed กันวรรณยุกต์และสระบนของไทยถูกตัดขอบเมื่อใช้ line-clamp */}
        <p className={`line-clamp-2 leading-relaxed ${done ? 'text-slate-400 line-through' : ''}`}>{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 ${PRIORITY_STYLE[task.priority]}`}>
            {PRIORITY_LABEL[task.priority]}
          </span>
          {task.dueDate && (
            <span className={isOverdue(task) ? 'font-medium text-red-600' : 'text-slate-500'}>
              ครบ {formatDue(task.dueDate)}
            </span>
          )}
        </p>
      </button>
    </li>
  );
}
