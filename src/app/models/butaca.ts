/*
 * Tipos posibles de una butaca.
 *
 * normal:
 *   Butaca común de la sala.
 *
 * accesible:
 *   Butaca ubicada en la fila K.
 *
 * vip:
 *   Butaca de las filas R, S y T.
 */
export type TipoButaca =
  'normal' |
  'accesible' |
  'vip';


/*
 * Estados posibles de una butaca
 * para una función determinada.
 */
export type EstadoButaca =
  'disponible' |
  'seleccionada' |
  'ocupada';


/*
 * Representa una butaca física
 * dentro de una sala de CineBera.
 */
export interface Butaca {

  /*
   * Ejemplo:
   * A, B, K, Ñ, R...
   */
  fila: string;

  /*
   * Número de asiento dentro de la fila.
   *
   * Ejemplo:
   * A1, A2, A3...
   */
  numero: number;

  /*
   * Determina las características
   * de la butaca y posteriormente
   * también su precio.
   */
  tipo: TipoButaca;

  /*
   * Estado de la butaca para
   * la función seleccionada.
   */
  estado: EstadoButaca;
}