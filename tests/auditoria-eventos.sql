begin;
do $$
declare
 administrador uuid; empleado uuid; funcion bigint; compra bigint; entrada bigint; pedido bigint; beneficio bigint; combo bigint;
 pelicula bigint; producto bigint; bebida bigint; base bigint; antes numeric; n bigint;
begin
 select id into administrador from public.perfiles where rol='admin' limit 1;
 select id into empleado from public.perfiles where rol='cliente' limit 1;
 if administrador is null or empleado is null then raise exception 'Faltan perfiles para la prueba'; end if;
 -- El cambio de rol es temporal y se revierte al finalizar.
 update public.perfiles set rol='empleado' where id=empleado;
 perform set_config('request.jwt.claim.sub',administrador::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',administrador,'is_anonymous',false)::text,true);
 select coalesce(max(id),0) into base from public.auditoria;
 select id into pelicula from public.peliculas order by id limit 1;
 select p.id into producto from public.productos_candy p join public.categorias_candy c on c.id=p.categoria_id where c.nombre='Pochoclos' limit 1;
 select p.id into bebida from public.productos_candy p join public.categorias_candy c on c.id=p.categoria_id where c.nombre='Bebidas' limit 1;
 execute 'set local role authenticated';
 insert into public.funciones(pelicula_id,sala_id,fecha,hora,formato,idioma)
 values(pelicula,(select id from public.salas limit 1),'2099-12-30','17:00','2D','Español') returning id into funcion;
 if not exists(select 1 from public.auditoria where id>base and entidad='funciones' and entidad_id=funcion and usuario_id=administrador) then raise exception 'Falta evento de función'; end if;
 update public.peliculas set precio_venta=coalesce(precio_venta,0)+1,precio_preventa=coalesce(precio_preventa,0)+1 where id=pelicula;
 update public.productos_candy set precio=precio+1 where id=producto;
 insert into public.combos(nombre,precio,pochoclo_id,bebida_id) values('Prueba auditoría',100,producto,bebida) returning id into combo;
 update public.combos set precio=101 where id=combo;
 select count(*) into n from public.auditoria where id>base;
 if n<>4 then raise exception 'Se esperaban 4 eventos iniciales, hay %',n; end if;
 if not exists(select 1 from public.auditoria where id>base and entidad='combos' and (detalles->>'precio_anterior')::numeric=100 and (detalles->>'precio_nuevo')::numeric=101) then raise exception 'Importes incorrectos'; end if;
 -- Guardar el mismo precio y modificar otro atributo no genera eventos.
 update public.productos_candy set precio=precio where id=producto;
 update public.peliculas set visible=visible where id=pelicula;
 insert into public.compras(reserva_token,usuario_id,funcion_id,total,estado,pagada_at)
 values(gen_random_uuid(),administrador,funcion,100,'pagada',now()) returning id into compra;
 insert into public.entradas(compra_id) values(compra) returning id into entrada;
 insert into public.pedidos_candy(compra_id,total,estado) values(compra,10,'pagado') returning id into pedido;
 insert into public.movimientos_puntos(usuario_id,tipo,puntos,beneficio_tipo,producto_candy_id,codigo_beneficio)
 values(administrador,'canje',-1,'candy',producto,gen_random_uuid()) returning id into beneficio;
 perform set_config('request.jwt.claim.sub',empleado::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',empleado,'is_anonymous',false)::text,true);
 update public.entradas set utilizada=true,utilizada_at=now() where id=entrada and not utilizada;
 update public.pedidos_candy set entregado=true,entregado_at=now() where id=pedido and not entregado;
 update public.movimientos_puntos set entregado_at=now() where id=beneficio and entregado_at is null;
 -- Reintento de actualización idéntica y condicional: ninguno duplica auditoría.
 update public.entradas set utilizada=true where id=entrada;
 update public.pedidos_candy set entregado=true where id=pedido and not entregado;
 update public.movimientos_puntos set entregado_at=now() where id=beneficio;
 if exists(select 1 from public.auditoria) then raise exception 'Empleado pudo leer auditoría'; end if;
 begin
  update public.productos_candy set precio=precio+1 where id=producto;
  raise exception 'Empleado cambió precio';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 begin
  update public.productos_candy set precio=precio+1 where id=producto;
  raise exception 'Operación sin actor permitida';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',administrador::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',administrador,'is_anonymous',false)::text,true);
 select count(*) into n from public.auditoria where id>base;
 if n<>7 then raise exception 'Duplicó u omitió eventos: %',n; end if;
 if (select count(*) from public.auditoria where id>base and accion='qr_validado' and usuario_id=empleado)<>3 then raise exception 'Actor incorrecto en QR'; end if;
 if exists(select 1 from public.auditoria where id>base and (detalles ? 'codigo' or detalles ? 'reserva_token' or detalles ? 'codigo_beneficio')) then raise exception 'Guardó secretos'; end if;
 -- Simular un fallo al registrar auditoría; comprobar reversión del precio.
 select precio into antes from public.productos_candy where id=producto;
 execute 'reset role';
 alter table public.auditoria add constraint prueba_fallo_auditoria check (false) not valid;
 execute 'set local role authenticated';
 begin
  update public.productos_candy set precio=precio+1 where id=producto;
  raise exception 'No propagó fallo de auditoría';
 exception when check_violation then null; end;
 if (select precio from public.productos_candy where id=producto)<>antes then raise exception 'Cambio parcial pese al fallo'; end if;
 if (select count(*) from public.auditoria where id>base)<>7 then raise exception 'Evento parcial pese al fallo'; end if;
 execute 'reset role';
 alter table public.auditoria drop constraint prueba_fallo_auditoria;
 if has_function_privilege('authenticated','auditoria_interna.registrar_cambio()','EXECUTE') then raise exception 'Expuso función al cliente'; end if;
end $$;
rollback;
select '7 eventos, actores, importes, permisos, reintentos y rollback atómico verificados; fixtures revertidas' as resultado;
