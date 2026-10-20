-- =============================================================================
-- 0002 · Funciones de autorización usadas por las políticas RLS
-- =============================================================================
-- Son SECURITY DEFINER para leer `profiles` sin disparar su propia RLS
-- (evita recursión) y STABLE para que Postgres las evalúe una vez por consulta
-- cuando se usan como `(select private.fn())` en las políticas.
-- Un usuario INACTIVO no tiene rol ni área: todas devuelven null/false.

create or replace function private.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol
  from public.profiles p
  where p.id = auth.uid() and p.activo;
$$;

-- Área del usuario actual SOLO si es encargado activo; null para cualquier otro caso.
create or replace function private.area_encargado()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.area_id
  from public.profiles p
  where p.id = auth.uid() and p.activo and p.rol = 'encargado';
$$;

create or replace function private.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.rol_actual() in ('admin', 'super_admin'), false);
$$;

create or replace function private.es_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.rol_actual() = 'super_admin', false);
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function
  private.rol_actual(),
  private.area_encargado(),
  private.es_admin(),
  private.es_super_admin(),
  private.hoy_ar()
to authenticated, service_role;
