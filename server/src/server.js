import mongoose from 'mongoose';
import app from './app.js';
import { connectDb } from './db.js';
import { config } from './config.js';
import { startPushScheduler } from './jobs/pushScheduler.js';

if (!config.mongoUri || !config.jwtSecret) {
  console.error('Missing MONGO_URI or JWT_SECRET');
  process.exit(1);
}

await connectDb();
const server = app.listen(config.port, () => console.log(`API ready → http://localhost:${config.port}`));

const stopScheduler = startPushScheduler();

process.on('SIGTERM', () => { // graceful shutdown
  stopScheduler();
  server.close(() => mongoose.disconnect());
});
