import { CreditoService } from '../app/services/credito';
import { ComboService } from '../app/services/combo';
import { FidelizacionService } from '../app/services/fidelizacion';
import { CandyService } from '../app/services/candy';
import { ButacaService } from '../app/services/butaca';
import { supabase } from '../app/supabase';
import { Compra } from '../app/models/compra';
import { Recompensa } from '../app/models/recompensa';
import { Beneficio } from '../app/models/beneficio';
import { ButacaFuncion } from '../app/models/butaca-funcion';
import { Pago } from '../app/pages/cliente/pago/pago';
import { Fidelizacion } from '../app/pages/cliente/fidelizacion/fidelizacion';
import { ValidarEntrada } from '../app/pages/empleado/validar-entrada/validar-entrada';

const recompensa = { id: 1, nombre: 'Entrada', tipo: 'entrada', puntos_necesarios: 500, activo: true } as Recompensa;
const compra = { id: 20, usuario_id: 'cliente', reserva_token: 'reserva', estado: 'pendiente', total: 8000, funcion_id: 4 } as Compra;
const butaca = (fila = 'A', extra = {}): ButacaFuncion => ({
  id: 1, funcion_id: 4, fila, numero: 1, estado: 'reservada', reserva_token: 'reserva',
  expires_at: '2099-01-01T00:00:00Z', created_at: '', ...extra
});
const beneficio = { id: 30, usuario_id: 'cliente', beneficio_tipo: 'entrada', compra_utilizada_id: null } as Beneficio;

// Se simula solo el transporte. Los servicios reales validan y construyen consultas.
// Cada respuesta esperada exige la tabla correcta y se registran filtros y escrituras.
type Respuesta = { tabla: string; data: unknown; error?: { code?: string; message?: string } };
let respuestas: Respuesta[];
let consultas: { tabla: string; pasos: { metodo: string; args: unknown[] }[] }[];
function responder(tabla: string, data: unknown, error?: Respuesta['error']) { respuestas.push({ tabla, data, error }); }
function simularSesion(id: string | null = 'cliente') {
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: id ? { user: { id } } : null }, error: null } as never);
}

beforeEach(()=>{
  vi.spyOn(CreditoService.prototype,'obtenerSaldo').mockResolvedValue(0);
  vi.spyOn(CreditoService.prototype,'obtenerUso').mockResolvedValue(0);
  respuestas = [];
  consultas = [];
  simularSesion();
  vi.spyOn(supabase, 'from').mockImplementation(((tabla: string) => {
    const respuesta = respuestas.shift();
    if (!respuesta) throw new Error(`Consulta no esperada: ${tabla}`);
    expect(tabla).toBe(respuesta.tabla);
    const registro = { tabla, pasos: [] as { metodo: string; args: unknown[] }[] };
    consultas.push(registro);
    const consulta: Record<string, unknown> = {};
    for (const metodo of ['select','insert','update','eq','is','order','range','single','maybeSingle','gt','neq','delete']) {
      consulta[metodo] = (...args: unknown[]) => { registro.pasos.push({ metodo, args }); return consulta; };
    }
    consulta['then'] = (resolver: (value: unknown) => unknown) => Promise.resolve({ data: respuesta.data, error: respuesta.error ?? null }).then(resolver);
    return consulta;
  }) as never);
});
afterEach(() => vi.restoreAllMocks());
const escritura = (indice: number, metodo = 'insert') => consultas[indice].pasos.find(p => p.metodo === metodo)?.args[0];

