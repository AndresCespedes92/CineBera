begin;
create schema if not exists auditoria_interna;
revoke all on schema auditoria_interna from public,anon,authenticated;
create function auditoria_interna.registrar_cambio()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 rol_actor text;
 accion_evento text;
 datos jsonb;
begin
 if tg_table_name='funciones' then
  accion_evento := 'funcion_creada';
  datos := jsonb_build_object('pelicula_id',new.pelicula_id,'sala_id',new.sala_id,'fecha',new.fecha,'hora',new.hora);
 elsif tg_table_name='peliculas' then
  if old.precio_preventa is not distinct from new.precio_preventa and old.precio_venta is not distinct from new.precio_venta then return new; end if;
  accion_evento := 'precio_modificado';
  datos := jsonb_build_object('precio_preventa_anterior',old.precio_preventa,'precio_preventa_nuevo',new.precio_preventa,
   'precio_venta_anterior',old.precio_venta,'precio_venta_nuevo',new.precio_venta);
 elsif tg_table_name in ('productos_candy','combos') then
  if old.precio is not distinct from new.precio then return new; end if;
  accion_evento := 'precio_modificado';
  datos := jsonb_build_object('precio_anterior',old.precio,'precio_nuevo',new.precio);
 elsif tg_table_name='entradas' then
  if old.utilizada or not new.utilizada then return new; end if;
  if not exists(select 1 from public.compras c where c.id=new.compra_id and c.estado='pagada') then
   raise exception 'La compra no está pagada.' using errcode='23514';
  end if;
  accion_evento := 'qr_validado';
  datos := jsonb_build_object('operacion','ingreso','compra_id',new.compra_id);
 elsif tg_table_name='pedidos_candy' then
  if old.entregado or not new.entregado then return new; end if;
  if new.estado<>'pagado' or not exists(select 1 from public.compras c where c.id=new.compra_id and c.estado='pagada') then
   raise exception 'El pedido o la compra no está pagado.' using errcode='23514';
  end if;
  accion_evento := 'qr_validado';
  datos := jsonb_build_object('operacion','retiro_candy','compra_id',new.compra_id);
 elsif tg_table_name='movimientos_puntos' then
  if old.entregado_at is not null or new.entregado_at is null or new.tipo<>'canje' or new.beneficio_tipo is distinct from 'candy' then return new; end if;
  accion_evento := 'qr_validado';
  datos := jsonb_build_object('operacion','retiro_beneficio_candy','producto_id',new.producto_candy_id);
 else
  raise exception 'Tabla de auditoría no admitida.';
 end if;
 if actor is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
  raise exception 'Iniciá sesión como personal para esta operación.' using errcode='42501';
 end if;
 select p.rol into rol_actor from public.perfiles p where p.id=actor;
 if (accion_evento='qr_validado' and coalesce(rol_actor,'') not in ('admin','empleado'))
 or (accion_evento<>'qr_validado' and rol_actor is distinct from 'admin') then
  raise exception 'No tenés permisos para esta operación.' using errcode='42501';
 end if;
 insert into public.auditoria(usuario_id,accion,entidad,entidad_id,detalles)
 values(actor,accion_evento,tg_table_name,new.id,datos);
 return new;
end;
$$;
revoke all on function auditoria_interna.registrar_cambio() from public,anon,authenticated;
create trigger auditar_funcion_creada after insert on public.funciones for each row execute function auditoria_interna.registrar_cambio();
create trigger auditar_precio_pelicula after update of precio_preventa,precio_venta on public.peliculas for each row execute function auditoria_interna.registrar_cambio();
create trigger auditar_precio_producto after update of precio on public.productos_candy for each row execute function auditoria_interna.registrar_cambio();
create trigger auditar_precio_combo after update of precio on public.combos for each row execute function auditoria_interna.registrar_cambio();
create trigger auditar_ingreso after update of utilizada on public.entradas for each row execute function auditoria_interna.registrar_cambio();
create trigger auditar_retiro_candy after update of entregado on public.pedidos_candy for each row execute function auditoria_interna.registrar_cambio();
create trigger auditar_retiro_beneficio after update of entregado_at on public.movimientos_puntos for each row execute function auditoria_interna.registrar_cambio();
commit;
