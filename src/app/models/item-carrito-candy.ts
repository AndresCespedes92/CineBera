import {
  ProductoCandy
} from './producto-candy';


/*
 * Representa un producto que el cliente
 * agregó al carrito de Candy.
 *
 * No modificamos ProductoCandy agregándole
 * una propiedad "cantidad", porque la cantidad
 * no pertenece al producto.
 *
 * Ejemplo:
 * Coca Cola sigue siendo el mismo producto,
 * pero un cliente puede comprar 1, 2 o 3.
 */
export interface ItemCarritoCandy {

  producto: ProductoCandy;

  cantidad: number;

}