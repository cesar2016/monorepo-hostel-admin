-- =============================================================================
-- 0001 · Base: esquema privado, tipos, utilidades, áreas, unidades y perfiles
-- =============================================================================

-- Esquema para funciones internas. No se expone en la API REST de Supabase.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.rol_usuario as enum ('encargado', 'admin', 'super_admin');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- Fecha "de negocio" en Argentina (evita desfasajes con UTC).
create or replace function private.hoy_ar()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

-- Columnas de auditoría por fila: created_*/updated_* no pueden ser falsificadas
-- por el cliente; siempre se toman del JWT (auth.uid()) y del reloj del servidor.
create or replace function private.set_columnas_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
    new.updated_by := new.created_by;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null check (char_length(btrim(nombre)) between 2 and 120),
  email       text not null,
  rol         public.rol_usuario not null default 'encargado',
  area_id     uuid,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  -- Encargado: debe tener área (salvo que esté inactivo). Admin/Super Admin: sin área.
  constraint profiles_area_segun_rol check (
    (rol = 'encargado' and (area_id is not null or not activo))
    or (rol <> 'encargado' and area_id is null)
  )
);

comment on table public.profiles is 'Datos de negocio de cada usuario: rol, área y estado.';

create unique index profiles_email_uk on public.profiles (lower(email));
-- Un único encargado ACTIVO por área.
create unique index profiles_un_encargado_por_area
  on public.profiles (area_id)
  where rol = 'encargado' and activo;

-- -----------------------------------------------------------------------------
-- Áreas
-- -----------------------------------------------------------------------------
create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(btrim(nombre)) between 2 and 80),
  descripcion text check (char_length(descripcion) <= 500),
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null
);

create unique index areas_nombre_uk on public.areas (lower(btrim(nombre)));

alter table public.profiles
  add constraint profiles_area_id_fkey
  foreign key (area_id) references public.areas (id);

create index profiles_area_id_idx on public.profiles (area_id);

-- -----------------------------------------------------------------------------
-- Unidades de medida (catálogo global)
-- -----------------------------------------------------------------------------
create table public.unidades_medida (
  id                 smallint generated always as identity primary key,
  codigo             text not null check (codigo ~ '^[a-z0-9_]{1,10}$'),
  nombre             text not null check (char_length(btrim(nombre)) between 2 and 40),
  permite_decimales  boolean not null default true,
  activa             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null
);

create unique index unidades_medida_codigo_uk on public.unidades_medida (codigo);

-- -----------------------------------------------------------------------------
-- Triggers de columnas de auditoría
-- -----------------------------------------------------------------------------
create trigger profiles_auditoria_columnas
  before insert or update on public.profiles
  for each row execute function private.set_columnas_auditoria();

create trigger areas_auditoria_columnas
  before insert or update on public.areas
  for each row execute function private.set_columnas_auditoria();

create trigger unidades_medida_auditoria_columnas
  before insert or update on public.unidades_medida
  for each row execute function private.set_columnas_auditoria();

-- -----------------------------------------------------------------------------
-- Reglas de perfiles
-- -----------------------------------------------------------------------------

-- El encargado activo debe pertenecer a un área activa.
create or replace function private.validar_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rol = 'encargado' and new.activo
     and (tg_op = 'INSERT'
          or new.area_id is distinct from old.area_id
          or new.rol is distinct from old.rol
          or new.activo is distinct from old.activo)
     and not exists (select 1 from public.areas a where a.id = new.area_id and a.activa) then
    raise exception 'El área asignada no existe o está inactiva.'
      using errcode = 'P0001', hint = 'AREA_INACTIVA';
  end if;
  return new;
end;
$$;

create trigger profiles_validar
  before insert or update on public.profiles
  for each row execute function private.validar_profile();

-- Siempre debe quedar al menos un Super Admin activo.
create or replace function private.proteger_ultimo_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.rol = 'super_admin' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'super_admin' or not new.activo)
     and not exists (
       select 1 from public.profiles p
       where p.rol = 'super_admin' and p.activo and p.id <> old.id
     ) then
    raise exception 'Debe existir al menos un Super Admin activo.'
      using errcode = 'P0001', hint = 'ULTIMO_SUPER_ADMIN';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger profiles_proteger_ultimo_super_admin
  before update or delete on public.profiles
  for each row execute function private.proteger_ultimo_super_admin();

-- -----------------------------------------------------------------------------
-- Alta automática de perfil al crear un usuario en Supabase Auth.
-- El rol y el área se leen de raw_app_meta_data, que SOLO puede escribir el
-- service_role (backend). raw_user_meta_data (editable por el usuario) se usa
-- únicamente para el nombre. Si no vino un rol desde el backend, el perfil
-- se crea INACTIVO (nunca debería pasar: el registro público está deshabilitado).
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_rol  public.rol_usuario := coalesce((v_meta ->> 'rol')::public.rol_usuario, 'encargado');
  v_area uuid := nullif(v_meta ->> 'area_id', '')::uuid;
begin
  insert into public.profiles (id, nombre, email, rol, area_id, activo)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''), new.email),
    new.email,
    v_rol,
    case when v_rol = 'encargado' then v_area end,
    v_meta ? 'rol'
  )
  on conflict (id) do update set
    nombre = coalesce(nullif(btrim(excluded.nombre), ''), public.profiles.nombre),
    email = excluded.email,
    rol = excluded.rol,
    area_id = excluded.area_id,
    activo = case when v_meta ? 'rol' then true else public.profiles.activo end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger on_auth_user_updated
  after update of raw_app_meta_data, raw_user_meta_data on auth.users
  for each row execute function private.handle_new_user();

-- Mantener el email sincronizado si cambia en Auth.
create or replace function private.sync_email_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.sync_email_usuario();
