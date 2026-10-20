-- =============================================================================
-- 0003 · Catálogos por área: proveedores y productos
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Proveedores (cada área tiene los suyos)
-- -----------------------------------------------------------------------------
create table public.proveedores (
  id          uuid primary key default gen_random_uuid(),
  area_id     uuid not null references public.areas (id),
  nombre      text not null check (char_length(btrim(nombre)) between 2 and 150),
  cuit        text check (cuit ~ '^\d{11}$'),          -- solo dígitos; el front formatea XX-XXXXXXXX-X
  contacto    text check (char_length(contacto) <= 150),
  telefono    text check (char_length(telefono) <= 40),
  email       text check (char_length(email) <= 150),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null
);

create unique index proveedores_area_nombre_uk on public.proveedores (area_id, lower(btrim(nombre)));
create unique index proveedores_area_cuit_uk   on public.proveedores (area_id, cuit) where cuit is not null;

-- -----------------------------------------------------------------------------
-- Productos
-- -----------------------------------------------------------------------------
create table public.productos (
  id            uuid primary key default gen_random_uuid(),
  area_id       uuid not null references public.areas (id),
  nombre        text not null check (char_length(btrim(nombre)) between 2 and 150),
  sku           text check (char_length(btrim(sku)) between 1 and 50),
  unidad_id     smallint not null references public.unidades_medida (id),
  stock_minimo  numeric(12, 3) not null default 0 check (stock_minimo >= 0),
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null
);

create unique index productos_area_nombre_uk on public.productos (area_id, lower(btrim(nombre)));
create unique index productos_area_sku_uk    on public.productos (area_id, lower(btrim(sku))) where sku is not null;
create index productos_unidad_id_idx on public.productos (unidad_id);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger proveedores_auditoria_columnas
  before insert or update on public.proveedores
  for each row execute function private.set_columnas_auditoria();

create trigger productos_auditoria_columnas
  before insert or update on public.productos
  for each row execute function private.set_columnas_auditoria();

-- Un proveedor/producto no puede "mudarse" de área (rompería el historial).
create or replace function private.area_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.area_id is distinct from old.area_id then
    raise exception 'No se puede cambiar el área de un registro existente.'
      using errcode = 'P0001', hint = 'AREA_INMUTABLE';
  end if;
  return new;
end;
$$;

create trigger proveedores_area_inmutable
  before update on public.proveedores
  for each row execute function private.area_inmutable();

create trigger productos_area_inmutable
  before update on public.productos
  for each row execute function private.area_inmutable();

-- En altas de proveedores, el área debe existir y estar activa.
create or replace function private.validar_alta_proveedor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.areas a where a.id = new.area_id and a.activa) then
    raise exception 'El área no existe o está inactiva.'
      using errcode = 'P0001', hint = 'AREA_INACTIVA';
  end if;
  return new;
end;
$$;

create trigger proveedores_validar_alta
  before insert on public.proveedores
  for each row execute function private.validar_alta_proveedor();

-- En productos, validar área activa y unidad activa.
create or replace function private.validar_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and not exists (select 1 from public.areas a where a.id = new.area_id and a.activa) then
    raise exception 'El área no existe o está inactiva.'
      using errcode = 'P0001', hint = 'AREA_INACTIVA';
  end if;

  if (tg_op = 'INSERT' or new.unidad_id is distinct from old.unidad_id)
     and not exists (select 1 from public.unidades_medida u where u.id = new.unidad_id and u.activa) then
    raise exception 'La unidad de medida no existe o está inactiva.'
      using errcode = 'P0001', hint = 'UNIDAD_INACTIVA';
  end if;
  return new;
end;
$$;

create trigger productos_validar
  before insert or update of unidad_id on public.productos
  for each row execute function private.validar_producto();
