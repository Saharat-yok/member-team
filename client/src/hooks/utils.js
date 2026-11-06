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

export function useSwipeDown(targetRef, onDismiss, threshold = 120) {
  const start = useRef(null);
  const move = (dy) => { targetRef.current.style.transform = dy ? `translateY(${dy}px)` : ''; };
  const end = (e) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const speed = dy / Math.max(1, e.timeStamp - start.current.t); // px/ms
    start.current = null;
    targetRef.current.style.transition = 'transform 200ms ease-out';
    if (e.type === 'pointerup' && (dy > threshold || (dy > 30 && speed > 0.6))) onDismiss();
    else move(0); // ปัดไม่ถึงเกณฑ์: เด้งกลับที่เดิม
  };
  return {
    style: { touchAction: 'none' },
    onPointerDown: (e) => {
      start.current = { y: e.clientY, t: e.timeStamp };
      targetRef.current.style.transition = 'none';
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e) => start.current && move(Math.max(0, e.clientY - start.current.y)),
    onPointerUp: end,
    onPointerCancel: end,
  };
}
