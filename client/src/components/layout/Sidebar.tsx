import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  History,
  Truck,
  Building2,
  Users,
  ShieldCheck,
  X,
  Hotel,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isSuperAdmin } = useAuth();

  const mainNavigation: NavItem[] = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Productos', to: '/productos', icon: Package },
    { name: 'Ingresos', to: '/ingresos', icon: ArrowDownToLine },
    { name: 'Egresos', to: '/egresos', icon: ArrowUpFromLine },
    { name: 'Stock Actual', to: '/stock', icon: Layers },
    { name: 'Historial', to: '/movimientos', icon: History },
    { name: 'Proveedores', to: '/proveedores', icon: Truck },
  ];

  const adminNavigation: NavItem[] = [
    { name: 'Áreas', to: '/admin/areas', icon: Building2, superAdminOnly: true },
    { name: 'Usuarios', to: '/admin/usuarios', icon: Users, superAdminOnly: true },
    { name: 'Auditoría', to: '/admin/auditoria', icon: ShieldCheck, superAdminOnly: true },
  ];

  const filteredAdminNav = adminNavigation.filter((item) => !item.superAdminOnly || isSuperAdmin);

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Contenedor del Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-100 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 border-r border-slate-800 shadow-xl lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Encabezado del Hotel */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/50">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white leading-tight">Hotel Stock</h1>
              <p className="text-[11px] text-slate-400 font-medium">Gestión de Inventario</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de Navegación */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Operaciones
            </p>
            <nav className="space-y-1">
              {mainNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {filteredAdminNav.length > 0 && (
            <div>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Sistema & Control
              </p>
              <nav className="space-y-1">
                {filteredAdminNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Footer del Sidebar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-center">
          <p className="text-[11px] text-slate-400">
            Hotel Inventarios &bull; v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
};
