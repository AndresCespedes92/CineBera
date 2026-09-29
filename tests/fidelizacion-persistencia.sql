-- Pruebas de persistencia. Todos los cambios se revierten al finalizar.
-- No crea funciones ni deja datos de prueba.
begin;
do $$
declare
  usuario uuid;
  funcion bigint;
  producto bigint;
  recompensa_entrada bigint;
  recompensa_candy bigint;
  filas integer;
begin
  select id into usuario from public.perfiles order by id limit 1;
  select id into funcion from public.funciones order by id limit 1;
  select id into producto from public.productos_candy order by id limit 1;
  select id into recompensa_entrada from public.recompensas where tipo='entrada' order by id limit 1;
  select id into recompensa_candy from public.recompensas where tipo='candy' order by id limit 1;
  assert usuario is not null and funcion is not null and producto is not null, 'Faltan datos base';

  insert into public.movimientos_puntos(id,usuario_id,recompensa_id,tipo,puntos,beneficio_tipo,beneficio_nombre,codigo_beneficio)
    overriding system value values (-920001,usuario,recompensa_entrada,'canje',-500,'entrada','Prueba entrada',gen_random_uuid());
  assert (select puntos=-500 and codigo_beneficio is not null from public.movimientos_puntos where id=-920001), 'Canje incompleto';

  insert into public.compras(id,reserva_token,usuario_id,funcion_id,total)
    overriding system value values (-920001,gen_random_uuid(),usuario,funcion,8000),(-920002,gen_random_uuid(),usuario,funcion,8000);
  update public.compras set estado='pagada',total=0,beneficio_id=-920001,descuento_beneficio=8000,pagada_at=now()
    where id=-920001 and estado='pendiente';
  get diagnostics filas = row_count;
  assert filas=1, 'Primera utilización rechazada';
  begin
    update public.compras set estado='pagada',total=0,beneficio_id=-920001 where id=-920002;
    raise exception 'La misma recompensa pudo usarse dos veces';
  exception when unique_violation then null;
  end;
  assert (select estado='pendiente' and total=8000 from public.compras where id=-920002), 'El rechazo dejó cambios parciales';

  insert into public.movimientos_puntos(id,usuario_id,recompensa_id,tipo,puntos,beneficio_tipo,beneficio_nombre,producto_candy_id,codigo_beneficio)
    overriding system value values (-920002,usuario,recompensa_candy,'canje',-200,'candy','Prueba Candy',producto,gen_random_uuid());
  update public.movimientos_puntos set entregado_at=now() where id=-920002 and entregado_at is null;
  get diagnostics filas=row_count;
  assert filas=1, 'Primera entrega rechazada';
  update public.movimientos_puntos set entregado_at=now() where id=-920002 and entregado_at is null;
  get diagnostics filas=row_count;
  assert filas=0, 'Se entregó Candy dos veces';

  insert into public.movimientos_puntos(id,usuario_id,compra_id,tipo,puntos)
    overriding system value values (-920003,usuario,-920001,'compra',100);
  begin
    insert into public.movimientos_puntos(id,usuario_id,compra_id,tipo,puntos)
      overriding system value values (-920004,usuario,-920001,'compra',100);
    raise exception 'Se acreditaron entradas dos veces';
  exception when unique_violation then null;
  end;

  insert into public.pedidos_candy(id,compra_id,total) overriding system value values (-920001,-920001,500);
  update public.pedidos_candy set entregado=true where id=-920001 and estado='pagado' and entregado=false;
  get diagnostics filas=row_count;
  assert filas=0, 'Se entregó un pedido impago';
  update public.pedidos_candy set estado='pagado' where id=-920001;
  insert into public.movimientos_puntos(id,usuario_id,compra_id,pedido_candy_id,tipo,puntos)
    overriding system value values (-920004,usuario,-920001,-920001,'compra',500);
  begin
    insert into public.movimientos_puntos(id,usuario_id,compra_id,pedido_candy_id,tipo,puntos)
      overriding system value values (-920005,usuario,-920001,-920001,'compra',500);
    raise exception 'Se acreditó Candy dos veces';
  exception when unique_violation then null;
  end;
  assert (select count(*)=2 from public.movimientos_puntos where compra_id=-920001), 'Entradas y Candy no se acreditan por separado';
end $$;
rollback;
select 'Pruebas de canje, uso único, entrega y acreditación: OK. Datos revertidos.' as resultado;
