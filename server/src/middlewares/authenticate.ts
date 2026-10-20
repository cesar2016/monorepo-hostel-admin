import { Request, Response, NextFunction } from 'express';
import { adminClient, createUserClient, SupabaseUserClient } from '../lib/supabase.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import type { RolUsuario } from '@hotel/shared';

export interface AuthenticatedProfile {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  area_id: string | null;
  activo: boolean;
}

declare global {
  namespace Express {
    interface Request {
      userToken?: string;
      profile?: AuthenticatedProfile;
      supabase?: SupabaseUserClient;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Cabecera de autorización faltante o inválida');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Token no provisto');
    }

    // 1. Validar el token contra Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      throw new UnauthorizedError('Token expirado o inválido');
    }

    // 2. Cargar perfil de negocio
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, nombre, email, rol, area_id, activo')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedError('Perfil de usuario no encontrado');
    }

    if (!profile.activo) {
      throw new ForbiddenError('Su cuenta se encuentra desactivada. Contacte al administrador.', 'CUENTA_DESACTIVADA');
    }

    // 3. Adjuntar datos a la request
    req.userToken = token;
    req.profile = profile as AuthenticatedProfile;
    // Cliente de Supabase con el JWT del usuario: garantiza que aplique RLS
    req.supabase = createUserClient(token);

    next();
  } catch (error) {
    next(error);
  }
};
