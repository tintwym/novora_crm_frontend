import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);

  if (!user || !tokens) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
