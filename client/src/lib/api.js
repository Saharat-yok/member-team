const TH = {
  'Invalid email or password': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'Email already registered': 'อีเมลนี้ถูกใช้แล้ว',
};

const toMessage = (status, msg) =>
  TH[msg] ??
  (status === 0 ? 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
    : status === 429 ? 'ลองบ่อยเกินไป กรุณารอสักครู่'
    : status >= 500 || !msg ? 'ระบบขัดข้อง กรุณาลองใหม่'
    : msg);

export class ApiError extends Error {
  constructor(status, body) {
    super(toMessage(status, body?.message));
    this.status = status;
    // แปลง errors จาก server ให้อยู่ในรูป { field: message } เพื่อแสดงใต้ช่องกรอกได้ตรง ๆ
    this.fieldErrors = Object.fromEntries((body?.errors ?? []).map((e) => [e.field, e.message]));
  }
}

export async function api(path, { method = 'GET', body, query, signal } = {}) {
  // ใช้ URL แบบเต็ม เพราะ fetch ของ Node (ตอนเทสต์) ใช้ path แบบ relative ไม่ได้
  const url = new URL(`/api/v1${path}`, window.location.origin);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null); // 429 จาก rate limiter ตอบกลับเป็น text
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
