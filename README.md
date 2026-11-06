# Task Manager (member-team)

เว็บแอปจัดการงานแบบ mobile-first (MERN) ติดตั้งเป็นแอป (PWA) ใช้งานออฟไลน์ได้ และแจ้งเตือนงานใกล้ครบกำหนดผ่าน Web Push

- `server/` Express 5 + Mongoose REST API
- `client/` React 19 + Vite + Tailwind 4 + TanStack Query (PWA)
- `shared/` ค่าคงที่และ Zod schema ที่ใช้ร่วมกัน (`@task-manager/shared`)
- `api/` Vercel Function ที่ห่อ Express app ไว้สำหรับ deploy บน Vercel

## รันในเครื่อง

ต้องมี Node 22 และ MongoDB (เช่น `mongodb://127.0.0.1:27017`)

```bash
npm ci
cp server/.env.example server/.env   # แล้วแก้ MONGO_URI และ JWT_SECRET
npm run dev -w server                # API ที่ http://localhost:4000
npm run dev -w client -- --host      # เว็บที่ http://localhost:5173 (proxy /api ไป :4000)
```

ทดสอบ: `npm test` (ไม่ต้องมี MongoDB เพราะใช้แบบในหน่วยความจำ)

## ตัวแปร environment

| ตัวแปร | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| `MONGO_URI` | connection string ของ MongoDB | จำเป็น |
| `JWT_SECRET` | เซ็น session | จำเป็น สร้างด้วย `openssl rand -hex 32` |
| `CLIENT_URL` | origin ของหน้าเว็บ (CORS) | เช่น `https://xxx.vercel.app` ไม่มี `/` ท้าย |
| `NODE_ENV` | ตั้งเป็น `production` | ทำให้ cookie เป็น `Secure` และเปิด rate limit เต็ม |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | คีย์ Web Push | สร้างด้วย `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | อีเมลติดต่อ `mailto:you@example.com` | push service ใช้ติดต่อเมื่อมีปัญหา |
| `CRON_SECRET` | ป้องกัน `/api/v1/cron/push` | สร้างด้วย `openssl rand -hex 32` |

ห้าม commit ค่าเหล่านี้ (`server/.env` ถูก `.gitignore` ไว้แล้ว)

## Deploy บน Vercel (แพ็กเกจฟรี)

หน้าเว็บและ API อยู่โปรเจกต์ Vercel เดียวกัน จึงเป็น origin เดียวกัน ไม่ต้องตั้ง CORS หรือ proxy และ cookie ทำงานบน iOS ได้

### 1. เตรียม MongoDB Atlas
1. สมัคร https://www.mongodb.com/atlas สร้าง cluster ฟรี (M0)
2. Database Access → สร้าง user ที่มีรหัสผ่านแข็งแรง
3. Network Access → อนุญาต `0.0.0.0/0` (Vercel ไม่มี IP คงที่ในแพ็กเกจฟรี จึงต้องพึ่งรหัสผ่านที่แข็งแรง)
4. Connect → Drivers → คัดลอก connection string แล้วใส่ชื่อ database ต่อท้าย เช่น `.../task-manager?retryWrites=true&w=majority`

### 2. สร้างโปรเจกต์บน Vercel
1. Import repository นี้ที่ https://vercel.com/new
2. **Root Directory = รากของ repo** (ไม่ใช่ `client`) Framework Preset = Other
   ค่า install/build/output ถูกกำหนดไว้ใน `vercel.json` แล้ว
3. Settings → Environment Variables ใส่ตัวแปรตามตารางด้านบนทั้งหมด (ใส่ให้ Production)
   `CLIENT_URL` ใส่เป็นโดเมนที่ Vercel ให้ (ดูได้หลัง deploy ครั้งแรก แล้วแก้ค่าและ Redeploy)
4. Deploy

### 3. ตรวจหลัง deploy
- เปิด `https://<โดเมน>/api/health` ควรได้ `{"status":"ok","db":"up"}`
- สมัครสมาชิก สร้างงาน และลองออกจากระบบ/เข้าสู่ระบบ
- ถ้าได้ 503 `Service unavailable` แปลว่า `MONGO_URI`/`JWT_SECRET` ไม่ถูกตั้ง หรือ Atlas บล็อก IP

### 4. ทดสอบบนมือถือ
- **iPhone (iOS 16.4+):** Share → "เพิ่มไปยังหน้าจอโฮม" แล้วเปิดจากไอคอน จึงจะขอสิทธิ์แจ้งเตือนได้
- **Android:** ติดตั้งแอปจาก Chrome แล้วลองเปิดโหมดเครื่องบิน
- หน้า "ใกล้ครบกำหนด" → ปุ่ม "เปิดการแจ้งเตือน"

### ข้อจำกัดของแพ็กเกจฟรี
- **แจ้งเตือนวันละครั้ง:** Vercel Cron ฟรีรันได้วันละครั้ง ตั้งไว้ 01:00 UTC (~08:00 เวลาไทย แต่เวลาจริงอาจเลื่อนภายในชั่วโมงนั้น) ผู้ใช้ทุกคนได้รับแจ้งเตือนเวลาเดียวกัน
- **Cold start:** คำขอแรกหลังไม่มีคนใช้สักพักจะช้าลงเล็กน้อย
- **Rate limit** (`express-rate-limit`) เก็บในหน่วยความจำของแต่ละ instance จึงจำกัดได้ไม่เข้มงวดบน serverless ถ้าต้องการจริงจังให้ใช้ store ภายนอก (เช่น Redis)
- แพ็กเกจ Hobby ของ Vercel ใช้กับโปรเจกต์ที่ไม่ใช่เชิงพาณิชย์เท่านั้น
- ถ้าต้องการแจ้งเตือนหลายครั้งต่อวันหรือตามเวลาของแต่ละคน ให้ย้ายตัวตั้งเวลาไปรันบนเซิร์ฟเวอร์ที่เปิดตลอด (`server/src/jobs/pushScheduler.js` มี `startPushScheduler` พร้อมใช้ และ `server/src/server.js` เรียกให้อยู่แล้ว)

## โครงสร้างการ deploy

```
เบราว์เซอร์ ──► Vercel (โดเมนเดียว)
                ├─ ไฟล์ static: client/dist (PWA + Service Worker)
                ├─ /api/*  → api/[...path].js → Express app → MongoDB Atlas
                └─ Cron วันละครั้ง → /api/v1/cron/push → Web Push
```
