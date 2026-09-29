import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { Recompensa } from '../models/recompensa';
import { MovimientoPuntos } from '../models/movimiento-puntos';
import { Beneficio } from '../models/beneficio';
import { ButacaFuncion } from '../models/butaca-funcion';
import { Compra } from '../models/compra';

@Injectable({ providedIn: 'root' })
export class FidelizacionService {
  /** El saldo se deriva del historial; no guardamos un segundo saldo. */
  async obtenerSaldoPuntos(usuarioId: string): Promise<number> {
    let saldo = 0;
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await supabase.from('movimientos_puntos')
        .select('puntos').eq('usuario_id', usuarioId).order('id').range(desde, desde + 999);
      if (error) throw new Error('No se pudo consultar el saldo. Intentá nuevamente.');
      saldo += (data ?? []).reduce((total, movimiento) => total + movimiento.puntos, 0);
      if ((data?.length ?? 0) < 1000) return saldo;
    }
  }

  async obtenerRecompensas(): Promise<Recompensa[]> {
    const { data, error } = await supabase.from('recompensas').select('*').order('puntos_necesarios');
    if (error) throw new Error('No se pudieron cargar las recompensas.');
    return data ?? [];
  }

  async obtenerRecompensasActivas(): Promise<Recompensa[]> {
    return (await this.obtenerRecompensas()).filter(recompensa => recompensa.activo);
  }

  /** Releemos precio y estado: la pantalla podría tener información desactualizada. */
  async canjearRecompensa(usuarioId: string, recompensa: Recompensa): Promise<boolean> {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session || sesion.session.user.id !== usuarioId) return false;
    const { data: actual, error } = await supabase.from('recompensas')
      .select('*').eq('id', recompensa.id).eq('activo', true).maybeSingle();
    if (error || !actual || !Number.isInteger(actual.puntos_necesarios) || actual.puntos_necesarios <= 0) return false;
    let nombreBeneficio = actual.nombre;
    if (actual.tipo === 'candy') {
      if (!actual.producto_candy_id) return false;
      const producto = await supabase.from('productos_candy').select('id,nombre,categorias_candy!inner(activo)')
        .eq('id', actual.producto_candy_id).eq('activo', true).eq('categorias_candy.activo', true).maybeSingle();
      if (producto.error || !producto.data) return false;
      nombreBeneficio = producto.data.nombre;
    }
    if (await this.obtenerSaldoPuntos(usuarioId) < actual.puntos_necesarios) return false;

    // Un único INSERT crea tanto el débito como el beneficio pendiente.
    // No hay un segundo guardado que pueda dejar puntos descontados sin beneficio.
    const resultado = await supabase.from('movimientos_puntos').insert({
      usuario_id: usuarioId, recompensa_id: actual.id, compra_id: null,
      tipo: 'canje', puntos: -actual.puntos_necesarios,
      descripcion: `Canje: ${actual.nombre}`, beneficio_tipo: actual.tipo,
      beneficio_nombre: nombreBeneficio, producto_candy_id: actual.producto_candy_id,
      codigo_beneficio: crypto.randomUUID()
    });
    if (resultado.error) throw new Error('No se pudo confirmar el canje. Recargá el historial antes de volver a intentar.');
    return true;
  }

  async obtenerHistorialCanjes(usuarioId: string): Promise<MovimientoPuntos[]> {
    return this.obtenerBeneficios(usuarioId);
  }

  async obtenerBeneficios(usuarioId: string): Promise<Beneficio[]> {
    const beneficios: Beneficio[] = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await supabase.from('movimientos_puntos')
        .select('*, compras!compras_beneficio_id_fkey(id)')
        .eq('usuario_id', usuarioId).eq('tipo', 'canje')
        .order('id', { ascending: false }).range(desde, desde + 999);
      if (error) throw new Error('No se pudieron cargar tus beneficios.');
      for (const fila of data ?? []) {
        // La FK UNIQUE hace que la relación inversa sea uno a uno.
        const compra = Array.isArray(fila.compras) ? fila.compras[0] : fila.compras;
        beneficios.push({ ...fila, compra_utilizada_id: compra?.id ?? null } as Beneficio);
      }
      if ((data?.length ?? 0) < 1000) return beneficios;
    }
  }

  /** Una recompensa cubre la entrada de menor precio, incluidas las promociones.
   * Los precios existentes comparten precio base y recargo VIP del 30%.
   * Usar sus proporciones evita recalcular precios o promociones históricas. */
  calcularDescuentoEntrada(total: number, butacas: ButacaFuncion[]): number {
    if (!Number.isFinite(total) || total < 0 || butacas.length === 0) return 0;
    const pesos = butacas.map(butaca => ['R', 'S', 'T'].includes(butaca.fila) ? 1.3 : 1);
    return Math.min(total, Math.round(total * Math.min(...pesos) / pesos.reduce((a, b) => a + b, 0) * 100) / 100);
  }

  async confirmarCompraConBeneficio(compra: Compra, beneficioId: number, butacas: ButacaFuncion[]): Promise<Compra> {
    if (compra.combo_id) throw new Error('El combo tiene precio fijo y no se acumula con entrada gratis. Podés quitar el combo desde checkout.');
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session || sesion.session.user.id !== compra.usuario_id) throw new Error('Este beneficio pertenece a otra cuenta.');
    const beneficios = await this.obtenerBeneficios(compra.usuario_id!);
    const beneficio = beneficios.find(item => item.id === beneficioId && item.beneficio_tipo === 'entrada' && !item.compra_utilizada_id);
    if (!beneficio) throw new Error('La entrada gratis ya fue utilizada o no está disponible.');
    if (!butacas.length || butacas.some(b => b.reserva_token !== compra.reserva_token || b.estado !== 'reservada' || !b.expires_at || new Date(b.expires_at).getTime() <= Date.now())) {
      throw new Error('La reserva venció. Volvé a seleccionar tus butacas.');
    }
    const descuento = this.calcularDescuentoEntrada(Number(compra.total), butacas);
    if (descuento <= 0) throw new Error('Esta compra no necesita una entrada gratis.');
    // Estado, total y uso del beneficio cambian juntos en una sola fila.
    // UNIQUE(beneficio_id) impide usar el mismo canje en dos compras.
    const { data, error } = await supabase.from('compras').update({
      estado: 'pagada', pagada_at: new Date().toISOString(), beneficio_id: beneficioId,
      descuento_beneficio: descuento, total: Math.round((Number(compra.total) - descuento) * 100) / 100
    }).eq('id', compra.id).eq('usuario_id', compra.usuario_id!).eq('estado', 'pendiente').select().maybeSingle();
    if (error || !data) throw new Error('No se pudo aplicar el beneficio. Recargá para consultar el estado de la compra.');
    return data as Compra;
  }

  async buscarBeneficioCandy(codigo: string): Promise<Beneficio | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigo)) return null;
    const { data, error } = await supabase.from('movimientos_puntos').select('*')
      .eq('codigo_beneficio', codigo).eq('tipo', 'canje').eq('beneficio_tipo', 'candy').maybeSingle();
    if (error) throw new Error('No se pudo consultar el canje de Candy.');
    return data as Beneficio | null;
  }

  async entregarBeneficioCandy(id: number): Promise<Beneficio | null> {
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) throw new Error('Iniciá sesión como empleado para entregar Candy.');
    const perfil = await supabase.from('perfiles').select('rol').eq('id', sesion.session.user.id).single();
    if (perfil.error || !['admin', 'empleado'].includes(perfil.data?.rol)) throw new Error('Solo el personal puede entregar Candy.');
    const { data, error } = await supabase.from('movimientos_puntos')
      .update({ entregado_at: new Date().toISOString() }).eq('id', id)
      .eq('tipo', 'canje').eq('beneficio_tipo', 'candy').is('entregado_at', null).select().maybeSingle();
    if (error) throw new Error('No se pudo confirmar la entrega. Consultá el código nuevamente.');
    return data as Beneficio | null;
  }

  /** Solo acreditamos importes persistidos y pagados, nunca un total del componente. */
  async acreditarPuntosPorCompra(compraId: number, usuarioId: string, _totalCompra?: number): Promise<boolean> {
    const { data, error } = await supabase.from('compras').select('usuario_id,total,estado').eq('id', compraId).single();
    if (error || !data || data.estado !== 'pagada' || data.usuario_id !== usuarioId) return false;
    return this.registrarPuntos(usuarioId, Number(data.total), compraId, null);
  }

  async acreditarPuntosPorCandy(pedidoId: number): Promise<boolean> {
    const pedido = await supabase.from('pedidos_candy').select('compra_id,total,estado').eq('id', pedidoId).single();
    if (pedido.error || !pedido.data || pedido.data.estado !== 'pagado') return false;
    const compra = await supabase.from('compras').select('usuario_id,estado').eq('id', pedido.data.compra_id).single();
    if (compra.error || !compra.data || compra.data.estado !== 'pagada') return false;
    if (!compra.data.usuario_id) return true; // Las compras anónimas siguen siendo válidas.
    return this.registrarPuntos(compra.data.usuario_id, Number(pedido.data.total), pedido.data.compra_id, pedidoId);
  }

  private async registrarPuntos(usuarioId: string, total: number, compraId: number, pedidoId: number | null): Promise<boolean> {
    if (!Number.isFinite(total) || total < 0) return false;
    const puntos = Math.floor(total);
    if (puntos === 0) return true; // La parte gratuita nunca genera puntos.
    const { error } = await supabase.from('movimientos_puntos').insert({
      usuario_id: usuarioId, compra_id: compraId, pedido_candy_id: pedidoId,
      tipo: 'compra', puntos, descripcion: pedidoId ? `Puntos por Candy #${pedidoId}` : `Puntos por compra #${compraId}`
    });
    return !error || error.code === '23505'; // Reintentar no duplica la acreditación.
  }

  async actualizarRecompensa(id: number, puntosNecesarios: number, activo: boolean, productoId?: number | null): Promise<boolean> {
    if (!Number.isInteger(puntosNecesarios) || puntosNecesarios <= 0) return false;
    if (productoId === null) {
      const recompensa = await supabase.from('recompensas').select('tipo').eq('id', id).single();
      if (recompensa.error || recompensa.data?.tipo === 'candy') return false;
    }
    const cambios: { puntos_necesarios: number; activo: boolean; producto_candy_id?: number | null } = { puntos_necesarios: puntosNecesarios, activo };
    if (productoId !== undefined) cambios.producto_candy_id = productoId;
    const { data, error } = await supabase.from('recompensas').update(cambios).eq('id', id).select('id').maybeSingle();
    return !error && !!data;
  }
}
