import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';

if (!config.mongoUri || !config.jwtSecret) {
  console.error('Missing MONGO_URI or JWT_SECRET');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
const server = app.listen(config.port, () => console.log(`API ready → http://localhost:${config.port}`));

process.on('SIGTERM', () => server.close(() => mongoose.disconnect())); // graceful shutdown
