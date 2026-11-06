// src/routes.jsx
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useRouteError } from 'react-router';
import { useMe } from './hooks/useAuth.js';
import { Button, Spinner } from './components/ui.jsx';
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const AppLayout = lazy(() => import('./components/AppLayout.jsx'));
const TasksPage = lazy(() => import('./pages/TasksPage.jsx'));
const BoardPage = lazy(() => import('./pages/BoardPage.jsx')); // dnd-kit ถูกโหลดเฉพาะเมื่อเปิดหน้านี้
const DuePage = lazy(() => import('./pages/DuePage.jsx'));
// แสดงแทนหน้า error ดิบของ React Router เช่น โหลดไฟล์หน้า (lazy chunk) ไม่ได้เพราะออฟไลน์หรือหลัง deploy เวอร์ชันใหม่
export function RouteError() {
  useRouteError(); // ให้ router รู้ว่าเรารับมือ error นี้แล้ว
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  return (
    <main role="alert" className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">โหลดหน้านี้ไม่สำเร็จ</h1>
      <p className="text-slate-600">
        {offline ? 'ดูเหมือนคุณออฟไลน์อยู่ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่' : 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่'}
      </p>
      <Button type="button" onClick={() => window.location.reload()}>โหลดใหม่</Button>
    </main>
  );
}

function Gate({ requireUser }) {
  const { data: user, isPending } = useMe();
  if (isPending) return <Spinner full />;
  if (requireUser && !user) return <Navigate to="/login" replace />;
  if (!requireUser && user) return <Navigate to="/" replace />;
  return <Suspense fallback={<Spinner full />}><Outlet /></Suspense>;
}
export const routes = [
  {
    errorElement: <RouteError />,
    children: [
      { element: <Gate requireUser={false} />, children: [{ path: '/login', element: <AuthPage /> }] },
      {
        element: <Gate requireUser />,
        children: [{
          path: '/',
          element: <AppLayout />,
          children: [
            { index: true, element: <TasksPage /> },
            { path: 'board', element: <BoardPage /> },
            { path: 'due', element: <DuePage /> },
          ],
        }],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
