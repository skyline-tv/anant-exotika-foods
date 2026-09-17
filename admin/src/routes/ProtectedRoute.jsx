import { Navigate, Outlet } from 'react-router-dom';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader full label="Checking admin session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
