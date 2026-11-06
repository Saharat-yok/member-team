// store เล็ก ๆ ไม่ต้องลงไลบรารี
const listeners = new Set();
let current = null;
let timer;

const emit = () => listeners.forEach((l) => l());
export const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));
export const getToast = () => current;

export function toast(msg) {
  current = msg;
  clearTimeout(timer);
  timer = setTimeout(() => { current = null; emit(); }, 3000);
  emit();
}
