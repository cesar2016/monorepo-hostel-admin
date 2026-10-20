-- =============================================================================
-- 0005 · Vistas de stock y movimientos
-- =============================================================================
-- security_invoker = true: las vistas respetan la RLS del usuario que consulta.

-- Stock actual por producto (calculado: Σ ingresos − Σ egresos).
create view public.v_stock
with (security_invoker = true)
as
select
  p.id                                  as producto_id,
  p.area_id,
  a.nombre                              as area_nombre,
  p.nombre,
  p.nombre                              as producto_nombre,
  p.sku,
  p.unidad_id,
  u.codigo                              as unidad_codigo,
  u.nombre                              as unidad_nombre,
  p.stock_minimo,
  p.activo,
  coalesce(i.total, 0)                  as total_ingresado,
  coalesce(e.total, 0)                  as total_egresado,
  coalesce(i.total, 0) - coalesce(e.total, 0) as stock_actual,
  -- Alerta: el stock llegó al mínimo o está por debajo (solo si se definió un mínimo).
  (p.stock_minimo > 0 and coalesce(i.total, 0) - coalesce(e.total, 0) <= p.stock_minimo) as bajo_minimo,
  greatest(i.ultimo, e.ultimo)          as ultimo_movimiento
from public.productos p
join public.areas a           on a.id = p.area_id
join public.unidades_medida u on u.id = p.unidad_id
left join lateral (
  select sum(ii.cantidad) as total, max(ing.fecha) as ultimo
  from public.ingreso_items ii
  join public.ingresos ing on ing.id = ii.ingreso_id
  where ii.producto_id = p.id
) i on true
left join lateral (
  select sum(eg.cantidad) as total, max(eg.fecha) as ultimo
  from public.egresos eg
  where eg.producto_id = p.id
) e on true;

comment on view public.v_stock is 'Stock actual por producto con alerta de stock mínimo.';

-- Historial unificado de movimientos (una fila por producto movido).
create view public.v_movimientos
with (security_invoker = true)
as
select
  'ingreso'::text      as tipo,
  ii.id                as id,             -- id de la línea (ingreso_items.id)
  ing.id               as movimiento_id,  -- id del documento (ingresos.id)
  ing.area_id,
  a.nombre             as area_nombre,
  ing.fecha,
  ii.producto_id,
  p.nombre             as producto_nombre,
  p.sku,
  u.codigo             as unidad_codigo,
  ii.cantidad,
  ii.costo_unitario,
  ing.nro_factura,
  ing.proveedor_id,
  pr.nombre            as proveedor_nombre,
  null::text           as motivo,
  ing.observaciones,
  ing.created_by,
  cb.nombre            as created_by_nombre,
  ing.created_at,
  greatest(ing.updated_at, ii.updated_at) as updated_at
from public.ingreso_items ii
join public.ingresos ing      on ing.id = ii.ingreso_id
join public.areas a           on a.id = ing.area_id
join public.productos p       on p.id = ii.producto_id
join public.unidades_medida u on u.id = p.unidad_id
join public.proveedores pr    on pr.id = ing.proveedor_id
left join public.profiles cb  on cb.id = ing.created_by
union all
select
  'egreso'::text,
  eg.id,
  eg.id,
  eg.area_id,
  a.nombre,
  eg.fecha,
  eg.producto_id,
  p.nombre,
  p.sku,
  u.codigo,
  eg.cantidad,
  null::numeric,
  null::text,
  null::uuid,
  null::text,
  eg.motivo,
  null::text,
  eg.created_by,
  cb.nombre,
  eg.created_at,
  eg.updated_at
from public.egresos eg
join public.areas a           on a.id = eg.area_id
join public.productos p       on p.id = eg.producto_id
join public.unidades_medida u on u.id = p.unidad_id
left join public.profiles cb  on cb.id = eg.created_by;

comment on view public.v_movimientos is 'Ingresos y egresos unificados para historial y exportación.';
