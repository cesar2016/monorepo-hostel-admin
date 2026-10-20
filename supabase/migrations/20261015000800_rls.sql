-- =============================================================================
-- 0008 · Permisos (GRANT) y Row Level Security
-- =============================================================================
-- Matriz:
--   encargado   → lectura y escritura SOLO de su área (productos, proveedores,
--                 ingresos, egresos). Lectura de su área y de los perfiles de su área.
--   admin       → lectura de todo.
--   super_admin → lectura de todo + administración de áreas, unidades y perfiles.
-- Usuarios inactivos: las funciones helper devuelven null/false ⇒ no ven nada
-- (salvo su propio perfil, para que el front pueda informar "cuenta desactivada").

-- -----------------------------------------------------------------------------
-- GRANTs: el rol anónimo no accede a nada; authenticated solo a lo necesario.
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

grant select, insert, update         on public.areas            to authenticated;
grant select, insert, update         on public.unidades_medida  to authenticated;
grant select, update                 on public.profiles         to authenticated;
grant select, insert, update         on public.proveedores      to authenticated;
grant select, insert, update         on public.productos        to authenticated;
grant select, insert, update, delete on public.ingresos         to authenticated;
grant select, insert, update, delete on public.ingreso_items    to authenticated;
grant select, insert, update, delete on public.egresos          to authenticated;
grant select                         on public.audit_log        to authenticated;
grant select                         on public.v_stock          to authenticated;
grant select                         on public.v_movimientos    to authenticated;

-- -----------------------------------------------------------------------------
-- Habilitar RLS en todas las tablas
-- -----------------------------------------------------------------------------
alter table public.areas            enable row level security;
alter table public.unidades_medida  enable row level security;
alter table public.profiles         enable row level security;
alter table public.proveedores      enable row level security;
alter table public.productos        enable row level security;
alter table public.ingresos         enable row level security;
alter table public.ingreso_items    enable row level security;
alter table public.egresos          enable row level security;
alter table public.audit_log        enable row level security;

-- -----------------------------------------------------------------------------
-- Áreas
-- -----------------------------------------------------------------------------
create policy areas_select on public.areas
  for select to authenticated
  using ((select private.es_admin()) or id = (select private.area_encargado()));

create policy areas_insert on public.areas
  for insert to authenticated
  with check ((select private.es_super_admin()));

create policy areas_update on public.areas
  for update to authenticated
  using ((select private.es_super_admin()))
  with check ((select private.es_super_admin()));

-- -----------------------------------------------------------------------------
-- Unidades de medida (catálogo global)
-- -----------------------------------------------------------------------------
create policy unidades_select on public.unidades_medida
  for select to authenticated
  using ((select private.rol_actual()) is not null);

create policy unidades_insert on public.unidades_medida
  for insert to authenticated
  with check ((select private.es_super_admin()));

create policy unidades_update on public.unidades_medida
  for update to authenticated
  using ((select private.es_super_admin()))
  with check ((select private.es_super_admin()));

-- -----------------------------------------------------------------------------
-- Perfiles
-- (el alta de usuarios se hace desde el backend con service_role + trigger)
-- -----------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.es_admin())
    or (area_id is not null and area_id = (select private.area_encargado()))
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using ((select private.es_super_admin()))
  with check ((select private.es_super_admin()));

-- -----------------------------------------------------------------------------
-- Proveedores y productos (por área)
-- -----------------------------------------------------------------------------
create policy proveedores_select on public.proveedores
  for select to authenticated
  using ((select private.es_admin()) or area_id = (select private.area_encargado()));

create policy proveedores_insert on public.proveedores
  for insert to authenticated
  with check (area_id = (select private.area_encargado()));

create policy proveedores_update on public.proveedores
  for update to authenticated
  using (area_id = (select private.area_encargado()))
  with check (area_id = (select private.area_encargado()));

create policy productos_select on public.productos
  for select to authenticated
  using ((select private.es_admin()) or area_id = (select private.area_encargado()));

create policy productos_insert on public.productos
  for insert to authenticated
  with check (area_id = (select private.area_encargado()));

create policy productos_update on public.productos
  for update to authenticated
  using (area_id = (select private.area_encargado()))
  with check (area_id = (select private.area_encargado()));

-- -----------------------------------------------------------------------------
-- Ingresos
-- -----------------------------------------------------------------------------
create policy ingresos_select on public.ingresos
  for select to authenticated
  using ((select private.es_admin()) or area_id = (select private.area_encargado()));

create policy ingresos_insert on public.ingresos
  for insert to authenticated
  with check (area_id = (select private.area_encargado()));

create policy ingresos_update on public.ingresos
  for update to authenticated
  using (area_id = (select private.area_encargado()))
  with check (area_id = (select private.area_encargado()));

create policy ingresos_delete on public.ingresos
  for delete to authenticated
  using (area_id = (select private.area_encargado()));

-- Ítems: heredan el acceso de su cabecera.
create policy ingreso_items_select on public.ingreso_items
  for select to authenticated
  using (exists (select 1 from public.ingresos i where i.id = ingreso_id));

create policy ingreso_items_insert on public.ingreso_items
  for insert to authenticated
  with check (exists (
    select 1 from public.ingresos i
    where i.id = ingreso_id and i.area_id = (select private.area_encargado())
  ));

create policy ingreso_items_update on public.ingreso_items
  for update to authenticated
  using (exists (
    select 1 from public.ingresos i
    where i.id = ingreso_id and i.area_id = (select private.area_encargado())
  ))
  with check (exists (
    select 1 from public.ingresos i
    where i.id = ingreso_id and i.area_id = (select private.area_encargado())
  ));

create policy ingreso_items_delete on public.ingreso_items
  for delete to authenticated
  using (exists (
    select 1 from public.ingresos i
    where i.id = ingreso_id and i.area_id = (select private.area_encargado())
  ));

-- -----------------------------------------------------------------------------
-- Egresos
-- -----------------------------------------------------------------------------
create policy egresos_select on public.egresos
  for select to authenticated
  using ((select private.es_admin()) or area_id = (select private.area_encargado()));

create policy egresos_insert on public.egresos
  for insert to authenticated
  with check (area_id = (select private.area_encargado()));

create policy egresos_update on public.egresos
  for update to authenticated
  using (area_id = (select private.area_encargado()))
  with check (area_id = (select private.area_encargado()));

create policy egresos_delete on public.egresos
  for delete to authenticated
  using (area_id = (select private.area_encargado()));

-- -----------------------------------------------------------------------------
-- Auditoría: solo lectura para Admin / Super Admin. Nadie escribe (solo triggers).
-- -----------------------------------------------------------------------------
create policy audit_log_select on public.audit_log
  for select to authenticated
  using ((select private.es_admin()));

-- -----------------------------------------------------------------------------
-- Funciones internas: nadie las ejecuta salvo las que usan las políticas/RPC.
-- (Los triggers no requieren EXECUTE por parte del usuario que los dispara.)
-- -----------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.rol_actual(),
  private.area_encargado(),
  private.es_admin(),
  private.es_super_admin(),
  private.hoy_ar(),
  private.validar_items_ingreso(jsonb)
to authenticated;
