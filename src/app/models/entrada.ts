/*
 * Representa una entrada ya generada en Supabase.
 *
 * Esta interfaz refleja la estructura de la tabla
 * public.entradas.
 */
export interface Entrada {

  // Identificador interno de la entrada.
  id: number;

  // Compra que originó esta entrada.
  compra_id: number;

  // Código UUID público que posteriormente irá dentro del QR.
  codigo: string;

  // Código alternativo para validación manual.
  codigo_manual: string | null;

  // Indica si la entrada ya fue utilizada para ingresar.
  utilizada: boolean;

  // Fecha y hora de utilización.
  // Será null mientras la entrada no haya sido utilizada.
  utilizada_at: string | null;

  // Momento en el que se generó la entrada.
  created_at: string;
}