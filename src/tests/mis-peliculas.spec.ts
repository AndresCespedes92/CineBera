import { CreditoService } from '../app/services/credito';
import { CompraService } from '../app/services/compra';
import { MisPeliculas } from '../app/pages/cliente/mis-peliculas/mis-peliculas';
import { supabase } from '../app/supabase';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../app/services/auth';
import { routes } from '../app/app.routes';
import { authGuard } from '../app/guards/auth-guard';
const compra={id:30,funciones:{fecha:'2026-10-01',hora:'18:30:00',peliculas:{id:7,titulo:'Película',poster_url:'poster.jpg'}},entradas:{codigo:'entrada'}};
const tarjeta={compraId:30,estado:'pagada' as const,reintegro:0,cancelacionCompleta:false,peliculaId:7,titulo:'Película',poster:'poster.jpg',fechaFuncion:'2026-10-01T18:30:00',calificacion:4,codigoEntrada:'entrada'};
let respuestas:{tabla:string;data:unknown;error?:unknown}[];
let llamadas:{tabla:string;pasos:{metodo:string;args:unknown[]}[]}[];
beforeEach(()=>{
  vi.spyOn(CreditoService.prototype,'obtenerSaldo').mockResolvedValue(0);
  vi.spyOn(CreditoService.prototype,'obtenerUso').mockResolvedValue(0);
 respuestas=[];llamadas=[];
 vi.spyOn(supabase.auth,'getUser').mockResolvedValue({data:{user:{id:'propietario'}},error:null} as never);
 vi.spyOn(supabase,'from').mockImplementation(((tabla:string)=>{
  const r=respuestas.shift();if(!r) throw Error('Consulta inesperada');expect(tabla).toBe(r.tabla);
  const registro={tabla,pasos:[] as {metodo:string;args:unknown[]}[]};llamadas.push(registro);
  const q:Record<string,unknown>={};
  for(const metodo of ['select','eq','order','limit','lt','in']) q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
  q['then']=(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:r.data,error:r.error??null}).then(resolve);return q;
 }) as never);
});
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});
const servicio=new CompraService();
describe('Historial personal',()=>{
 it('reutiliza compras, entrada y reseña propia con filtros de usuario y pago',async()=>{
  respuestas=[{tabla:'compras',data:[compra]},{tabla:'resenas',data:[{pelicula_id:7,estrellas:4}]}];
  expect(await servicio.obtenerMisPeliculas()).toEqual({peliculas:[tarjeta],siguiente:null});
  expect(llamadas[0].pasos).toContainEqual({metodo:'eq',args:['usuario_id','propietario']});
  expect(llamadas[0].pasos).toContainEqual({metodo:'in',args:['estado',['pagada','cancelada','pendiente']]});
  expect(llamadas[1].pasos).toContainEqual({metodo:'eq',args:['usuario_id','propietario']});
 });
 it.each([null,{id:'anon',is_anonymous:true}])('rechaza visitante o cuenta anónima antes de consultar',async user=>{
  vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user},error:null} as never);
  await expect(servicio.obtenerMisPeliculas()).rejects.toThrow('sesión');expect(supabase.from).not.toHaveBeenCalled();
 });
 it('no acepta un cursor inválido',async()=>{await expect(servicio.obtenerMisPeliculas(-1)).rejects.toThrow('inválida');});
 it('distingue historial vacío y evita consultar reseñas innecesariamente',async()=>{
  respuestas=[{tabla:'compras',data:[]}];expect(await servicio.obtenerMisPeliculas()).toEqual({peliculas:[],siguiente:null});expect(llamadas).toHaveLength(1);
 });
 it('no convierte un fallo de compras en historial vacío',async()=>{
  respuestas=[{tabla:'compras',data:null,error:{}}];await expect(servicio.obtenerMisPeliculas()).rejects.toThrow('historial');
 });
 it('no convierte un fallo de reseñas en sin calificar',async()=>{
  respuestas=[{tabla:'compras',data:[compra]},{tabla:'resenas',data:null,error:{}}];await expect(servicio.obtenerMisPeliculas()).rejects.toThrow('calificaciones');
 });
 it('tolera póster, entrada y calificación ausentes',async()=>{
  respuestas=[{tabla:'compras',data:[{...compra,funciones:{...compra.funciones,peliculas:{...compra.funciones.peliculas,poster_url:null}},entradas:[]}]},{tabla:'resenas',data:[]}];
  expect((await servicio.obtenerMisPeliculas()).peliculas[0]).toMatchObject({poster:null,codigoEntrada:null,calificacion:null});
 });
 it('mantiene la compra si falta una relación',async()=>{
  respuestas=[{tabla:'compras',data:[{id:30,funciones:null,entradas:null}]}];expect((await servicio.obtenerMisPeliculas()).peliculas[0]).toMatchObject({titulo:'Película no disponible',fechaFuncion:null});
 });
 it('pagina de veinte en veinte con cursor estable y una consulta de reseñas',async()=>{
  respuestas=[{tabla:'compras',data:Array.from({length:21},(_,i)=>({...compra,id:30-i}))},{tabla:'resenas',data:[]}];
  const pagina=await servicio.obtenerMisPeliculas(40);expect(pagina.peliculas).toHaveLength(20);expect(pagina.siguiente).toBe(11);
  expect(llamadas[0].pasos).toContainEqual({metodo:'lt',args:['id',40]});expect(llamadas[1].pasos).toContainEqual({metodo:'in',args:['pelicula_id',[7]]});
 });
 it('la ruta tiene guard y lazy loading',()=>{
  const ruta=routes.find(r=>r.path==='mis-peliculas');expect(ruta?.canActivate).toContain(authGuard);expect(ruta?.loadComponent).toBeTypeOf('function');
 });
 it('conserva tarjetas si falla cargar más y permite reintentar el mismo cursor',async()=>{
  const obtener=vi.fn().mockResolvedValueOnce({peliculas:[tarjeta],siguiente:30}).mockRejectedValueOnce(Error('Sin conexión')).mockResolvedValueOnce({peliculas:[{...tarjeta,compraId:20}],siguiente:null});
  const pagina=new MisPeliculas({obtenerMisPeliculas:obtener} as never);await pagina.cargar();await pagina.cargar(true);
  expect(pagina.peliculas()).toHaveLength(1);expect(pagina.siguiente()).toBe(30);expect(pagina.error()).toBe('Sin conexión');
  await pagina.cargar(true);expect(pagina.peliculas()).toHaveLength(2);expect(obtener).toHaveBeenLastCalledWith(30);expect(pagina.error()).toBe('');
 });
 it('el template muestra póster, fecha, calificación y enlaces existentes',async()=>{
  await TestBed.configureTestingModule({imports:[MisPeliculas],providers:[provideRouter([]),{provide:CompraService,useValue:{obtenerMisPeliculas:async()=>({peliculas:[tarjeta],siguiente:null})}},{provide:Auth,useValue:{obtenerSesion:async()=>null}}]}).compileComponents();
  const fixture=TestBed.createComponent(MisPeliculas);fixture.detectChanges();await vi.waitFor(()=>expect(fixture.componentInstance.peliculas()).toHaveLength(1));fixture.detectChanges();
  const html=fixture.nativeElement;expect(html.textContent).toContain('01/10/2026 18:30');expect(html.textContent).toContain('4 / 5');expect(html.querySelector('img').getAttribute('src')).toBe('poster.jpg');
  expect(html.querySelector('a[href="/entrada/entrada"]')).not.toBeNull();expect(html.querySelector('a[href="/pelicula/7/funciones"]')).not.toBeNull();
 });
});
