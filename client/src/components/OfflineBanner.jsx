import { useEffect, useState } from 'react';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { KEY } from '../hooks/useTasks.js';

export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const pending = useIsMutating({ mutationKey: KEY });
  const qc = useQueryClient();

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      // เมื่อกลับมาออนไลน์ ให้ส่ง mutation ที่ค้างอยู่และดึงข้อมูลล่าสุด
      qc.resumePausedMutations().then(() => qc.invalidateQueries({ queryKey: KEY }));
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [qc]);

  if (online) return null;

  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
      โหมดออฟไลน์ — การแก้ไขจะถูกส่งเมื่อกลับมาออนไลน์ {pending > 0 && `(รอส่ง ${pending} รายการ)`}
    </div>
  );
}
