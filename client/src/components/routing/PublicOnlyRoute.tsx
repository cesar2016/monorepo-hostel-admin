import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { FullPageSpinner } from '../ui/Spinner';

export const PublicOnlyRoute: React.FC = () => {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner label="Cargando..." />;
  }

  if (session && profile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
