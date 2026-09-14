/*
 * Esta interfaz define la estructura que debe tener
 * cualquier indicador que mostremos en el Dashboard.
 *
 * No crea un indicador.
 * Solamente define las "reglas" que debe cumplir.
 */
export interface IndicadorDashboard {
    titulo: string;
    valor: number;
    prefijo: string;
    sufijo: string;
}
