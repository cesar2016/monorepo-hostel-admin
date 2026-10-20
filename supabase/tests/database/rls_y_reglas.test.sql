-- =============================================================================
-- Tests de reglas de negocio y RLS (pgTAP). Ejecutar con: supabase test db
-- Todo corre dentro de una transacción que se revierte al final.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(32);

-- Los controles de stock son diferidos (se evalúan al COMMIT); como el test
-- nunca confirma, los forzamos a inmediatos.
set constraints all immediate;

-- -----------------------------------------------------------------------------
-- Fixtures
-- -----------------------------------------------------------------------------
create temp table t_ids (clave text primary key, id uuid);
grant select on t_ids to authenticated;

insert into areas (id, nombre, descripcion) values
  ('11111111-1111-1111-1111-111111111101', 'Cocina Test', 'Área cocina para tests'),
  ('11111111-1111-1111-1111-111111111102', 'Mantenimiento Test', 'Área mant para tests')
on conflict (id) do nothing;

insert into t_ids values
  ('cocina', '11111111-1111-1111-1111-111111111101'),
  ('mant', '11111111-1111-1111-1111-111111111102');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'super@hotel.test',  '{"rol":"super_admin"}', '{"nombre":"Super"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@hotel.test',  '{"rol":"admin"}',       '{"nombre":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'cocina@hotel.test',
     json_build_object('rol','encargado','area_id',(select id from t_ids where clave='cocina'))::jsonb, '{"nombre":"Enc Cocina"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'mant@hotel.test',
     json_build_object('rol','encargado','area_id',(select id from t_ids where clave='mant'))::jsonb,   '{"nombre":"Enc Mant"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'colado@hotel.test', '{}', '{"nombre":"Sin rol"}');

-- Productos/proveedor de Mantenimiento creados como postgres (bypass RLS)
insert into proveedores (id, area_id, nombre)
values ('00000000-0000-0000-0000-00000000d001', (select id from t_ids where clave='mant'), 'Ferretería Sur');
insert into productos (id, area_id, nombre, unidad_id)
values ('00000000-0000-0000-0000-00000000e001', (select id from t_ids where clave='mant'), 'Tornillos 6mm',
        (select id from unidades_medida where codigo='un'));

-- 1-3 · Perfiles creados por trigger
select is((select rol::text from profiles where email='super@hotel.test'), 'super_admin', 'Perfil super_admin creado');
select is((select area_id from profiles where email='cocina@hotel.test'), (select id from t_ids where clave='cocina'), 'Encargado con su área');
select is((select activo from profiles where email='colado@hotel.test'), false, 'Usuario sin rol del backend queda inactivo');

-- 4 · Un único encargado activo por área
select throws_ok(
  $$ insert into auth.users (id, email, raw_app_meta_data)
     values ('00000000-0000-0000-0000-0000000000b3', 'otro@hotel.test',
             json_build_object('rol','encargado','area_id',(select id from t_ids where clave='cocina'))::jsonb) $$,
  '23505', null, 'No se permite un segundo encargado activo en la misma área');

-- -----------------------------------------------------------------------------
-- Encargado de Cocina
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$ insert into productos (id, area_id, nombre, unidad_id, stock_minimo)
     values ('00000000-0000-0000-0000-00000000c001', (select id from t_ids where clave='cocina'),
             'Harina 000', (select id from unidades_medida where codigo='kg'), 10) $$,
  'Encargado crea producto en su área');

select lives_ok(
  $$ insert into productos (id, area_id, nombre, unidad_id)
     values ('00000000-0000-0000-0000-00000000c002', (select id from t_ids where clave='cocina'),
             'Huevos', (select id from unidades_medida where codigo='un')) $$,
  'Encargado crea segundo producto');

select throws_ok(
  $$ insert into productos (area_id, nombre, unidad_id)
     values ((select id from t_ids where clave='mant'), 'Martillo', (select id from unidades_medida where codigo='un')) $$,
  '42501', null, 'Encargado NO puede crear productos en otra área');

select is((select count(*)::int from productos), 2, 'Encargado solo ve productos de su área');
select is((select count(*)::int from areas), 1, 'Encargado solo ve su área');
select is((select count(*)::int from proveedores), 0, 'Encargado no ve proveedores de otra área');

select lives_ok(
  $$ insert into proveedores (id, area_id, nombre, cuit)
     values ('00000000-0000-0000-0000-00000000d002', (select id from t_ids where clave='cocina'),
             'Molinos SA', '30123456789') $$,
  'Encargado crea proveedor de su área');

select lives_ok(
  $$ select registrar_ingreso(
       '00000000-0000-0000-0000-00000000d002', 'Fact. N° 125478', current_date, 'Primera compra',
       '[{"producto_id":"00000000-0000-0000-0000-00000000c001","cantidad":25.5,"costo_unitario":900},
         {"producto_id":"00000000-0000-0000-0000-00000000c002","cantidad":30,"costo_unitario":150}]'::jsonb) $$,
  'Registra ingreso con 2 ítems');

