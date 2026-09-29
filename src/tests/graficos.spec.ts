import { TestBed } from '@angular/core/testing';
import { supabase } from '../app/supabase';
import { EstadisticaService, periodoGrafico, ordenarGrafico } from '../app/services/estadistica';
import { Graficos } from '../app/pages/admin/graficos/graficos';
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
  for(const metodo of ['select','eq','gte','lte','gt','lt','in','order','limit','single']) q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
  q['then']=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:respuesta.data,error:respuesta.error}).then(resolve);
  return q;
 }) as never);
});
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});

const servicio=new EstadisticaService();
const b=(id:number,token='uno',pelicula=1,funcion=10)=>({id,reserva_token:token,funcion_id:funcion,funciones:{fecha:'2026-09-29',pelicula_id:pelicula,peliculas:{titulo:'Película '+pelicula}}});
const compra=(token='uno',funcion=10,id=1)=>({id,reserva_token:token,funcion_id:funcion});
const detalle=(id:number,producto=1,cantidad=2)=>({id,producto_id:producto,cantidad,productos_candy:{nombre:'Producto '+producto}});
it.each([
 ['2026-09-29','semana','2026-09-28','2026-10-04'],
 ['2026-10-04','semana','2026-09-28','2026-10-04'],
 ['2026-01-01','semana','2025-12-29','2026-01-04'],
 ['2024-02-20','mes','2024-02-01','2024-02-29'],
 ['2026-02-28','mes','2026-02-01','2026-02-28'],
 ['2026-12-31','mes','2026-12-01','2026-12-31']
])('calcula período %s %s',(fecha,tipo,desde,hasta)=>expect(periodoGrafico(fecha,tipo as 'semana'|'mes')).toEqual({desde,hasta,tipo}));
it.each(['','2026-02-30','texto'])('rechaza fecha inválida %s',async fecha=>{await expect(servicio.obtener(fecha,'mes')).rejects.toThrow();expect(consultas).toHaveLength(0);});
it('rechaza período desconocido',()=>expect(()=>periodoGrafico('2026-09-29','otro' as never)).toThrow('semana'));
it('rechaza cliente antes de consultar ventas',async()=>{r('perfiles',{rol:'cliente'});await expect(servicio.obtener('2026-09-29','mes')).rejects.toThrow('administrador');expect(consultas).toHaveLength(1);});
it('rechaza usuarios anónimos',async()=>{vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:{id:'anon',is_anonymous:true}},error:null} as never);await expect(servicio.obtener('2026-09-29','mes')).rejects.toThrow('sesión');expect(consultas).toHaveLength(0);});
it('devuelve gráficos vacíos sin inventar ganadores',async()=>{r('perfiles',{rol:'admin'});r('butacas_funcion',[]);r('detalles_pedido_candy',[]);const d=await servicio.obtener('2026-09-29','mes');expect(d.peliculas).toEqual([]);expect(d.candy).toEqual([]);expect(consultas).toHaveLength(3);});
it('cuenta cada butaca pagada; agrupa funciones de una película y excluye huérfanas',async()=>{
 r('perfiles',{rol:'admin'});r('butacas_funcion',[b(1),b(2),b(3,'dos',1,11),b(4,'tres',2),b(5,'cancelada'),b(6,'uno',1,999),{...b(7),reserva_token:null}]);
 r('compras',[compra(),compra('dos',11,2),compra('tres',10,3)]);r('detalles_pedido_candy',[]);
 const d=await servicio.obtener('2026-09-29','mes');expect(d.peliculas.map(p=>[p.id,p.cantidad])).toEqual([[1,3],[2,1]]);
 expect(consultas[1].pasos).toContainEqual({metodo:'eq',args:['estado','ocupada']});expect(consultas[2].pasos).toContainEqual({metodo:'eq',args:['estado','pagada']});
});
it('suma unidades Candy incluyendo combos una sola vez y conserva IDs distintos',async()=>{
 r('perfiles',{rol:'admin'});r('butacas_funcion',[]);r('detalles_pedido_candy',[{...detalle(1,1,3),cantidad_combo:2},detalle(2,1,2),{...detalle(3,2,1),productos_candy:{nombre:'Producto 1'}}]);
 const d=await servicio.obtener('2026-09-29','mes');expect(d.candy.map(p=>[p.id,p.cantidad])).toEqual([[1,5],[2,1]]);
 for(const [campo,valor] of [['pedidos_candy.estado','pagado'],['pedidos_candy.compras.estado','pagada']]) expect(consultas[2].pasos).toContainEqual({metodo:'eq',args:[campo,valor]});
 expect(consultas[2].pasos).toContainEqual({metodo:'lt',args:['pedidos_candy.compras.pagada_at','2026-10-01T00:00:00-03:00']});
 expect(consultas[2].pasos.some(p=>p.args.includes('activo'))).toBe(false);
});
it('ordena empates por nombre y luego ID',()=>expect(ordenarGrafico([{id:3,nombre:'B',cantidad:2},{id:2,nombre:'A',cantidad:2},{id:1,nombre:'A',cantidad:2}]).map(p=>p.id)).toEqual([1,2,3]));
it.each(['butacas_funcion','compras','detalles_pedido_candy'])('no muestra resultados parciales ante fallo en %s',async tabla=>{
 r('perfiles',{rol:'admin'});
 if(tabla==='butacas_funcion') r(tabla,null,{});
 else {r('butacas_funcion',[b(1)]);if(tabla==='compras') r(tabla,null,{});else {r('compras',[compra()]);r(tabla,null,{});}}
 await expect(servicio.obtener('2026-09-29','mes')).rejects.toThrow();
});
it('pagina butacas y Candy sin truncar 501 filas',async()=>{
 r('perfiles',{rol:'admin'});r('butacas_funcion',Array.from({length:500},(_,i)=>b(i+1)));r('butacas_funcion',[b(501)]);r('compras',[compra()]);
 r('detalles_pedido_candy',Array.from({length:500},(_,i)=>detalle(i+1)));r('detalles_pedido_candy',[detalle(501)]);
 const d=await servicio.obtener('2026-09-29','mes');expect(d.peliculas[0].cantidad).toBe(501);expect(d.candy[0].cantidad).toBe(1002);
 expect(consultas[2].pasos).toContainEqual({metodo:'gt',args:['id',500]});expect(consultas[5].pasos).toContainEqual({metodo:'gt',args:['id',500]});
});
it('divide consultas de compras en lotes de 100 tokens únicos',async()=>{
 r('perfiles',{rol:'admin'});r('butacas_funcion',Array.from({length:101},(_,i)=>b(i+1,'t'+i)));r('compras',[]);r('compras',[]);r('detalles_pedido_candy',[]);
 await servicio.obtener('2026-09-29','mes');expect(consultas.filter(c=>c.tabla==='compras')).toHaveLength(2);
});
it('rechaza cantidades Candy inválidas',async()=>{r('perfiles',{rol:'admin'});r('butacas_funcion',[]);r('detalles_pedido_candy',[detalle(1,1,-1)]);await expect(servicio.obtener('2026-09-29','mes')).rejects.toThrow('cantidades');});
it('la ruta gráfica hereda el guard admin',()=>{const admin=routes.find(r=>r.path==='admin');expect(admin?.canMatch).toContain(roleGuard);expect(admin?.children?.some(r=>r.path==='graficos')).toBe(true);});
it('renderiza barras y etiquetas; conserva período consultado y limpia datos ante error',async()=>{
 const mock={obtener:vi.fn().mockResolvedValue({desde:'2026-09-01',hasta:'2026-09-30',tipo:'mes',peliculas:[{id:1,nombre:'Película real',cantidad:4},{id:2,nombre:'Otra',cantidad:2}],candy:[]})};
 await TestBed.configureTestingModule({imports:[Graficos],providers:[{provide:EstadisticaService,useValue:mock}]}).compileComponents();
 const fixture=TestBed.createComponent(Graficos);const c=fixture.componentInstance;await c.consultar();c.fecha='2020-01-01';fixture.detectChanges();
 expect(fixture.nativeElement.textContent).toContain('Mes consultado: 2026-09-01');expect(fixture.nativeElement.textContent).toContain('4 entradas');
 const barras=fixture.nativeElement.querySelectorAll('rect');expect(barras[0].getAttribute('width')).toBe('240');expect(barras[1].getAttribute('width')).toBe('120');
 mock.obtener.mockRejectedValueOnce(new Error('Sin conexión'));await c.consultar();fixture.detectChanges();expect(c.datos()).toBeNull();expect(fixture.nativeElement.textContent).toContain('Sin conexión');expect(c.cargando()).toBe(false);
});
