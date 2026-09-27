import {
  Injectable
} from '@angular/core';

import {
  ItemCarritoCandy
} from '../models/item-carrito-candy';

import {
  supabase
} from '../supabase';

import {
  ProductoCandy
} from '../models/producto-candy';

import {
  PedidoCandy
} from '../models/pedido-candy';


@Injectable({
  providedIn: 'root'
})
export class CandyService {


  /*
   * Obtiene solamente los productos
   * activos del Candy.
   *
   * Los productos desactivados permanecen
   * en la base para conservar información
   * histórica, pero no se ofrecen al cliente.
   */
  async obtenerProductosActivos():
    Promise<ProductoCandy[]> {

    const {
      data,
      error
    } =
      await supabase
        .from('productos_candy')
        .select('*')
        .eq('activo', true)
        .order('nombre');


    /*
     * Si Supabase devuelve un error,
     * lo registramos y devolvemos un
     * array vacío para que la pantalla
     * pueda seguir funcionando.
     */
    if (error) {

      console.error(
        'Error obteniendo productos Candy:',
        error
      );

      return [];
    }


    /*
     * Supabase utiliza snake_case.
     *
     * Nuestro modelo Angular utiliza
     * camelCase.
     *
     * map() transforma cada registro
     * recibido en un ProductoCandy.
     */
    return (data ?? []).map(
      fila => this.mapearProducto(fila)
    );
  }


  /*
   * Transforma la representación de
   * Supabase en la representación que
   * utilizamos dentro de Angular.
   */
  private mapearProducto(
    fila: any
  ): ProductoCandy {

    return {
      id: fila.id,
      categoriaId: fila.categoria_id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      precio: Number(fila.precio),
      imagenUrl: fila.imagen_url,
      activo: fila.activo
    };
  }

