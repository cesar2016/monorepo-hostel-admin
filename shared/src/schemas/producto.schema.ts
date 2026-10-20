import { z } from 'zod';

export const createProductoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(150, { message: 'El nombre no puede superar los 150 caracteres' }),
  sku: z
    .string()
    .trim()
    .max(50, { message: 'El código SKU no puede superar los 50 caracteres' })
    .optional()
    .nullable()
    .or(z.literal('')),
  unidad_id: z.coerce.number().int().positive({ message: 'Debe seleccionar una unidad de medida válida' }),
  stock_minimo: z.coerce.number().min(0, { message: 'El stock mínimo debe ser mayor o igual a 0' }).default(0),
});

export type CreateProductoInput = z.infer<typeof createProductoSchema>;

export const updateProductoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(150, { message: 'El nombre no puede superar los 150 caracteres' })
    .optional(),
  sku: z
    .string()
    .trim()
    .max(50, { message: 'El código SKU no puede superar los 50 caracteres' })
    .optional()
    .nullable()
    .or(z.literal('')),
  unidad_id: z.coerce.number().int().positive().optional(),
  stock_minimo: z.coerce.number().min(0).optional(),
  activo: z.boolean().optional(),
});

export type UpdateProductoInput = z.infer<typeof updateProductoSchema>;
