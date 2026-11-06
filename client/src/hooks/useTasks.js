import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { toast } from '../lib/toast.js';

const KEY = ['tasks'];

// ประกาศไว้นอก hook ให้ reference คงที่ จะได้ไม่คำนวณใหม่ทุกครั้งที่ render
const flatten = (res) => {
  const byId = new Map();
  for (const p of res.pages) for (const t of p.data) byId.set(t._id, t); // ตัดรายการซ้ำจาก offset pagination
  return { tasks: [...byId.values()], total: res.pages[0]?.meta.total ?? 0 };
};

export function useTaskList(filters) {
  return useInfiniteQuery({
    queryKey: [...KEY, filters],
    queryFn: ({ pageParam, signal }) =>
      api('/tasks', { query: { ...filters, page: pageParam, limit: 20 }, signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    select: flatten,
    placeholderData: (prev) => prev, // ตอนเปลี่ยน filter ให้แสดงข้อมูลเดิมไว้ก่อน จอจะไม่กะพริบว่าง
  });
}

function useOptimisticTaskMutation(mutationFn, apply) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: KEY,
    mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: KEY }); // กัน refetch ที่ค้างอยู่มาเขียนทับค่า optimistic
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      qc.setQueriesData({ queryKey: KEY }, (old) =>
        old && { ...old, pages: old.pages.map((p) => ({ ...p, data: apply(p.data, vars) })) });
      return { snapshot };
    },
    // callback ที่ใส่ใน useMutation ยังทำงานแม้ component จะ unmount ไปแล้ว (เช่นปิด sheet ไปแล้ว)
    onError: (err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      if (err.status !== 401) toast('บันทึกไม่สำเร็จ ข้อมูลถูกย้อนกลับแล้ว');
    },
    onSettled: () => {
      // ถ้าผู้ใช้ติ๊กรัว ๆ ให้ refetch หลัง mutation ตัวสุดท้ายเท่านั้น ไม่งั้นข้อมูลเก่าจะมาทับค่าใหม่
      if (qc.isMutating({ mutationKey: KEY }) === 1) qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export const useUpdateTask = () =>
  useOptimisticTaskMutation(
    ({ id, ...patch }) => api(`/tasks/${id}`, { method: 'PATCH', body: patch }),
    (tasks, { id, ...patch }) => tasks.map((t) => (t._id === id ? { ...t, ...patch } : t)),
  );

export const useDeleteTask = () =>
  useOptimisticTaskMutation(
    (id) => api(`/tasks/${id}`, { method: 'DELETE' }),
    (tasks, id) => tasks.filter((t) => t._id !== id),
  );

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/tasks', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
