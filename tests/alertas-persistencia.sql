begin;
select set_config('test.usuario',(select id::text from auth.users where not is_anonymous limit 1),true);
select set_config('test.pelicula',(select id::text from public.peliculas limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.usuario'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.usuario'),'is_anonymous',false)::text,true);
set local role authenticated;
insert into public.alertas_estrenos(usuario_id,pelicula_id) values(auth.uid(),current_setting('test.pelicula')::bigint);
do $$ begin
 begin
  insert into public.alertas_estrenos(usuario_id,pelicula_id) values(auth.uid(),current_setting('test.pelicula')::bigint);
  raise exception 'Permitió duplicar suscripción';
 exception when unique_violation then null; end;
 update public.alertas_estrenos set notificada_at=now(),leida=false where usuario_id=auth.uid();
 update public.alertas_estrenos set leida=true where usuario_id=auth.uid();
 if not exists(select 1 from public.alertas_estrenos where usuario_id=auth.uid() and leida and notificada_at is not null) then raise exception 'Aviso no persistió'; end if;
 update public.alertas_estrenos set activa=false where usuario_id=auth.uid();
 if exists(select 1 from public.alertas_estrenos where usuario_id=auth.uid() and activa) then raise exception 'No desactivó'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'is_anonymous',false)::text,true);
set local role authenticated;
do $$ declare filas integer; begin
 if exists(select 1 from public.alertas_estrenos where usuario_id=current_setting('test.usuario')::uuid) then raise exception 'Leyó alerta ajena'; end if;
 update public.alertas_estrenos set activa=true where usuario_id=current_setting('test.usuario')::uuid;
 get diagnostics filas=row_count;if filas<>0 then raise exception 'Editó alerta ajena'; end if;
 begin
  insert into public.alertas_estrenos(usuario_id,pelicula_id) values(current_setting('test.usuario')::uuid,current_setting('test.pelicula')::bigint);
  raise exception 'Suplantó usuario';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform 1 from public.alertas_estrenos;
  raise exception 'Visitante leyó alertas';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Alertas: unicidad, persistencia y aislamiento verificados; datos revertidos' as resultado;
