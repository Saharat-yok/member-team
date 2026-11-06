import Task from '../models/Task.js';
import { AppError } from '../utils/AppError.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// ทุก query ผูกกับเจ้าของเสมอ → ป้องกัน IDOR
const scope = (req) => ({ _id: req.valid.params.id, owner: req.userId });
const taskNotFound = () => new AppError(404, 'Task not found');

export const listTasks = async (req, res) => {
  const { status, priority, q, sort, page, limit } = req.valid.query;
  const filter = { owner: req.userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');

  const dir = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');

  const [data, total] = await Promise.all([
    Task.find(filter)
      .sort({ [field]: dir, _id: dir }) // _id เป็น tie-breaker → ลำดับคงที่ข้ามหน้า
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  res.json({ data, meta: { page, limit, total, hasMore: page * limit < total } });
};

export const createTask = async (req, res) => {
  const task = await Task.create({ ...req.valid.body, owner: req.userId });
  res.status(201).json({ data: task });
};

export const getTask = async (req, res) => {
  const task = await Task.findOne(scope(req));
  if (!task) throw taskNotFound();
  res.json({ data: task });
};

export const updateTask = async (req, res) => {
  const task = await Task.findOneAndUpdate(scope(req), req.valid.body, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!task) throw taskNotFound();
  res.json({ data: task });
};

export const deleteTask = async (req, res) => {
  const { deletedCount } = await Task.deleteOne(scope(req));
  if (!deletedCount) throw taskNotFound();
  res.status(204).end();
};
