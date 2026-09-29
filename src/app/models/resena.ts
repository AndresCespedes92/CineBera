export interface Resena {
  pelicula_id: number;
  usuario_id: string;
  estrellas: number;
  comentario: string;
  created_at: string;
}
export interface ResumenResenas { pelicula_id: number; promedio: number; cantidad: number; }
export interface VentaPelicula { pelicula_id: number; entradas_vendidas: number; }