describe('Canjes y beneficios persistentes', () => {
  const servicio = new FidelizacionService();
  it('descuenta puntos y crea el beneficio en el mismo INSERT', async () => {
    responder('recompensas', recompensa); responder('movimientos_puntos', [{ puntos: 600 }]); responder('movimientos_puntos', null);
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(true);
    expect(escritura(2)).toMatchObject({ puntos: -500, usuario_id: 'cliente', beneficio_tipo: 'entrada', beneficio_nombre: 'Entrada' });
    expect((escritura(2) as {codigo_beneficio:string}).codigo_beneficio).toMatch(/^[0-9a-f-]{36}$/);
    expect(consultas.filter(c => c.pasos.some(p => p.metodo === 'insert'))).toHaveLength(1);
  });
  it('relee el costo actual y rechaza un saldo insuficiente', async () => {
    responder('recompensas', { ...recompensa, puntos_necesarios: 900 }); responder('movimientos_puntos', [{ puntos: 600 }]);
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(false);
    expect(consultas).toHaveLength(2);
  });
  it('rechaza recompensas inactivas sin descontar', async () => {
    responder('recompensas', null);
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(false);
  });
  it('no permite transferir un canje a otra cuenta', async () => {
    expect(await servicio.canjearRecompensa('otro', recompensa)).toBe(false);
    expect(consultas).toHaveLength(0);
  });
  it('rechaza canjes sin sesión', async () => {
    simularSesion(null);
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(false);
  });
  it('rechaza costos inválidos', async () => {
    responder('recompensas', { ...recompensa, puntos_necesarios: 0 });
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(false);
  });
  it('Candy guarda el producto real como información histórica', async () => {
    responder('recompensas', { ...recompensa, tipo: 'candy', producto_candy_id: 10 });
    responder('productos_candy', { id: 10, nombre: 'Pochoclo grande' });
    responder('movimientos_puntos', [{ puntos: 600 }]); responder('movimientos_puntos', null);
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(true);
    expect(escritura(3)).toMatchObject({ producto_candy_id: 10, beneficio_nombre: 'Pochoclo grande', beneficio_tipo: 'candy' });
  });
  it('Candy sin producto configurado no descuenta puntos', async () => {
    responder('recompensas', { ...recompensa, tipo: 'candy', producto_candy_id: null });
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(false);
  });
  it('Candy con producto inactivo no descuenta puntos', async () => {
    responder('recompensas', { ...recompensa, tipo: 'candy', producto_candy_id: 10 }); responder('productos_candy', null);
    expect(await servicio.canjearRecompensa('cliente', recompensa)).toBe(false);
  });
  it('un error de saldo no se interpreta como saldo cero', async () => {
    responder('movimientos_puntos', null, { message: 'sin conexión' });
    await expect(servicio.obtenerSaldoPuntos('cliente')).rejects.toThrow('saldo');
  });
  it('suma más de mil movimientos sin truncar el saldo', async () => {
    responder('movimientos_puntos', Array.from({length:1000}, () => ({puntos:1})));
    responder('movimientos_puntos', [{ puntos: -500 }]);
    expect(await servicio.obtenerSaldoPuntos('cliente')).toBe(500);
  });
  it('un fallo al guardar pide revisar el historial antes de repetir', async () => {
    responder('recompensas', recompensa); responder('movimientos_puntos', [{puntos:1000}]);
    responder('movimientos_puntos', null, {message:'error'});
    await expect(servicio.canjearRecompensa('cliente', recompensa)).rejects.toThrow('historial');
  });
  it('reconstruye los beneficios usados a partir de compras', async () => {
    responder('movimientos_puntos', [{...beneficio, compras:{id:20}}, {...beneficio,id:31,compras:null}]);
    const r = await servicio.obtenerBeneficios('cliente');
    expect(r.map(b => b.compra_utilizada_id)).toEqual([20,null]);
  });
});

describe('Entrada gratis', () => {
  const servicio = new FidelizacionService();
  it.each([
    [8000, [butaca()], 8000],
    [10400, [butaca('R')], 10400],
    [18400, [butaca(),butaca('R')], 8000],
    [14720, [butaca(),butaca('R')], 6400],
    [16000, [butaca(),butaca('K')], 8000],
    [0, [butaca()], 0],
    [8000, [], 0]
  ])('calcula un beneficio sobre el total %s', (total, butacas, esperado) => {
    expect(servicio.calcularDescuentoEntrada(total as number, butacas as ButacaFuncion[])).toBe(esperado);
  });
  it('confirma el pago y consume la recompensa con un solo UPDATE', async () => {
    responder('movimientos_puntos', [{...beneficio,compras:null}]); responder('compras', {...compra,total:0,estado:'pagada',beneficio_id:30});
    const r = await servicio.confirmarCompraConBeneficio(compra,30,[butaca()]);
    expect(r.total).toBe(0);
    expect(escritura(1,'update')).toMatchObject({estado:'pagada',beneficio_id:30,descuento_beneficio:8000,total:0});
    expect(consultas[1].pasos).toContainEqual({metodo:'eq',args:['estado','pendiente']});
    expect(consultas[1].pasos).toContainEqual({metodo:'eq',args:['usuario_id','cliente']});
  });
  it('rechaza un beneficio ya utilizado', async () => {
    responder('movimientos_puntos', [{...beneficio,compras:{id:99}}]);
    await expect(servicio.confirmarCompraConBeneficio(compra,30,[butaca()])).rejects.toThrow('utilizada');
    expect(consultas).toHaveLength(1);
  });
  it('rechaza aplicar un beneficio de otra cuenta', async () => {
    await expect(servicio.confirmarCompraConBeneficio({...compra,usuario_id:'otro'},30,[butaca()])).rejects.toThrow('otra cuenta');
  });
  it('rechaza una reserva vencida', async () => {
    responder('movimientos_puntos', [{...beneficio,compras:null}]);
    await expect(servicio.confirmarCompraConBeneficio(compra,30,[butaca('A',{expires_at:'2000-01-01'})])).rejects.toThrow('venció');
  });
  it('una colisión UNIQUE no se muestra como pago exitoso', async () => {
    responder('movimientos_puntos', [{...beneficio,compras:null}]); responder('compras',null,{code:'23505'});
    await expect(servicio.confirmarCompraConBeneficio(compra,30,[butaca()])).rejects.toThrow('Recargá');
  });
});

