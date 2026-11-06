import { z } from 'zod';

// ⚠️ ต้องตรงกับ server/src/validators/schemas.js (Phase 4 จะย้ายไปไว้ใน shared package)
export const STATUSES = ['todo', 'in_progress', 'done'];
export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUS_LABEL = { todo: 'ต้องทำ', in_progress: 'กำลังทำ', done: 'เสร็จแล้ว' };
export const PRIORITY_LABEL = { low: 'ต่ำ', medium: 'กลาง', high: 'สูง' };

export const loginSchema = z.object({
  email: z.string().trim().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(50, 'ไม่เกิน 50 ตัวอักษร'),
  password: z
    .string()
    .min(8, 'อย่างน้อย 8 ตัวอักษร')
    .refine((p) => new TextEncoder().encode(p).length <= 72, 'รหัสผ่านยาวเกินไป'), // บน browser ไม่มี Buffer
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'กรุณาใส่ชื่องาน').max(120, 'ไม่เกิน 120 ตัวอักษร'),
  description: z.string().trim().max(2000, 'ไม่เกิน 2000 ตัวอักษร'),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  // "2025-07-01" ถ้าส่งไปตรง ๆ จะถูกตีความเป็นเที่ยงคืน UTC จึงแปลงเป็นสิ้นวันตามเวลาเครื่องก่อน
  dueDate: z.string().transform((v) => (v ? new Date(`${v}T23:59:59`).toISOString() : null)),
});

export function parseForm(schema, formEl) {
  const result = schema.safeParse(Object.fromEntries(new FormData(formEl)));
  if (result.success) return { data: result.data };
  const errors = {};
  for (const issue of result.error.issues) errors[issue.path[0]] ??= issue.message;
  return { errors };
}
