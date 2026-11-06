import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as auth from '../controllers/auth.controller.js';
import * as task from '../controllers/task.controller.js';
import * as s from '../validators/schemas.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: config.isProd ? 20 : 1000 });

// Auth
router.post('/auth/register', authLimiter, validate({ body: s.registerSchema }), auth.register);
router.post('/auth/login', authLimiter, validate({ body: s.loginSchema }), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);

// Tasks — ต้อง login ทุก endpoint
router.use('/tasks', requireAuth);
router.get('/tasks', validate({ query: s.listTasksQuery }), task.listTasks);
router.post('/tasks', validate({ body: s.createTaskSchema }), task.createTask);
router.get('/tasks/:id', validate({ params: s.idParams }), task.getTask);
router.patch('/tasks/:id', validate({ params: s.idParams, body: s.updateTaskSchema }), task.updateTask);
router.delete('/tasks/:id', validate({ params: s.idParams }), task.deleteTask);

export default router;