describe('Acreditación de puntos', () => {
  const servicio = new FidelizacionService();
  it('usa el total pagado persistido, no el total enviado por la pantalla', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente',total:125.75}); responder('movimientos_puntos',null);
    expect(await servicio.acreditarPuntosPorCompra(20,'cliente',999999)).toBe(true);
    expect(escritura(1)).toMatchObject({puntos:125,compra_id:20,pedido_candy_id:null});
  });
  it('una compra gratis no genera puntos', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente',total:0});
    expect(await servicio.acreditarPuntosPorCompra(20,'cliente')).toBe(true);
    expect(consultas).toHaveLength(1);
  });
  it('una compra pendiente no genera puntos', async () => {
    responder('compras',{estado:'pendiente',usuario_id:'cliente',total:100});
    expect(await servicio.acreditarPuntosPorCompra(20,'cliente')).toBe(false);
  });
  it('no acredita a un usuario distinto del comprador', async () => {
    responder('compras',{estado:'pagada',usuario_id:'otro',total:100});
    expect(await servicio.acreditarPuntosPorCompra(20,'cliente')).toBe(false);
  });
  it('el índice único hace idempotente el reintento', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente',total:100}); responder('movimientos_puntos',null,{code:'23505'});
    expect(await servicio.acreditarPuntosPorCompra(20,'cliente')).toBe(true);
  });
  it('Candy pagado acredita por pedido independientemente de las entradas', async () => {
    responder('pedidos_candy',{compra_id:20,total:500,estado:'pagado'});
    responder('compras',{usuario_id:'cliente',estado:'pagada'}); responder('movimientos_puntos',null);
    expect(await servicio.acreditarPuntosPorCandy(40)).toBe(true);
    expect(escritura(2)).toMatchObject({compra_id:20,pedido_candy_id:40,puntos:500});
  });
  it('Candy pendiente no genera puntos', async () => {
    responder('pedidos_candy',{compra_id:20,total:500,estado:'pendiente'});
    expect(await servicio.acreditarPuntosPorCandy(40)).toBe(false);
  });
  it('Candy anónimo puede pagarse sin generar puntos', async () => {
    responder('pedidos_candy',{compra_id:20,total:500,estado:'pagado'}); responder('compras',{usuario_id:null,estado:'pagada'});
    expect(await servicio.acreditarPuntosPorCandy(40)).toBe(true);
    expect(consultas).toHaveLength(2);
  });
});

describe('Entrega de canjes Candy', () => {
  const servicio = new FidelizacionService();
  it('valida el código antes de consultar', async () => {
    expect(await servicio.buscarBeneficioCandy('cualquier texto')).toBeNull();
    expect(consultas).toHaveLength(0);
  });
  it('la entrega filtra por pendiente y devuelve la fila efectivamente modificada', async () => {
    responder('perfiles',{rol:'empleado'}); responder('movimientos_puntos',{id:30,entregado_at:'2026-09-29'});
    expect((await servicio.entregarBeneficioCandy(30))?.entregado_at).toBeTruthy();
    expect(consultas[1].pasos).toContainEqual({metodo:'is',args:['entregado_at',null]});
    expect(consultas[1].pasos).toContainEqual({metodo:'eq',args:['beneficio_tipo','candy']});
  });
  it('cero filas modificadas no autoriza una segunda entrega', async () => {
    responder('perfiles',{rol:'empleado'}); responder('movimientos_puntos',null);
    expect(await servicio.entregarBeneficioCandy(30)).toBeNull();
  });
  it('el cliente no puede marcar su propio Candy como entregado', async () => {
    responder('perfiles',{rol:'cliente'});
    await expect(servicio.entregarBeneficioCandy(30)).rejects.toThrow('personal');
  });
});

