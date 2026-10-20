import { z } from 'zod';

export const createProveedorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(150, { message: 'El nombre no puede superar los 150 caracteres' }),
  cuit: z
    .string()
    .trim()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val === '' || val.length === 11, {
      message: 'El CUIT debe tener 11 dígitos numéricos',
    })
    .optional()
    .nullable(),
  contacto: z
    .string()
    .trim()
    .max(150, { message: 'El contacto no puede superar los 150 caracteres' })
    .optional()
    .nullable(),
  telefono: z
    .string()
    .trim()
    .max(40, { message: 'El teléfono no puede superar los 40 caracteres' })
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email({ message: 'El email de contacto no es válido' })
    .max(150, { message: 'El email no puede superar los 150 caracteres' })
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type CreateProveedorInput = z.infer<typeof createProveedorSchema>;

export const updateProveedorSchema = createProveedorSchema.partial().extend({
  activo: z.boolean().optional(),
});

export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>;
