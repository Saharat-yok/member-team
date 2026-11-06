import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useMe } from './hooks/useAuth.js';
import { Spinner } from './components/ui.jsx';

// แยก bundle ตาม route ผู้ใช้ที่ยังไม่ login จะได้ไม่ต้องโหลดโค้ดหน้ารายการงาน
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const TasksPage = lazy(() => import('./pages/TasksPage.jsx'));

function Gate({ requireUser }) {
  const { data: user, isPending } = useMe();
  if (isPending) return <Spinner full />;
  if (requireUser && !user) return <Navigate to="/login" replace />;
  if (!requireUser && user) return <Navigate to="/" replace />;
  return <Suspense fallback={<Spinner full />}><Outlet /></Suspense>;
}

export const routes = [
  { element: <Gate requireUser={false} />, children: [{ path: '/login', element: <AuthPage /> }] },
  { element: <Gate requireUser />, children: [{ path: '/', element: <TasksPage /> }] },
  { path: '*', element: <Navigate to="/" replace /> },
];
