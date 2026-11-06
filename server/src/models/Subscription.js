import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    tz: { type: String, default: 'Asia/Bangkok' },
    lastNotifiedDate: { type: String, default: null }, // "YYYY-MM-DD" ตามเวลา tz ของผู้ใช้นั้น
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model('Subscription', subscriptionSchema);
