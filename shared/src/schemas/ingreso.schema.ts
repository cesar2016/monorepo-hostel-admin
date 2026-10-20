import { z } from 'zod';

export const ingresoItemSchema = z.object({
  producto_id: z.string().uuid({ message: 'El ID de producto no es válido' }),
  cantidad: z.coerce.number().positive({ message: 'La cantidad debe ser mayor a 0' }),
  costo_unitario: z.coerce.number().min(0, { message: 'El costo unitario debe ser mayor o igual a 0' }),
});

export type IngresoItemInput = z.infer<typeof ingresoItemSchema>;

export const createIngresoSchema = z.object({
  proveedor_id: z.string().uuid({ message: 'Debe seleccionar un proveedor válido' }),
  nro_factura: z
    .string()
    .trim()
    .min(1, { message: 'El número de factura es obligatorio' })
    .max(50, { message: 'El número de factura no puede superar los 50 caracteres' }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato AAAA-MM-DD' }),
  observaciones: z
    .string()
    .trim()
    .max(1000, { message: 'Las observaciones no pueden superar los 1000 caracteres' })
    .optional()
    .nullable()
    .or(z.literal('')),
  items: z
    .array(ingresoItemSchema)
    .min(1, { message: 'Debe agregar al menos un producto al ingreso' })
    .refine(
      (items) => {
        const ids = items.map((i) => i.producto_id);
        return new Set(ids).size === ids.length;
      },
      { message: 'No puede haber productos repetidos en el mismo ingreso' }
    ),
});

export type CreateIngresoInput = z.infer<typeof createIngresoSchema>;

export const updateIngresoSchema = createIngresoSchema;
export type UpdateIngresoInput = z.infer<typeof updateIngresoSchema>;
