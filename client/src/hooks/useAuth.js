import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { clearPersistedCache } from '../lib/queryClient.js';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await api('/auth/me')).user;
      } catch (err) {
        if (err.status === 401) return null; // ยังไม่ login ถือเป็นสถานะปกติ ไม่ใช่ error
        throw err;
      }
    },
    staleTime: Infinity,
  });
}

export function useAuthMutation(mode) { // 'login' | 'register'
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(`/auth/${mode}`, { method: 'POST', body }),
    onSuccess: ({ user }) => {
      qc.removeQueries({ queryKey: ['tasks'] }); // กันไม่ให้เห็น cache งานของผู้ใช้คนก่อน
      qc.setQueryData(['me'], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      clearPersistedCache(); // ไม่ให้คนถัดไปที่เปิดเครื่องนี้เห็นข้อมูลที่แคชไว้ใน localStorage
      qc.removeQueries({ queryKey: ['tasks'] });
      qc.setQueryData(['me'], null);
    },
  });
}