select throws_ok(
  $$ select registrar_ingreso(
       '00000000-0000-0000-0000-00000000d002', 'fact. n°  125478', current_date, null,
       '[{"producto_id":"00000000-0000-0000-0000-00000000c001","cantidad":1,"costo_unitario":1}]'::jsonb) $$,
  '23505', 'La factura "fact. n°  125478" ya fue registrada para este proveedor.',
  'Factura duplicada para el mismo proveedor (normalizada)');

select throws_ok(
  $$ select registrar_ingreso(
       '00000000-0000-0000-0000-00000000d001', 'A-1', current_date, null,
       '[{"producto_id":"00000000-0000-0000-0000-00000000c001","cantidad":1,"costo_unitario":1}]'::jsonb) $$,
  'P0001', 'El proveedor no pertenece al área o está inactivo.',
  'No puede usar proveedor de otra área');

select throws_ok(
  $$ select registrar_ingreso(
       '00000000-0000-0000-0000-00000000d002', 'A-2', current_date, null,
       '[{"producto_id":"00000000-0000-0000-0000-00000000e001","cantidad":1,"costo_unitario":1}]'::jsonb) $$,
  'P0001', 'El producto no pertenece al área del movimiento.',
  'No puede ingresar producto de otra área');

select throws_ok(
  $$ select registrar_ingreso(
       '00000000-0000-0000-0000-00000000d002', 'A-3', current_date + 1, null,
       '[{"producto_id":"00000000-0000-0000-0000-00000000c001","cantidad":1,"costo_unitario":1}]'::jsonb) $$,
  'P0001', 'La fecha no puede ser futura.', 'Rechaza fecha futura');

select throws_ok(
  $$ insert into egresos (area_id, producto_id, cantidad, fecha, motivo)
     values ((select id from t_ids where clave='cocina'), '00000000-0000-0000-0000-00000000c002', 2.5, current_date, 'Desayuno') $$,
  'P0001', null, 'Unidades no admiten decimales');

select throws_ok(
  $$ insert into egresos (area_id, producto_id, cantidad, fecha, motivo)
     values ((select id from t_ids where clave='cocina'), '00000000-0000-0000-0000-00000000c001', 30, current_date, 'Panadería') $$,
  'P0001', null, 'Egreso mayor al stock es rechazado');

select lives_ok(
  $$ insert into egresos (id, area_id, producto_id, cantidad, fecha, motivo)
     values ('00000000-0000-0000-0000-00000000f001', (select id from t_ids where clave='cocina'),
             '00000000-0000-0000-0000-00000000c001', 20, current_date, 'Panadería') $$,
  'Egreso dentro del stock');

select is((select stock_actual from v_stock where producto_id='00000000-0000-0000-0000-00000000c001'),
          5.5::numeric, 'Stock calculado = 25,5 − 20');
select is((select bajo_minimo from v_stock where producto_id='00000000-0000-0000-0000-00000000c001'),
          true, 'Alerta de stock mínimo');

select throws_ok(
  $$ update ingreso_items set cantidad = 10
     where producto_id = '00000000-0000-0000-0000-00000000c001' $$,
  'P0001', null, 'Editar ingreso no puede dejar stock negativo');

select throws_ok(
  $$ update egresos set cantidad = 26 where id = '00000000-0000-0000-0000-00000000f001' $$,
  'P0001', null, 'Editar egreso no puede dejar stock negativo');

select is((select count(*)::int from audit_log), 0, 'Encargado no ve la auditoría');

-- -----------------------------------------------------------------------------
-- Admin (solo lectura global)
-- -----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;

select ok((select count(*) from productos) >= 3, 'Admin ve productos de todas las áreas');
select throws_ok(
  $$ insert into productos (area_id, nombre, unidad_id)
     values ((select id from t_ids where clave='cocina'), 'Azúcar', (select id from unidades_medida where codigo='kg')) $$,
  '42501', null, 'Admin NO puede crear productos');
select is_empty(
  $$ update areas set descripcion = 'x' returning id $$,
  'Admin NO puede modificar áreas');
select ok((select count(*) from audit_log) > 0, 'Admin ve la auditoría');

-- -----------------------------------------------------------------------------
-- Super Admin
-- -----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

select isnt_empty(
  $$ update areas set descripcion = 'Cocina central' where nombre = 'Cocina' returning id $$,
  'Super Admin modifica áreas');
select throws_ok(
  $$ update profiles set activo = false where rol = 'super_admin' $$,
  'P0001', 'Debe existir al menos un Super Admin activo.', 'No se puede desactivar al último Super Admin');

-- -----------------------------------------------------------------------------
-- Usuario inactivo y anónimo
-- -----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from productos), 0, 'Usuario inactivo no ve datos');

reset role;
set local role anon;
select throws_ok($$ select * from productos $$, '42501', null, 'Anónimo no tiene acceso');

reset role;
select * from finish();
rollback;
