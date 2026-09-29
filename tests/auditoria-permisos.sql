begin;
select set_config('test.admin',(select id::text from public.perfiles where rol='admin' limit 1),true);
do $$ begin
 if nullif(current_setting('test.admin'),'') is null then raise exception 'Falta perfil admin para probar'; end if;
end $$;
insert into public.auditoria(usuario_id,accion,entidad,entidad_id,detalles)
values(current_setting('test.admin')::uuid,'funcion_creada','funciones',1,'{"prueba":true}');
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.admin'),'is_anonymous',false)::text,true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.auditoria where detalles='{"prueba":true}'::jsonb) then raise exception 'Admin no puede leer'; end if;
 begin
  insert into public.auditoria(usuario_id,accion,entidad,entidad_id) values(auth.uid(),'funcion_creada','funciones',1);
  raise exception 'Permitió inventar evento';
 exception when insufficient_privilege then null; end;
 begin
  update public.auditoria set detalles='{}';
  raise exception 'Permitió modificar evento';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.auditoria;
  raise exception 'Permitió borrar evento';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('request.jwt.claim.sub'),'is_anonymous',false)::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.auditoria) then raise exception 'Usuario sin rol admin pudo leer'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.admin'),'is_anonymous',true)::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.auditoria) then raise exception 'Sesión anónima pudo leer'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform id from public.auditoria;
  raise exception 'Visitante pudo leer';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'RLS y permisos de auditoría verificados; datos de prueba revertidos' as resultado;
