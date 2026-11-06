// src/hooks/useTasks.js
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { toast } from '../lib/toast.js';
export const KEY = ['tasks'];
export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
// ตัดค่าว่างออก เพื่อให้ { status: '' } กับ {} ได้ query key เดียวกัน
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
const flatten = (res) => ({ tasks: res.pages.flatMap((p) => p.data), total: res.pages[0]?.meta.total });
export function useTaskList(filters = {}) {
  const f = clean(filters);
  return useInfiniteQuery({
    queryKey: [...KEY, 'list', f],
    queryFn: ({ pageParam, signal }) =>
      api('/tasks', { query: { ...f, cursor: pageParam, limit: 20 }, signal }),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    select: flatten,
    placeholderData: (prev) => prev,
  });
}
export function useDueTasks() {
  return useQuery({
    queryKey: [...KEY, 'due', TZ],
    queryFn: ({ signal }) => api('/tasks/due', { query: { tz: TZ }, signal }),
    refetchInterval: 5 * 60_000, // ถ้าเปิดแอปค้างไว้ข้ามเที่ยงคืน กลุ่มของงานจะได้อัปเดต
  });
}
// หางานจาก cache ทุกแบบ (list และ due) ใช้เป็น initialData ตอนเปิด sheet จะได้ไม่ต้องรอโหลด
const tasksIn = (d) =>
  d?.pages ? d.pages.flatMap((p) => p.data) : d?.data && !Array.isArray(d.data) ? Object.values(d.data).flat() : [];
export function useTask(id) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: ({ signal }) => api(`/tasks/${id}`, { signal }).then((r) => r.data),
    initialData: () => {
      for (const [, d] of qc.getQueriesData({ queryKey: KEY })) {
        const hit = tasksIn(d).find((t) => t._id === id);
        if (hit) return hit;
      }
    },
    enabled: !!id,
    retry: false,
  });
}
const matches = (t, f) =>
  (!f.status || t.status === f.status) &&
  (!f.priority || t.priority === f.priority) &&
  (!f.q || t.title.toLowerCase().includes(f.q.toLowerCase()));
// แก้ cache 1 ชุดให้สะท้อนการเปลี่ยนแปลง: next = งานหลังแก้ หรือ null ถ้าลบ
export function applyChange(key, old, id, next) {
  const [, kind, arg] = key;
  if (kind === 'detail') return next && old._id === id ? next : old;
  if (kind === 'due') {
    const data = Object.fromEntries(Object.entries(old.data).map(([g, list]) => [
      g, list.flatMap((t) => (t._id !== id ? [t] : next && next.status !== 'done' ? [next] : [])),
    ]));
    return { ...old, data };
  }
  if (kind !== 'list') return old;
  const keep = !!next && matches(next, arg);
  let found = false;
  const pages = old.pages.map((p) => ({
    ...p,
    data: p.data.flatMap((t) => {
      if (t._id !== id) return [t];
      found = true;
      return keep ? [next] : [];
    }),
  }));
  // งานที่ลากเข้ามาจากคอลัมน์อื่น ให้ไปอยู่บนสุดของคอลัมน์ปลายทาง
  const inserted = keep && !found && !!arg.status && pages.length > 0;
  if (inserted) pages[0] = { ...pages[0], data: [next, ...pages[0].data] };
  const delta = (inserted ? 1 : 0) - (found && !keep ? 1 : 0);
  if (delta && typeof pages[0]?.meta.total === 'number') {
    pages[0] = { ...pages[0], meta: { ...pages[0].meta, total: pages[0].meta.total + delta } };
  }
  return { ...old, pages };
}
function useTaskMutation(mutationFn, toChange) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: KEY,
    mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      const { id, next } = toChange(vars);
      for (const [key, old] of snapshot) if (old) qc.setQueryData(key, applyChange(key, old, id, next));
      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      if (err.status !== 401) toast('บันทึกไม่สำเร็จ ข้อมูลถูกย้อนกลับแล้ว');
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: KEY }) > 1) return; // รอให้ mutation ตัวสุดท้ายเสร็จก่อน
      // cache ของ list ถูกแก้ด้วย applyChange แล้ว จึงแค่ mark stale ไว้ แล้วไป refetch ตอนผู้ใช้กลับมาที่หน้าหรือที่แอป
      qc.invalidateQueries({ queryKey: [...KEY, 'list'], refetchType: 'none' });
      qc.invalidateQueries({ queryKey: [...KEY, 'due'] }); // การแบ่งกลุ่มขึ้นกับ dueDate จึงให้ server คำนวณใหม่
    },
  });
}
export const useUpdateTask = () =>
  useTaskMutation(
    ({ task, patch }) => api(`/tasks/${task._id}`, { method: 'PATCH', body: patch }),
    ({ task, patch }) => ({ id: task._id, next: { ...task, ...patch } }),
  );
export const useDeleteTask = () =>
  useTaskMutation(
    (task) => api(`/tasks/${task._id}`, { method: 'DELETE' }),
    (task) => ({ id: task._id, next: null }),
  );
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/tasks', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }), // งานใหม่ต้องได้ลำดับที่ถูกต้องจาก server
  });
}
