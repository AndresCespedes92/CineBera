import { CreditoService } from '../app/services/credito';
import { EntradaService } from '../app/services/entrada';
import { CandyService } from '../app/services/candy';
import { supabase } from '../app/supabase';
import { Pago } from '../app/pages/cliente/pago/pago';
import { Compra } from '../app/models/compra';
const servicio=new CreditoService();
const compra={id:20,usuario_id:'yo',estado:'pagada',funcion_id:4,reserva_token:'token',total:8000} as Compra;
let respuestas:{tabla:string;data:unknown;error?:unknown}[];
let consultas:{tabla:string;pasos:{metodo:string;args:unknown[]}[]}[];
const r=(tabla:string,data:unknown,error?:unknown)=>respuestas.push({tabla,data,error});
const escritura=(indice:number,metodo='insert')=>consultas[indice].pasos.find(p=>p.metodo===metodo)?.args[0];
beforeEach(()=>{
 respuestas=[];consultas=[];
 vi.spyOn(supabase.auth,'getUser').mockResolvedValue({data:{user:{id:'yo'}},error:null} as never);
 vi.spyOn(supabase,'from').mockImplementation(((tabla:string)=>{
  const respuesta=respuestas.shift();if(!respuesta)throw Error('Consulta inesperada '+tabla);expect(tabla).toBe(respuesta.tabla);
  const registro={tabla,pasos:[] as {metodo:string;args:unknown[]}[]};consultas.push(registro);const q:Record<string,unknown>={};
  for(const metodo of ['select','eq','order','limit','single','maybeSingle','insert','update','delete'])q[metodo]=(...args:unknown[])=>{registro.pasos.push({metodo,args});return q;};
  q['then']=(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:respuesta.data,error:respuesta.error??null}).then(resolve);return q;
 }) as never);
});
afterEach(()=>vi.restoreAllMocks());
describe('Crédito y plazo',()=>{
 it('acepta el límite exacto de dos horas en Buenos Aires',()=>expect(()=>servicio.validarPlazo('2026-10-01','18:00:00',Date.parse('2026-10-01T19:00:00Z'))).not.toThrow());
 it.each(['2026-10-01T19:00:00.001Z','2026-10-02T00:00:00Z'])('rechaza menos de dos horas o función pasada',ahora=>expect(()=>servicio.validarPlazo('2026-10-01','18:00:00',Date.parse(ahora))).toThrow('dos horas'));
 it('rechaza fecha inválida',()=>expect(()=>servicio.validarPlazo('mal','18:00:00')).toThrow());
 it('no permite crédito anónimo',async()=>{
  vi.mocked(supabase.auth.getUser).mockResolvedValue({data:{user:null},error:null} as never);await expect(servicio.obtenerSaldo()).rejects.toThrow('sesión');expect(supabase.from).not.toHaveBeenCalled();
 });
 it('saldo inicial cero y lectura del último saldo',async()=>{r('movimientos_credito',null);expect(await servicio.obtenerSaldo()).toBe(0);r('movimientos_credito',{id:1,saldo:'125.50'});expect(await servicio.obtenerSaldo()).toBe(125.5);});
 it.each([0,1,-1.001,NaN])('rechaza débito inválido %s',async monto=>await expect(servicio.registrar(20,'uso',monto)).rejects.toThrow('inválido'));
 it('no duplica una operación confirmada aunque se haya perdido su respuesta',async()=>{r('movimientos_credito',{monto:-100});await servicio.registrar(20,'uso',-100);expect(consultas).toHaveLength(1);});
 it('no acepta cambiar el importe de una operación existente',async()=>{r('movimientos_credito',{monto:-100});await expect(servicio.registrar(20,'uso',-200)).rejects.toThrow('otro importe');});
 it('impide saldo negativo antes de escribir',async()=>{r('movimientos_credito',null);r('movimientos_credito',{id:1,saldo:50});await expect(servicio.registrar(20,'uso',-100)).rejects.toThrow('insuficiente');expect(consultas).toHaveLength(2);});
 it('tras colisión relee el saldo y no permite gastar lo que usó otra pestaña',async()=>{
  r('movimientos_credito',null);r('movimientos_credito',{id:1,saldo:100});r('movimientos_credito',null,{code:'23505'});
  r('movimientos_credito',null);r('movimientos_credito',{id:2,saldo:20});await expect(servicio.registrar(20,'uso',-80)).rejects.toThrow('insuficiente');
 });
 it('guarda el saldo con dos decimales y referencia a su movimiento anterior',async()=>{
  r('movimientos_credito',null);r('movimientos_credito',{id:1,saldo:100});r('movimientos_credito',null);await servicio.registrar(20,'uso',-25.55);
  expect(escritura(2)).toMatchObject({anterior_id:1,saldo_anterior:100,saldo:74.45,monto:-25.55});
 });
});
describe('Cancelación recuperable',()=>{
 it('rechaza compra ajena sin modificar datos',async()=>{r('compras',null,{});await expect(servicio.cancelar(20)).rejects.toThrow('cuenta');});
 it('una cancelación completa no se vuelve a acreditar',async()=>{r('compras',{...compra,estado:'cancelada',cancelacion_completa:true});await servicio.cancelar(20);expect(consultas).toHaveLength(1);});
 it('no cancela Candy entregado',async()=>{r('compras',compra);r('pedidos_candy',{entregado:true});await expect(servicio.cancelar(20)).rejects.toThrow('retirado');});
 it('no cancela una entrada utilizada',async()=>{
  r('compras',compra);r('pedidos_candy',null);r('movimientos_credito',null);r('funciones',{fecha:'2099-01-01',hora:'18:00:00'});r('entradas',{utilizada:true});await expect(servicio.cancelar(20)).rejects.toThrow('utilizada');
 });
 it('cancela una compra pagada con Candy y reintegra el neto completo',async()=>{
  r('compras',compra);r('pedidos_candy',{id:40,total:1000,estado:'pagado',entregado:false});r('movimientos_credito',{monto:-3000});
  r('funciones',{fecha:'2099-01-01',hora:'18:00:00'});r('entradas',{utilizada:false});
  r('compras',{...compra,estado:'cancelada',cancelada_at:'2026-01-01',credito_reintegro:9000});
  r('pedidos_candy',{id:40});r('butacas_funcion',null);r('movimientos_puntos',[]);
  r('movimientos_credito',null);r('movimientos_credito',{id:2,saldo:2000});r('movimientos_credito',null);r('compras',{id:20});
  await servicio.cancelar(20);expect(escritura(5,'update')).toMatchObject({estado:'cancelada',credito_reintegro:9000});
  expect(escritura(11)).toMatchObject({monto:9000,saldo:11000});
 });
 it('si venció el plazo no comienza ninguna escritura',async()=>{
  r('compras',compra);r('pedidos_candy',null);r('movimientos_credito',null);r('funciones',{fecha:'2000-01-01',hora:'18:00:00'});
  await expect(servicio.cancelar(20)).rejects.toThrow('dos horas');expect(consultas.every(c=>!c.pasos.some(p=>p.metodo==='update'))).toBe(true);
 });
 it('reanuda una cancelación, libera solo su reserva, revierte puntos y acredita una vez',async()=>{
  r('compras',{...compra,estado:'cancelada',cancelada_at:'2026-01-01',credito_reintegro:9000});r('pedidos_candy',{id:40,total:1000,estado:'pagado',entregado:false});
  r('pedidos_candy',{id:40});r('butacas_funcion',null);r('movimientos_puntos',[{puntos:8000},{puntos:1000}]);r('movimientos_puntos',null);
  r('movimientos_credito',null);r('movimientos_credito',null);r('movimientos_credito',null);r('compras',{id:20});
  await servicio.cancelar(20);expect(escritura(5)).toMatchObject({tipo:'cancelacion',puntos:-9000});expect(escritura(8)).toMatchObject({monto:9000,saldo:9000});
  expect(consultas[3].pasos).toContainEqual({metodo:'eq',args:['reserva_token','token']});expect(consultas[3].pasos).toContainEqual({metodo:'eq',args:['funcion_id',4]});
 });
 it('si falla liberar butacas no acredita todavía el reintegro',async()=>{
  r('compras',{...compra,estado:'cancelada',cancelada_at:'2026-01-01',credito_reintegro:8000});r('pedidos_candy',null);r('butacas_funcion',null,{});
  await expect(servicio.cancelar(20)).rejects.toThrow('butacas');expect(consultas).toHaveLength(3);
 });
 it('anular una reserva pendiente devuelve solo su crédito reservado',async()=>{
  r('compras',{...compra,estado:'pendiente'});r('pedidos_candy',null);r('movimientos_credito',{monto:-500});
  r('compras',{...compra,estado:'cancelada',cancelada_at:'2026-01-01',credito_reintegro:500});r('butacas_funcion',null);r('movimientos_puntos',[]);
  r('movimientos_credito',null);r('movimientos_credito',{id:1,saldo:0});r('movimientos_credito',null);r('compras',{id:20});
  await servicio.cancelar(20);expect(escritura(3,'update')).toMatchObject({credito_reintegro:500});expect(escritura(8)).toMatchObject({monto:500});
 });
 it('QR de compra cancelada no puede validarse',async()=>{r('entradas',{compra_id:20});r('compras',{estado:'cancelada'});expect(await new EntradaService().utilizarEntrada(1)).toBeNull();expect(consultas).toHaveLength(2);});
 it('Candy de compra cancelada no puede entregarse',async()=>{r('pedidos_candy',{compra_id:20});r('compras',{estado:'cancelada'});await expect(new CandyService().entregarPedido(40)).rejects.toThrow('cancelada');expect(consultas).toHaveLength(2);});
});
describe('Pago mixto',()=>{
 function pagina(saldo:number,reservado=0) {
  const credito={obtenerSaldo:async()=>saldo,obtenerUso:async()=>reservado,registrar:vi.fn().mockResolvedValue(undefined)};
  const compras={obtenerCompraPorId:async()=>({...compra,estado:'pendiente'}),confirmarCompra:async()=>compra};
  const pago=new Pago({} as never,{navigate:vi.fn()} as never,compras as never,{obtenerReservaPorToken:async()=>[{expires_at:'2099-01-01'}],confirmarButacasReserva:async()=>true} as never,
    {obtenerEntradaPorCompra:async()=>({codigo:'qr'})} as never,{acreditarPuntosPorCompra:async()=>true} as never,
    {obtenerSesion:async()=>({user:{id:'yo'}})} as never,{obtenerPedidoPorCompra:async()=>null,limpiarSeleccion:()=>{}} as never,
    {validarPedido:()=>{},guardarSeleccion:()=>{}} as never,credito as never);
  pago.compra.set({...compra,estado:'pendiente'});pago.saldoCredito.set(saldo);pago.usarCredito.set(true);return {pago,credito};
 }
 it('aplica crédito parcial y conserva el importe de la compra',async()=>{const {pago,credito}=pagina(3000);expect(pago.restante()).toBe(5000);await pago.confirmarPago();expect(pago.error()).toBe('');expect(credito.registrar).toHaveBeenCalledWith(20,'uso',-3000);expect(pago.compra()?.total).toBe(8000);});
 it('cubre el total sin consumir saldo sobrante',async()=>{const {pago,credito}=pagina(10000);await pago.confirmarPago();expect(credito.registrar).toHaveBeenCalledWith(20,'uso',-8000);expect(pago.restante()).toBe(0);});
 it('si falla el pago después de reservar, el crédito queda recuperable',async()=>{
  const {pago,credito}=pagina(3000);
  (pago as unknown as {compraService:{confirmarCompra:()=>Promise<null>}}).compraService.confirmarCompra=async()=>null;
  await pago.confirmarPago();expect(pago.error()).toContain('confirmar el pago');expect(pago.creditoReservado()).toBe(3000);
  expect(credito.registrar).toHaveBeenCalledTimes(1);
 });
 it('un reintento reutiliza crédito reservado sin descontar otra vez',async()=>{const {pago,credito}=pagina(0,3000);await pago.confirmarPago();expect(credito.registrar).not.toHaveBeenCalled();expect(pago.restante()).toBe(5000);});
});
