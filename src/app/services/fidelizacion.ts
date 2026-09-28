import {
  Injectable
} from '@angular/core';

import {
  supabase
} from '../supabase';

import {
  Recompensa
} from '../models/recompensa';

import {
  MovimientoPuntos
} from '../models/movimiento-puntos';



/*
 * =====================================================
 * FIDELIZACION SERVICE
 * =====================================================
 *
 * Este servicio concentra la lógica relacionada con:
 *
 * - acumulación de puntos
 * - saldo de puntos
 * - recompensas
 * - canjes
 *
 * De esta forma los componentes no necesitan
 * realizar consultas directamente a Supabase.
 */
@Injectable({
  providedIn: 'root'
})
export class FidelizacionService {


  /*
   * =====================================================
   * ACREDITAR PUNTOS POR COMPRA
   * =====================================================
   *
   * Regla del negocio:
   *
   * $1 gastado = 1 punto.
   *
   * Ejemplo:
   *
   * compra.total = 8000
   *
   * puntos obtenidos = 8000
   */
  async acreditarPuntosPorCompra(
    compraId: number,
    usuarioId: string,
    totalCompra: number
  ): Promise<boolean> {


    /*
     * Convertimos el total a puntos.
     *
     * Math.floor evita generar puntos decimales.
     *
     * Ejemplo:
     *
     * $8500.75 → 8500 puntos
     */
    const puntos =
      Math.floor(totalCompra);


    /*
     * Si por algún motivo el total no genera
     * puntos válidos, no insertamos nada.
     */
    if (puntos <= 0) {

      return false;

    }


    const {
      error
    } =
      await supabase
        .from('movimientos_puntos')
        .insert({
          usuario_id: usuarioId,

          compra_id: compraId,

          recompensa_id: null,

          tipo: 'compra',

          puntos: puntos,

          descripcion:
            `Puntos obtenidos por compra #${compraId}`
        });


    /*
     * El índice UNIQUE que creamos en Supabase
     * evita que una misma compra otorgue
     * puntos dos veces.
     */
    if (error) {

      console.error(
        'Error acreditando puntos:',
        error
      );

      return false;

    }


    return true;

  }



  /*
 * =====================================================
 * OBTENER SALDO DE PUNTOS
 * =====================================================
 *
 * El saldo no se guarda como un número separado.
 * Lo calculamos sumando todos los movimientos
 * pertenecientes al usuario.
 *
 * Ejemplo:
 *
 * Compra       +8000
 * Compra       +5000
 * Canje         -500
 * Canje         -150
 * ------------------
 * Saldo        12350
 */
async obtenerSaldoPuntos(
  usuarioId: string
): Promise<number> {

  const {
    data,
    error
  } =
    await supabase
      .from('movimientos_puntos')
      .select('puntos')
      .eq('usuario_id', usuarioId);


  if (error) {

    console.error(
      'Error obteniendo movimientos de puntos:',
      error
    );

    return 0;
  }


  /*
   * reduce() recorre todos los movimientos
   * y los acumula en un único número.
   *
   * Como los canjes serán negativos,
   * automáticamente se descuentan.
   */
  const saldo =
    (data ?? []).reduce(
      (
        acumulador,
        movimiento
      ) =>
        acumulador +
        movimiento.puntos,

      0
    );


  return saldo;
}

/*
 * =====================================================
 * OBTENER RECOMPENSAS ACTIVAS
 * =====================================================
 *
 * Recupera las recompensas que actualmente
 * pueden ser canjeadas por los clientes.
 *
 * Las recompensas inactivas siguen existiendo
 * en Supabase, pero no deben ofrecerse.
 */
async obtenerRecompensasActivas():
  Promise<Recompensa[]> {

  const {
    data,
    error
  } =
    await supabase
      .from('recompensas')
      .select('*')
      .eq('activo', true)
      .order(
        'puntos_necesarios',
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      'Error obteniendo recompensas:',
      error
    );

    return [];

  }


  return (data ?? []) as Recompensa[];

}

