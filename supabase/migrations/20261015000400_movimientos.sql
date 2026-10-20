-- =============================================================================
-- 0004 · Movimientos: ingresos (cabecera + ítems) y egresos
-- =============================================================================
-- Los movimientos son editables por el encargado del área (cada cambio queda en
-- audit_log). La regla "el stock nunca puede quedar negativo" se garantiza con
-- triggers de restricción DIFERIDOS: se evalúan al confirmar la transacción,
-- bloqueando la fila del producto para serializar operaciones concurrentes.

-- -----------------------------------------------------------------------------
-- Ingresos (cabecera: siempre respaldada por factura)
-- -----------------------------------------------------------------------------
create table public.ingresos (
  id             uuid primary key default gen_random_uuid(),
  area_id        uuid not null references public.areas (id),
  proveedor_id   uuid not null references public.proveedores (id),
  nro_factura    text not null check (char_length(btrim(nro_factura)) between 1 and 50),
  fecha          date not null,
  observaciones  text check (char_length(observaciones) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null
);

-- Misma factura no puede repetirse para el mismo proveedor.
-- Se normaliza: sin espacios y en minúsculas ("Fact. N° 125478" = "fact.n°125478").
create unique index ingresos_factura_proveedor_uk
  on public.ingresos (proveedor_id, lower(regexp_replace(nro_factura, '\s', '', 'g')));
create index ingresos_area_fecha_idx on public.ingresos (area_id, fecha desc);

-- -----------------------------------------------------------------------------
-- Ítems de ingreso
-- -----------------------------------------------------------------------------
create table public.ingreso_items (
  id              uuid primary key default gen_random_uuid(),
  ingreso_id      uuid not null references public.ingresos (id) on delete cascade,
  producto_id     uuid not null references public.productos (id),
  cantidad        numeric(12, 3) not null check (cantidad > 0),
  costo_unitario  numeric(14, 2) not null check (costo_unitario >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,
  constraint ingreso_items_producto_unico unique (ingreso_id, producto_id)
);

create index ingreso_items_producto_idx on public.ingreso_items (producto_id);

-- -----------------------------------------------------------------------------
-- Egresos (un producto por egreso; el responsable es el usuario que lo registra)
-- -----------------------------------------------------------------------------
create table public.egresos (
  id           uuid primary key default gen_random_uuid(),
  area_id      uuid not null references public.areas (id),
  producto_id  uuid not null references public.productos (id),
  cantidad     numeric(12, 3) not null check (cantidad > 0),
  fecha        date not null,
  motivo       text not null check (char_length(btrim(motivo)) between 3 and 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,  -- = responsable
  updated_by   uuid references public.profiles (id) on delete set null
);

comment on column public.egresos.created_by is 'Responsable del egreso (usuario que lo registró).';

create index egresos_area_fecha_idx on public.egresos (area_id, fecha desc);
create index egresos_producto_idx on public.egresos (producto_id);

-- -----------------------------------------------------------------------------
-- Columnas de auditoría
-- -----------------------------------------------------------------------------
create trigger ingresos_auditoria_columnas
  before insert or update on public.ingresos
  for each row execute function private.set_columnas_auditoria();

create trigger ingreso_items_auditoria_columnas
  before insert or update on public.ingreso_items
  for each row execute function private.set_columnas_auditoria();

create trigger egresos_auditoria_columnas
  before insert or update on public.egresos
  for each row execute function private.set_columnas_auditoria();

-- -----------------------------------------------------------------------------
-- Validaciones de consistencia
-- -----------------------------------------------------------------------------

-- Valida que un producto pertenezca al área, esté activo (si es un alta o
-- cambió el producto) y que la cantidad respete la unidad (enteros vs decimales).
create or replace function private.validar_producto_movimiento(
  p_producto_id uuid,
  p_area_id     uuid,
  p_cantidad    numeric,
  p_exigir_activo boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prod record;
begin
  select p.area_id, p.activo, p.nombre, u.permite_decimales, u.nombre as unidad
    into v_prod
  from public.productos p
  join public.unidades_medida u on u.id = p.unidad_id
  where p.id = p_producto_id;

  if not found or v_prod.area_id <> p_area_id then
    raise exception 'El producto no pertenece al área del movimiento.'
      using errcode = 'P0001', hint = 'PRODUCTO_OTRA_AREA';
  end if;

  if p_exigir_activo and not v_prod.activo then
    raise exception 'El producto "%" está inactivo.', v_prod.nombre
      using errcode = 'P0001', hint = 'PRODUCTO_INACTIVO';
  end if;

  if not v_prod.permite_decimales and p_cantidad <> trunc(p_cantidad) then
    raise exception 'El producto "%" se mide en % y no admite decimales.', v_prod.nombre, v_prod.unidad
      using errcode = 'P0001', hint = 'CANTIDAD_NO_ENTERA';
  end if;
end;
$$;

create or replace function private.validar_fecha_movimiento(p_fecha date)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_fecha > greatest(current_date, private.hoy_ar()) then
    raise exception 'La fecha no puede ser futura.'
      using errcode = 'P0001', hint = 'FECHA_FUTURA';
  end if;
end;
$$;

-- Cabecera de ingreso
create or replace function private.validar_ingreso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.area_id is distinct from old.area_id then
    raise exception 'No se puede cambiar el área de un ingreso.'
      using errcode = 'P0001', hint = 'AREA_INMUTABLE';
  end if;

  if tg_op = 'INSERT' and not exists (
    select 1 from public.areas a where a.id = new.area_id and a.activa
  ) then
    raise exception 'El área no existe o está inactiva.'
      using errcode = 'P0001', hint = 'AREA_INACTIVA';
  end if;

  if tg_op = 'INSERT' or new.proveedor_id is distinct from old.proveedor_id then
    if not exists (
      select 1 from public.proveedores pr
      where pr.id = new.proveedor_id and pr.area_id = new.area_id and pr.activo
    ) then
      raise exception 'El proveedor no pertenece al área o está inactivo.'
        using errcode = 'P0001', hint = 'PROVEEDOR_INVALIDO';
    end if;
  end if;

  if tg_op = 'INSERT' or new.fecha is distinct from old.fecha then
    perform private.validar_fecha_movimiento(new.fecha);
  end if;

  new.nro_factura := btrim(new.nro_factura);
  return new;
end;
$$;

create trigger ingresos_validar
  before insert or update on public.ingresos
  for each row execute function private.validar_ingreso();

-- Ítem de ingreso
create or replace function private.validar_ingreso_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_area_id uuid;
begin
  if tg_op = 'UPDATE' and new.ingreso_id is distinct from old.ingreso_id then
    raise exception 'No se puede mover un ítem a otro ingreso.'
      using errcode = 'P0001', hint = 'ITEM_INMUTABLE';
  end if;

  select i.area_id into v_area_id from public.ingresos i where i.id = new.ingreso_id;

  perform private.validar_producto_movimiento(
    new.producto_id,
    v_area_id,
    new.cantidad,
    tg_op = 'INSERT' or new.producto_id is distinct from old.producto_id
  );
  return new;
end;
$$;

create trigger ingreso_items_validar
  before insert or update on public.ingreso_items
  for each row execute function private.validar_ingreso_item();

-- Egreso
create or replace function private.validar_egreso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.area_id is distinct from old.area_id then
    raise exception 'No se puede cambiar el área de un egreso.'
      using errcode = 'P0001', hint = 'AREA_INMUTABLE';
  end if;

  if tg_op = 'INSERT' and not exists (
    select 1 from public.areas a where a.id = new.area_id and a.activa
  ) then
    raise exception 'El área no existe o está inactiva.'
      using errcode = 'P0001', hint = 'AREA_INACTIVA';
  end if;

  perform private.validar_producto_movimiento(
    new.producto_id,
    new.area_id,
    new.cantidad,
    tg_op = 'INSERT' or new.producto_id is distinct from old.producto_id
  );

  if tg_op = 'INSERT' or new.fecha is distinct from old.fecha then
    perform private.validar_fecha_movimiento(new.fecha);
  end if;

  new.motivo := btrim(new.motivo);
  return new;
end;
$$;

create trigger egresos_validar
  before insert or update on public.egresos
  for each row execute function private.validar_egreso();

-- No permitir cambiar la unidad de un producto que ya tiene movimientos.
create or replace function private.validar_cambio_unidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.unidad_id is distinct from old.unidad_id and (
       exists (select 1 from public.ingreso_items ii where ii.producto_id = old.id)
    or exists (select 1 from public.egresos e where e.producto_id = old.id)
  ) then
    raise exception 'No se puede cambiar la unidad de un producto con movimientos.'
      using errcode = 'P0001', hint = 'UNIDAD_CON_MOVIMIENTOS';
  end if;
  return new;
end;
$$;

create trigger productos_validar_cambio_unidad
  before update of unidad_id on public.productos
  for each row execute function private.validar_cambio_unidad();

-- -----------------------------------------------------------------------------
-- Control de stock no negativo
-- -----------------------------------------------------------------------------
create or replace function private.stock_producto(p_producto_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(ii.cantidad) from public.ingreso_items ii where ii.producto_id = p_producto_id), 0)
  - coalesce((select sum(e.cantidad)  from public.egresos e        where e.producto_id  = p_producto_id), 0);
$$;

create or replace function private.verificar_stock_producto(p_producto_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock  numeric;
  v_nombre text;
  v_unidad text;
begin
  -- Bloqueo de la fila del producto: serializa transacciones concurrentes sobre
  -- el mismo producto. La suma se calcula DESPUÉS del bloqueo (nuevo snapshot en
  -- READ COMMITTED), por lo que ve lo confirmado por la transacción anterior.
  select p.nombre, u.codigo
    into v_nombre, v_unidad
  from public.productos p
  join public.unidades_medida u on u.id = p.unidad_id
  where p.id = p_producto_id
  for update of p;

  v_stock := private.stock_producto(p_producto_id);

  if v_stock < 0 then
    raise exception 'Stock insuficiente para "%": la operación dejaría el stock en % %.',
      v_nombre, trim_scale(v_stock), v_unidad
      using errcode = 'P0001',
            hint = 'STOCK_INSUFICIENTE',
            detail = json_build_object(
              'producto_id', p_producto_id,
              'disponible', trim_scale(v_stock + 0)
            )::text;
  end if;
end;
$$;

create or replace function private.trg_verificar_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.verificar_stock_producto(old.producto_id);
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.producto_id is distinct from old.producto_id) then
    perform private.verificar_stock_producto(new.producto_id);
  end if;
  return null;
end;
$$;

-- Un egreso nuevo/modificado puede dejar stock negativo.
create constraint trigger egresos_verificar_stock
  after insert or update of producto_id, cantidad on public.egresos
  deferrable initially deferred
  for each row execute function private.trg_verificar_stock();

-- Reducir o eliminar un ítem de ingreso puede dejar stock negativo.
create constraint trigger ingreso_items_verificar_stock
  after update of producto_id, cantidad or delete on public.ingreso_items
  deferrable initially deferred
  for each row execute function private.trg_verificar_stock();
