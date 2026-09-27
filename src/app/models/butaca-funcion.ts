/*
 * Representa un registro de la tabla
 * butacas_funcion de Supabase.
 */
export interface ButacaFuncion {

  id: number;

  funcion_id: number;

  fila: string;

  numero: number;

  estado:
    'reservada' |
    'ocupada';

  /*
   * Identifica a qué operación de compra
   * pertenece una reserva.
   *
   * Una butaca ocupada antigua podría no
   * necesitar estos datos, por eso permitimos null.
   */
  reserva_token: string | null;

  /*
   * Momento hasta el cual una reserva
   * temporal continúa siendo válida.
   */
  expires_at: string | null;

  created_at: string;
}