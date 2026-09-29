begin;
-- Las identidades existentes se usan únicamente dentro de esta transacción revertida.
select set_config('test.usuario',(select id::text from auth.users where is_anonymous = false limit 1),true);
select set_config('test.pelicula',(select id::text from public.peliculas order by id limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.usuario'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.usuario'),'is_anonymous',false)::text,true);
set local role authenticated;
insert into public.resenas(pelicula_id,usuario_id,estrellas,comentario)
 values(current_setting('test.pelicula')::bigint,auth.uid(),4,'Prueba reversible');
update public.resenas set estrellas=5 where usuario_id=auth.uid();
do $$ begin
 if (select promedio from public.resenas_resumen where pelicula_id=current_setting('test.pelicula')::bigint) <> 5 then raise exception 'Promedio incorrecto'; end if;
 begin
  insert into public.resenas(pelicula_id,usuario_id,estrellas,comentario) values(current_setting('test.pelicula')::bigint,auth.uid(),3,'Duplicada');
  raise exception 'Aceptó duplicado';
 exception when unique_violation then null; end;
 begin
  update public.resenas set estrellas=6 where usuario_id=auth.uid();
  raise exception 'Aceptó estrellas inválidas';
 exception when check_violation then null; end;
 begin
  update public.resenas set comentario='   ' where usuario_id=auth.uid();
  raise exception 'Aceptó comentario vacío';
 exception when check_violation then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'is_anonymous',false)::text,true);
set local role authenticated;
do $$ declare afectadas integer; begin
 update public.resenas set estrellas=1 where usuario_id=current_setting('test.usuario')::uuid;
 get diagnostics afectadas=row_count;
 if afectadas <> 0 then raise exception 'Editó reseña ajena'; end if;
 begin
  insert into public.resenas(pelicula_id,usuario_id,estrellas,comentario) values(current_setting('test.pelicula')::bigint,current_setting('test.usuario')::uuid,1,'Suplantación');
  raise exception 'Aceptó autor ajeno';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 if not exists(select 1 from public.resenas_resumen where pelicula_id=current_setting('test.pelicula')::bigint) then raise exception 'Sin lectura pública'; end if;
 begin
  insert into public.resenas(pelicula_id,usuario_id,estrellas,comentario) values(current_setting('test.pelicula')::bigint,current_setting('test.usuario')::uuid,1,'Anónimo');
  raise exception 'Aceptó escritura anónima';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Una compra con dos butacas debe sumar dos, nunca uno por su QR.
do $$ declare funcion bigint; pelicula bigint; token uuid := gen_random_uuid(); compra bigint; antes bigint; despues bigint; begin
 select f.id,f.pelicula_id into funcion,pelicula from public.funciones f limit 1;
 if funcion is null then raise exception 'No hay función para verificar'; end if;
 select coalesce((select entradas_vendidas from public.ranking_peliculas where pelicula_id=pelicula),0) into antes;
 insert into public.compras(reserva_token,funcion_id,total,estado) values(token,funcion,100,'pendiente') returning id into compra;
 insert into public.butacas_funcion(funcion_id,fila,numero,estado,reserva_token)
 values(funcion,'PRUEBA',9001,'ocupada',token),(funcion,'PRUEBA',9002,'ocupada',token);
 select coalesce((select entradas_vendidas from public.ranking_peliculas where pelicula_id=pelicula),0) into despues;
 if despues <> antes then raise exception 'Cuenta pendientes'; end if;
 update public.compras set estado='pagada' where id=compra;
 select entradas_vendidas into despues from public.ranking_peliculas where pelicula_id=pelicula;
 if despues <> antes+2 then raise exception 'No cuenta las dos butacas'; end if;
 update public.compras set estado='cancelada' where id=compra;
 select coalesce((select entradas_vendidas from public.ranking_peliculas where pelicula_id=pelicula),0) into despues;
 if despues <> antes then raise exception 'Cuenta canceladas'; end if;
end $$;
rollback;
select 'Reseñas, permisos y ranking verificados; datos revertidos' as resultado;
