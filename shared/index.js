import { z } from 'zod';

export const STATUSES = ['todo', 'in_progress', 'done'];
export const PRIORITIES = ['low', 'medium', 'high'];

export const STATUS_LABEL = { todo: 'ต้องทำ', in_progress: 'กำลังทำ', done: 'เสร็จแล้ว' };
export const PRIORITY_LABEL = { low: 'ต่ำ', medium: 'กลาง', high: 'สูง' };

export const isTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const taskBaseFields = {
  title: z.string().trim().min(1, 'กรุณาใส่ชื่องาน').max(120, 'ไม่เกิน 120 ตัวอักษร'),
  description: z.string().trim().max(2000, 'ไม่เกิน 2000 ตัวอักษร'),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
};
