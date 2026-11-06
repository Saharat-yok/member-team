// src/components/TaskSheet.jsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCreateTask, useDeleteTask, useUpdateTask } from '../hooks/useTasks.js';
import { useSwipeDown } from '../hooks/utils.js';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, parseForm, taskFormSchema } from '../lib/schemas.js';
import { toInputDate } from '../lib/date.js';
import { Button, Field } from './ui.jsx';
export function TaskSheet({ task, onClose }) {
  const ref = useRef(null);
  const alive = useRef(true);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const close = () => ref.current?.close();
  const swipe = useSwipeDown(ref, close);
  // ถ้า sheet ถูก unmount เพราะ URL เปลี่ยน (เช่นกด Back) จะไม่เรียก onClose ซ้ำ ไม่งั้น history ถูกย้อน 2 ครั้ง
  useLayoutEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (!ref.current.open) ref.current.showModal();
  }, []);
  const onSubmit = (e) => {
    e.preventDefault();
    const { data, errors } = parseForm(taskFormSchema, e.currentTarget);
    if (errors) return setErrors(errors);
    if (task) {
      update.mutate({ task, patch: data });
      return close();
    }
    create.mutate(data, { onSuccess: close, onError: (err) => setErrors(err.fieldErrors ?? {}) });
  };
  const onDelete = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    remove.mutate(task);
    close();
  };
  return (
    <dialog ref={ref} onClose={() => alive.current && onClose()} aria-labelledby="sheet-title"
      onClick={(e) => e.target === e.currentTarget && close()}
      className="mx-0 mt-auto mb-0 max-h-[90dvh] w-full max-w-none overflow-y-auto overscroll-contain
                 rounded-t-3xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40
                 md:m-auto md:max-w-lg md:rounded-3xl">
      <form onSubmit={onSubmit} noValidate className="space-y-4 p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))]">
        {/* พื้นที่สำหรับปัดลงเพื่อปิด ครอบเฉพาะด้ามจับกับหัวข้อ จะได้ไม่ชนกับการเลื่อนฟอร์ม */}
        <div {...swipe} className="-mx-5 -mt-5 space-y-3 px-5 pt-3 pb-1">
          <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-slate-300 md:hidden" />
          <h2 id="sheet-title" className="text-lg font-semibold">{task ? 'แก้ไขงาน' : 'งานใหม่'}</h2>
        </div>
        <Field label="ชื่องาน" name="title" defaultValue={task?.title} error={errors.title}
          autoFocus={!task} enterKeyHint="done" />
        <Field as="textarea" label="รายละเอียด" name="description" rows={3}
          defaultValue={task?.description} error={errors.description} />
        <div className="grid grid-cols-2 gap-3">
          <Field as="select" label="สถานะ" name="status" defaultValue={task?.status ?? 'todo'}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Field>
          <Field as="select" label="ความสำคัญ" name="priority" defaultValue={task?.priority ?? 'medium'}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </Field>
        </div>
        <Field label="วันครบกำหนด" name="dueDate" type="date" defaultValue={toInputDate(task?.dueDate)} />
        {create.isError && !Object.keys(create.error.fieldErrors ?? {}).length && (
          <p role="alert" className="text-sm text-red-600">{create.error.message}</p>
        )}
        <div className="flex gap-2 pt-2">
          {task && (
            <Button type="button" variant="danger" onClick={onDelete}>
              {confirmDelete ? 'แตะอีกครั้งเพื่อลบ' : 'ลบ'}
            </Button>
          )}
          <Button type="button" variant="ghost" className="ml-auto" onClick={close}>ยกเลิก</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </div>
      </form>
    </dialog>
  );
}
