begin;
create table public.resenas (
  pelicula_id bigint not null references public.peliculas(id),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  estrellas integer not null check (estrellas between 1 and 5),
  comentario text not null check (length(trim(comentario)) between 1 and 300),
  created_at timestamptz not null default now(),
  primary key (pelicula_id, usuario_id)
);
alter table public.resenas enable row level security;
revoke all on public.resenas from anon, authenticated;
grant select on public.resenas to anon, authenticated;
grant insert (pelicula_id,usuario_id,estrellas,comentario), update (estrellas,comentario) on public.resenas to authenticated;
create policy resenas_publicas on public.resenas for select to anon, authenticated using (true);
create policy resenas_propias_alta on public.resenas for insert to authenticated
  with check ((select auth.uid()) = usuario_id and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true');
create policy resenas_propias_edicion on public.resenas for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true');
-- Calculamos el promedio desde las reseñas: no hay contadores que puedan desactualizarse.
create view public.resenas_resumen with (security_invoker = true) as
  select pelicula_id, round(avg(estrellas),1) as promedio, count(*) as cantidad
  from public.resenas group by pelicula_id;
-- Una compra puede cubrir varias butacas. No contamos QR ni pedidos Candy como ventas.
create view public.ranking_peliculas with (security_invoker = true) as
  select f.pelicula_id, count(b.id) as entradas_vendidas
  from public.compras c join public.funciones f on f.id = c.funcion_id
  join public.butacas_funcion b on b.funcion_id = c.funcion_id and b.reserva_token = c.reserva_token
  where c.estado = 'pagada' and b.estado = 'ocupada'
  group by f.pelicula_id;
grant select on public.resenas_resumen, public.ranking_peliculas to anon, authenticated;
commit;
