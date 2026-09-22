/*
 * Representa la información básica de una película
 * dentro de nuestra aplicación.
 *
 * Más adelante esta estructura se relacionará
 * con los datos almacenados en Supabase.
 */
/*
 * Define los formatos en los que una película
 * puede proyectarse.
 *
 * Al limitar los valores posibles evitamos cosas como:
 * formato: '3DD'
 */
export type FormatoPelicula = '2D' | '3D' | '4D' | '5D';
export type ClasificacionEdad = 'ATP' | '+13' | '+18';

/*
 * Modelo principal de una película.
 *
 * Esta interface funciona como un "contrato":
 * cualquier objeto Pelicula debe respetar
 * esta estructura.
 */
export interface Pelicula {
  // Identificador único.
  id: number;

  // Información principal.
  titulo: string;
  sinopsis: string;

  // Duración expresada en minutos.
  duracion: number;

  /*
   * Una película puede pertenecer
   * a más de un género.
   */
  generos: string[];

  /*
   * Una película también puede estar disponible
   * en más de un formato.
   *
   * Ejemplo:
   * ['2D', '3D']
   */
  formatos: FormatoPelicula[];

  /*
   * También permitimos varios idiomas.
   *
   * Ejemplo:
   * ['Castellano', 'Subtitulada']
   */
  idiomas: string[];

  /*
   * Guardaremos las referencias/URLs de las imágenes.
   *
   * Más adelante las imágenes reales podrán
   * almacenarse en Supabase Storage.
   */
  imagenes: string[];

  // Información comercial.
  precioPreventa: number;
  precioVenta: number;

  // Fecha prevista de estreno.
  fechaEstreno: string;

  // Información de valoración.
  valoracion: number;
  cantidadResenas: number;

  // Restricción de edad.
  clasificacionEdad: ClasificacionEdad;

  /*
   * Permite decidir si la película aparece
   * actualmente en la cartelera.
   */
  visible: boolean;

}

export interface NuevaPeliculaSupabase {

  tmdb_id: number;

  titulo: string;

  sinopsis: string;

  duracion: number;

  generos: string[];

  formatos: FormatoPelicula[];

  idiomas: string[];

  poster_url: string | null;

  precio_preventa: number;

  precio_venta: number;

  /*
 * Fecha original informada por TMDB.
 */
fecha_estreno_tmdb: string;


/*
 * Fecha desde la cual CineBera
 * estrenará la película.
 *
 * Esta fecha la decide el administrador.
 */
fecha_estreno_cinebera: string;

  valoracion_tmdb: number;

  valoracion_cinebera: number;

  cantidad_resenas: number;

  clasificacion_edad: ClasificacionEdad;

  visible: boolean;

}