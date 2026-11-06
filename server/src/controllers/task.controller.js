import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { startOfDay } from '../utils/time.js';
import { AppError } from '../utils/AppError.js';

const { ObjectId } = mongoose.Types;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// ทุก query ผูกกับเจ้าของเสมอ → ป้องกัน IDOR
const scope = (req) => ({ _id: req.valid.params.id, owner: req.userId });
const taskNotFound = () => new AppError(404, 'Task not found');

// สร้างเงื่อนไข "แถวที่อยู่ถัดจาก (v, id)" ตามลำดับ sort
// MongoDB ถือว่า null น้อยกว่าทุกค่า แต่ $gt/$lt กับ Date จะไม่ match null (type bracketing) จึงต้องเขียนกรณี null แยกเอง
function after(field, dir, { v, id }) {
  const idCmp = { _id: { [dir === 1 ? '$gt' : '$lt']: new ObjectId(id) } };
  if (v === null) {
    return dir === 1
      ? { $or: [{ [field]: null, ...idCmp }, { [field]: { $ne: null } }] } // null อยู่ต้นรายการ
      : { [field]: null, ...idCmp };                                       // null อยู่ท้ายรายการ
  }
  const value = new Date(v);
  const or = [{ [field]: { [dir === 1 ? '$gt' : '$lt']: value } }, { [field]: value, ...idCmp }];
  if (dir === -1) or.push({ [field]: null });
  return { $or: or };
}

const encodeCursor = (row, field) =>
  Buffer.from(JSON.stringify({ v: row[field]?.toISOString() ?? null, id: String(row._id) }))
    .toString('base64url');

export const listTasks = async (req, res) => {
  const { status, priority, q, sort, cursor, limit } = req.valid.query;
  const filter = { owner: req.userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');

  const dir = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');
  const query = cursor ? { ...filter, $and: [after(field, dir, cursor)] } : filter;

  const [rows, total] = await Promise.all([
    Task.find(query).sort({ [field]: dir, _id: dir }).limit(limit + 1).lean(), // ดึงเกิน 1 แถวเพื่อรู้ว่ายังมีหน้าถัดไปไหม
    cursor ? undefined : Task.countDocuments(filter),                           // นับ total เฉพาะหน้าแรก
  ]);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  res.json({
    data,
    meta: {
      limit, hasMore,
      nextCursor: hasMore ? encodeCursor(data.at(-1), field) : null,
      ...(total !== undefined && { total }),
    },
  });
};

const DUE_WINDOW_DAYS = 7;
const DUE_MAX = 100;

export const dueTasks = async (req, res) => {
  const { tz } = req.valid.query;
  const now = new Date();
  const tomorrow = startOfDay(now, tz, 1);
  const end = startOfDay(now, tz, 1 + DUE_WINDOW_DAYS);

  const tasks = await Task.find({
    owner: req.userId,
    status: { $ne: 'done' },
    dueDate: { $ne: null, $lt: end },
  }).sort({ dueDate: 1, _id: 1 }).limit(DUE_MAX).lean();

  const data = { overdue: [], today: [], upcoming: [] };
  for (const t of tasks) {
    data[t.dueDate < now ? 'overdue' : t.dueDate < tomorrow ? 'today' : 'upcoming'].push(t);
  }
  res.json({ data, meta: { tz, now, truncated: tasks.length === DUE_MAX } });
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
