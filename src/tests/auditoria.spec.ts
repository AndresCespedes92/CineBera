import { EntradaService } from '../app/services/entrada';
import { ValidarEntrada } from '../app/pages/empleado/validar-entrada/validar-entrada';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { supabase } from '../app/supabase';
import { HoraCortaPipe } from '../app/pipes/hora-corta';
import { AuditoriaService } from '../app/services/auditoria';
import { Auditoria } from '../app/pages/admin/auditoria/auditoria';
import { RegistroAuditoria } from '../app/models/auditoria';
import { routes } from '../app/app.routes';
import { roleGuard } from '../app/guards/role-guard';
let respuestas: {tabla:string;data:unknown;error:unknown}[];
let consultas: {tabla:string;pasos:{metodo:string;args:unknown[]}[]}[];
const r=(tabla:string,data:unknown,error:unknown=null)=>respuestas.push({tabla,data,error});
beforeEach(()=>{
 respuestas=[];consultas=[];
 vi.spyOn(supabase.auth,'getUser').mockResolvedValue({data:{user:{id:'admin'}},error:null} as never);
 vi.spyOn(supabase,'from').mockImplementation(((tabla:string)=>{
  const respuesta=respuestas.shift();if(!respuesta) throw new Error('Consulta inesperada: '+tabla);
  expect(tabla).toBe(respuesta.tabla);const registro={tabla,pasos:[] as {metodo:string;args:unknown[]}[]};consultas.push(registro);
  const q:Record<string,unknown>={};
  for(const metodo of ['update','maybeSingle','select','eq','gte','gt','lt','in','order','limit','single']) q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
  q['then']=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:respuesta.data,error:respuesta.error}).then(resolve);
  return q;
 }) as never);
});
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});

