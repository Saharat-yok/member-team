import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

export const CACHE_KEY = 'tm-query-cache-v1';
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

export function clearPersistedCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // เพิกเฉยกรณี private mode บล็อก storage
  }
}

export function createQueryClient({ persist = false } = {}) {
  let client;
  const on401 = (err) => {
    if (err?.status === 401) {
      clearPersistedCache();
      client.setQueryData(['me'], null);
    }
  };

  client = new QueryClient({
    queryCache: new QueryCache({
      onError: on401,
      onSuccess: () => {
        if (!persist) return;
        // ไม่มีผู้ใช้ที่ login อยู่ (เช่น logout แล้วแต่ query ที่ค้างอยู่เพิ่งเสร็จ) ห้ามเขียนแคชกลับ ไม่งั้นข้อมูลคนก่อนจะรั่ว
        if (!client.getQueryData(['me'])) return clearPersistedCache();
        try {
          const queries = client
            .getQueryCache()
            .getAll()
            .filter((q) => q.state.status === 'success' && (q.queryKey[0] === 'me' || q.queryKey[0] === 'tasks'))
            .map((q) => [q.queryKey, q.state.data]);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), queries }));
        } catch {
          // storage เต็มหรือถูกบล็อก
        }
      },
    }),
    mutationCache: new MutationCache({ onError: on401 }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        networkMode: 'offlineFirst',
        retry: (n, err) => (err?.status === 0 || err?.status >= 500) && n < 2,
      },
      mutations: {
        networkMode: 'offlineFirst',
      },
    },
  });

  if (persist) {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (raw && Date.now() - raw.ts < MAX_AGE) {
        for (const [key, data] of raw.queries) client.setQueryData(key, data);
      }
    } catch {
      clearPersistedCache();
    }
  }

  return client;
}

export const queryClient = createQueryClient({ persist: true });
