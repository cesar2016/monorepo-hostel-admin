export const ROLES = {
  ENCARGADO: 'encargado',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES];

export const TIPOS_MOVIMIENTO = {
  INGRESO: 'ingreso',
  EGRESO: 'egreso',
} as const;

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[keyof typeof TIPOS_MOVIMIENTO];

export const FORMATOS_EXPORT = {
  CSV: 'csv',
  XLSX: 'xlsx',
} as const;

export type FormatoExport = (typeof FORMATOS_EXPORT)[keyof typeof FORMATOS_EXPORT];
