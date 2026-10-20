import { z } from 'zod';

export const createAreaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(80, { message: 'El nombre no puede superar los 80 caracteres' }),
  descripcion: z
    .string()
    .trim()
    .max(500, { message: 'La descripción no puede superar los 500 caracteres' })
    .optional()
    .nullable(),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;

export const updateAreaSchema = createAreaSchema.partial().extend({
  activa: z.boolean().optional(),
});

export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
