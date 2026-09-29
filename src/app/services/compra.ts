import {
  Injectable
} from '@angular/core';

import {
  supabase
} from '../supabase';

import {
  Compra,
  NuevaCompra
} from '../models/compra';


@Injectable({
  providedIn: 'root'
})
export class CompraService {

  async actualizarTotalPendiente(id: number, total: number): Promise<void> {
    const { data, error } = await supabase.from('compras').update({ total })
      .eq('id', id).eq('estado', 'pendiente').select('id').maybeSingle();
    if (error || !data) throw new Error('No se pudo actualizar el resumen de entradas.');
  }


  /*
   * Crea una compra en estado pendiente.
   *
   * IMPORTANTE:
   *
   * crear la compra todavía NO significa
   * que el pago haya sido aprobado.
   */
  async crearCompra(
    nuevaCompra: NuevaCompra
  ): Promise<Compra | null> {

    const {
      data,
      error
    } = await supabase
      .from('compras')
      .insert({
        reserva_token:
          nuevaCompra.reserva_token,

        usuario_id:
          nuevaCompra.usuario_id,

        funcion_id:
          nuevaCompra.funcion_id,

        total:
          nuevaCompra.total,

        estado:
          'pendiente'
      })
      .select()
      .single();


    /*
     * Si Supabase rechaza el INSERT,
     * informamos el error y devolvemos null.
     */
    if (error) {

      console.error(
        'Error creando la compra:',
        error
      );

      return null;
    }


    /*
     * Supabase nos devuelve la compra
     * que acaba de insertar.
     *
     * Ahora ya tenemos:
     *
     * - id
     * - codigo
     * - created_at
     * - estado
     * - etc.
     */
    return data as Compra;

  }


  /*
   * Permite recuperar una compra utilizando
   * el token de reserva.
   *
   * Esto será útil si el usuario recarga
   * la pantalla durante el checkout.
   */
  async obtenerCompraPorReserva(
    reservaToken: string
  ): Promise<Compra | null> {

    const {
      data,
      error
    } = await supabase
      .from('compras')
      .select('*')
      .eq(
        'reserva_token',
        reservaToken
      )
      .maybeSingle();


    /*
     * maybeSingle() permite que no exista
     * todavía ninguna compra para esa reserva.
     *
     * En ese caso data será null.
     */
    if (error) {

      console.error(
        'Error obteniendo la compra:',
        error
      );

      return null;
    }


    return data as Compra | null;

  }

  /*
 * Obtiene una compra específica utilizando
 * su identificador interno.
 *
 * Lo utilizaremos cuando la pantalla de pago
 * reciba una URL como:
 *
 * /pago/15
 */
async obtenerCompraPorId(
  compraId: number
): Promise<Compra | null> {

  const {
    data,
    error
  } = await supabase
    .from('compras')
    .select('*')
    .eq(
      'id',
      compraId
    )
    .maybeSingle();


  if (error) {

    console.error(
      'Error obteniendo la compra:',
      error
    );

    return null;
  }


  return data as Compra | null;

}

/*
 * Confirma una compra que se encontraba pendiente.
 *
 * Cuando el pago es aprobado:
 *
 * pendiente → pagada
 *
 * También registramos el momento exacto
 * en que se confirmó el pago.
 */
async confirmarCompra(
  compraId: number
): Promise<Compra | null> {

  const {
    data,
    error
  } = await supabase
    .from('compras')
    .update({

      estado: 'pagada',

      /*
       * Guardamos la fecha/hora actual.
       *
       * toISOString() genera una fecha UTC,
       * que Supabase almacena correctamente
       * como timestamptz.
       */
      pagada_at:
        new Date().toISOString()

    })
    .eq(
      'id',
      compraId
    )

    /*
     * Solamente una compra pendiente
     * puede pasar a pagada.
     */
    .eq(
      'estado',
      'pendiente'
    )
    .select()
    .maybeSingle();


  if (error) {

    console.error(
      'Error confirmando la compra:',
      error
    );

    return null;
  }


  return data as Compra | null;

}


/*
 * Indica si un usuario ya tiene al menos
 * una compra PAGADA anteriormente.
 *
 * Lo usamos para determinar si corresponde
 * aplicar el beneficio de primera compra.
 *
 * IMPORTANTE:
 * una compra pendiente no cuenta como compra
 * realizada porque todavía no fue pagada.
 */
async tieneComprasPagadas(
  usuarioId: string
): Promise<boolean> {

  const {
    data,
    error
  } =
    await supabase
      .from('compras')

      /*
       * Solamente necesitamos conocer el ID.
       *
       * No hace falta traer todos los datos
       * de todas las compras del usuario.
       */
      .select('id')

      /*
       * Buscamos compras pertenecientes
       * al usuario autenticado.
       */
      .eq(
        'usuario_id',
        usuarioId
      )

      /*
       * Para el beneficio solamente cuentan
       * compras que efectivamente fueron pagadas.
       */
      .eq(
        'estado',
        'pagada'
      )

      /*
       * Nos alcanza con encontrar una.
       *
       * Si existe una compra pagada,
       * ya sabemos que NO es la primera compra.
       */
      .limit(1);


  if (error) {

    console.error(
      'Error verificando compras anteriores:',
      error
    );

    /*
     * Ante un error no asumimos que es
     * primera compra, porque podríamos aplicar
     * un descuento incorrectamente.
     */
    return true;
  }


  /*
   * Si Supabase devuelve al menos una fila,
   * significa que ya compró anteriormente.
   */
  return (data?.length ?? 0) > 0;
}


}
