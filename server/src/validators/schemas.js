import { z } from 'zod';
import { PRIORITIES, STATUSES } from '../models/Task.js';

const email = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(50),
  email,
  password: z
    .string()
    .min(8)
    // bcrypt ใช้แค่ 72 bytes แรก — อักษรไทย 1 ตัว = 3 bytes
    .refine((p) => Buffer.byteLength(p) <= 72, { message: 'Password must not exceed 72 bytes' }),
});

export const loginSchema = z.object({ email, password: z.string().min(1) });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

// cursor = base64url ของ { v: ค่าของ field ที่ใช้ sort, id } ต้อง validate ซ้ำ เพราะ client แก้เองได้
const cursorPayload = z.object({ v: z.string().datetime().nullable(), id: objectId });
const cursor = z.string().max(200).transform((raw, ctx) => {
  try {
    return cursorPayload.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid cursor' });
    return z.NEVER;
  }
});

const taskFields = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.coerce.date().nullable().optional(), // ส่ง null = ล้างวันครบกำหนด
});

export const createTaskSchema = taskFields;

export const updateTaskSchema = taskFields
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field' });

export const listTasksQuery = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['-createdAt', 'createdAt', '-dueDate', 'dueDate']).default('-createdAt'),
  cursor: cursor.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const isTimeZone = (tz) => {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
};

export const dueQuery = z.object({
  tz: z.string().max(64).refine(isTimeZone, 'Invalid time zone').default('Asia/Bangkok'),
});
