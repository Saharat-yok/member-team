import Subscription from '../models/Subscription.js';
import { config } from '../config.js';

export const getVapidKey = (_req, res) => {
  res.json({ publicKey: config.vapidPublicKey });
};

export const subscribe = async (req, res) => {
  const { endpoint, keys, tz } = req.valid.body;
  // upsert ตาม endpoint เพื่อรองรับการรีเฟรช subscription เดิมหรือสลับบัญชีบนเบราว์เซอร์เดิม
  const sub = await Subscription.findOneAndUpdate(
    { endpoint },
    { owner: req.userId, endpoint, keys, tz },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  res.status(201).json({ data: { id: sub.id, tz: sub.tz } });
};

export const unsubscribe = async (req, res) => {
  await Subscription.deleteOne({ owner: req.userId, endpoint: req.valid.body.endpoint });
  res.status(204).end();
};
