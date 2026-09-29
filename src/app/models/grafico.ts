export interface DatoGrafico { id: number; nombre: string; cantidad: number; }
export interface Estadisticas {
  desde: string; hasta: string; tipo: 'semana' | 'mes';
  peliculas: DatoGrafico[]; candy: DatoGrafico[];
}
