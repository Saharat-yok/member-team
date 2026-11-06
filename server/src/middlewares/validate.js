// Express 5: req.query เป็น read-only → เก็บข้อมูลที่ผ่าน Zod แล้วไว้ที่ req.valid
export const validate = (schemas) => (req, _res, next) => {
  req.valid ??= {};
  for (const [part, schema] of Object.entries(schemas)) {
    req.valid[part] = schema.parse(req[part]); // ไม่ผ่าน → ZodError → 400
  }
  next();
};
