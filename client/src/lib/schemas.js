import { z } from 'zod';

import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, taskBaseFields } from '@task-manager/shared';

// ค่าคงที่และกฎพื้นฐานของงานอยู่ใน @task-manager/shared เพื่อให้ตรงกับ server เสมอ
export { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL };

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
  ...taskBaseFields,
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
