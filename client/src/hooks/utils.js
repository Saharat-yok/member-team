import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useInfiniteScroll(onVisible) {
  const ref = useRef(null);
  const cb = useRef(onVisible);
  useLayoutEffect(() => { cb.current = onVisible; });
  useEffect(() => {
    // rootMargin 400px: เริ่มโหลดหน้าถัดไปก่อนผู้ใช้เลื่อนถึงท้ายรายการ
    const io = new IntersectionObserver(([e]) => e.isIntersecting && cb.current(), { rootMargin: '400px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return ref;
}
