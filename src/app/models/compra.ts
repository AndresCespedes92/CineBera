/*
 * Estados posibles de una compra.
 *
 * Usamos un type para impedir valores
 * que nuestro sistema no reconoce.
 */
export type EstadoCompra =
  'pendiente' |
  'pagada' |
  'cancelada';


/*
 * Representa una compra ya existente
 * dentro de Supabase.
 */
export interface Compra {

  id: number;

  /*
   * Código definitivo de la compra.
   *
   * Más adelante será importante para
   * la entrada y el QR.
   */
  codigo: string;


  /*
   * Token de la reserva temporal
   * que originó esta compra.
   */
  reserva_token: string;


  /*
   * Puede ser null porque permitiremos
   * compras anónimas.
   */
  usuario_id: string | null;


  funcion_id: number;

  estado: EstadoCompra;

  total: number;

  created_at: string;

  pagada_at: string | null;

  beneficio_id?: number | null;
  combo_id?: number | null;
  combo_nombre?: string | null;
  combo_precio?: number | null;
  combo_cantidad?: number;
  combo_pochoclo_id?: number | null;
  combo_bebida_id?: number | null;
  descuento_beneficio?: number;

}


/*
 * Datos necesarios para CREAR una compra.
 *
 * No incluimos:
 *
 * id
 * codigo
 * created_at
 * pagada_at
 *
 * porque esos valores serán generados
 * o completados por el sistema.
 */
export interface NuevaCompra {

  reserva_token: string;

  usuario_id: string | null;

  funcion_id: number;

  total: number;

}
