-- Pruebas contra la base real; no dejan productos, combos ni compras de prueba.
begin;
insert into public.combos(id,nombre,precio,pochoclo_id,bebida_id,activo) overriding system value
select -930001,'Combo prueba',12000,p.id,b.id,true from public.productos_candy p,public.productos_candy b
where p.nombre='Pochoclo chico' and b.nombre='Gaseosa chica';
insert into public.combos(id,nombre,precio,pochoclo_id,bebida_id,activo) overriding system value
select -930002,'Combo inactivo',15000,pochoclo_id,bebida_id,false from public.combos where id=-930001;
set local role anon;
do $$ begin
  assert (select count(*)=1 from public.combos where id in (-930001,-930002)), 'Anon ve combos inactivos';
  begin
    insert into public.combos(nombre,precio,pochoclo_id,bebida_id) values ('No permitido',100,8,11);
    raise exception 'Anon pudo crear combo';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.perfiles where rol='admin' limit 1),true);
set local role authenticated;
do $$ declare filas integer; begin
  update public.combos set precio=13000 where id=-930002;
  get diagnostics filas=row_count;
  assert filas=1, 'Admin no pudo editar combo inactivo';
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare filas integer; begin
  update public.combos set precio=1 where id=-930001;
  get diagnostics filas=row_count;
  assert filas=0, 'Usuario sin rol admin pudo modificar combo';
end $$;
reset role;
do $$
declare usuario uuid; funcion bigint; producto bigint; bebida bigint;
begin
  select id into usuario from public.perfiles limit 1;
  select id into funcion from public.funciones limit 1;
  select pochoclo_id,bebida_id into producto,bebida from public.combos where id=-930001;
  insert into public.compras(id,reserva_token,usuario_id,funcion_id,total,combo_id,combo_nombre,combo_precio,combo_cantidad,combo_pochoclo_id,combo_bebida_id)
    overriding system value values (-930001,gen_random_uuid(),usuario,funcion,12000,-930001,'Combo prueba',12000,1,producto,bebida);
  update public.combos set precio=20000,activo=false where id=-930001;
  assert (select combo_precio=12000 and total=12000 from public.compras where id=-930001), 'La edición cambió el histórico';
  insert into public.pedidos_candy(id,compra_id,total) overriding system value values (-930001,-930001,5000);
  insert into public.detalles_pedido_candy(id,pedido_candy_id,producto_id,cantidad,cantidad_combo,precio_unitario,subtotal)
    overriding system value values (-930001,-930001,producto,3,1,2500,5000),(-930002,-930001,bebida,1,1,2000,0);
  assert (select sum(subtotal)=5000 and sum(cantidad_combo)=2 from public.detalles_pedido_candy where pedido_candy_id=-930001), 'Importes de Candy incorrectos';
  begin
    update public.detalles_pedido_candy set cantidad_combo=4 where id=-930001;
    raise exception 'Se admitieron más unidades incluidas que entregables';
  exception when check_violation then null;
  end;
  begin
    update public.compras set combo_cantidad=0 where id=-930001;
    raise exception 'Se admitió una copia de combo inválida';
  exception when check_violation then null;
  end;
end $$;
rollback;
select 'RLS, histórico, productos incluidos y restricciones: OK. Pruebas revertidas.' as resultado;
