begin;
alter table public.compras
 add column cancelada_at timestamptz,
 add column credito_reintegro numeric(12,2) not null default 0 check (credito_reintegro >= 0),
 add column cancelacion_completa boolean not null default false;
create table public.movimientos_credito (
 id bigint generated always as identity primary key,
 usuario_id uuid not null references auth.users(id),
 compra_id bigint not null references public.compras(id),
 tipo text not null check (tipo in ('uso','reintegro')),
 monto numeric(12,2) not null,
 anterior_id bigint unique,
 saldo_anterior numeric(12,2) not null check (saldo_anterior >= 0),
 saldo numeric(12,2) not null check (saldo >= 0),
 created_at timestamptz not null default now(),
 unique(compra_id,tipo),
 unique(id,usuario_id,saldo),
 foreign key (anterior_id,usuario_id,saldo_anterior) references public.movimientos_credito(id,usuario_id,saldo),
 check (saldo = saldo_anterior + monto),
 check ((tipo = 'uso' and monto < 0) or (tipo = 'reintegro' and monto > 0)),
 check (anterior_id is not null or saldo_anterior = 0),
 check (anterior_id is null or anterior_id < id)
);
-- Un solo inicio y un solo sucesor: dos pestañas no pueden gastar el mismo saldo.
create unique index credito_inicio_unico on public.movimientos_credito(usuario_id) where anterior_id is null;
create index credito_usuario_ultimo on public.movimientos_credito(usuario_id,id desc);
alter table public.movimientos_credito enable row level security;
revoke all on public.movimientos_credito from anon,authenticated;
grant select,insert on public.movimientos_credito to authenticated;
grant usage,select on sequence public.movimientos_credito_id_seq to authenticated;
create policy credito_lectura_propia on public.movimientos_credito for select to authenticated
 using (usuario_id = (select auth.uid()));
create policy credito_movimiento_propio on public.movimientos_credito for insert to authenticated
 with check (usuario_id = (select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true'
 and exists(select 1 from public.compras c where c.id=compra_id and c.usuario_id=(select auth.uid())
 and ((tipo='reintegro' and c.estado='cancelada' and c.credito_reintegro=monto)
 or (tipo='uso' and c.estado='pendiente' and -monto <= c.total + coalesce((select p.total from public.pedidos_candy p where p.compra_id=c.id and p.estado <> 'cancelado'),0)))));
alter table public.movimientos_puntos drop constraint movimientos_tipo_valido;
alter table public.movimientos_puntos add constraint movimientos_tipo_valido check (tipo in ('compra','canje','cancelacion'));
create unique index puntos_cancelacion_unica on public.movimientos_puntos(compra_id) where tipo='cancelacion';
commit;
