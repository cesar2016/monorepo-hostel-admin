import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import type { RolUsuario } from '@hotel/shared';
import { FullPageSpinner } from '../ui/Spinner';

interface RoleGuardProps {
  allowedRoles: RolUsuario[];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageSpinner label="Verificando permisos..." />;
  }

  if (!profile || !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/sin-autorizacion" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
