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
 * Recibimos también el vencimiento de la operación.
 *
 * IMPORTANTE:
 * Butacas NO crea ahora un segundo reloj.
 *
 * El vencimiento nació cuando el usuario entró
 * a seleccionar butacas y ese mismo momento
 * se guarda posteriormente en Supabase.
 */
async reservarButacas(
  funcionId: number,
  butacas: Butaca[],
  vencimientoOperacion: number
): Promise<string | null> {


  /*
   * Antes de reservar liberamos reservas anteriores
   * que hayan vencido.
   */
  const limpiezaExitosa =
    await this.limpiarReservasVencidas(
      funcionId
    );


  if (!limpiezaExitosa) {
    return null;
  }


  /*
   * Identificador único de esta operación.
   *
   * Todas las butacas compartirán este token.
   */
  const reservaToken =
    crypto.randomUUID();


  /*
   * El vencimiento YA NO nace acá.
   *
   * Lo recibimos desde la operación iniciada
   * en la pantalla de Butacas.
   */
  const vencimiento =
    new Date(
      vencimientoOperacion
    );


  /*
   * Preparamos los registros para Supabase.
   */
  const registros =
    butacas.map(
      butaca => ({

        funcion_id:
          funcionId,

        fila:
          butaca.fila,

        numero:
          butaca.numero,

        estado:
          'reservada',

        reserva_token:
          reservaToken,

        /*
         * Todas las butacas reciben exactamente
         * el mismo vencimiento de la operación.
         */
        expires_at:
          vencimiento.toISOString()

      })
    );


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
 * Libera todas las butacas pertenecientes
 * a una reserva temporal.
 *
 * Usamos el reservaToken porque todas las butacas
 * elegidas durante una misma operación de compra
 * comparten ese identificador.
 *
 * Ejemplo:
 *
 * token ABC123
 *   H6
 *   H7
 *
 * Al eliminar por token liberamos ambas.
 */
async liberarReserva(
  reservaToken: string
): Promise<boolean> {

  const { error } =
    await supabase
      .from('butacas_funcion')
      .delete()
      .eq('reserva_token', reservaToken)
      .eq('estado', 'reservada');


  /*
   * Si Supabase devuelve un error,
   * informamos que la operación no pudo completarse.
   */
  if (error) {

    console.error(
      'Error al liberar la reserva:',
      error
    );

    return false;
  }


  /*
   * Si no hubo error, las butacas temporales
   * de esta reserva quedaron liberadas.
   */
  return true;
}

/*
 * =====================================================
 * ACTUALIZAR UNA RESERVA EXISTENTE
 * =====================================================
 *
 * Permite modificar las butacas de una operación
 * SIN generar un nuevo reserva_token.
 *
 * Ejemplo:
 *
 * Reserva original:
 * H5 - H6
 *
 * Nueva selección:
 * H6 - H7
 *
 * Resultado:
 *
 * H5 → se elimina
 * H6 → se conserva
 * H7 → se agrega
 *
 * Todas siguen perteneciendo al mismo token.
 */
async actualizarReserva(
  reservaToken: string,
  funcionId: number,
  nuevasButacas: Butaca[],
  vencimientoOperacion: number
): Promise<boolean> {


  /*
   * PASO 1
   *
   * Recuperamos las butacas que actualmente
   * pertenecen a esta reserva.
   */
  const actuales =
    await this.obtenerReservaPorToken(
      reservaToken
    );


  /*
   * Si no encontramos la reserva,
   * no tenemos nada seguro que modificar.
   */
  if (actuales.length === 0) {

    console.error(
      'No se encontró la reserva a modificar.'
    );

    return false;
  }


  /*
   * PASO 2
   *
   * Detectamos qué butacas fueron quitadas.
   *
   * filter():
   * "quedate con las actuales..."
   *
   * some():
   * "...para las cuales NO exista una equivalente
   * dentro de la nueva selección".
   */
  const butacasQuitadas =
    actuales.filter(

      actual =>

        !nuevasButacas.some(

          nueva =>
            nueva.fila === actual.fila &&
            nueva.numero === actual.numero

        )

    );


  /*
   * PASO 3
   *
   * Detectamos cuáles son nuevas.
   */
  const butacasAgregadas =
    nuevasButacas.filter(

      nueva =>

        !actuales.some(

          actual =>
            actual.fila === nueva.fila &&
            actual.numero === nueva.numero

        )

    );


  /*
   * PASO 4
   *
   * Eliminamos únicamente las butacas que
   * pertenecen a ESTA reserva.
   *
   * Nunca eliminamos una reserva de otro usuario.
   */
  for (
    const butaca of butacasQuitadas
  ) {

    const { error } =
      await supabase
        .from('butacas_funcion')
        .delete()

        .eq(
          'reserva_token',
          reservaToken
        )

        .eq(
          'funcion_id',
          funcionId
        )

        .eq(
          'fila',
          butaca.fila
        )

        .eq(
          'numero',
          butaca.numero
        )

        .eq(
          'estado',
          'reservada'
        );


    if (error) {

      console.error(
        'Error liberando una butaca:',
        error
      );

      return false;
    }

  }


  /*
   * PASO 5
   *
   * Insertamos solamente las nuevas.
   */
  if (
    butacasAgregadas.length > 0
  ) {

    const vencimiento =
      new Date(
        vencimientoOperacion
      ).toISOString();


    const registrosNuevos =
      butacasAgregadas.map(

        butaca => ({

          funcion_id:
            funcionId,

          fila:
            butaca.fila,

          numero:
            butaca.numero,

          estado:
            'reservada',

          /*
           * MUY IMPORTANTE:
           *
           * conservamos el token original.
           */
          reserva_token:
            reservaToken,

          /*
           * Y también conservamos el vencimiento
           * de la operación original.
           */
          expires_at:
            vencimiento

        })

      );


    const { error } =
      await supabase
        .from('butacas_funcion')
        .insert(
          registrosNuevos
        );


    if (error) {

      console.error(
        'Error agregando nuevas butacas:',
        error
      );

      return false;
    }

  }


  return true;
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

  // Un reintento de pago puede encontrar butacas ya ocupadas. Cero filas,
  // en cambio, nunca significa que confirmamos una entrada correctamente.
  const consulta = await supabase.from('butacas_funcion').select('*')
    .eq('reserva_token', reservaToken);
  if (consulta.error || !consulta.data?.length) return false;
  const reservadas = consulta.data.filter(butaca => butaca.estado === 'reservada');
  if (reservadas.some(butaca => !butaca.expires_at || new Date(butaca.expires_at).getTime() <= Date.now())) return false;
  if (!reservadas.length) return consulta.data.every(butaca => butaca.estado === 'ocupada');

  const {
    data,
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
    )
    .gt('expires_at', new Date().toISOString())
    .select('id');


  if (error) {

    console.error(
      'Error confirmando las butacas:',
      error
    );

    return false;
  }


  return data?.length === reservadas.length;

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

/*
 * Recupera las butacas relacionadas con una compra
 * mediante el mismo reserva_token utilizado durante
 * la operación de compra.
 *
 * No filtramos por "reservada" porque después
 * del pago las butacas pasan a estado "ocupada".
 */
async obtenerButacasPorToken(
  reservaToken: string
): Promise<ButacaFuncion[]> {

  const { data, error } =
    await supabase
      .from('butacas_funcion')
      .select('*')
      .eq('reserva_token', reservaToken);


  /*
   * Si Supabase informa un error,
   * devolvemos un array vacío para que el componente
   * pueda continuar trabajando de forma controlada.
   */
  if (error) {

    console.error(
      'Error obteniendo las butacas de la compra:',
      error
    );

    return [];

  }


  return data ?? [];

}

}
