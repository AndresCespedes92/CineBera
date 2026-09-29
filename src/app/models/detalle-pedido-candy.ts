/*
 * Representa una línea del pedido de Candy.
 *
 * Ejemplo:
 * Coca Cola | cantidad 2 | $3000 c/u | subtotal $6000
 */
export interface DetallePedidoCandy {

  id: number;

  productoId: number;

  nombreProducto: string;

  cantidad: number;
  cantidadCombo?: number;

  precioUnitario: number;

  subtotal: number;

}
