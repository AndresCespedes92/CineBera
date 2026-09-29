begin;
select set_config('test.usuario',(select id::text from auth.users where not is_anonymous limit 1),true);
select set_config('test.funcion',(select id::text from public.funciones limit 1),true);
-- Solo fixtures nuevas. Ninguna compra real se cancela o modifica.
do $$ declare c1 bigint; c2 bigint; c3 bigint; c4 bigint; begin
 insert into public.compras(usuario_id,funcion_id,reserva_token,total,estado,credito_reintegro,cancelada_at)
 values(current_setting('test.usuario')::uuid,current_setting('test.funcion')::bigint,gen_random_uuid(),100,'cancelada',100,now()) returning id into c1;
 insert into public.compras(usuario_id,funcion_id,reserva_token,total,estado)
 values(current_setting('test.usuario')::uuid,current_setting('test.funcion')::bigint,gen_random_uuid(),80,'pendiente') returning id into c2;
 insert into public.compras(usuario_id,funcion_id,reserva_token,total,estado)
 values(current_setting('test.usuario')::uuid,current_setting('test.funcion')::bigint,gen_random_uuid(),80,'pendiente') returning id into c3;
 insert into public.compras(usuario_id,funcion_id,reserva_token,total,estado,credito_reintegro,cancelada_at)
 values(current_setting('test.usuario')::uuid,current_setting('test.funcion')::bigint,gen_random_uuid(),100,'cancelada',100,now()) returning id into c4;
 perform set_config('test.c1',c1::text,true);perform set_config('test.c2',c2::text,true);perform set_config('test.c3',c3::text,true);perform set_config('test.c4',c4::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.usuario'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.usuario'),'is_anonymous',false)::text,true);
set local role authenticated;
do $$ declare primero bigint; segundo bigint; begin
 insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
 values(auth.uid(),current_setting('test.c1')::bigint,'reintegro',100,null,0,100) returning id into primero;
 begin
  insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
  values(auth.uid(),current_setting('test.c1')::bigint,'reintegro',100,primero,100,200);
  raise exception 'Duplicó reintegro';
 exception when unique_violation then null; end;
 insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
 values(auth.uid(),current_setting('test.c2')::bigint,'uso',-80,primero,100,20) returning id into segundo;
 begin
  insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
  values(auth.uid(),current_setting('test.c3')::bigint,'uso',-80,primero,100,20);
  raise exception 'Permitió dos sucesores del mismo saldo';
 exception when unique_violation then null; end;
 begin
  insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
  values(auth.uid(),current_setting('test.c3')::bigint,'uso',-80,segundo,20,-60);
  raise exception 'Permitió saldo negativo';
 exception when check_violation then null; end;
 begin
  insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
  values(auth.uid(),current_setting('test.c3')::bigint,'uso',-80,segundo,100,20);
  raise exception 'Permitió inventar saldo anterior';
 exception when foreign_key_violation then null; end;
 begin
  insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
  values(auth.uid(),current_setting('test.c4')::bigint,'reintegro',100,null,0,100);
  raise exception 'Permitió reiniciar saldo';
 exception when unique_violation then null; end;
 begin
  update public.movimientos_credito set saldo=10000 where id=segundo;
  raise exception 'Permitió editar movimientos';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
  values(auth.uid(),current_setting('test.c4')::bigint,'reintegro',500,segundo,20,520);
  raise exception 'Permitió reintegro mayor al registrado';
 exception when insufficient_privilege then null; end;
 if (select saldo from public.movimientos_credito order by id desc limit 1)<>20 then raise exception 'Saldo final incorrecto'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'is_anonymous',false)::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.movimientos_credito where usuario_id=current_setting('test.usuario')::uuid) then raise exception 'Leyó saldo ajeno'; end if;
 begin
  insert into public.movimientos_credito(usuario_id,compra_id,tipo,monto,anterior_id,saldo_anterior,saldo)
  values(current_setting('test.usuario')::uuid,current_setting('test.c4')::bigint,'reintegro',100,null,0,100);
  raise exception 'Permitió escribir como otro usuario';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Crédito: unicidad, saldo, propietario y restricciones verificados; fixtures revertidas' as resultado;
