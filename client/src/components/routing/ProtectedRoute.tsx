import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { FullPageSpinner } from '../ui/Spinner';

export const ProtectedRoute: React.FC = () => {
  const { session, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner label="Verificando sesión..." />;
  }

  if (!session || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
