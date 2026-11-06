import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

const cookieBase = { httpOnly: true, secure: config.isProd, sameSite: 'lax', path: '/' };

const sendSession = (res, status, user) => {
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtTtlSec });
  res.cookie('token', token, { ...cookieBase, maxAge: config.jwtTtlSec * 1000 });
  res.status(status).json({ user });
};

export const register = async (req, res) => {
  const { email } = req.valid.body;
  if (await User.exists({ email })) throw new AppError(409, 'Email already registered');
  const user = await User.create(req.valid.body); // unique index กัน race condition อีกชั้น
  sendSession(res, 201, user);
};

export const login = async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Invalid email or password'); // ไม่บอกว่าผิดที่ช่องไหน
  }
  sendSession(res, 200, user);
};

export const logout = (_req, res) => {
  res.clearCookie('token', cookieBase).status(204).end();
};

export const me = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(401, 'User not found');
  res.json({ user });
};
