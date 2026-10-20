-- =============================================================================
-- 0007 · Auditoría: registro de cada alta, modificación y baja
-- =============================================================================
create table public.audit_log (
  id             bigint generated always as identity primary key,
  tabla          text not null,
  operacion      text not null check (operacion in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id    text not null,
  area_id        uuid,          -- sin FK: el log debe sobrevivir a cualquier cambio
  usuario_id     uuid,          -- null = operación del sistema / service_role
  datos_antes    jsonb,
  datos_despues  jsonb,
  created_at     timestamptz not null default now()
);

comment on table public.audit_log is 'Bitácora inmutable de cambios. Se alimenta solo por triggers.';

create index audit_log_registro_idx   on public.audit_log (tabla, registro_id);
create index audit_log_area_fecha_idx on public.audit_log (area_id, created_at desc);
create index audit_log_fecha_idx      on public.audit_log (created_at desc);
create index audit_log_usuario_idx    on public.audit_log (usuario_id);

create or replace function private.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes   jsonb;
  v_despues jsonb;
  v_area    uuid;
begin
  if tg_op <> 'INSERT' then v_antes   := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_despues := to_jsonb(new); end if;

  -- Ignorar UPDATE sin cambios reales.
  if tg_op = 'UPDATE'
     and (v_antes - 'updated_at' - 'updated_by') = (v_despues - 'updated_at' - 'updated_by') then
    return null;
  end if;

  v_area := coalesce(v_despues ->> 'area_id', v_antes ->> 'area_id')::uuid;

  if tg_table_name = 'areas' then
    v_area := coalesce(v_despues ->> 'id', v_antes ->> 'id')::uuid;
  elsif tg_table_name = 'ingreso_items' then
    select i.area_id into v_area
    from public.ingresos i
    where i.id = coalesce(v_despues ->> 'ingreso_id', v_antes ->> 'ingreso_id')::uuid;
  end if;

  insert into public.audit_log (tabla, operacion, registro_id, area_id, usuario_id, datos_antes, datos_despues)
  values (
    tg_table_name,
    tg_op,
    coalesce(v_despues ->> 'id', v_antes ->> 'id'),
    v_area,
    auth.uid(),
    v_antes,
    v_despues
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'areas', 'unidades_medida', 'profiles', 'proveedores',
    'productos', 'ingresos', 'ingreso_items', 'egresos'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function private.registrar_auditoria()',
      t || '_auditoria', t
    );
  end loop;
end;
$$;
