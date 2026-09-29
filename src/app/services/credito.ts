import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { Compra } from '../models/compra';

@Injectable({providedIn:'root'})
export class CreditoService {
  private async usuario(): Promise<string> {
    const {data:{user},error}=await supabase.auth.getUser();
    if(error || !user || user.is_anonymous) throw new Error('Iniciá sesión con tu cuenta para usar crédito.');
    return user.id;
  }
  private async ultimo(usuario: string) {
    const r=await supabase.from('movimientos_credito').select('id,saldo').eq('usuario_id',usuario).order('id',{ascending:false}).limit(1).maybeSingle();
    if(r.error) throw new Error('No se pudo consultar el crédito.');
    return r.data;
  }
  async obtenerSaldo(): Promise<number> { return Number((await this.ultimo(await this.usuario()))?.saldo ?? 0); }
  async obtenerUso(compraId:number): Promise<number> {
    const r=await supabase.from('movimientos_credito').select('monto').eq('usuario_id',await this.usuario()).eq('compra_id',compraId).eq('tipo','uso').maybeSingle();
    if(r.error) throw new Error('No se pudo consultar el crédito de la compra.');
    return -Number(r.data?.monto ?? 0);
  }
  /** FK al saldo previo + sucesor UNIQUE forman una cadena sin bifurcaciones.
   * Si otra pestaña llegó primero, releemos el saldo y reintentamos el INSERT. */
  async registrar(compraId:number,tipo:'uso'|'reintegro',monto:number): Promise<void> {
    if(!Number.isFinite(monto) || Math.abs(monto*100-Math.round(monto*100))>0.00001 ||
      (tipo==='uso' ? monto>=0 : monto<=0)) throw new Error('Importe de crédito inválido.');
    const usuario=await this.usuario();
    for(let intento=0;intento<3;intento++) {
      const existente=await supabase.from('movimientos_credito').select('monto').eq('compra_id',compraId).eq('tipo',tipo).maybeSingle();
      if(existente.error) throw new Error('No se pudo verificar el movimiento.');
      if(existente.data) {
        if(Number(existente.data.monto)!==monto) throw new Error('La compra ya tiene otro importe de crédito reservado. Recargá el pago.');
        return;
      }
      const anterior=await this.ultimo(usuario);
      const saldoAnterior=Number(anterior?.saldo ?? 0);
      const saldo=Math.round((saldoAnterior+monto)*100)/100;
      if(saldo<0) throw new Error('El crédito disponible cambió o es insuficiente. Recargá el pago.');
      const guardado=await supabase.from('movimientos_credito').insert({usuario_id:usuario,compra_id:compraId,tipo,monto,
        anterior_id:anterior?.id ?? null,saldo_anterior:saldoAnterior,saldo});
      if(!guardado.error) return;
      if(guardado.error.code!=='23505') throw new Error('No se pudo registrar el crédito. Recargá para consultar el estado.');
    }
    throw new Error('El crédito cambió durante la operación. Reintentá.');
  }
  validarPlazo(fecha:string,hora:string,ahora=Date.now()): void {
    // Las funciones del cine se interpretan en Buenos Aires, independientemente del navegador.
    const inicio=new Date(fecha+'T'+hora+'-03:00').getTime();
    if(!Number.isFinite(inicio) || inicio-ahora<2*60*60*1000) throw new Error('Solo podés cancelar hasta dos horas antes de la función.');
  }
  async cancelar(compraId:number): Promise<void> {
    const usuario=await this.usuario();
    const consulta=await supabase.from('compras').select('*').eq('id',compraId).eq('usuario_id',usuario).single();
    if(consulta.error || !consulta.data) throw new Error('La compra no pertenece a tu cuenta o no está disponible.');
    let compra=consulta.data as Compra;
    if(compra.cancelacion_completa) return;
    const candy=await supabase.from('pedidos_candy').select('id,total,estado,entregado').eq('compra_id',compraId).maybeSingle();
    if(candy.error) throw new Error('No se pudo comprobar Candy.');
    if(candy.data?.entregado) throw new Error('No se puede cancelar una compra con Candy retirado.');
    if(compra.estado!=='cancelada') {
      let reintegro=await this.obtenerUso(compraId);
      if(compra.estado==='pagada') {
        const funcion=await supabase.from('funciones').select('fecha,hora').eq('id',compra.funcion_id).single();
        if(funcion.error || !funcion.data) throw new Error('No se pudo comprobar el horario de la función.');
        this.validarPlazo(funcion.data.fecha,funcion.data.hora);
        const entrada=await supabase.from('entradas').select('utilizada').eq('compra_id',compraId).maybeSingle();
        if(entrada.error) throw new Error('No se pudo comprobar la entrada.');
        if(entrada.data?.utilizada) throw new Error('La entrada ya fue utilizada.');
        if(candy.data?.estado==='pendiente') throw new Error('Completá el pago de Candy antes de cancelar la compra.');
        reintegro=Math.round((Number(compra.total)+(candy.data?.estado==='pagado'?Number(candy.data.total):0))*100)/100;
      }
      const r=await supabase.from('compras').update({estado:'cancelada',cancelada_at:new Date().toISOString(),credito_reintegro:reintegro})
        .eq('id',compraId).eq('usuario_id',usuario).eq('estado',compra.estado).select().maybeSingle();
      if(r.error || !r.data) throw new Error('La compra cambió. Reintentá para consultar su cancelación.');
      compra=r.data as Compra;
    }
    if(!compra.cancelada_at) throw new Error('Esta cancelación anterior no tiene un reintegro registrado.');
    // Pasos recuperables: primero anulamos el acceso y liberamos la reserva, luego acreditamos.
    if(candy.data && candy.data.estado!=='cancelado') {
      const r=await supabase.from('pedidos_candy').update({estado:'cancelado'}).eq('id',candy.data.id).eq('entregado',false).select('id').maybeSingle();
      if(r.error || !r.data) throw new Error('No se pudo anular Candy. Reintentá la cancelación.');
    }
    const liberacion=await supabase.from('butacas_funcion').delete().eq('reserva_token',compra.reserva_token).eq('funcion_id',compra.funcion_id);
    if(liberacion.error) throw new Error('Falta liberar las butacas. Reintentá la cancelación.');
    const puntos=await supabase.from('movimientos_puntos').select('puntos').eq('compra_id',compraId).eq('tipo','compra');
    if(puntos.error) throw new Error('Falta ajustar los puntos. Reintentá la cancelación.');
    const suma=(puntos.data??[]).reduce((s,p)=>s+Number(p.puntos),0);
    if(suma>0) {
      const ajuste=await supabase.from('movimientos_puntos').insert({usuario_id:usuario,compra_id:compraId,tipo:'cancelacion',puntos:-suma,descripcion:'Reversión por cancelación #'+compraId});
      if(ajuste.error && ajuste.error.code!=='23505') throw new Error('Falta ajustar los puntos. Reintentá la cancelación.');
    }
    if(Number(compra.credito_reintegro)>0) await this.registrar(compraId,'reintegro',Number(compra.credito_reintegro));
    const final=await supabase.from('compras').update({cancelacion_completa:true}).eq('id',compraId).eq('estado','cancelada').select('id').maybeSingle();
    if(final.error || !final.data) throw new Error('El reintegro está procesado. Reintentá para cerrar la cancelación.');
  }
}
