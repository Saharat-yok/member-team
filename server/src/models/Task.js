import mongoose from 'mongoose';

import { PRIORITIES, STATUSES } from '@task-manager/shared';

export { PRIORITIES, STATUSES };

const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: STATUSES, default: 'todo' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// Compound index ตาม query ที่ใช้จริง: "งานของฉัน" + filter/sort
taskSchema.index({ owner: 1, createdAt: -1 });
taskSchema.index({ owner: 1, status: 1, dueDate: 1 });

export default mongoose.model('Task', taskSchema);
