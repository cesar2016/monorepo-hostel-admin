import { z } from 'zod';
import { FORMATOS_EXPORT, TIPOS_MOVIMIENTO } from '../constants/index.js';

export const movimientosFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  productoId: z.string().uuid().optional(),
  tipo: z.enum([TIPOS_MOVIMIENTO.INGRESO, TIPOS_MOVIMIENTO.EGRESO]).optional(),
  areaId: z.string().uuid().optional(),
  nroFactura: z.string().trim().optional(),
  q: z.string().trim().optional(),
});

export type MovimientosFilterInput = z.infer<typeof movimientosFilterSchema>;

export const exportMovimientosSchema = movimientosFilterSchema.omit({ page: true, pageSize: true }).extend({
  formato: z.enum([FORMATOS_EXPORT.CSV, FORMATOS_EXPORT.XLSX]).default(FORMATOS_EXPORT.XLSX),
});

export type ExportMovimientosInput = z.infer<typeof exportMovimientosSchema>;

export const stockFilterSchema = z.object({
  areaId: z.string().uuid().optional(),
  soloBajoMinimo: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  q: z.string().trim().optional(),
});

export type StockFilterInput = z.infer<typeof stockFilterSchema>;
