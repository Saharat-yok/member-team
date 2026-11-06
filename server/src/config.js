export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtTtlSec: 7 * 24 * 60 * 60, // 7 วัน — ใช้ทั้ง JWT และ cookie ให้หมดอายุพร้อมกัน
  bcryptRounds: process.env.NODE_ENV === 'test' ? 4 : 12, // ตอนเทสต์ใช้ค่าต่ำให้เร็ว
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  isProd: process.env.NODE_ENV === 'production',
};
