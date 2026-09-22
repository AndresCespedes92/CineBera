/*
 * Representa una película tal como aparece
 * en los resultados de búsqueda de TMDB.
 *
 * Esta interfaz representa el formato externo
 * de TMDB, no nuestro modelo Pelicula de CineBera.
 */
export interface TmdbPelicula {

  id: number;

  title: string;

  overview: string;

  poster_path: string | null;

  release_date: string;

  vote_average: number;

  genre_ids: number[];

}


/*
 * Representa la respuesta completa que devuelve
 * TMDB cuando realizamos una búsqueda.
 *
 * "results" contiene el listado de películas
 * encontradas.
 */
export interface TmdbRespuestaBusqueda {

  page: number;

  results: TmdbPelicula[];

  total_pages: number;

  total_results: number;

}


/*
 * Representa un género tal como TMDB
 * lo devuelve al consultar el detalle
 * de una película.
 */
export interface TmdbGenero {

  id: number;

  name: string;

}


/*
 * Representa la información detallada
 * de una película obtenida desde TMDB.
 *
 * El detalle contiene información adicional
 * que no viene en la búsqueda básica,
 * como duración y géneros completos.
 */
export interface TmdbDetallePelicula {

  id: number;

  title: string;

  overview: string;

  poster_path: string | null;

  release_date: string;

  vote_average: number;

  runtime: number | null;

  genres: TmdbGenero[];

}