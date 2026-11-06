// Vercel Function: รับทุก request ที่ขึ้นต้นด้วย /api/ แล้วส่งต่อให้ Express app เดิม (route จริงอยู่ที่ /api/v1/*)
import app from '../server/src/app.js';
import { connectDb } from '../server/src/db.js';

export default async function handler(req, res) {
  try {
    await connectDb();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    // ใช้ API มาตรฐานของ Node (ไม่พึ่ง res.status/res.json ของ Vercel) จะได้ทดสอบนอก Vercel ได้
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ message: 'Service unavailable' }));
  }
  return app(req, res);
}
