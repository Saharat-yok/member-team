import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { config } from './config.js';
import { errorHandler, notFound } from './middlewares/error.js';

const app = express();

if (config.isProd) app.set('trust proxy', 1); // อยู่หลัง proxy ของ Render/Railway → ได้ IP จริง
app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(compression()); // gzip → ประหยัดดาต้ามือถือ
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({ status: dbReady ? 'ok' : 'degraded', db: dbReady ? 'up' : 'down' });
});
app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

export default app;
