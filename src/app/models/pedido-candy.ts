import {
  DetallePedidoCandy
} from './detalle-pedido-candy';


/*
 * Representa un pedido Candy completo.
 *
 * Tiene la información general del pedido
 * y todos sus productos.
 */
export interface PedidoCandy {

  id: number;

  compraId: number;

  estado: string;

  total: number;

  entregado: boolean;

  entregadoAt: string | null;

  detalles: DetallePedidoCandy[];

}