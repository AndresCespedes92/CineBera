import { ComboService } from '../app/services/combo';
import { CandyService } from '../app/services/candy';
import { CompraService } from '../app/services/compra';
import { FidelizacionService } from '../app/services/fidelizacion';
import { supabase } from '../app/supabase';
import { Combo, SeleccionCombo } from '../app/models/combo';
import { Compra } from '../app/models/compra';
import { PedidoCandy } from '../app/models/pedido-candy';
import { Checkout } from '../app/pages/cliente/checkout/checkout';
import { Combos } from '../app/pages/admin/combos/combos';
import { Pago } from '../app/pages/cliente/pago/pago';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

const combo: Combo = {id:1,nombre:'Combo clásico',precio:12000,pochoclo_id:8,bebida_id:11,activo:true};
const seleccion: SeleccionCombo = {combo,cantidad:1};
const catalogo = [
  {id:8,nombre:'Pochoclo',precio:2500,categorias_candy:{nombre:'Pochoclos'}},
  {id:11,nombre:'Gaseosa',precio:2000,categorias_candy:{nombre:'Bebidas'}}
];
const compra = {id:20,estado:'pendiente',usuario_id:'cliente',reserva_token:'token',funcion_id:4,total:12000,
  combo_id:1,combo_nombre:'Combo clásico',combo_precio:12000,combo_cantidad:1,combo_pochoclo_id:8,combo_bebida_id:11} as Compra;
const pedido = {id:40,compraId:20,total:0,estado:'pendiente',entregado:false,detalles:[
  {id:1,productoId:8,cantidad:1,cantidadCombo:1,subtotal:0},
  {id:2,productoId:11,cantidad:1,cantidadCombo:1,subtotal:0}
]} as PedidoCandy;
let respuestas: {tabla:string;data:unknown;error:unknown}[];
let consultas: {tabla:string;pasos:{metodo:string;args:unknown[]}[]}[];
function responder(tabla:string,data:unknown,error:unknown=null) {respuestas.push({tabla,data,error});}
const escrito=(indice:number,metodo='insert')=>consultas[indice].pasos.find(p=>p.metodo===metodo)?.args[0];
beforeEach(()=>{
  respuestas=[];consultas=[];
  vi.spyOn(supabase.auth,'getSession').mockResolvedValue({data:{session:{user:{id:'cliente'}}},error:null} as never);
  vi.spyOn(supabase,'from').mockImplementation(((tabla:string)=>{
    const r=respuestas.shift(); if(!r) throw new Error('Consulta inesperada: '+tabla);
    expect(tabla).toBe(r.tabla);
    const registro={tabla,pasos:[] as {metodo:string;args:unknown[]}[]};consultas.push(registro);
    const q:Record<string,unknown>={};
    for(const metodo of ['select','order','eq','neq','insert','update','delete','single','maybeSingle']) {
      q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
    }
    q['then']=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:r.data,error:r.error}).then(resolve);
    return q;
  }) as never);
});
afterEach(()=>{vi.restoreAllMocks();sessionStorage.clear();});

describe('Precio fijo y selección de combos',()=>{
  const servicio=new ComboService();
  it.each([
    [[8000],20,null,6400],
    [[8000],20,seleccion,12000],
    [[10400],20,seleccion,12000],
    [[8000,10400],20,seleccion,18400],
    [[8000,10400],20,{combo,cantidad:2},24000],
    [[6000],0,seleccion,12000]
  ])('calcula el total para precios %j',(precios,porcentaje,s,total)=>{
    expect(servicio.calcularImportes(precios as number[],porcentaje as number,s as SeleccionCombo|null).total).toBe(total);
  });
  it.each([0,-1,1.5,3])('rechaza %s combos para dos entradas',cantidad=>{
    expect(()=>servicio.calcularImportes([8000,8000],0,{combo,cantidad})).toThrow();
  });
  it('conserva la selección al ir a Candy y reconstruir el servicio',()=>{
    servicio.guardarSeleccion('token',seleccion);
    expect(new ComboService().obtenerSeleccion('token')).toEqual(seleccion);
    expect(servicio.obtenerSeleccion('otro')).toBeNull();
    servicio.guardarSeleccion('token',null);expect(servicio.obtenerSeleccion('token')).toBeNull();
  });
  it('un JSON inválido no rompe el checkout',()=>{
    sessionStorage.setItem('cinebera-combo-token','texto');expect(servicio.obtenerSeleccion('token')).toBeNull();
  });
  it('ofrece solamente combos activos con ambos productos disponibles',async()=>{
    responder('combos',[combo,{...combo,id:2,activo:false},{...combo,id:3,bebida_id:99}]);responder('productos_candy',catalogo);
    expect(await servicio.obtenerDisponibles()).toEqual([combo]);
  });
  it('el error de consulta se distingue del catálogo vacío',async()=>{
    responder('combos',null,{message:'error'});await expect(servicio.obtenerTodos()).rejects.toThrow('cargar');
  });
  it('revalida el precio antes de preparar el pago',async()=>{
    responder('combos',[{...combo,precio:13000}]);responder('productos_candy',catalogo);
    await expect(servicio.validarSeleccion(seleccion,1)).rejects.toThrow('cambió');
  });
  it('rechaza un combo desactivado antes de guardar',async()=>{
    responder('combos',[{...combo,activo:false}]);responder('productos_candy',catalogo);
    await expect(servicio.validarSeleccion(seleccion,1)).rejects.toThrow('disponible');
  });
});

