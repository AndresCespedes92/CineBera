begin;
create table public.combos (
  id bigint generated always as identity primary key,
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  precio numeric(12,2) not null check (precio > 0),
  pochoclo_id bigint not null references public.productos_candy(id),
  bebida_id bigint not null references public.productos_candy(id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  check (pochoclo_id <> bebida_id)
);
alter table public.combos enable row level security;
revoke all on public.combos from anon, authenticated;
grant select on public.combos to anon, authenticated;
grant insert, update on public.combos to authenticated;
grant usage, select on sequence public.combos_id_seq to authenticated;
create policy combos_lectura on public.combos for select to anon, authenticated
  using (activo or exists (select 1 from public.perfiles where id = (select auth.uid()) and rol = 'admin'));
create policy combos_alta_admin on public.combos for insert to authenticated
  with check (exists (select 1 from public.perfiles where id = (select auth.uid()) and rol = 'admin'));
create policy combos_edicion_admin on public.combos for update to authenticated
  using (exists (select 1 from public.perfiles where id = (select auth.uid()) and rol = 'admin'))
  with check (exists (select 1 from public.perfiles where id = (select auth.uid()) and rol = 'admin'));

-- Copia histórica del combo comprado: futuras ediciones no cambian una compra.
alter table public.compras
  add column combo_id bigint references public.combos(id),
  add column combo_nombre text,
  add column combo_precio numeric(12,2),
  add column combo_cantidad integer not null default 0,
  add column combo_pochoclo_id bigint references public.productos_candy(id),
  add column combo_bebida_id bigint references public.productos_candy(id),
  add constraint compra_combo_valido check (
    (combo_id is null and combo_cantidad = 0 and combo_nombre is null and combo_precio is null
      and combo_pochoclo_id is null and combo_bebida_id is null)
    or (combo_id is not null and combo_cantidad > 0 and combo_nombre is not null and combo_precio > 0
      and combo_precio is not null and combo_pochoclo_id is not null and combo_bebida_id is not null)
  );
alter table public.detalles_pedido_candy
  add column cantidad_combo integer not null default 0
    check (cantidad_combo >= 0 and cantidad_combo <= cantidad);
commit;
