import type { RolUsuario } from '@hotel/shared';

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  area_id: string | null;
  area_nombre?: string | null;
  activo: boolean;
}

export interface AreaOption {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activa: boolean;
}
