/** Una tarjeta por compra, aunque su entrada incluya varias butacas. */
export interface PeliculaComprada {
  compraId: number;
  peliculaId: number | null;
  titulo: string;
  poster: string | null;
  fechaFuncion: string | null;
  calificacion: number | null;
  codigoEntrada: string | null;
}
export interface PaginaMisPeliculas {
  peliculas: PeliculaComprada[];
  siguiente: number | null;
}
