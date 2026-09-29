import { TestBed } from '@angular/core/testing';
import { supabase } from '../app/supabase';
import { ReporteService, fechaBuenosAires, validarPeriodo } from '../app/services/reporte';
import { filasExportacion, generarExcelXml, generarPdf } from '../app/services/exportar-reporte';
import { Reportes } from '../app/pages/admin/reportes/reportes';
import { routes } from '../app/app.routes';
import { roleGuard } from '../app/guards/role-guard';

let respuestas: {tabla:string;data:unknown;error:unknown}[];
let consultas: {tabla:string;pasos:{metodo:string;args:unknown[]}[]}[];
const r=(tabla:string,data:unknown,error:unknown=null)=>respuestas.push({tabla,data,error});
const compra=(id=1,total:number|string=10.1)=>({id,total,pagada_at:'2026-09-29T03:00:00Z',reserva_token:'token'+id,funcion_id:7,pedidos_candy:null});
const butaca=(id=1,token='token1',funcion=7)=>({id,reserva_token:token,funcion_id:funcion});
const servicio=new ReporteService();
beforeEach(()=>{
 respuestas=[];consultas=[];
 vi.spyOn(supabase.auth,'getUser').mockResolvedValue({data:{user:{id:'admin'}},error:null} as never);
 vi.spyOn(supabase,'from').mockImplementation(((tabla:string)=>{
  const respuesta=respuestas.shift();if(!respuesta) throw new Error('Consulta inesperada: '+tabla);
  expect(tabla).toBe(respuesta.tabla);const registro={tabla,pasos:[] as {metodo:string;args:unknown[]}[]};consultas.push(registro);
  const q:Record<string,unknown>={};
  for(const metodo of ['select','eq','gte','gt','lt','in','order','limit','single']) q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
  q['then']=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:respuesta.data,error:respuesta.error}).then(resolve);
  return q;
 }) as never);
});
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});
it.each([['','2026-09-29'],['2026-02-30','2026-03-01'],['2026-09-30','2026-09-29'],['2025-01-01','2026-01-02'],['texto','texto']])('rechaza rango %s a %s',async(desde,hasta)=>{
 await expect(servicio.obtener(desde,hasta)).rejects.toThrow();expect(consultas).toHaveLength(0);
});
it('admite año bisiesto y días inclusive',()=>{expect(validarPeriodo('2024-01-01','2024-12-31')).toHaveLength(366);expect(validarPeriodo('2026-09-29','2026-09-29')).toEqual(['2026-09-29']);});
it.each([['2026-09-29T02:59:59Z','2026-09-28'],['2026-09-29T03:00:00Z','2026-09-29']])('agrupa medianoche Buenos Aires', (instante,fecha)=>expect(fechaBuenosAires(new Date(instante))).toBe(fecha));
it('rechaza usuarios sin rol admin',async()=>{r('perfiles',{rol:'cliente'});await expect(servicio.obtener('2026-09-29','2026-09-29')).rejects.toThrow('administrador');expect(consultas).toHaveLength(1);});
it('rechaza sesión anónima',async()=>{vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:{id:'anon',is_anonymous:true}},error:null} as never);await expect(servicio.obtener('2026-09-29','2026-09-29')).rejects.toThrow('sesión');expect(consultas).toHaveLength(0);});
it('período vacío conserva días en cero sin consultar butacas',async()=>{
 r('perfiles',{rol:'admin'});r('compras',[]);const reporte=await servicio.obtener('2026-09-28','2026-09-29');
 expect(reporte.filas).toHaveLength(2);expect(reporte.totales.total).toBe(0);expect(consultas).toHaveLength(2);
 expect(consultas[1].pasos).toContainEqual({metodo:'eq',args:['estado','pagada']});
 expect(consultas[1].pasos).toContainEqual({metodo:'gte',args:['pagada_at','2026-09-28T00:00:00-03:00']});
 expect(consultas[1].pasos).toContainEqual({metodo:'lt',args:['pagada_at','2026-09-30T00:00:00-03:00']});
});
it('suma importes netos y Candy pagado una sola vez; cuenta butacas y no QR',async()=>{
 r('perfiles',{rol:'admin'});r('compras',[
 {...compra(),pedidos_candy:{estado:'pagado',total:'0.20'}},
 {...compra(2,'0.20'),pedidos_candy:[{estado:'pendiente',total:100}]},
 {...compra(3,0),pagada_at:'2026-09-29T02:59:59Z',pedidos_candy:[{estado:'cancelado',total:100}]}
 ]);r('butacas_funcion',[butaca(1),butaca(2),butaca(3,'token2'),butaca(4,'token3'),butaca(5,'token1',999)]);
 const reporte=await servicio.obtener('2026-09-28','2026-09-29');
 expect(reporte.totales).toEqual({fecha:'TOTAL',compras:3,entradas:4,entradasCombos:10.3,candy:0.2,total:10.5});
 expect(reporte.filas[0].entradas).toBe(1);expect(reporte.filas[1].total).toBe(10.5);
 expect(consultas[2].pasos).toContainEqual({metodo:'eq',args:['estado','ocupada']});
});
it.each(['compras','butacas_funcion'])('no presenta datos parciales ante error en %s',async tabla=>{
 r('perfiles',{rol:'admin'});if(tabla==='compras') r('compras',null,{});else {r('compras',[compra()]);r('butacas_funcion',null,{});}
 await expect(servicio.obtener('2026-09-29','2026-09-29')).rejects.toThrow('consultar');
});
it('rechaza importes no numéricos',async()=>{r('perfiles',{rol:'admin'});r('compras',[compra(1,'inválido')]);r('butacas_funcion',[]);await expect(servicio.obtener('2026-09-29','2026-09-29')).rejects.toThrow('importe');});
it('pagina más de 500 compras y divide tokens en lotes de 100',async()=>{
 r('perfiles',{rol:'admin'});r('compras',Array.from({length:500},(_,i)=>compra(i+1,1)));r('compras',[compra(501,1)]);
 for(let i=0;i<6;i++) r('butacas_funcion',[]);
 const reporte=await servicio.obtener('2026-09-29','2026-09-29');expect(reporte.comprasSinButacas).toBe(501);expect(reporte.totales.compras).toBe(501);expect(reporte.totales.total).toBe(501);
 expect(consultas[2].pasos).toContainEqual({metodo:'gt',args:['id',500]});expect(consultas.filter(c=>c.tabla==='butacas_funcion')).toHaveLength(6);
});
it('pagina más de 500 butacas de un lote',async()=>{
 r('perfiles',{rol:'admin'});r('compras',[compra()]);r('butacas_funcion',Array.from({length:500},(_,i)=>butaca(i+1)));r('butacas_funcion',[butaca(501)]);
 const reporte=await servicio.obtener('2026-09-29','2026-09-29');expect(reporte.totales.entradas).toBe(501);expect(consultas[3].pasos).toContainEqual({metodo:'gt',args:['id',500]});
});
const fila={fecha:'2026-09-29',compras:2,entradas:3,entradasCombos:10.3,candy:0.2,total:10.5};
const reporte={desde: fila.fecha,hasta: fila.fecha,generado:'2026-09-29T10:00:00Z',comprasSinButacas:0,filas:[fila],totales:{...fila,fecha:'TOTAL'}};
it('Excel es XML válido con importes numéricos y mismos totales',()=>{
 const doc=new DOMParser().parseFromString(generarExcelXml(reporte),'application/xml');expect(doc.querySelector('parsererror')).toBeNull();
 const rows=doc.getElementsByTagName('Row');expect(rows.length).toBe(6);
 const ultima=rows[rows.length-1].getElementsByTagName('Data');expect(ultima[5].textContent).toBe('10.5');expect(ultima[5].getAttribute('ss:Type')).toBe('Number');
 expect(filasExportacion(reporte)[1]).toEqual(['TOTAL',2,3,10.3,0.2,10.5]);
});
it('escapa texto en el XML sin crear fórmulas',()=>{
 const doc=new DOMParser().parseFromString(generarExcelXml({...reporte,desde:'< & >'}),'application/xml');expect(doc.querySelector('parsererror')).toBeNull();expect(doc.documentElement.textContent).toContain('< & >');
});
it('PDF real repite encabezados y pagina todos los días con totales',async()=>{
 const pdf=await generarPdf({...reporte,filas:Array.from({length:65},()=>fila)});
 expect(pdf.getNumberOfPages()).toBe(3);const texto=pdf.output();expect(texto.startsWith('%PDF')).toBe(true);expect(texto).toContain('TOTAL');expect(texto).toContain('10.50');expect(texto.match(/CineBera - Reporte de ventas/g)).toHaveLength(3);
});
it('ruta reportes hereda guard de administrador',()=>{const admin=routes.find(r=>r.path==='admin');expect(admin?.canMatch).toContain(roleGuard);expect(admin?.children?.some(r=>r.path==='reportes')).toBe(true);});
it('pantalla conserva período consultado al cambiar filtros y limpia resultados al fallar',async()=>{
 const mock={obtener:vi.fn().mockResolvedValue(reporte)};
 await TestBed.configureTestingModule({imports:[Reportes],providers:[{provide:ReporteService,useValue:mock}]}).compileComponents();
 const fixture=TestBed.createComponent(Reportes);const c=fixture.componentInstance;
 await c.consultar();c.desde='2020-01-01';fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Período consultado: 2026-09-29');
 mock.obtener.mockRejectedValueOnce(new Error('Sin conexión'));await c.consultar();fixture.detectChanges();expect(c.reporte()).toBeNull();expect(fixture.nativeElement.textContent).toContain('Sin conexión');expect(c.cargando()).toBe(false);
});

it('exportaciones advierten sobre compras sin butacas',async()=>{
 const r={...reporte,comprasSinButacas:2};expect(generarExcelXml(r)).toContain('2 compras sin butacas');expect((await generarPdf(r)).output()).toContain('2 compras sin butacas');
});
