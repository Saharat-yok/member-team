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

export const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });

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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
