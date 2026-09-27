import { Injectable } from '@angular/core';
import { ButacaFuncion } from '../models/butaca-funcion';



import { supabase } from '../supabase';
import { Butaca } from '../models/butaca';


@Injectable({
  providedIn: 'root'
})
export class ButacaService {

 /*
 * Obtiene las butacas que actualmente bloquean
 * lugares para una función.
 *
 * Una butaca bloquea el lugar cuando:
 *
 * 1. está "ocupada" definitivamente, o
 * 2. está "reservada" y su reserva todavía no venció.
 */
async obtenerButacasOcupadas(
  funcionId: number
): Promise<ButacaFuncion[]> {

  const { data, error } =
    await supabase
      .from('butacas_funcion')
      .select('*')
      .eq('funcion_id', funcionId);


  if (error) {

    console.error(
      'Error al obtener las butacas de la función:',
      error
    );

    return [];
  }


  /*
   * Momento actual.
   *
   * Lo utilizamos para comparar contra expires_at.
   */
  const ahora =
    new Date();


  /*
   * No todos los registros encontrados necesariamente
   * deben seguir bloqueando una butaca.
   *
   * filter() conserva solamente los que actualmente
   * son válidos.
   */
  return (data ?? []).filter(

    (registro: ButacaFuncion) => {


      /*
       * Una butaca ya pagada/ocupada
       * siempre continúa bloqueada.
       */
      if (
        registro.estado === 'ocupada'
      ) {

        return true;
      }


      /*
       * Si es una reserva pero no tiene vencimiento,
       * no la consideramos una reserva válida.
       */
      if (
        !registro.expires_at
      ) {

        return false;
      }


      /*
       * Convertimos la fecha guardada por Supabase
       * nuevamente a un objeto Date.
       */
      const vencimiento =
        new Date(
          registro.expires_at
        );


      /*
       * Solamente bloqueamos la butaca mientras
       * el vencimiento sea posterior al momento actual.
       */
      return vencimiento > ahora;

    }

  );
}

/*
 * Elimina reservas temporales que ya vencieron
 * para una función determinada.
 *
 * IMPORTANTE:
 * solamente elimina registros cuyo estado
 * sea "reservada".
 *
 * Las butacas "ocupada" representan compras
 * confirmadas y nunca se eliminan acá.
 */
async limpiarReservasVencidas(
  funcionId: number
): Promise<boolean> {

  /*
   * Obtenemos el momento actual en formato ISO,
   * compatible con timestamptz de PostgreSQL.
   */
  const ahora =
    new Date().toISOString();


  /*
   * DELETE FROM butacas_funcion
   *
   * WHERE funcion_id = ...
   * AND estado = 'reservada'
   * AND expires_at < ahora
   */
  const { error } =
    await supabase
      .from('butacas_funcion')
      .delete()
      .eq('funcion_id', funcionId)
      .eq('estado', 'reservada')
      .lt('expires_at', ahora);


  if (error) {

    console.error(
      'Error al limpiar reservas vencidas:',
      error
    );

    return false;
  }


  return true;
}

/*
 * Reserva temporalmente un conjunto de butacas.
 *
 * Todas las butacas seleccionadas reciben:
 * - el mismo reserva_token
 * - el mismo vencimiento
 *
 * De esta manera sabemos que pertenecen
 * a una misma operación de compra.
 *
 * Devuelve el token si la reserva fue exitosa.
 * Devuelve null si ocurrió un error.
 */
async reservarButacas(
  funcionId: number,
  butacas: Butaca[]
): Promise<string | null> {


  /*
 * Antes de intentar una nueva reserva,
 * liberamos lugares cuya reserva temporal
 * ya haya vencido.
 *
 * Esto es necesario porque el registro viejo
 * seguiría chocando contra nuestra restricción
 * UNIQUE(funcion_id, fila, numero).
 */
const limpiezaExitosa =
  await this.limpiarReservasVencidas(
    funcionId
  );


if (!limpiezaExitosa) {

  /*
   * Si no pudimos comprobar/liberar correctamente
   * las reservas vencidas, preferimos no continuar.
   *
   * Es más seguro rechazar temporalmente una compra
   * que correr el riesgo de inconsistencias.
   */
  return null;
}


  /*
   * Generamos un UUID único para esta operación.
   *
   * Ejemplo:
   * A5 y A6 tendrán exactamente el mismo token.
   */
  const reservaToken =
    crypto.randomUUID();


  /*
   * Calculamos el vencimiento.
   *
   * Date.now() devuelve el momento actual
   * expresado en milisegundos.
   *
   * 10 * 60 * 1000 = 10 minutos.
   */
  const vencimiento =
    new Date(
      Date.now() + 10 * 60 * 1000
    );


  /*
   * Transformamos las Butaca de Angular
   * en registros para Supabase.
   */
  const registros =
    butacas.map(
      butaca => ({

        funcion_id: funcionId,

        fila: butaca.fila,

        numero: butaca.numero,

        estado: 'reservada',

        /*
         * Mismo token para todas las butacas
         * pertenecientes a esta operación.
         */
        reserva_token: reservaToken,

        /*
         * Supabase utiliza timestamptz.
         * toISOString() genera un formato
         * apropiado para almacenarlo.
         */
        expires_at:
          vencimiento.toISOString()

      })
    );


  /*
   * Intentamos reservar todas las butacas.
   *
   * La restricción UNIQUE de nuestra tabla
   * evita que exista dos veces la misma:
   *
   * funcion_id + fila + numero
   */
  const { error } =
    await supabase
      .from('butacas_funcion')
      .insert(registros);


  if (error) {

    console.error(
      'Error al reservar las butacas:',
      error
    );

    return null;
  }


  /*
   * Devolvemos el token porque lo necesitaremos
   * en la siguiente pantalla para saber qué
   * reserva estamos pagando.
   */
  return reservaToken;
}

/*
 * Busca todas las butacas pertenecientes
 * a una misma operación de reserva.
 *
 * El token funciona como identificador
 * de la futura compra.
 */
async obtenerReservaPorToken(
  reservaToken: string
): Promise<ButacaFuncion[]> {

  const { data, error } =
    await supabase
      .from('butacas_funcion')
      .select('*')
      .eq('reserva_token', reservaToken)
      .eq('estado', 'reservada');


  if (error) {

    console.error(
      'Error al obtener la reserva:',
      error
    );

    return [];
  }


  return data ?? [];
}

/*
 * Convierte las butacas de una reserva temporal
 * en butacas definitivamente ocupadas.
 *
 * Esto se ejecuta después de confirmar el pago.
 */
async confirmarButacasReserva(
  reservaToken: string
): Promise<boolean> {

  const {
    error
  } = await supabase
    .from('butacas_funcion')
    .update({

      /*
       * La butaca deja de estar reservada
       * temporalmente.
       */
      estado: 'ocupada',

      /*
       * Una butaca comprada ya no vence.
       */
      expires_at: null

    })
    .eq(
      'reserva_token',
      reservaToken
    )
    .eq(
      'estado',
      'reservada'
    );


  if (error) {

    console.error(
      'Error confirmando las butacas:',
      error
    );

    return false;
  }


  return true;

}

/*
 * Escucha en tiempo real los cambios de butacas
 * correspondientes a una función específica.
 *
 * Cuando Supabase detecta un INSERT, UPDATE o DELETE,
 * avisamos al componente mediante alCambiar().
 */
suscribirseACambiosButacas(
  funcionId: number,
  alCambiar: () => void
) {

  const canal = supabase
    .channel(
      `butacas-funcion-${funcionId}-${crypto.randomUUID()}`
    )

    .on(
      'postgres_changes',

      {
        /*
         * Escuchamos cualquier modificación:
         *
         * INSERT → nueva reserva
         * UPDATE → reserva confirmada como ocupada
         * DELETE → reserva vencida eliminada
         */
        event: '*',

        schema: 'public',

        table: 'butacas_funcion',

        /*
         * Supabase solamente nos enviará cambios
         * correspondientes a la función que
         * estamos visualizando.
         */
        filter:
          `funcion_id=eq.${funcionId}`
      },

      () => {

        /*
         * No necesitamos conocer qué cambió.
         *
         * Simplemente avisamos al componente
         * para que vuelva a consultar el estado
         * actualizado de las butacas.
         */
        alCambiar();

      }
    )

    .subscribe();


  return canal;

}

}