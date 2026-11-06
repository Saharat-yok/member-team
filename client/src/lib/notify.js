import { api } from './api.js';
import { TZ } from '../hooks/useTasks.js';

const STORE_KEY = 'due-notified-on';

export const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// ต้องเรียกจาก user gesture เท่านั้น
export async function enableNotifications() {
  if (!canNotify()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.pushManager) {
      const { publicKey } = await api('/push/vapid-public-key');
      if (publicKey) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await api('/push/subscribe', {
          method: 'POST',
          body: { ...sub.toJSON(), tz: TZ },
        });
      }
    }
  } catch {
    // ถ้าเบราว์เซอร์ยังไม่รองรับ PushManager ให้ทำงานต่อด้วยการแจ้งเตือนตอนเปิดแอป
  }
  return perm;
}

export function notifyDueOnce(count) {
  if (!count || !canNotify() || Notification.permission !== 'granted') return;
  const today = new Date().toLocaleDateString('en-CA');
  if (localStorage.getItem(STORE_KEY) === today) return; // แจ้งไม่เกินวันละครั้ง
  try {
    new Notification('งานใกล้ครบกำหนด', { body: `มี ${count} งานที่เลยกำหนดหรือครบกำหนดวันนี้`, tag: 'due' });
    localStorage.setItem(STORE_KEY, today);
  } catch {
    // Chrome บน Android ไม่ให้สร้าง new Notification() ต้องใช้ ServiceWorkerRegistration.showNotification
    navigator.serviceWorker?.ready.then((reg) => {
      reg.showNotification('งานใกล้ครบกำหนด', {
        body: `มี ${count} งานที่เลยกำหนดหรือครบกำหนดวันนี้`,
        tag: 'due',
      });
      localStorage.setItem(STORE_KEY, today);
    });
  }
}
