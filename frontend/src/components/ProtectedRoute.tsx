import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
