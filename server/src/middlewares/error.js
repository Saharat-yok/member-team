import mongoose from 'mongoose';
import { ZodError } from 'zod';

export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// ต้องมีครบ 4 พารามิเตอร์ Express จึงจะนับเป็น error handler
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate value' });

  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status < 500 ? err.message : 'Internal server error' });
};
