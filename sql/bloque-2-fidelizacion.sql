-- Cambio incremental. Ejecutar una vez desde el SQL Editor de Supabase.
-- No crea funciones, triggers ni tablas paralelas.
begin;

alter table public.recompensas
  add column producto_candy_id bigint references public.productos_candy(id);

-- El catálogo actual contiene una recompensa y un producto con este nombre.
update public.recompensas set producto_candy_id =
  (select id from public.productos_candy where nombre = 'Pochoclo grande' order by id limit 1)
where tipo = 'candy' and nombre = 'Pochoclo grande';

alter table public.movimientos_puntos
  add column beneficio_tipo text check (beneficio_tipo in ('entrada', 'candy')),
  add column beneficio_nombre text,
  add column producto_candy_id bigint references public.productos_candy(id),
  add column codigo_beneficio uuid unique,
  add column entregado_at timestamptz,
  add column pedido_candy_id bigint references public.pedidos_candy(id);

-- Reconocer también el canje histórico, que ya descontó puntos.
update public.movimientos_puntos m set
  beneficio_tipo = r.tipo, beneficio_nombre = r.nombre,
  producto_candy_id = r.producto_candy_id, codigo_beneficio = gen_random_uuid()
from public.recompensas r where m.recompensa_id = r.id and m.tipo = 'canje';

alter table public.compras
  add column beneficio_id bigint unique references public.movimientos_puntos(id),
  add column descuento_beneficio numeric not null default 0 check (descuento_beneficio >= 0);

-- Cada origen puede acreditar puntos una sola vez. No se eliminan duplicados:
-- si existiesen, el script falla y conserva los datos para su revisión.
create unique index movimientos_compra_unica on public.movimientos_puntos(compra_id)
  where tipo = 'compra' and pedido_candy_id is null;
create unique index movimientos_pedido_unico on public.movimientos_puntos(pedido_candy_id)
  where pedido_candy_id is not null;
create unique index pedido_por_compra_unico on public.pedidos_candy(compra_id);
create unique index detalle_producto_unico on public.detalles_pedido_candy(pedido_candy_id, producto_id);

commit;