  /*
 * Crea un pedido de Candy asociado
 * a una compra de CineBera.
 *
 * Recibimos:
 *
 * - compraId: compra de entrada relacionada.
 * - carrito: productos seleccionados.
 * - total: importe total del pedido.
 *
 * El proceso tiene dos pasos:
 *
 * 1. Crear la cabecera en pedidos_candy.
 * 2. Crear los productos en detalles_pedido_candy.
 */
async crearPedido(
  compraId: number,
  carrito: ItemCarritoCandy[],
  total: number
): Promise<number | null> {

  /*
   * PASO 1
   *
   * Creamos la cabecera del pedido.
   *
   * .select()
   * hace que Supabase nos devuelva
   * el registro que acaba de insertar.
   *
   * .single()
   * indica que esperamos exactamente
   * un registro.
   */
  const {
    data: pedido,
    error: errorPedido
  } =
    await supabase
      .from('pedidos_candy')
      .insert({
        compra_id: compraId,
        estado: 'pendiente',
        total: total,
        entregado: false
      })
      .select()
      .single();


  if (
    errorPedido ||
    !pedido
  ) {

    console.error(
      'Error creando pedido Candy:',
      errorPedido
    );

    return null;
  }


  /*
   * PASO 2
   *
   * Ahora conocemos pedido.id.
   *
   * Transformamos cada producto del carrito
   * en una fila para detalles_pedido_candy.
   */
  const detalles =
    carrito.map(
      item => ({

        pedido_candy_id:
          pedido.id,

        producto_id:
          item.producto.id,

        cantidad:
          item.cantidad,

        /*
         * Guardamos el precio actual
         * como precio histórico de compra.
         */
        precio_unitario:
          item.producto.precio,

        subtotal:
          item.producto.precio *
          item.cantidad

      })
    );


  /*
   * Supabase permite insertar un array.
   *
   * Por lo tanto, si tenemos tres productos,
   * no necesitamos hacer tres llamadas
   * independientes.
   */
  const {
    error: errorDetalles
  } =
    await supabase
      .from('detalles_pedido_candy')
      .insert(detalles);


  if (errorDetalles) {

    console.error(
      'Error creando detalles Candy:',
      errorDetalles
    );

    return null;
  }


  /*
   * Todo salió correctamente.
   *
   * Devolvemos el ID del pedido porque
   * después puede servirnos para continuar
   * con el pago o consultar el pedido.
   */
  return pedido.id;
}

/*
 * Busca el pedido Candy asociado a una compra.
 *
 * Además de la cabecera del pedido,
 * necesitamos recuperar sus productos.
 */
async obtenerPedidoPorCompra(
  compraId: number
): Promise<PedidoCandy | null> {

  /*
   * PASO 1
   *
   * Buscamos la cabecera del pedido.
   *
   * Usamos maybeSingle() porque una compra
   * puede todavía no tener pedido Candy.
   */
  const {
    data: pedido,
    error: errorPedido
  } =
    await supabase
      .from('pedidos_candy')
      .select('*')
      .eq('compra_id', compraId)
      .maybeSingle();


  if (errorPedido) {

    console.error(
      'Error obteniendo pedido Candy:',
      errorPedido
    );

    return null;
  }


  /*
   * No tener Candy no necesariamente
   * significa que ocurrió un error.
   *
   * Simplemente puede ser una entrada
   * cuyo cliente no compró productos.
   */
  if (!pedido) {
    return null;
  }


  /*
   * PASO 2
   *
   * Recuperamos las líneas del pedido.
   *
   * También pedimos el nombre del producto
   * relacionado para poder mostrar algo como:
   *
   * Coca Cola x2
   *
   * y no solamente:
   *
   * producto_id = 4
   */
  const {
    data: detalles,
    error: errorDetalles
  } =
    await supabase
      .from('detalles_pedido_candy')
      .select(`
        id,
        producto_id,
        cantidad,
        precio_unitario,
        subtotal,
        productos_candy (
          nombre
        )
      `)
      .eq(
        'pedido_candy_id',
        pedido.id
      );


  if (errorDetalles) {

    console.error(
      'Error obteniendo detalles Candy:',
      errorDetalles
    );

    return null;
  }


  /*
   * Transformamos la estructura de Supabase
   * a nuestros modelos de Angular.
   */
  return {

    id:
      pedido.id,

    compraId:
      pedido.compra_id,

    estado:
      pedido.estado,

    total:
      Number(pedido.total),

    entregado:
      pedido.entregado,

    entregadoAt:
      pedido.entregado_at,

    detalles:
      (detalles ?? []).map(
        detalle => ({

          id:
            detalle.id,

          productoId:
            detalle.producto_id,

          /*
          * Supabase está tipando la relación
          * productos_candy como un array.
          *
          * Como producto_id referencia a un único
          * producto, tomamos el primer elemento.
          */
          nombreProducto:
            detalle.productos_candy?.[0]?.nombre
            ?? 'Producto',

          cantidad:
            detalle.cantidad,

          precioUnitario:
            Number(
              detalle.precio_unitario
            ),

          subtotal:
            Number(
              detalle.subtotal
            )

        })
      )

  };

}


/*
 * Marca un pedido Candy como entregado.
 *
 * La condición:
 *
 *   .eq('entregado', false)
 *
 * es importante porque solamente permitimos
 * entregar un pedido que todavía está pendiente.
 *
 * Esto ayuda a evitar una doble entrega.
 */
async entregarPedido(
  pedidoId: number
): Promise<PedidoCandy | null> {

  const {
    data: pedido,
    error
  } =
    await supabase
      .from('pedidos_candy')
      .update({
        entregado: true,

        /*
         * Guardamos también cuándo se realizó
         * efectivamente la entrega.
         */
        entregado_at:
          new Date().toISOString()
      })

      /*
       * Actualizamos solamente el pedido
       * que estamos intentando entregar.
       */
      .eq(
        'id',
        pedidoId
      )

      /*
       * Además debe continuar pendiente.
       *
       * Si otro empleado ya lo entregó,
       * esta condición dejará de cumplirse.
       */
      .eq(
        'entregado',
        false
      )

      /*
       * Queremos recibir el registro
       * actualizado.
       */
      .select()

      /*
       * Puede devolver uno o ninguno.
       *
       * Ninguno puede significar que el pedido
       * ya había sido entregado.
       */
      .maybeSingle();


  if (error) {

    console.error(
      'Error entregando pedido Candy:',
      error
    );

    return null;
  }


  /*
   * Si no se actualizó ningún registro,
   * no consideramos válida la entrega.
   */
  if (!pedido) {
    return null;
  }


  /*
   * Después de actualizar necesitamos devolver
   * un PedidoCandy completo.
   *
   * Reutilizamos nuestro método de consulta
   * para recuperar también sus detalles.
   */
  return await this.obtenerPedidoPorCompra(
    pedido.compra_id
  );

}


}