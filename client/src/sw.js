import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST); // ไฟล์ build ทั้งหมดจาก Vite

// แคชคำขอ GET /api/v1/tasks* แบบ NetworkFirst เพื่อให้เปิดดูงานได้แม้รีเฟรชหน้าตอนออฟไลน์
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/v1/tasks'),
  new NetworkFirst({ cacheName: 'tasks-api-cache', networkTimeoutSeconds: 3 }),
);

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'งานใกล้ครบกำหนด', body: 'มีงานที่ต้องทำวันนี้', url: '/due' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: 'due',
      data: { url: data.url ?? '/due' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/due';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