describe('Pedidos Candy pagados', () => {
  const servicio = new CandyService();
  it('no permite entregar un pedido que aún no fue pagado', async () => {
    responder('pedidos_candy',{compra_id:20});responder('compras',{estado:'pagada'});responder('pedidos_candy',null);
    expect(await servicio.entregarPedido(40)).toBeNull();
    expect(consultas[2].pasos).toContainEqual({metodo:'eq',args:['estado','pagado']});
    expect(consultas[2].pasos).toContainEqual({metodo:'eq',args:['entregado',false]});
  });
  it('confirma el importe de los detalles persistidos', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente'});
    responder('pedidos_candy',{id:40,compra_id:20,estado:'pendiente',total:1});
    responder('detalles_pedido_candy',[{id:1,producto_id:10,cantidad:2,precio_unitario:250,subtotal:500,productos_candy:{nombre:'Pochoclo'}}]);
    responder('pedidos_candy',{id:40});
    const pedido = await servicio.confirmarPagoPedido(20);
    expect(pedido.total).toBe(500);
    expect(pedido.detalles[0].nombreProducto).toBe('Pochoclo');
    expect(escritura(3,'update')).toEqual({estado:'pagado',total:500});
  });
  it('un pedido pagado no se cobra nuevamente', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente'});
    responder('pedidos_candy',{id:40,compra_id:20,estado:'pagado',total:500});
    responder('detalles_pedido_candy',[{id:1,subtotal:500}]);
    expect((await servicio.confirmarPagoPedido(20)).estado).toBe('pagado');
    expect(consultas).toHaveLength(3);
  });
  it('una cabecera sin detalles no puede pagarse', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente'});
    responder('pedidos_candy',{id:40,compra_id:20,estado:'pendiente',total:500}); responder('detalles_pedido_candy',[]);
    await expect(servicio.confirmarPagoPedido(20)).rejects.toThrow('listo');
  });
  it('no permite pagar Candy de otra cuenta', async () => {
    responder('compras',{estado:'pagada',usuario_id:'otro'});
    await expect(servicio.confirmarPagoPedido(20)).rejects.toThrow('otra cuenta');
  });
});

describe('Recuperación de butacas', () => {
  const servicio = new ButacaService();
  it('no considera éxito una reserva inexistente', async () => {
    responder('butacas_funcion',[]);
    expect(await servicio.confirmarButacasReserva('reserva')).toBe(false);
  });
  it('acepta un reintento con butacas ya ocupadas', async () => {
    responder('butacas_funcion',[butaca('A',{estado:'ocupada',expires_at:null})]);
    expect(await servicio.confirmarButacasReserva('reserva')).toBe(true);
  });
  it('no confirma reservas vencidas', async () => {
    responder('butacas_funcion',[butaca('A',{expires_at:'2000-01-01'})]);
    expect(await servicio.confirmarButacasReserva('reserva')).toBe(false);
  });
  it('verifica la cantidad afectada por el UPDATE', async () => {
    responder('butacas_funcion',[butaca()]); responder('butacas_funcion',[]);
    expect(await servicio.confirmarButacasReserva('reserva')).toBe(false);
  });
});

