begin;
create table public.auditoria (
 id bigint generated always as identity primary key,
 evento_id uuid not null default gen_random_uuid() unique,
 usuario_id uuid not null,
 accion text not null check (accion in ('funcion_creada','precio_modificado','qr_validado')),
 entidad text not null check (entidad in ('funciones','peliculas','productos_candy','combos','entradas','pedidos_candy','movimientos_puntos')),
 entidad_id bigint not null check (entidad_id > 0),
 detalles jsonb not null default '{}'::jsonb check (jsonb_typeof(detalles)='object' and octet_length(detalles::text)<=4096),
 created_at timestamptz not null default now()
);
comment on column public.auditoria.usuario_id is 'UUID del actor; se conserva aunque su cuenta se elimine.';
alter table public.auditoria enable row level security;
revoke all on public.auditoria from public,anon,authenticated;
revoke all on sequence public.auditoria_id_seq from public,anon,authenticated;
grant select on public.auditoria to authenticated;
create policy auditoria_lectura_admin on public.auditoria for select to authenticated
using (coalesce((select auth.jwt())->>'is_anonymous','false')<>'true'
 and exists(select 1 from public.perfiles p where p.id=(select auth.uid()) and p.rol='admin'));
create index auditoria_accion_id_idx on public.auditoria(accion,id desc);
commit;
