-- =============================================================================
-- Datos iniciales (catálogos). Se ejecuta con `supabase db reset`.
-- El primer Super Admin se crea con el script del backend (Etapa 3); ver README.
-- =============================================================================

insert into public.areas (nombre, descripcion) values
  ('Cocina',          'Comestibles y mercadería varia'),
  ('Housekeeping',    'Servicio de cuarto: blancos, amenities y limpieza'),
  ('Administración',  'Librería y tecnología'),
  ('Mantenimiento',   'Materiales para refacciones y herramientas')
on conflict do nothing;

insert into public.unidades_medida (codigo, nombre, permite_decimales) values
  ('un',   'Unidades',    false),
  ('kg',   'Kilogramos',  true),
  ('g',    'Gramos',      true),
  ('l',    'Litros',      true),
  ('ml',   'Mililitros',  true),
  ('m',    'Metros',      true),
  ('caja', 'Cajas',       false),
  ('paq',  'Paquetes',    false),
  ('rollo','Rollos',      false),
  ('par',  'Pares',       false)
on conflict do nothing;