describe('Administración y copia histórica',()=>{
  const servicio=new ComboService();
  it('crea un combo con los productos configurados',async()=>{
    responder('productos_candy',catalogo);responder('combos',{id:1});
    await servicio.guardar({...combo,nombre:'  Clásico  '});
    expect(escrito(1)).toMatchObject({nombre:'Clásico',precio:12000,pochoclo_id:8,bebida_id:11});
  });
  it('editar precio modifica solo el catálogo',async()=>{
    responder('productos_candy',catalogo);responder('combos',{id:1});
    await servicio.guardar({...combo,precio:14000},1);
    expect(escrito(1,'update')).toMatchObject({precio:14000});
    expect(consultas.every(c=>c.tabla!=='compras')).toBe(true);
  });
  it.each([0,-1,NaN,12.345])('rechaza precio inválido %s',async precio=>{
    await expect(servicio.guardar({...combo,precio})).rejects.toThrow('precio');expect(consultas).toHaveLength(0);
  });
  it('rechaza bebida configurada con un pochoclo',async()=>{
    responder('productos_candy',catalogo);await expect(servicio.guardar({...combo,bebida_id:8})).rejects.toThrow('bebida');
  });
  it('no presenta una actualización sin filas como exitosa',async()=>{
    responder('combos',null);await expect(servicio.cambiarEstado(1,false)).rejects.toThrow('estado');
  });
  it('guarda el precio, cantidad y productos históricos en la compra pendiente',async()=>{
    responder('compras',{id:20});await new CompraService().actualizarTotalPendiente(20,12000,seleccion);
    expect(escrito(0,'update')).toMatchObject({total:12000,combo_id:1,combo_precio:12000,combo_cantidad:1,combo_pochoclo_id:8,combo_bebida_id:11});
  });
  it('quitar el combo limpia la copia anterior',async()=>{
    responder('compras',{id:20});await new CompraService().actualizarTotalPendiente(20,8000,null);
    expect(escrito(0,'update')).toMatchObject({total:8000,combo_id:null,combo_precio:null,combo_cantidad:0});
  });
});

