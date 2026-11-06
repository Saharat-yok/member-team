// src/hooks/useSheet.js
import { useLocation, useNavigate, useSearchParams } from 'react-router';
export const withParam = (params, key, value) => {
  const next = new URLSearchParams(params);
  value ? next.set(key, value) : next.delete(key);
  return next;
};
export function useSheet() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  return {
    value: params.get('task'), // 'new' | taskId | null
    open: (v) => setParams((p) => withParam(p, 'task', v), { state: { sheet: true } }),
    close: () => {
      if (state?.sheet) navigate(-1); // เปิดจากในแอป: ย้อน history เพื่อให้ปุ่ม Back กับปุ่มปิดทำงานเหมือนกัน
      else setParams((p) => withParam(p, 'task', null), { replace: true }); // เข้ามาจาก deep link
    },
  };
}