/*
 * =====================================================
 * CANJEAR RECOMPENSA
 * =====================================================
 *
 * Intenta utilizar los puntos del usuario
 * para obtener una recompensa.
 *
 * Antes de realizar el canje verificamos:
 *
 * 1. El saldo actual.
 * 2. Que tenga suficientes puntos.
 *
 * Si puede canjearla, registramos un movimiento
 * NEGATIVO en movimientos_puntos.
 */
async canjearRecompensa(
  usuarioId: string,
  recompensa: Recompensa
): Promise<boolean> {


  /*
   * Primero calculamos cuánto tiene disponible.
   */
  const saldoActual =
    await this.obtenerSaldoPuntos(
      usuarioId
    );


  /*
   * Ejemplo:
   *
   * saldo = 300
   * recompensa = 500
   *
   * No puede realizar el canje.
   */
  if (
    saldoActual <
    recompensa.puntos_necesarios
  ) {

    console.warn(
      'El usuario no tiene puntos suficientes.'
    );

    return false;

  }


  /*
   * Los canjes son movimientos NEGATIVOS.
   *
   * Ejemplo:
   *
   * recompensa = 500
   *
   * movimiento = -500
   */
  const puntosACanjear =
    -recompensa.puntos_necesarios;


  const {
    error
  } =
    await supabase
      .from('movimientos_puntos')
      .insert({

        usuario_id:
          usuarioId,

        compra_id:
          null,

        recompensa_id:
          recompensa.id,

        tipo:
          'canje',

        puntos:
          puntosACanjear,

        descripcion:
          `Canje: ${recompensa.nombre}`

      });


  if (error) {

    console.error(
      'Error realizando el canje:',
      error
    );

    return false;

  }


  return true;

}

/*
 * =====================================================
 * OBTENER HISTORIAL DE CANJES
 * =====================================================
 *
 * Recupera solamente los movimientos que representan
 * canjes realizados por el usuario.
 *
 * No mostramos acá las acreditaciones por compras
 * porque el requisito solicita específicamente
 * el historial de canjes.
 *
 * Los ordenamos del más reciente al más antiguo.
 */
async obtenerHistorialCanjes(
  usuarioId: string
): Promise<MovimientoPuntos[]> {

  const {
    data,
    error
  } =
    await supabase
      .from('movimientos_puntos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('tipo', 'canje')
      .order(
        'created_at',
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      'Error obteniendo historial de canjes:',
      error
    );

    return [];

  }


  return (data ?? []) as MovimientoPuntos[];

}

/*
 * =====================================================
 * OBTENER TODAS LAS RECOMPENSAS
 * =====================================================
 *
 * Este método está pensado para Administración.
 *
 * A diferencia de obtenerRecompensasActivas(),
 * acá necesitamos ver también las recompensas
 * desactivadas para poder volver a habilitarlas.
 */
async obtenerRecompensas():
  Promise<Recompensa[]> {

  const {
    data,
    error
  } =
    await supabase
      .from('recompensas')
      .select('*')
      .order(
        'puntos_necesarios',
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      'Error obteniendo recompensas:',
      error
    );

    return [];

  }


  return (data ?? []) as Recompensa[];

}

/*
 * =====================================================
 * ACTUALIZAR RECOMPENSA
 * =====================================================
 *
 * Permite al administrador modificar:
 *
 * - cantidad de puntos necesarios
 * - estado activo/inactivo
 *
 * Ejemplo:
 *
 * Entrada gratis:
 * 500 puntos → 700 puntos
 */
async actualizarRecompensa(
  id: number,
  puntosNecesarios: number,
  activo: boolean
): Promise<boolean> {

  /*
   * Evitamos guardar cantidades inválidas.
   */
  if (puntosNecesarios <= 0) {

    console.error(
      'Los puntos necesarios deben ser mayores a cero.'
    );

    return false;

  }


  const {
    error
  } =
    await supabase
      .from('recompensas')
      .update({
        puntos_necesarios:
          puntosNecesarios,

        activo:
          activo
      })
      .eq(
        'id',
        id
      );


  if (error) {

    console.error(
      'Error actualizando recompensa:',
      error
    );

    return false;

  }


  return true;

}

}