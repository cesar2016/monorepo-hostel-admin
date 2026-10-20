import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { PublicOnlyRoute } from './components/routing/PublicOnlyRoute';
import { RoleGuard } from './components/routing/RoleGuard';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { RecoverPasswordPage } from './pages/auth/RecoverPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Módulos Operativos (Etapa 5)
import { ProductosPage } from './pages/modules/productos/ProductosPage';
import { IngresosPage } from './pages/modules/ingresos/IngresosPage';
import { EgresosPage } from './pages/modules/egresos/EgresosPage';
import { StockPage } from './pages/modules/stock/StockPage';
import { MovimientosPage } from './pages/modules/movimientos/MovimientosPage';
import { ProveedoresPage } from './pages/modules/proveedores/ProveedoresPage';

// Administración (Etapa 6)
import { AreasPage } from './pages/admin/AreasPage';
import { UsuariosPage } from './pages/admin/UsuariosPage';
import { AuditoriaPage } from './pages/admin/AuditoriaPage';

import { UnauthorizedPage } from './pages/common/UnauthorizedPage';
import { NotFoundPage } from './pages/common/NotFoundPage';
import { ROLES } from '@hotel/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 segundos
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas públicas (solo si no está logueado) */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/recuperar-contrasena" element={<RecoverPasswordPage />} />
              <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
            </Route>

            {/* Rutas protegidas (requieren login) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/productos" element={<ProductosPage />} />
                <Route path="/ingresos" element={<IngresosPage />} />
                <Route path="/egresos" element={<EgresosPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/movimientos" element={<MovimientosPage />} />
                <Route path="/proveedores" element={<ProveedoresPage />} />

                {/* Sub-rutas solo para Super Admin */}
                <Route element={<RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />}>
                  <Route path="/admin/areas" element={<AreasPage />} />
                  <Route path="/admin/usuarios" element={<UsuariosPage />} />
                  <Route path="/admin/auditoria" element={<AuditoriaPage />} />
                </Route>
              </Route>
            </Route>

            {/* Páginas de estado */}
            <Route path="/sin-autorizacion" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
