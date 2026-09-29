begin;
create table public.alertas_estrenos (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 pelicula_id bigint not null references public.peliculas(id),
 activa boolean not null default true,
 notificada_at timestamptz,
 leida boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(usuario_id,pelicula_id)
);
alter table public.alertas_estrenos enable row level security;
revoke all on public.alertas_estrenos from anon,authenticated;
grant select,insert,update on public.alertas_estrenos to authenticated;
create policy alertas_lectura on public.alertas_estrenos for select to authenticated using (usuario_id=(select auth.uid()));
create policy alertas_alta on public.alertas_estrenos for insert to authenticated
 with check (usuario_id=(select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
create policy alertas_edicion on public.alertas_estrenos for update to authenticated
 using (usuario_id=(select auth.uid()))
 with check (usuario_id=(select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true');
commit;
