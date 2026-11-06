import webpush from 'web-push';
import Subscription from '../models/Subscription.js';
import Task from '../models/Task.js';
import { config } from '../config.js';
import { startOfDay } from '../utils/time.js';

const vapidReady = Boolean(config.vapidPublicKey && config.vapidPrivateKey);
if (vapidReady) {
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
}

// คืนค่าเป็นจำนวน subscription ที่ถูกส่งแจ้งเตือนในรอบนี้ (แยกฟังก์ชันเพื่อให้เขียนเทสต์เรียกตรง ๆ ได้)
export async function runDuePushJob(now = new Date(), sender = webpush) {
  const subs = await Subscription.find().lean();
  let sentCount = 0;

  for (const sub of subs) {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: sub.tz }).format(now);
    if (sub.lastNotifiedDate === todayStr) continue;

    const tomorrow = startOfDay(now, sub.tz, 1);
    const urgentCount = await Task.countDocuments({
      owner: sub.owner,
      status: { $ne: 'done' },
      dueDate: { $ne: null, $lt: tomorrow },
    });
    if (urgentCount === 0) continue;

    // จองสิทธิ์การส่งของวันนี้แบบ atomic กันส่งซ้ำเมื่อมีหลาย worker
    const locked = await Subscription.findOneAndUpdate(
      { _id: sub._id, lastNotifiedDate: { $ne: todayStr } },
      { lastNotifiedDate: todayStr },
    );
    if (!locked) continue;

    const payload = JSON.stringify({
      title: 'งานใกล้ครบกำหนด',
      body: `มี ${urgentCount} งานที่เลยกำหนดหรือครบกำหนดวันนี้`,
      url: '/due',
    });

    try {
      await sender.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
      sentCount++;
    } catch (err) {
      // 404 หรือ 410 แปลว่าผู้ใช้ถอนสิทธิ์หรือถอนการติดตั้ง PWA ไปแล้ว ให้ลบออกจาก DB
      if (err.statusCode === 404 || err.statusCode === 410) {
        await Subscription.deleteOne({ _id: sub._id });
      } else {
        // ถ้าส่งไม่สำเร็จจากสาเหตุชั่วคราว ให้คืนค่า lastNotifiedDate เพื่อลองใหม่รอบหน้า
        await Subscription.updateOne({ _id: sub._id }, { lastNotifiedDate: sub.lastNotifiedDate });
      }
    }
  }
  return sentCount;
}

// ตรวจทุก 15 นาที (ส่งได้ไม่เกินวันละครั้งต่อ subscription ด้วย lastNotifiedDate) ไม่เริ่มถ้ายังไม่ตั้งค่า VAPID
export function startPushScheduler(intervalMs = 15 * 60_000) {
  if (!vapidReady) {
    console.warn('VAPID keys not set: Web Push scheduler disabled');
    return () => {};
  }
  const timer = setInterval(() => {
    runDuePushJob().catch((err) => console.error('Push job failed', err));
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
