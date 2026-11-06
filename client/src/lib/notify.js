// src/lib/notify.js
const STORE_KEY = 'due-notified-on';
export const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;
export const enableNotifications = () => Notification.requestPermission(); // ต้องเรียกจาก user gesture เท่านั้น
export function notifyDueOnce(count) {
  if (!count || !canNotify() || Notification.permission !== 'granted') return;
  const today = new Date().toLocaleDateString('en-CA');
  if (localStorage.getItem(STORE_KEY) === today) return; // แจ้งไม่เกินวันละครั้ง
  try {
    new Notification('งานใกล้ครบกำหนด', { body: `มี ${count} งานที่เลยกำหนดหรือครบกำหนดวันนี้`, tag: 'due' });
    localStorage.setItem(STORE_KEY, today);
  } catch {
    // Chrome บน Android ไม่ให้สร้าง new Notification() ต้องใช้ ServiceWorkerRegistration.showNotification (Phase 4)
  }
}
