import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

export const requireAuth = (req, _res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new AppError(401, 'Authentication required');
  try {
    req.userId = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }).sub;
  } catch {
    throw new AppError(401, 'Invalid or expired session');
  }
  next();
};