const pipe=new HoraCortaPipe();
it.each([['17:30:00','17:30'],['00:00:00','00:00'],['23:59:59','23:59'],['09:05','09:05'],['08:12:10.123456','08:12']])('horaCorta transforma %s', (hora,esperado)=>expect(pipe.transform(hora)).toBe(esperado));
it.each([null,undefined,'','texto','25:00:00','12:60:00','12:10:90'])('horaCorta maneja entrada inválida %s',hora=>expect(pipe.transform(hora)).toBe('—'));
@Component({imports:[HoraCortaPipe],template:'<strong>{{ hora() | horaCorta }}</strong>'})
class PruebaHora {hora=signal('17:30:00');}
it('pipe funciona y actualiza un template Angular',async()=>{
 await TestBed.configureTestingModule({imports:[PruebaHora]}).compileComponents();const f=TestBed.createComponent(PruebaHora);f.detectChanges();expect(f.nativeElement.textContent).toBe('17:30');f.componentInstance.hora.set('21:05:00');await f.whenStable();f.detectChanges();expect(f.nativeElement.textContent).toBe('21:05');
});
const servicio=new AuditoriaService();
const fila=(id:number):RegistroAuditoria=>({id,usuario_id:'actor',accion:'funcion_creada',entidad:'funciones',entidad_id:7,detalles:{sala_id:1},created_at:'2026-09-29T20:00:00Z'});
it('no permite consultar a un cliente',async()=>{r('perfiles',{rol:'cliente'});await expect(servicio.obtener('')).rejects.toThrow('administrador');expect(consultas).toHaveLength(1);});
it('no permite usuario anónimo',async()=>{vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:{id:'anon',is_anonymous:true}},error:null} as never);await expect(servicio.obtener('')).rejects.toThrow('sesión');expect(consultas).toHaveLength(0);});
it('rechaza acción y cursor inválidos antes de consultar',async()=>{await expect(servicio.obtener('otra' as never)).rejects.toThrow('Acción');await expect(servicio.obtener('',0)).rejects.toThrow('Página');expect(consultas).toHaveLength(0);});
it('pagina 50 filas con filtro y cursor descendente',async()=>{
 r('perfiles',{rol:'admin'});r('auditoria',Array.from({length:51},(_,i)=>fila(100-i)));const p=await servicio.obtener('funcion_creada',101);
 expect(p.registros).toHaveLength(50);expect(p.siguiente).toBe(51);
 expect(consultas[1].pasos).toContainEqual({metodo:'eq',args:['accion','funcion_creada']});expect(consultas[1].pasos).toContainEqual({metodo:'lt',args:['id',101]});expect(consultas[1].pasos).toContainEqual({metodo:'order',args:['id',{ascending:false}]});
});
it('consulta vacía termina la paginación',async()=>{r('perfiles',{rol:'admin'});r('auditoria',[]);expect(await servicio.obtener('')).toEqual({registros:[],siguiente:undefined});});
it('falla explícitamente al consultar eventos',async()=>{r('perfiles',{rol:'admin'});r('auditoria',null,{});await expect(servicio.obtener('')).rejects.toThrow('consultar');});
it('auditoría pertenece a ruta admin protegida',()=>{const admin=routes.find(r=>r.path==='admin');expect(admin?.canMatch).toContain(roleGuard);expect(admin?.children?.some(r=>r.path==='auditoria')).toBe(true);});
it('página mantiene filtro aplicado al cargar más y permite reintentar sin duplicar',async()=>{
 const mock={obtener:vi.fn().mockResolvedValueOnce({registros:[fila(51)],siguiente:51}).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({registros:[fila(50)]})};
 const c=new Auditoria(mock as never);await c.cargar();c.accion='qr_validado';await c.cargar(true);expect(c.error()).toBe('Sin conexión');expect(c.registros()).toHaveLength(1);expect(c.siguiente()).toBe(51);
 await c.cargar(true);expect(mock.obtener).toHaveBeenLastCalledWith('',51);expect(c.registros().map(r=>r.id)).toEqual([51,50]);
});
it('renderiza usuario, fecha de Buenos Aires y datos escapados',async()=>{
 const mock={obtener:vi.fn().mockResolvedValue({registros:[{...fila(1),detalles:{nombre:'<script>alert(1)</script>'}}]})};
 await TestBed.configureTestingModule({imports:[Auditoria],providers:[{provide:AuditoriaService,useValue:mock}]}).compileComponents();
 const f=TestBed.createComponent(Auditoria);f.detectChanges();await f.whenStable();await f.componentInstance.cargar();f.detectChanges();
 expect(f.nativeElement.textContent).toContain('actor');expect(f.nativeElement.textContent).toContain('29/09/2026 17:00:00');expect(f.nativeElement.querySelector('script')).toBeNull();
});

it('un fallo de persistencia de auditoría no se confunde con entrada ya usada',async()=>{
 r('entradas',{compra_id:1});r('compras',{estado:'pagada'});r('entradas',null,{message:'Fallo al auditar'});
 await expect(new EntradaService().utilizarEntrada(1)).rejects.toThrow('registrar la operación');
});
it('la pantalla muestra error y permite reintentar sin autorizar ingreso',async()=>{
 const servicio={utilizarEntrada:vi.fn().mockRejectedValue(new Error('Fallo de auditoría'))};const c=new ValidarEntrada(servicio as never,{} as never,{} as never);
 c.entrada.set({id:1,utilizada:false} as never);await c.validarEntrada();expect(c.mensaje()).toBe('Fallo de auditoría');expect(c.procesando()).toBe(false);expect(c.entrada()?.utilizada).toBe(false);
 servicio.utilizarEntrada.mockResolvedValue({id:1,utilizada:true});await c.validarEntrada();expect(c.entrada()?.utilizada).toBe(true);expect(c.mensaje()).toContain('Ingreso autorizado');
});
it('evita confirmaciones simultáneas desde la pantalla',async()=>{
 let completar!:(valor:unknown)=>void;const servicio={utilizarEntrada:vi.fn().mockImplementation(()=>new Promise(resolve=>{completar=resolve;}))};const c=new ValidarEntrada(servicio as never,{} as never,{} as never);
 c.entrada.set({id:1,utilizada:false} as never);const primera=c.validarEntrada();await c.validarEntrada();expect(servicio.utilizarEntrada).toHaveBeenCalledTimes(1);
 completar({id:1,utilizada:true});await primera;expect(c.procesando()).toBe(false);
});
