import { MovimientoPuntos } from './movimiento-puntos';

/** El canje y el descuento de puntos se guardan en la misma fila. */
export interface Beneficio extends MovimientoPuntos {
  beneficio_tipo: 'entrada' | 'candy';
  beneficio_nombre: string;
  producto_candy_id: number | null;
  codigo_beneficio: string;
  entregado_at: string | null;
  // Se obtiene de compras: una entrada se consume al confirmar su compra.
  compra_utilizada_id: number | null;
}