describe('Pantallas: pago, canje y empleado', () => {
  function pantallaPago(pagada = false) {
    const actual = {...compra,estado:pagada ? 'pagada' : 'pendiente'} as Compra;
    const compras = {obtenerCompraPorId:vi.fn().mockResolvedValue(actual),confirmarCompra:vi.fn().mockResolvedValue({...actual,estado:'pagada'})};
    const butacas = {obtenerReservaPorToken:vi.fn().mockResolvedValue([butaca()]),confirmarButacasReserva:vi.fn().mockResolvedValue(true)};
    const entradas = {obtenerEntradaPorCompra:vi.fn().mockResolvedValue({codigo:'entrada'}),crearEntrada:vi.fn()};
    const fidelizacion = {acreditarPuntosPorCompra:vi.fn().mockResolvedValue(true),confirmarCompraConBeneficio:vi.fn().mockResolvedValue({...actual,estado:'pagada',total:0}),calcularDescuentoEntrada:vi.fn().mockReturnValue(8000)};
    const router = {navigate:vi.fn()};
    const auth = {obtenerSesion:vi.fn().mockResolvedValue({user:{id:'cliente'}})};
    const pagina = new Pago({} as never,router as never,compras as never,butacas as never,entradas as never,fidelizacion as never,auth as never,{obtenerPedidoPorCompra:async()=>null,limpiarSeleccion:()=>{}} as never,new ComboService());
    pagina.compra.set(actual);
    return {pagina,compras,butacas,entradas,fidelizacion,router};
  }
  it('el pago normal conserva emisión y navegación', async () => {
    const r=pantallaPago(); await r.pagina.confirmarPago();
    expect(r.compras.confirmarCompra).toHaveBeenCalledWith(20);
    expect(r.router.navigate).toHaveBeenCalledWith(['/entrada','entrada']);
  });
  it('la selección de beneficio usa el servicio de fidelización', async () => {
    const r=pantallaPago(); r.pagina.beneficioId.set(30); await r.pagina.confirmarPago();
    expect(r.fidelizacion.confirmarCompraConBeneficio).toHaveBeenCalled();
    expect(r.compras.confirmarCompra).not.toHaveBeenCalled();
  });
  it('recupera la emisión sin volver a pagar', async () => {
    const r=pantallaPago(true); await r.pagina.confirmarPago();
    expect(r.compras.confirmarCompra).not.toHaveBeenCalled();
    expect(r.fidelizacion.confirmarCompraConBeneficio).not.toHaveBeenCalled();
    expect(r.router.navigate).toHaveBeenCalled();
  });
  it('bloquea el doble clic durante el pago', async () => {
    const r=pantallaPago(); await Promise.all([r.pagina.confirmarPago(),r.pagina.confirmarPago()]);
    expect(r.compras.confirmarCompra).toHaveBeenCalledTimes(1);
  });
  it('el fallo de emisión permite reintentar sin reutilizar el beneficio', async () => {
    const r=pantallaPago(true); r.entradas.obtenerEntradaPorCompra.mockResolvedValue(null); r.entradas.crearEntrada.mockResolvedValue(null);
    await r.pagina.confirmarPago();
    expect(r.pagina.error()).toContain('Reintentá'); expect(r.pagina.procesando()).toBe(false);
    expect(r.router.navigate).not.toHaveBeenCalled();
  });
  it('un error de carga de fidelización no muestra un historial vacío', async () => {
    const servicio = {obtenerSaldoPuntos:vi.fn().mockRejectedValue(new Error('sin conexión'))};
    const pagina = new Fidelizacion({obtenerSesion:async()=>({user:{id:'cliente'}})} as never,servicio as never);
    await pagina.cargarDatos();
    expect(pagina.error()).toBe('sin conexión'); expect(pagina.cargando()).toBe(false);
  });
  it('el empleado dirige los códigos manuales de canje al mismo flujo que el QR', async () => {
    const servicio = {buscarBeneficioCandy:vi.fn().mockResolvedValue({...beneficio,beneficio_tipo:'candy'})};
    const pagina = new ValidarEntrada({} as never,{} as never,servicio as never);
    pagina.codigoManual='00000000-0000-0000-0000-000000000030';
    await pagina.buscarEntrada();
    expect(servicio.buscarBeneficioCandy).toHaveBeenCalledWith(pagina.codigoManual);
    await pagina.qrLeido('CINEBERA-CANJE:'+pagina.codigoManual);
    expect(servicio.buscarBeneficioCandy).toHaveBeenCalledTimes(2);
    expect(pagina.entrada()).toBeNull();
  });
});
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { CompraService } from '../app/services/compra';
import { EntradaService } from '../app/services/entrada';
import { Auth } from '../app/services/auth';

