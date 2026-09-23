import { Injectable } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { supabase } from '../supabase';
import { NuevaPeliculaSupabase } from '../models/pelicula';

@Injectable({
  providedIn: 'root'
})
export class PeliculaService {

  /*
   * MOCK TEMPORAL.
   *
   * Todavía lo utiliza la cartelera.
   * Lo eliminaremos cuando hagamos
   * el SELECT desde Supabase.
   */
  private peliculas: Pelicula[] = [
    // tu película actual...
  ];

  obtenerPeliculaPorId(
    id: number
  ): Pelicula | undefined {

    return this.peliculas.find(
      pelicula => pelicula.id === id
    );

  }


  /*
   * A diferencia de los métodos anteriores,
   * este método ya trabaja realmente
   * contra Supabase.
   */
  async crearPelicula(
    pelicula: NuevaPeliculaSupabase
  ) {

    return await supabase
      .from('peliculas')
      .insert(pelicula)
      .select()
      .single();

  }

  


/*
 * Obtiene las películas guardadas
 * realmente en Supabase.
 *
 * Las ordenamos utilizando la fecha
 * de estreno definida por CineBera,
 * no la fecha original de TMDB.
 */
async obtenerPeliculasSupabase() {

  return await supabase
    .from('peliculas')
    .select('*')
    .order(
      'fecha_estreno_cinebera',
      {
        ascending: true
      }
    );

}

async obtenerPeliculas(): Promise<Pelicula[]> {

  const {
    data,
    error
  } = await this.obtenerPeliculasSupabase();

  if (error) {

    console.error(
      'Error obteniendo películas:',
      error
    );

    return [];
  }

  return (data ?? [])
    .map(
      fila =>
        this.mapearPeliculaSupabase(fila)
    );

}

/*
 * Convierte una fila de la tabla "peliculas"
 * de Supabase al modelo Pelicula utilizado
 * por nuestra aplicación Angular.
 *
 * Supabase utiliza nombres como:
 * precio_venta
 *
 * Angular utiliza:
 * precioVenta
 */
private mapearPeliculaSupabase(
  fila: any
): Pelicula {

  return {

    id:
      fila.id,

    titulo:
      fila.titulo,

    sinopsis:
      fila.sinopsis,

    duracion:
      fila.duracion,

    generos:
      fila.generos ?? [],

    formatos:
      fila.formatos ?? [],

    idiomas:
      fila.idiomas ?? [],

    /*
     * Nuestro modelo anterior esperaba
     * un array de imágenes.
     *
     * Actualmente TMDB nos proporciona
     * un único póster.
     */
    imagenes:
      fila.poster_url
        ? [fila.poster_url]
        : [],

    precioPreventa:
      Number(fila.precio_preventa),

    precioVenta:
      Number(fila.precio_venta),

    /*
     * Para CineBera nos interesa su propia
     * fecha de estreno, no la fecha histórica
     * de TMDB.
     */
    fechaEstreno:
      fila.fecha_estreno_cinebera,

    valoracion:
      Number(
        fila.valoracion_cinebera ?? 0
      ),

    cantidadResenas:
      fila.cantidad_resenas ?? 0,

    clasificacionEdad:
      fila.clasificacion_edad,

    visible:
      fila.visible

  };

}

/*
 * Obtiene únicamente las películas
 * que actualmente pertenecen a la cartelera.
 *
 * Para estar en cartelera:
 *
 * 1. Debe estar visible.
 * 2. Su fecha de estreno en CineBera
 *    debe ser hoy o una fecha anterior.
 */
async obtenerCartelera(): Promise<Pelicula[]> {

  const {
    data,
    error
  } = await this.obtenerPeliculasSupabase();


  if (error) {

    console.error(
      'Error obteniendo películas:',
      error
    );

    return [];
  }


  /*
   * Creamos la fecha de hoy.
   *
   * Ejemplo:
   * 2026-09-22
   */
  const hoy =
    new Date()
      .toISOString()
      .split('T')[0];


  return (data ?? [])

    /*
     * Primero filtramos.
     */
    .filter(
      fila =>
        fila.visible === true &&
        fila.fecha_estreno_cinebera <= hoy
    )

    /*
     * Después transformamos cada fila
     * Supabase al modelo Pelicula.
     */
    .map(
      fila =>
        this.mapearPeliculaSupabase(fila)
    );

}


/*
 * Obtiene películas que CineBera
 * todavía no estrenó.
 */
async obtenerProximamente(): Promise<Pelicula[]> {

  const {
    data,
    error
  } = await this.obtenerPeliculasSupabase();


  if (error) {

    console.error(
      'Error obteniendo próximos estrenos:',
      error
    );

    return [];
  }


  const hoy =
    new Date()
      .toISOString()
      .split('T')[0];


  return (data ?? [])

    .filter(
      fila =>
        fila.visible === true &&
        fila.fecha_estreno_cinebera > hoy
    )

    .map(
      fila =>
        this.mapearPeliculaSupabase(fila)
    );

}

}