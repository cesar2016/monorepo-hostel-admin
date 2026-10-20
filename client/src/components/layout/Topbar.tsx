import React, { useState } from 'react';
import { Menu, LogOut, Building, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AreaOption } from '../../types/auth';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenSidebar }) => {
  const {
    profile,
    logout,
    isEncargado,
    isAdmin,
    isSuperAdmin,
    selectedAreaId,
    setSelectedAreaId,
  } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Cargar áreas para el selector de admin
  const { data: areas = [] } = useQuery<AreaOption[]>({
    queryKey: ['areas'],
    queryFn: () => api.get<AreaOption[]>('/areas'),
    staleTime: 1000 * 60 * 5, // 5 min
    enabled: isAdmin || isSuperAdmin,
  });

  const roleBadgeConfig = {
    super_admin: { label: 'Super Admin', variant: 'purple' as const },
    admin: { label: 'Admin (Lectura)', variant: 'info' as const },
    encargado: { label: 'Encargado de Área', variant: 'success' as const },
  };

  const currentRoleConfig = profile?.rol
    ? roleBadgeConfig[profile.rol]
    : { label: 'Usuario', variant: 'default' as const };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur shadow-sm">
      <div className="flex items-center gap-3">
        {/* Botón hamburguesa móvil */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Indicador o Selector de Área */}
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-slate-400 hidden sm:inline-block" />

          {isEncargado ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Área Asignada:
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {profile?.area_nombre || 'Mi Área'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:inline-block">
                Filtrar por Área:
              </span>
              <select
                value={selectedAreaId || ''}
                onChange={(e) => setSelectedAreaId(e.target.value || null)}
                className="h-8 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              >
                <option value="">Todas las áreas (Global)</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Controles de Usuario & Perfil */}
      <div className="flex items-center gap-3">
        <Badge variant={currentRoleConfig.variant} className="hidden sm:inline-flex">
          {currentRoleConfig.label}
        </Badge>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-300 font-semibold text-xs">
              {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">
                {profile?.nombre || 'Usuario'}
              </p>
              <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                {profile?.email}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {/* Menú desplegable */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-40">
                <div className="px-4 py-2 border-b border-slate-100 md:hidden">
                  <p className="text-xs font-semibold text-slate-800">{profile?.nombre}</p>
                  <p className="text-[11px] text-slate-500">{profile?.email}</p>
                  <div className="mt-1">
                    <Badge variant={currentRoleConfig.variant}>
                      {currentRoleConfig.label}
                    </Badge>
                  </div>
                </div>

                <div className="px-1 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
