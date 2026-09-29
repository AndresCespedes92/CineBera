import { AlertaService, PeliculaAlerta, FuncionAlerta } from '../app/services/alerta';
import { Alertas } from '../app/pages/cliente/alertas/alertas';
import { Auth } from '../app/services/auth';
import { supabase } from '../app/supabase';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../app/app.routes';
import { authGuard } from '../app/guards/auth-guard';
const servicio=new AlertaService();
const ahora=new Date('2026-09-29T15:00:00Z');
const pelicula:PeliculaAlerta={id:1,titulo:'Estreno',visible:true,fecha_estreno_cinebera:'2026-10-01'};
const funcion:FuncionAlerta={pelicula_id:1,fecha:'2026-10-01',hora:'18:00:00',activa:true};
const alerta={usuario_id:'yo',pelicula_id:1,activa:true,notificada_at:null,leida:false};
let respuestas:{tabla:string;data:unknown;error?:unknown}[];
let consultas:{tabla:string;pasos:{metodo:string;args:unknown[]}[]}[];
const r=(tabla:string,data:unknown,error?:unknown)=>respuestas.push({tabla,data,error});
beforeEach(()=>{
 respuestas=[];consultas=[];servicio.noLeidas.set(0);
 vi.spyOn(supabase.auth,'getUser').mockResolvedValue({data:{user:{id:'yo'}},error:null} as never);
 vi.spyOn(supabase,'from').mockImplementation(((tabla:string)=>{
  const respuesta=respuestas.shift();if(!respuesta)throw Error('Consulta inesperada '+tabla);expect(tabla).toBe(respuesta.tabla);
  const registro={tabla,pasos:[] as {metodo:string;args:unknown[]}[]};consultas.push(registro);const q:Record<string,unknown>={};
  for(const metodo of ['select','eq','order','range','single','maybeSingle','upsert','update','in','is','gte'])q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
  q['then']=(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:respuesta.data,error:respuesta.error??null}).then(resolve);return q;
 }) as never);
});
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});
describe('Disponibilidad de alertas',()=>{
 it('no avisa por fecha sin funciones',()=>expect(servicio.disponible(pelicula,[],ahora)).toBe(false));
 it('avisa dentro de preventa con función futura activa',()=>expect(servicio.disponible(pelicula,[funcion],ahora)).toBe(true));
 it('rechaza película oculta',()=>expect(servicio.disponible({...pelicula,visible:false},[funcion],ahora)).toBe(false));
 it('rechaza antes de la ventana de siete días',()=>expect(servicio.disponible({...pelicula,fecha_estreno_cinebera:'2026-10-07'},[{...funcion,fecha:'2026-10-07'}],ahora)).toBe(false));
 it('acepta el límite de siete días',()=>expect(servicio.disponible({...pelicula,fecha_estreno_cinebera:'2026-10-06'},[{...funcion,fecha:'2026-10-06'}],ahora)).toBe(true));
 it('rechaza función inactiva o de otra película',()=>{
  expect(servicio.disponible(pelicula,[{...funcion,activa:false}],ahora)).toBe(false);
  expect(servicio.disponible(pelicula,[{...funcion,pelicula_id:2}],ahora)).toBe(false);
 });
 it('no anuncia funciones fuera de la semana accesible',()=>expect(servicio.disponible(pelicula,[{...funcion,fecha:'2026-10-08'}],ahora)).toBe(false));
 it('no anuncia una función ya comenzada y usa hora argentina',()=>{
  const p={...pelicula,fecha_estreno_cinebera:'2026-09-24'};
  expect(servicio.disponible(p,[{...funcion,fecha:'2026-09-29',hora:'11:59:00'}],ahora)).toBe(false);
  expect(servicio.disponible(p,[{...funcion,fecha:'2026-09-29',hora:'12:01:00'}],ahora)).toBe(true);
 });
});
describe('Interés y aviso persistente',()=>{
 it.each([null,{id:'anon',is_anonymous:true}])('rechaza visitantes y cuentas anónimas',async user=>{
  vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user},error:null} as never);await expect(servicio.obtenerSuscripciones()).rejects.toThrow('sesión');expect(supabase.from).not.toHaveBeenCalled();
 });
 it('activa por usuario y película con clave única',async()=>{
  r('peliculas',{visible:true,fecha_estreno_cinebera:'2099-01-01'});r('alertas_estrenos',{pelicula_id:1});await servicio.activar(1);
  expect(consultas[1].pasos).toContainEqual({metodo:'upsert',args:[{...alerta},{onConflict:'usuario_id,pelicula_id'}]});
 });
 it.each([{visible:false,fecha_estreno_cinebera:'2099-01-01'},{visible:true,fecha_estreno_cinebera:'2000-01-01'}])('no activa película oculta o pasada',async p=>{
  r('peliculas',p);await expect(servicio.activar(1)).rejects.toThrow('futuras');expect(consultas).toHaveLength(1);
 });
 it('desactiva y marca leído solo para el usuario actual',async()=>{
  r('alertas_estrenos',{pelicula_id:1});await servicio.desactivar(1);
  expect(consultas[0].pasos).toContainEqual({metodo:'eq',args:['usuario_id','yo']});expect(consultas[0].pasos).toContainEqual({metodo:'update',args:[{activa:false}]});
  r('alertas_estrenos',{pelicula_id:1});await servicio.marcarLeida(1);expect(consultas[1].pasos).toContainEqual({metodo:'update',args:[{leida:true}]});
 });
 it('un error de consulta no se presenta como lista vacía',async()=>{r('alertas_estrenos',null,{});await expect(servicio.consultar()).rejects.toThrow('cargar');});
 it('sin intereses no consulta funciones',async()=>{r('alertas_estrenos',[]);expect(await servicio.consultar()).toEqual([]);expect(consultas).toHaveLength(1);});
 it('persiste el primer aviso y actualiza el contador',async()=>{
  vi.spyOn(servicio,'disponible').mockReturnValue(true);
  r('alertas_estrenos',[alerta]);r('peliculas',[pelicula]);r('funciones',[funcion]);r('alertas_estrenos',[]);
  r('alertas_estrenos',[{...alerta,notificada_at:'2026-09-29'}]);
  const filas=await servicio.consultar();expect(filas[0].notificada_at).toBe('2026-09-29');expect(servicio.noLeidas()).toBe(1);
  expect(consultas[3].pasos).toContainEqual({metodo:'is',args:['notificada_at',null]});
 });
 it('no vuelve a generar un aviso ya leído',async()=>{
  vi.spyOn(servicio,'disponible').mockReturnValue(true);r('alertas_estrenos',[{...alerta,notificada_at:'2026-09-29',leida:true}]);r('peliculas',[pelicula]);r('funciones',[funcion]);
  await servicio.consultar();expect(servicio.noLeidas()).toBe(0);expect(consultas).toHaveLength(3);
 });
 it('si desactivaron la alerta durante el chequeo no muestra un aviso nuevo',async()=>{
  vi.spyOn(servicio,'disponible').mockReturnValue(true);r('alertas_estrenos',[alerta]);r('peliculas',[pelicula]);r('funciones',[funcion]);r('alertas_estrenos',[]);r('alertas_estrenos',[{...alerta,activa:false}]);
  expect(await servicio.consultar()).toEqual([]);expect(servicio.noLeidas()).toBe(0);
 });
 it('la ruta está protegida',()=>expect(routes.find(r=>r.path==='alertas')?.canActivate).toContain(authGuard));
 it('el template muestra el aviso y el enlace a funciones',async()=>{
  const servicioMock={consultar:async()=>[{...alerta,titulo:'Estreno',notificada_at:'2026-09-29',disponible:true}],noLeidas:()=>1};
  await TestBed.configureTestingModule({imports:[Alertas],providers:[provideRouter([]),{provide:AlertaService,useValue:servicioMock},{provide:Auth,useValue:{obtenerSesion:async()=>null}}]}).compileComponents();
  const fixture=TestBed.createComponent(Alertas);fixture.detectChanges();await vi.waitFor(()=>expect(fixture.componentInstance.filas()).toHaveLength(1));fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Nuevo aviso');expect(fixture.nativeElement.querySelector('a[href="/pelicula/1/funciones"]')).not.toBeNull();
 });
});
