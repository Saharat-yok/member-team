import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.js'],
    hookTimeout: 60_000, // รอบแรก mongodb-memory-server ต้องดาวน์โหลด MongoDB binary
    coverage: { include: ['src/**'], thresholds: { lines: 80 } }, // NFR-4
  },
});