describe('Productos incluidos y pago',()=>{
  it('combina extras e incluidos sin duplicar filas ni cobrar otra vez el combo',async()=>{
    responder('compras',{estado:'pendiente',usuario_id:'cliente'});responder('pedidos_candy',null);responder('productos_candy',catalogo);
    responder('pedidos_candy',{id:40});responder('detalles_pedido_candy',null);responder('detalles_pedido_candy',null);responder('pedidos_candy',{id:40});
    await new CandyService().prepararPedidoCheckout(20,[{producto:{id:8,precio:2500} as never,cantidad:2}],seleccion);
    expect(escrito(3)).toMatchObject({total:5000});
    expect(escrito(5)).toEqual([
      {producto_id:8,cantidad:3,cantidad_combo:1,precio_unitario:2500,subtotal:5000,pedido_candy_id:40},
      {producto_id:11,cantidad:1,cantidad_combo:1,precio_unitario:2000,subtotal:0,pedido_candy_id:40}
    ]);
  });
  it('un combo sin extras prepara Candy con total cero y sus productos',async()=>{
    responder('compras',{estado:'pendiente',usuario_id:'cliente'});responder('pedidos_candy',null);responder('productos_candy',catalogo);
    responder('pedidos_candy',{id:40});responder('detalles_pedido_candy',null);responder('detalles_pedido_candy',null);responder('pedidos_candy',{id:40});
    await new CandyService().prepararPedidoCheckout(20,[],seleccion);
    expect(escrito(3)).toMatchObject({total:0});expect((escrito(5) as object[]).length).toBe(2);
  });
  it('si falta un producto no comienza a escribir el pedido',async()=>{
    responder('compras',{estado:'pendiente',usuario_id:'cliente'});responder('pedidos_candy',null);responder('productos_candy',[catalogo[0]]);
    await expect(new CandyService().prepararPedidoCheckout(20,[],seleccion)).rejects.toThrow('disponible');
    expect(consultas).toHaveLength(3);
  });
  it('rechaza un pago cuyo combo no tiene productos completos',()=>{
    expect(()=>new ComboService().validarPedido(compra,null)).toThrow('Faltan');
    expect(()=>new ComboService().validarPedido(compra,{...pedido,detalles:[pedido.detalles[0]]})).toThrow('Faltan');
    expect(()=>new ComboService().validarPedido(compra,pedido)).not.toThrow();
  });
  it('rechaza restos de un combo quitado pero todavía no actualizado',()=>{
    expect(()=>new ComboService().validarPedido({...compra,combo_id:null},pedido)).toThrow('anterior');
  });
  it('no permite descontar una entrada gratis sobre el importe del combo',async()=>{
    await expect(new FidelizacionService().confirmarCompraConBeneficio(compra,1,[])).rejects.toThrow('precio fijo');
    expect(consultas).toHaveLength(0);
  });
  it('confirma la compra con combo, emite su QR y acredita el importe una sola vez',async()=>{
    const compras={obtenerCompraPorId:async()=>compra,confirmarCompra:vi.fn().mockResolvedValue({...compra,estado:'pagada'})};
    const butacas={obtenerReservaPorToken:async()=>[{expires_at:'2099-01-01'}],confirmarButacasReserva:async()=>true};
    const entradas={obtenerEntradaPorCompra:async()=>({codigo:'qr-compartido'})};
    const puntos={acreditarPuntosPorCompra:vi.fn().mockResolvedValue(true),acreditarPuntosPorCandy:vi.fn().mockResolvedValue(true)};
    const candy={obtenerPedidoPorCompra:async()=>pedido,confirmarPagoPedido:vi.fn().mockResolvedValue({...pedido,estado:'pagado'}),limpiarSeleccion:vi.fn()};
    const router={navigate:vi.fn()};
    const pagina=new Pago({} as never,router as never,compras as never,butacas as never,entradas as never,puntos as never,{obtenerSesion:async()=>({user:{id:'cliente'}})} as never,candy as never,new ComboService());
    pagina.compra.set(compra);await pagina.confirmarPago();
    expect(pagina.error()).toBe('');expect(compras.confirmarCompra).toHaveBeenCalledTimes(1);
    expect(candy.confirmarPagoPedido).toHaveBeenCalledWith(20);
    expect(puntos.acreditarPuntosPorCompra).toHaveBeenCalledWith(20,'cliente');
    expect(router.navigate).toHaveBeenCalledWith(['/entrada','qr-compartido']);
  });
});

describe('Pantallas de combos',()=>{
  afterEach(()=>TestBed.resetTestingModule());
  it('el formulario admin muestra estado, edición y ambos productos',async()=>{
    const servicio={obtenerTodos:async()=>[combo],obtenerProductos:async()=>[
      {id:8,nombre:'Pochoclo',categoria:'Pochoclos'},{id:11,nombre:'Gaseosa',categoria:'Bebidas'}]};
    await TestBed.configureTestingModule({imports:[Combos],providers:[provideRouter([]),{provide:ComboService,useValue:servicio}]}).compileComponents();
    const fixture=TestBed.createComponent(Combos);fixture.detectChanges();
    await vi.waitFor(()=>expect(fixture.componentInstance.cargando()).toBe(false));fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Combo clásico');
    expect(fixture.nativeElement.textContent).toContain('Desactivar');
    expect(fixture.nativeElement.querySelectorAll('select')).toHaveLength(2);
    fixture.componentInstance.editar(combo);expect(fixture.componentInstance.formulario.precio).toBe(12000);
  });
  it('checkout conserva el combo al volver de Candy y permite quitarlo',async()=>{
    const servicio=new ComboService();servicio.guardarSeleccion('token',seleccion);
    vi.spyOn(servicio,'obtenerDisponibles').mockResolvedValue([combo]);
    vi.spyOn(servicio,'obtenerProductos').mockResolvedValue([]);
    const pagina=new Checkout({} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,servicio);
    pagina.reservaToken='token';pagina.butacasReservadas.set([{id:1} as never]);await pagina.cargarCombos();
    expect(pagina.seleccionCombo()).toEqual(seleccion);
    pagina.elegirCombo(null);expect(servicio.obtenerSeleccion('token')).toBeNull();
  });
  it('al cambiar precio durante la navegación retira la selección y avisa',async()=>{
    const servicio=new ComboService();servicio.guardarSeleccion('token',seleccion);
    vi.spyOn(servicio,'obtenerDisponibles').mockResolvedValue([{...combo,precio:14000}]);
    vi.spyOn(servicio,'obtenerProductos').mockResolvedValue([]);
    const pagina=new Checkout({} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,servicio);
    pagina.reservaToken='token';pagina.butacasReservadas.set([{id:1} as never]);await pagina.cargarCombos();
    expect(pagina.seleccionCombo()).toBeNull();expect(pagina.avisoCombos()).toContain('cambió');
  });
});
