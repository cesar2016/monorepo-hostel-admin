import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors.js';
import { ROLES, RolUsuario } from '@hotel/shared';

export const requireRole = (...allowedRoles: RolUsuario[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.profile) {
      next(new ForbiddenError('Usuario no autenticado'));
      return;
    }

    if (!allowedRoles.includes(req.profile.rol)) {
      next(new ForbiddenError(`Acceso denegado para el rol ${req.profile.rol}`));
      return;
    }

    next();
  };
};

/**
 * Resuelve el area_id efectivo:
 * - Para un ENCARGADO, SIEMPRE devuelve su propia área (ignora cualquier parámetro de consulta).
 * - Para ADMIN o SUPER_ADMIN, devuelve el área solicitada en query/params o null si no se especificó (filtro global).
 */
export const getEffectiveAreaId = (req: Request): string | null => {
  if (!req.profile) return null;

  if (req.profile.rol === ROLES.ENCARGADO) {
    return req.profile.area_id;
  }

  const queryArea = (req.query.areaId || req.params.areaId || req.body?.area_id) as string | undefined;
  return queryArea || null;
};
