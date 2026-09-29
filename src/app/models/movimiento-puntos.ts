/*
 * =====================================================
 * MOVIMIENTO DE PUNTOS
 * =====================================================
 *
 * Representa una entrada o salida de puntos
 * de la cuenta de fidelización de un usuario.
 *
 * Ejemplos:
 *
 * Compra       +8000
 * Canje         -500
 */


/*
 * Un movimiento puede producirse actualmente
 * por dos motivos:
 *
 * compra → suma puntos
 * canje  → resta puntos
 */
export type TipoMovimientoPuntos =
  | 'compra'
  | 'canje'
  | 'cancelacion';


export interface MovimientoPuntos {

  id: number;

  usuario_id: string;

  /*
   * Será null cuando el movimiento no
   * provenga directamente de una compra.
   */
  compra_id: number | null;

  /*
   * Será null para una acreditación por compra.
   *
   * En un canje contendrá la recompensa
   * que utilizó el cliente.
   */
  recompensa_id: number | null;

  tipo: TipoMovimientoPuntos;

  /*
   * Positivo:
   * +8000 por una compra.
   *
   * Negativo:
   * -500 por un canje.
   */
  puntos: number;

  descripcion: string | null;

  created_at: string;

}