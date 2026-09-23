import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TmdbDetallePelicula, TmdbRespuestaBusqueda } from '../models/tmdb-peliculas';
import { environmentLocal } from '../../environments/environment.local';

@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  /*
   * URL base de la API de TMDB.
   */
  private apiUrl =
    'https://api.themoviedb.org/3';

  /*
   * API Key utilizada para autenticar
   * las consultas contra TMDB.
   *
   * IMPORTANTE:
   * reemplazar el texto por tu API Key.
   */
  private apiKey =
    environmentLocal.tmdbApiKey;

      /*
  * URL base utilizada para obtener
  * las imágenes almacenadas por TMDB.
  */
  private imagenUrl =
    'https://image.tmdb.org/t/p/w342';


  /*
   * HttpClient es proporcionado por Angular
   * mediante inyección de dependencias.
   *
   * Lo utilizamos para realizar peticiones HTTP.
   */
  constructor(
    private http: HttpClient
  ) {}


  /*
 * Construye la URL completa del póster.
 *
 * TMDB devuelve solamente el path de la imagen,
 * por ejemplo:
 *
 * /abc123.jpg
 *
 * Nosotros lo transformamos en una URL
 * que el navegador pueda mostrar.
 */
obtenerUrlPoster(
  posterPath: string | null
): string {

  /*
   * Algunas películas pueden no tener póster.
   */
  if (!posterPath) {
    return '';
  }

  return `${this.imagenUrl}${posterPath}`;
}


/*
 * Obtiene información detallada de una película
 * utilizando su identificador de TMDB.
 *
 * Ejemplo:
 *
 * obtenerDetallePelicula(438631)
 */
obtenerDetallePelicula(id: number) {

  const url =
    `${this.apiUrl}/movie/${id}`;

  return this.http.get<TmdbDetallePelicula>(
    url,
    {
      params: {
        api_key: this.apiKey,
        language: 'es-AR'
      }
    }
  );

}

  /*
   * Busca películas en TMDB utilizando un texto.
   *
   * Ejemplo:
   *
   * buscarPeliculas('Dune')
   */
  buscarPeliculas(texto: string) {

    const url =
      `${this.apiUrl}/search/movie`;

    return this.http.get<TmdbRespuestaBusqueda>(url, {
      params: {
        api_key: this.apiKey,
        query: texto,
        language: 'es-AR'
      }
    });

  }

}