describe('Templates del flujo de beneficios', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('permite seleccionar una entrada gratis y muestra el total cero', async () => {
    await TestBed.configureTestingModule({ imports:[Pago], providers:[
      provideRouter([]),
      {provide:ActivatedRoute,useValue:{snapshot:{paramMap:{get:()=>null}}}},
      {provide:CompraService,useValue:{}}, {provide:ButacaService,useValue:{}},
      {provide:EntradaService,useValue:{}}, {provide:Auth,useValue:{}},
      {provide:CandyService,useValue:{obtenerPedidoPorCompra:async()=>null}},
      {provide:ComboService,useValue:new ComboService()},
      {provide:FidelizacionService,useValue:new FidelizacionService()}
    ]}).compileComponents();
    const fixture=TestBed.createComponent(Pago);
    fixture.detectChanges(); await fixture.whenStable();
    fixture.componentInstance.compra.set(compra);
    fixture.componentInstance.butacas.set([butaca()]);
    fixture.componentInstance.beneficios.set([{...beneficio,beneficio_nombre:'Entrada gratis'}]);
    fixture.componentInstance.cargando.set(false);
    fixture.detectChanges(); await fixture.whenStable();
    const select=fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    select.selectedIndex=1; select.dispatchEvent(new Event('change'));
    fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.beneficioId()).toBe(30);
    expect(fixture.nativeElement.textContent).toContain('Restante por pagar: ARS 0');
    expect(fixture.nativeElement.textContent).toContain('Confirmar compra sin pago adicional');
  });
  it('distingue beneficio pendiente, entrada usada y Candy entregado en el historial', async () => {
    const items = [
      {...beneficio,beneficio_nombre:'Entrada pendiente',created_at:'2026-09-29',puntos:-500},
      {...beneficio,id:31,beneficio_nombre:'Entrada usada',compra_utilizada_id:20,created_at:'2026-09-29',puntos:-500},
      {...beneficio,id:32,beneficio_nombre:'Pochoclo',beneficio_tipo:'candy',entregado_at:'2026-09-29',created_at:'2026-09-29',puntos:-200}
    ];
    await TestBed.configureTestingModule({imports:[Fidelizacion],providers:[
      provideRouter([]), {provide:Auth,useValue:{obtenerSesion:async()=>({user:{id:'cliente'}})}},
      {provide:FidelizacionService,useValue:{obtenerSaldoPuntos:async()=>600,obtenerRecompensasActivas:async()=>[],obtenerBeneficios:async()=>items}}
    ]}).compileComponents();
    const fixture=TestBed.createComponent(Fidelizacion);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.cargando()).toBe(false));
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const texto=fixture.nativeElement.textContent;
    expect(texto).toContain('Entrada gratis pendiente');
    expect(texto).toContain('Utilizado en la compra #20');
    expect(texto).toContain('Candy entregado');
    expect(fixture.nativeElement.querySelector('a[href="/cartelera"]')).toBeTruthy();
  });
});

describe('Reintentos y errores adicionales', () => {
  it('un QR repetido con scanner pausado conserva el beneficio mostrado', async () => {
    const servicio={buscarBeneficioCandy:vi.fn().mockResolvedValue({...beneficio,beneficio_tipo:'candy'})};
    const pagina=new ValidarEntrada({} as never,{} as never,servicio as never);
    await pagina.qrLeido('CINEBERA-CANJE:00000000-0000-0000-0000-000000000030');
    await pagina.qrLeido('CINEBERA-CANJE:00000000-0000-0000-0000-000000000030');
    expect(pagina.beneficioCandy()?.id).toBe(30);
    expect(servicio.buscarBeneficioCandy).toHaveBeenCalledTimes(1);
  });
  it('un fallo de entrega libera el botón y muestra el error', async () => {
    const pagina=new ValidarEntrada({} as never,{entregarPedido:async()=>{throw new Error('sin conexión');}} as never,{} as never);
    pagina.pedidoCandy.set({id:40,estado:'pagado',entregado:false} as never);
    await pagina.entregarCandy();
    expect(pagina.procesando()).toBe(false);
    expect(pagina.mensaje()).toBe('sin conexión');
  });
  it('reintentar crear un pedido existente no duplica cabecera ni detalles', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente'});
    responder('pedidos_candy',{id:40,compra_id:20,estado:'pendiente',total:500});
    responder('detalles_pedido_candy',[{id:1,subtotal:500}]);
    expect(await new CandyService().crearPedido(20,[{producto:{id:10},cantidad:1}] as never,500)).toBe(40);
    expect(consultas.some(c=>c.pasos.some(p=>p.metodo==='insert'))).toBe(false);
  });
  it('crear Candy toma los precios actuales del catálogo', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente'}); responder('pedidos_candy',null);
    responder('productos_candy',[{id:10,nombre:'Pochoclo',precio:500,activo:true}]);
    responder('pedidos_candy',{id:40}); responder('detalles_pedido_candy',null);
    expect(await new CandyService().crearPedido(20,[{producto:{id:10,precio:1},cantidad:2}] as never,2)).toBe(40);
    expect(escritura(3)).toMatchObject({total:1000,estado:'pendiente'});
    expect(escritura(4)).toEqual([{pedido_candy_id:40,producto_id:10,cantidad:2,precio_unitario:500,subtotal:1000}]);
  });
  it('un fallo de detalles no permite avanzar al pago como si el pedido estuviera completo', async () => {
    responder('compras',{estado:'pagada',usuario_id:'cliente'}); responder('pedidos_candy',null);
    responder('productos_candy',[{id:10,nombre:'Pochoclo',precio:500,activo:true}]);
    responder('pedidos_candy',{id:40}); responder('detalles_pedido_candy',null,{message:'error'});
    await expect(new CandyService().crearPedido(20,[{producto:{id:10},cantidad:1}] as never,500)).rejects.toThrow('productos');
  });
});

