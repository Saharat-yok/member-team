import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  let client;
  // ถ้า session หมดอายุระหว่างใช้งาน ให้ตั้ง me เป็น null แล้ว RequireAuth จะพาไปหน้า login
  const on401 = (err) => err?.status === 401 && client.setQueryData(['me'], null);

  client = new QueryClient({
    queryCache: new QueryCache({ onError: on401 }),
    mutationCache: new MutationCache({ onError: on401 }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // retry เฉพาะตอนเน็ตหลุดหรือ server error ส่วน 4xx retry ไปก็ได้ผลเดิม
        retry: (n, err) => (err?.status === 0 || err?.status >= 500) && n < 2,
      },
    },
  });
  return client;
}

export const queryClient = createQueryClient();
