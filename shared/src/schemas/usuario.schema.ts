import { z } from 'zod';
import { ROLES, RolUsuario } from '../constants/index.js';

export const createUsuarioSchema = z
  .object({
    email: z.string().trim().email({ message: 'El correo electrónico no es válido' }),
    password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    nombre: z
      .string()
      .trim()
      .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
      .max(120, { message: 'El nombre no puede superar los 120 caracteres' }),
    rol: z.enum([ROLES.ENCARGADO, ROLES.ADMIN, ROLES.SUPER_ADMIN], {
      errorMap: () => ({ message: 'Rol inválido' }),
    }),
    area_id: z.string().uuid({ message: 'El área debe ser un UUID válido' }).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.rol === ROLES.ENCARGADO) {
        return !!data.area_id;
      }
      return true;
    },
    {
      message: 'El rol encargado requiere tener un área asignada',
      path: ['area_id'],
    }
  );

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export const updateUsuarioSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
      .max(120, { message: 'El nombre no puede superar los 120 caracteres' })
      .optional(),
    rol: z.enum([ROLES.ENCARGADO, ROLES.ADMIN, ROLES.SUPER_ADMIN]).optional(),
    area_id: z.string().uuid().optional().nullable(),
    activo: z.boolean().optional(),
    password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.rol === ROLES.ENCARGADO && data.area_id === null) {
        return false;
      }
      return true;
    },
    {
      message: 'El rol encargado no puede quedar sin área',
      path: ['area_id'],
    }
  );

export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