import { Candy } from '../app/pages/cliente/candy/candy';
import { Checkout } from '../app/pages/cliente/checkout/checkout';
import { ProductoCandy } from '../app/models/producto-candy';

const pochoclo = {id:10,nombre:'Pochoclo',precio:500,activo:true} as ProductoCandy;
describe('Candy desde checkout y pago conjunto', () => {
  afterEach(()=>sessionStorage.clear());
  it('conserva el carrito por reserva después de reconstruir el servicio', () => {
    const servicio=new CandyService(); servicio.guardarSeleccion('uno',[{producto:pochoclo,cantidad:2}]);
    expect(new CandyService().obtenerSeleccion('uno')[0].cantidad).toBe(2);
    expect(servicio.obtenerSeleccion('otra')).toEqual([]);
    servicio.limpiarSeleccion('uno'); expect(servicio.obtenerSeleccion('uno')).toEqual([]);
  });
  it('un borrador inválido no rompe el checkout',()=>{
    sessionStorage.setItem('cinebera-candy-uno','texto inválido');
    expect(new CandyService().obtenerSeleccion('uno')).toEqual([]);
  });
  it('vuelve al mismo checkout y conserva lo elegido sin crear un pedido',async()=>{
    const servicio=new CandyService(); const router={navigate:vi.fn()};
    const pagina=new Candy(servicio,{obtenerReservaPorToken:async()=>[butaca()]} as never,{} as never,router as never);
    pagina.reservaToken='reserva'; pagina.productos=[pochoclo];
    pagina.agregarProducto(pochoclo); pagina.aumentarCantidad(10); await pagina.volverCheckout();
    expect(router.navigate).toHaveBeenCalledWith(['/checkout','reserva']);
    expect(servicio.obtenerSeleccion('reserva')[0].cantidad).toBe(2);
    expect(consultas).toHaveLength(0);
  });
  it('no vuelve al checkout como reserva válida si venció durante Candy',async()=>{
    const router={navigate:vi.fn()};
    const pagina=new Candy(new CandyService(),{obtenerReservaPorToken:async()=>[butaca('A',{expires_at:'2000-01-01'})]} as never,{} as never,router as never);
    pagina.reservaToken='reserva'; await pagina.volverCheckout();
    expect(pagina.error()).toContain('venció'); expect(router.navigate).not.toHaveBeenCalled();
  });
  it('prepara Candy mientras la compra aún está pendiente',async()=>{
    responder('compras',{estado:'pendiente',usuario_id:'cliente'}); responder('pedidos_candy',null);
    responder('productos_candy',[pochoclo]); responder('pedidos_candy',{id:40});
    responder('detalles_pedido_candy',null); responder('detalles_pedido_candy',null); responder('pedidos_candy',{id:40});
    await new CandyService().prepararPedidoCheckout(20,[{producto:pochoclo,cantidad:2}]);
    expect(escritura(3)).toMatchObject({total:1000,estado:'cancelado'});
    expect(escritura(6,'update')).toEqual({estado:'pendiente'});
  });
  it('continuar sin Candy no crea un pedido vacío',async()=>{
    responder('compras',{estado:'pendiente',usuario_id:'cliente'}); responder('pedidos_candy',null);
    await new CandyService().prepararPedidoCheckout(20,[]); expect(consultas).toHaveLength(2);
  });
  it('quitar todo Candy cancela el pedido pendiente anterior',async()=>{
    responder('compras',{estado:'pendiente',usuario_id:'cliente'});
    responder('pedidos_candy',{id:40,estado:'pendiente',compra_id:20,total:500}); responder('detalles_pedido_candy',[{id:1,subtotal:500}]);
    responder('pedidos_candy',{id:40}); responder('detalles_pedido_candy',null);
    await new CandyService().prepararPedidoCheckout(20,[]);
    expect(escritura(3,'update')).toEqual({estado:'cancelado',total:0});
    expect(consultas).toHaveLength(5);
  });
  it('un cambio de precio exige revisar Candy antes de pagar',async()=>{
    responder('compras',{estado:'pendiente',usuario_id:'cliente'}); responder('pedidos_candy',null);
    responder('productos_candy',[{...pochoclo,precio:600}]);
    await expect(new CandyService().prepararPedidoCheckout(20,[{producto:pochoclo,cantidad:1}])).rejects.toThrow('catálogo');
    expect(consultas.some(c=>c.pasos.some(p=>p.metodo==='insert'))).toBe(false);
  });
  it('checkout prepara el pedido antes de navegar al pago',async()=>{
    const compras={obtenerCompraPorReserva:async()=>compra,actualizarTotalPendiente:vi.fn()};
    const candy={prepararPedidoCheckout:vi.fn()}; const router={navigate:vi.fn()};
    const pagina=new Checkout({} as never,{obtenerReservaPorToken:async()=>[butaca()]} as never,{} as never,{} as never,{} as never,{} as never,{} as never,compras as never,{} as never,router as never,candy as never,new ComboService());
    pagina.reservaToken='reserva';pagina.funcion.set({id:4});pagina.cargandoCombos.set(false);pagina.seleccionCandy.set([{producto:pochoclo,cantidad:2}]);
    vi.spyOn(pagina,'calcularTotalFinal').mockReturnValue(8000);
    await pagina.irAlPago();
    expect(compras.actualizarTotalPendiente).toHaveBeenCalledWith(20,8000,null);
    expect(candy.prepararPedidoCheckout).toHaveBeenCalledWith(20,[{producto:pochoclo,cantidad:2}],null);
    expect(router.navigate).toHaveBeenCalledWith(['/pago',20]);
  });
  it('un fallo guardando Candy no permite navegar al pago',async()=>{
    const router={navigate:vi.fn()};
    const pagina=new Checkout({} as never,{obtenerReservaPorToken:async()=>[butaca()]} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{obtenerCompraPorReserva:async()=>compra,actualizarTotalPendiente:async()=>{}} as never,{} as never,router as never,{prepararPedidoCheckout:async()=>{throw new Error('fallo Candy');}} as never,new ComboService());
    pagina.funcion.set({id:4});pagina.cargandoCombos.set(false);await pagina.irAlPago();
    expect(router.navigate).not.toHaveBeenCalled();expect(pagina.errorPago()).toBe('fallo Candy');expect(pagina.preparandoPago()).toBe(false);
  });
  it('una confirmación paga ambas partes y acredita Candy sin descontarlo con la entrada gratis',async()=>{
    const pedido={id:40,estado:'pendiente',total:500,detalles:[{id:1}]};
    const candy={obtenerPedidoPorCompra:async()=>pedido,confirmarPagoPedido:vi.fn().mockResolvedValue({...pedido,estado:'pagado'}),limpiarSeleccion:vi.fn()};
    const fidelizacion={calcularDescuentoEntrada:()=>8000,confirmarCompraConBeneficio:vi.fn().mockResolvedValue({...compra,total:0,estado:'pagada'}),acreditarPuntosPorCompra:async()=>true,acreditarPuntosPorCandy:vi.fn().mockResolvedValue(true)};
    const router={navigate:vi.fn()};
    const pagina=new Pago({} as never,router as never,{obtenerCompraPorId:async()=>compra} as never,{obtenerReservaPorToken:async()=>[butaca()],confirmarButacasReserva:async()=>true} as never,{obtenerEntradaPorCompra:async()=>({codigo:'qr'})} as never,fidelizacion as never,{obtenerSesion:async()=>({user:{id:'cliente'}})} as never,candy as never,new ComboService());
    pagina.compra.set(compra);pagina.pedidoCandy.set(pedido as never);pagina.beneficioId.set(30);
    expect(pagina.total()).toBe(500);
    await pagina.confirmarPago();
    expect(candy.confirmarPagoPedido).toHaveBeenCalledWith(20);
    expect(fidelizacion.acreditarPuntosPorCandy).toHaveBeenCalledWith(40);
    expect(router.navigate).toHaveBeenCalledWith(['/entrada','qr']);
  });
});
