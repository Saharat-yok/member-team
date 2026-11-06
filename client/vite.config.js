import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ให้ /api ผ่าน origin เดียวกับหน้าเว็บ cookie จึงเป็น same-origin ไม่ต้องตั้ง CORS และไม่ติดข้อจำกัดของ iOS
  server: { proxy: { '/api': 'http://localhost:4000' } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'] },
});
