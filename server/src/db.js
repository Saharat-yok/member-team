import mongoose from 'mongoose';
import { config } from './config.js';

// แคชการเชื่อมต่อไว้ที่ globalThis เพื่อให้ serverless instance ที่ถูกใช้ซ้ำไม่ต้องเชื่อมต่อใหม่ทุก request
const cache = (globalThis.__mongoCache ??= { promise: null });

export async function connectDb() {
  if (!config.mongoUri || !config.jwtSecret) throw new Error('Missing MONGO_URI or JWT_SECRET');
  if (mongoose.connection.readyState === 1) return mongoose;
  cache.promise ??= mongoose
    .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
    .catch((err) => { cache.promise = null; throw err; }); // ล้มแล้วให้ request ถัดไปลองใหม่ได้
  await cache.promise;
  return mongoose;
}
