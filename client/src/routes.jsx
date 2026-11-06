// src/routes.jsx
import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useMe } from './hooks/useAuth.js';
import { Spinner } from './components/ui.jsx';
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const AppLayout = lazy(() => import('./components/AppLayout.jsx'));
const TasksPage = lazy(() => import('./pages/TasksPage.jsx'));
const BoardPage = lazy(() => import('./pages/BoardPage.jsx')); // dnd-kit ถูกโหลดเฉพาะเมื่อเปิดหน้านี้
const DuePage = lazy(() => import('./pages/DuePage.jsx'));
function Gate({ requireUser }) {
  const { data: user, isPending } = useMe();
  if (isPending) return <Spinner full />;
  if (requireUser && !user) return <Navigate to="/login" replace />;
  if (!requireUser && user) return <Navigate to="/" replace />;
  return <Suspense fallback={<Spinner full />}><Outlet /></Suspense>;
}
export const routes = [
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
];
