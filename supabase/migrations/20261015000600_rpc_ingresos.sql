-- =============================================================================
-- 0006 · Funciones RPC transaccionales para ingresos
-- =============================================================================
-- SECURITY INVOKER: se ejecutan con los permisos del usuario, por lo que la RLS
-- sigue aplicando. Agrupan cabecera + ítems en una sola transacción.
--
-- Formato de p_items (jsonb):
--   [{ "producto_id": "uuid", "cantidad": 10.5, "costo_unitario": 1234.50 }, ...]

create or replace function private.validar_items_ingreso(p_items jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El ingreso debe tener al menos un producto.'
      using errcode = 'P0001', hint = 'INGRESO_SIN_ITEMS';
  end if;

  if (select count(*) <> count(distinct x ->> 'producto_id') from jsonb_array_elements(p_items) x) then
    raise exception 'Hay productos repetidos en el ingreso.'
      using errcode = 'P0001', hint = 'ITEM_DUPLICADO';
  end if;
end;
$$;

grant execute on function private.validar_items_ingreso(jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Alta de ingreso
-- -----------------------------------------------------------------------------
create or replace function public.registrar_ingreso(
  p_proveedor_id  uuid,
  p_nro_factura   text,
  p_fecha         date,
  p_observaciones text,
  p_items         jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_area_id    uuid := private.area_encargado();
  v_ingreso_id uuid;
begin
  if v_area_id is null then
    raise exception 'Solo el encargado de un área puede registrar ingresos.'
      using errcode = '42501', hint = 'SIN_PERMISO';
  end if;

  perform private.validar_items_ingreso(p_items);

  begin
    insert into public.ingresos (area_id, proveedor_id, nro_factura, fecha, observaciones)
    values (v_area_id, p_proveedor_id, p_nro_factura, p_fecha, nullif(btrim(p_observaciones), ''))
    returning id into v_ingreso_id;
  exception when unique_violation then
    raise exception 'La factura "%" ya fue registrada para este proveedor.', btrim(p_nro_factura)
      using errcode = '23505', hint = 'FACTURA_DUPLICADA';
  end;

  insert into public.ingreso_items (ingreso_id, producto_id, cantidad, costo_unitario)
  select v_ingreso_id, x.producto_id, x.cantidad, x.costo_unitario
  from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric, costo_unitario numeric);

  return v_ingreso_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Edición de ingreso: actualiza cabecera y sincroniza ítems
-- (elimina los que ya no están, actualiza los modificados, inserta los nuevos).
-- El control de stock se evalúa al final de la transacción.
-- -----------------------------------------------------------------------------
create or replace function public.actualizar_ingreso(
  p_ingreso_id    uuid,
  p_proveedor_id  uuid,
  p_nro_factura   text,
  p_fecha         date,
  p_observaciones text,
  p_items         jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_area_id uuid := private.area_encargado();
  v_filas   integer;
begin
  if v_area_id is null then
    raise exception 'Solo el encargado de un área puede modificar ingresos.'
      using errcode = '42501', hint = 'SIN_PERMISO';
  end if;

  perform private.validar_items_ingreso(p_items);

  begin
    update public.ingresos
       set proveedor_id  = p_proveedor_id,
           nro_factura   = p_nro_factura,
           fecha         = p_fecha,
           observaciones = nullif(btrim(p_observaciones), '')
     where id = p_ingreso_id;
    get diagnostics v_filas = row_count;
  exception when unique_violation then
    raise exception 'La factura "%" ya fue registrada para este proveedor.', btrim(p_nro_factura)
      using errcode = '23505', hint = 'FACTURA_DUPLICADA';
  end;

  -- RLS filtra ingresos de otras áreas: para el usuario "no existen".
  if v_filas = 0 then
    raise exception 'Ingreso no encontrado.'
      using errcode = 'P0002', hint = 'NO_ENCONTRADO';
  end if;

  delete from public.ingreso_items ii
   where ii.ingreso_id = p_ingreso_id
     and ii.producto_id not in (
       select (x ->> 'producto_id')::uuid from jsonb_array_elements(p_items) x
     );

  insert into public.ingreso_items (ingreso_id, producto_id, cantidad, costo_unitario)
  select p_ingreso_id, x.producto_id, x.cantidad, x.costo_unitario
  from jsonb_to_recordset(p_items) as x(producto_id uuid, cantidad numeric, costo_unitario numeric)
  on conflict (ingreso_id, producto_id) do update
     set cantidad       = excluded.cantidad,
         costo_unitario = excluded.costo_unitario
   where public.ingreso_items.cantidad       is distinct from excluded.cantidad
      or public.ingreso_items.costo_unitario is distinct from excluded.costo_unitario;

  return p_ingreso_id;
end;
$$;

revoke all on function public.registrar_ingreso(uuid, text, date, text, jsonb) from public, anon;
revoke all on function public.actualizar_ingreso(uuid, uuid, text, date, text, jsonb) from public, anon;
grant execute on function public.registrar_ingreso(uuid, text, date, text, jsonb) to authenticated;
grant execute on function public.actualizar_ingreso(uuid, uuid, text, date, text, jsonb) to authenticated;
