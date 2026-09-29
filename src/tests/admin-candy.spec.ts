import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { supabase } from '../app/supabase';
import { CandyService } from '../app/services/candy';
import { FidelizacionService } from '../app/services/fidelizacion';
import { AdminCandy } from '../app/pages/admin/candy/candy';
import { routes } from '../app/app.routes';
import { roleGuard } from '../app/guards/role-guard';
const producto={nombre:' Agua ',categoriaId:3,precio:100.50,descripcion:' ',imagenUrl:'',activo:true};
const categorias=[{id:3,nombre:'Bebidas',activo:true}];
let respuestas: {tabla:string;data:unknown;error:unknown}[];
let consultas: {tabla:string;pasos:{metodo:string;args:unknown[]}[]}[];
const r=(tabla:string,data:unknown,error:unknown=null)=>respuestas.push({tabla,data,error});
const paso=(i:number,metodo:string)=>consultas[i].pasos.find(p=>p.metodo===metodo)?.args[0];
beforeEach(()=>{
 respuestas=[];consultas=[];
 vi.spyOn(supabase.auth,'getUser').mockResolvedValue({data:{user:{id:'admin',is_anonymous:false}},error:null} as never);
 vi.spyOn(supabase,'from').mockImplementation(((tabla:string)=>{
  const respuesta=respuestas.shift();if(!respuesta) throw new Error('Consulta inesperada: '+tabla);
  expect(tabla).toBe(respuesta.tabla);
  const registro={tabla,pasos:[] as {metodo:string;args:unknown[]}[]};consultas.push(registro);
  const q:Record<string,unknown>={};
  for(const metodo of ['select','order','eq','insert','update','single','maybeSingle']) q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
  q['then']=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:respuesta.data,error:respuesta.error}).then(resolve);
  return q;
 }) as never);
});
afterEach(()=>{vi.restoreAllMocks();TestBed.resetTestingModule();});
const service=new CandyService();
it.each([0,-1,1.234,Infinity,NaN])('rechaza precio %s',async precio=>{
 await expect(service.guardarProducto({...producto,precio})).rejects.toThrow();expect(consultas).toHaveLength(0);
});
it.each(['',' '.repeat(2),'a'.repeat(81)])('rechaza nombre inválido',async nombre=>{
 await expect(service.guardarProducto({...producto,nombre})).rejects.toThrow();expect(consultas).toHaveLength(0);
});
it('rechaza imagen javascript',async()=>{await expect(service.guardarProducto({...producto,imagenUrl:'javascript:alert(1)'})).rejects.toThrow('URL');});
it('rechaza cliente antes de escribir',async()=>{r('perfiles',{rol:'cliente'});await expect(service.cambiarEstadoProducto(1,false)).rejects.toThrow('administrador');expect(consultas).toHaveLength(1);});
it('rechaza sesión inexistente',async()=>{
 vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:null},error:null} as never);
 await expect(service.cambiarEstadoCategoria(3,false)).rejects.toThrow('sesión');expect(consultas).toHaveLength(0);
});
it('crea producto normalizado y conserva precio',async()=>{
 r('perfiles',{rol:'admin'});r('categorias_candy',categorias);r('productos_candy',{id:8});await service.guardarProducto(producto);
 expect(paso(2,'insert')).toEqual({nombre:'Agua',categoria_id:3,precio:100.50,descripcion:null,imagen_url:null,activo:true});
});
it('edita solamente el producto solicitado',async()=>{
 r('perfiles',{rol:'admin'});r('categorias_candy',categorias);r('productos_candy',{id:8});await service.guardarProducto(producto,8);
 expect(consultas[2].pasos).toContainEqual({metodo:'eq',args:['id',8]});expect(paso(2,'update')).toBeDefined();
});
it('rechaza categoría inexistente sin escribir',async()=>{
 r('perfiles',{rol:'admin'});r('categorias_candy',[]);await expect(service.guardarProducto(producto)).rejects.toThrow('categoría');expect(consultas).toHaveLength(2);
});
it('detecta actualización sin fila afectada',async()=>{
 r('perfiles',{rol:'admin'});r('productos_candy',null);await expect(service.cambiarEstadoProducto(9,false)).rejects.toThrow('estado');
});
it.each([false,true])('cambia estado a %s sin borrar históricos',async activo=>{
 r('perfiles',{rol:'admin'});r('productos_candy',{id:8});await service.cambiarEstadoProducto(8,activo);
 expect(paso(1,'update')).toEqual({activo});expect(consultas.map(c=>c.tabla)).toEqual(['perfiles','productos_candy']);
});
it('desactiva categoría sin modificar los productos individuales',async()=>{
 r('perfiles',{rol:'admin'});r('categorias_candy',{id:3});await service.cambiarEstadoCategoria(3,false);
 expect(paso(1,'update')).toEqual({activo:false});expect(consultas).toHaveLength(2);
});
it('impide renombrar categorías utilizadas por combos',async()=>{
 r('perfiles',{rol:'admin'});r('categorias_candy',categorias);await expect(service.guardarCategoria({nombre:'Otras',activo:true},3)).rejects.toThrow('combos');
});
it('rechaza categorías duplicadas ignorando mayúsculas',async()=>{
 r('perfiles',{rol:'admin'});r('categorias_candy',categorias);await expect(service.guardarCategoria({nombre:' bebidas ',activo:true})).rejects.toThrow('existe');
});
it('crea una categoría y edita una categoría libre',async()=>{
 r('perfiles',{rol:'admin'});r('categorias_candy',categorias);r('categorias_candy',{id:4});await service.guardarCategoria({nombre:' Dulces ',activo:true});
 expect(paso(2,'insert')).toEqual({nombre:'Dulces',activo:true});
 r('perfiles',{rol:'admin'});r('categorias_candy',[{id:4,nombre:'Dulces',activo:true}]);r('categorias_candy',{id:4});
 await service.guardarCategoria({nombre:'Golosinas',activo:false},4);expect(paso(5,'update')).toEqual({nombre:'Golosinas',activo:false});
});
it('catálogo público exige producto y categoría activos',async()=>{
 r('productos_candy',[]);expect(await service.obtenerProductosActivos()).toEqual([]);
 expect(paso(0,'select')).toContain('!inner');expect(consultas[0].pasos).toContainEqual({metodo:'eq',args:['categorias_candy.activo',true]});
});
it('catálogo admin conserva inactivos y convierte el precio',async()=>{
 r('productos_candy',[{id:8,categoria_id:3,nombre:'Agua',precio:'100.50',activo:false}]);
 expect((await service.obtenerProductosAdmin())[0]).toMatchObject({id:8,precio:100.50,activo:false,categoriaId:3});expect(consultas[0].pasos.some(p=>p.metodo==='eq')).toBe(false);
});
it('falla explícitamente al cargar catálogo',async()=>{r('productos_candy',null,{});await expect(service.obtenerProductosAdmin()).rejects.toThrow('cargar');});
it('canje exige categoría activa y no descuenta puntos si está inactiva',async()=>{
 vi.spyOn(supabase.auth,'getSession').mockResolvedValue({data:{session:{user:{id:'yo'}}},error:null} as never);
 r('recompensas',{id:1,nombre:'Agua',puntos_necesarios:10,tipo:'candy',producto_candy_id:8});r('productos_candy',null);
 expect(await new FidelizacionService().canjearRecompensa('yo',{id:1} as never)).toBe(false);
 expect(consultas[1].pasos).toContainEqual({metodo:'eq',args:['categorias_candy.activo',true]});expect(consultas).toHaveLength(2);
});
it('ruta Candy dentro del admin protegido',()=>{
 const admin=routes.find(r=>r.path==='admin');expect(admin?.canMatch).toContain(roleGuard);expect(admin?.children?.some(r=>r.path==='candy')).toBe(true);
});
it('renderiza lista, edita copia y conserva formulario ante error',async()=>{
 const mock={obtenerProductosAdmin:vi.fn().mockResolvedValue([{...producto,id:8}]),obtenerCategorias:vi.fn().mockResolvedValue(categorias),guardarProducto:vi.fn().mockRejectedValue(new Error('Sin conexión'))};
 await TestBed.configureTestingModule({imports:[AdminCandy],providers:[provideRouter([]),{provide:CandyService,useValue:mock}]}).compileComponents();
 const fixture=TestBed.createComponent(AdminCandy);fixture.detectChanges();await fixture.componentInstance.cargar();await fixture.whenStable();fixture.detectChanges();
 const c=fixture.componentInstance;c.editarProducto(c.productos()[0]);c.producto.nombre='Nuevo nombre';expect(c.productos()[0].nombre).toBe(' Agua ');
 await c.guardarProducto();fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Sin conexión');expect(c.producto.nombre).toBe('Nuevo nombre');expect(c.guardando()).toBe(false);
});
