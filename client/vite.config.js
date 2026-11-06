import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Task Manager',
        short_name: 'Tasks',
        description: 'จัดการงานประจำวันแบบใช้งานออฟไลน์ได้',
        lang: 'th',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#4f46e5',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // แยกไลบรารีหลักออกจากโค้ดหน้าเว็บ เพื่อให้แคชอยู่ได้นานและลดขนาด initial bundle
        // (Vite 8 ใช้ rolldown จึงกำหนดผ่าน codeSplitting.groups แทน manualChunks)
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/, priority: 30 },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/, priority: 20 },
            { name: 'dnd', test: /node_modules[\\/]@dnd-kit[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  // ให้ /api ผ่าน origin เดียวกับหน้าเว็บ cookie จึงเป็น same-origin ไม่ต้องตั้ง CORS และไม่ติดข้อจำกัดของ iOS
  server: { proxy: { '/api': 'http://localhost:4000' } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'] },
});
