/*
 * =====================================================
 * RECOMPENSA
 * =====================================================
 *
 * Representa una recompensa configurable del
 * programa de fidelización.
 *
 * Ejemplos:
 *
 * - Entrada gratis → 500 puntos
 * - Pochoclo grande → 150 puntos
 *
 * Estos datos provienen de la tabla
 * "recompensas" de Supabase.
 */


/*
 * Solamente permitimos los tipos de recompensa
 * que actualmente existen en CineBera.
 *
 * Esto evita valores inválidos como:
 *
 * tipo = 'cualquier_cosa'
 */
export type TipoRecompensa =
  | 'entrada'
  | 'candy';


export interface Recompensa {

  id: number;

  nombre: string;

  descripcion: string | null;

  tipo: TipoRecompensa;

  producto_candy_id?: number | null;

  puntos_necesarios: number;

  activo: boolean;

  created_at: string;

}
