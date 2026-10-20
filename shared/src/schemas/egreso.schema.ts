import { z } from 'zod';

export const createEgresoSchema = z.object({
  producto_id: z.string().uuid({ message: 'Debe seleccionar un producto válido' }),
  cantidad: z.coerce.number().positive({ message: 'La cantidad debe ser mayor a 0' }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato AAAA-MM-DD' }),
  motivo: z
    .string()
    .trim()
    .min(3, { message: 'El motivo debe tener al menos 3 caracteres' })
    .max(500, { message: 'El motivo no puede superar los 500 caracteres' }),
});

export type CreateEgresoInput = z.infer<typeof createEgresoSchema>;

export const updateEgresoSchema = createEgresoSchema;
export type UpdateEgresoInput = z.infer<typeof updateEgresoSchema>;
