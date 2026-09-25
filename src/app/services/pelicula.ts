import {
  Injectable
} from '@angular/core';

import {
  Pelicula,
  NuevaPeliculaSupabase
} from '../models/pelicula';

import {
  supabase
} from '../supabase';


@Injectable({
  providedIn: 'root'
})
export class PeliculaService {


  /*
   * Obtiene una película específica
   * desde Supabase utilizando su ID.
   *
   * Ejemplo:
   *
   * /admin/peliculas/5/editar
   */
  async obtenerPeliculaPorId(
    id: number
  ): Promise<Pelicula | null> {

    const {
      data,
      error
    } = await supabase
      .from('peliculas')
      .select('*')
      .eq('id', id)
      .single();


    if (error) {

      console.error(
        'Error obteniendo película por ID:',
        error
      );

      return null;
    }


    return this.mapearPeliculaSupabase(
      data
    );

  }


  /*
   * Crea una nueva película
   * en Supabase.
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
   * Actualiza los datos comerciales
   * administrados por CineBera.
   *
   * Los datos originales provenientes
   * de TMDB no se modifican.
   */
  async actualizarPelicula(
    peliculaId: number,
    datos: {
      fechaEstreno: string;
      precioPreventa: number;
      precioVenta: number;
      clasificacionEdad: string;
      formatos: string[];
      idiomas: string[];
      visible: boolean;
    }
  ) {

    return await supabase
      .from('peliculas')
      .update({

        fecha_estreno_cinebera:
          datos.fechaEstreno,

        precio_preventa:
          datos.precioPreventa,

        precio_venta:
          datos.precioVenta,

        clasificacion_edad:
          datos.clasificacionEdad,

        formatos:
          datos.formatos,

        idiomas:
          datos.idiomas,

        visible:
          datos.visible

      })
      .eq(
        'id',
        peliculaId
      )
      .select()
      .single();

  }


  /*
   * Obtiene todas las películas
   * almacenadas en Supabase.
   *
   * Se ordenan utilizando la fecha
   * de estreno definida por CineBera.
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


  /*
   * Obtiene todas las películas
   * y las transforma al modelo
   * utilizado por Angular.
   */
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
          this.mapearPeliculaSupabase(
            fila
          )
      );

  }


  /*
   * Convierte una fila de Supabase
   * al modelo Pelicula utilizado
   * por Angular.
   *
   * Ejemplo:
   *
   * Supabase:
   * precio_venta
   *
   * Angular:
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
       * Nuestro modelo Pelicula utiliza
       * un array de imágenes.
       *
       * Actualmente guardamos un solo
       * póster proveniente de TMDB.
       */
      imagenes:
        fila.poster_url
          ? [fila.poster_url]
          : [],


      precioPreventa:
        Number(
          fila.precio_preventa
        ),

      precioVenta:
        Number(
          fila.precio_venta
        ),


      /*
       * Para CineBera utilizamos su propia
       * fecha de estreno comercial.
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
   * Permite activar o desactivar
   * visualmente una película.
   */
  async cambiarVisibilidad(
    peliculaId: number,
    visible: boolean
  ) {

    return await supabase
      .from('peliculas')
      .update({
        visible: visible
      })
      .eq(
        'id',
        peliculaId
      )
      .select()
      .single();

  }


  /*
   * Obtiene las películas que PUEDEN
   * formar parte de la cartelera.
   *
   * IMPORTANTE:
   *
   * Acá solamente comprobamos que
   * la película esté visible.
   *
   * La existencia de funciones activas
   * se comprueba desde Home utilizando
   * FuncionService.
   *
   * Por lo tanto:
   *
   * visible
   *      +
   * función activa futura
   *      =
   * CARTELERA
   */
  async obtenerCartelera(): Promise<Pelicula[]> {

    const {
      data,
      error
    } = await this.obtenerPeliculasSupabase();


    if (error) {

      console.error(
        'Error obteniendo películas para cartelera:',
        error
      );

      return [];
    }


    return (data ?? [])

      /*
       * En este servicio solamente
       * comprobamos visibilidad.
       */
      .filter(
        fila =>
          fila.visible === true
      )

      /*
       * Convertimos cada fila de Supabase
       * al modelo Pelicula de Angular.
       */
      .map(
        fila =>
          this.mapearPeliculaSupabase(
            fila
          )
      );

  }


  /*
   * Obtiene películas que CineBera
   * todavía no estrenó.
   *
   * Próximamente SÍ depende de
   * fecha_estreno_cinebera.
   */
  async obtenerProximamente(): Promise<Pelicula[]> {

  const { data, error } =
    await this.obtenerPeliculasSupabase();

  if (error) {
    console.error(
      'Error al obtener películas próximas:',
      error
    );

    return [];
  }

  // Obtenemos la fecha actual.
  const hoy = new Date();

  // getDay():
  // domingo = 0
  // lunes = 1
  // ...
  // jueves = 4
  // miércoles = 3

  // Calculamos cuántos días pasaron
  // desde el último jueves.
  const diasDesdeJueves =
    (hoy.getDay() - 4 + 7) % 7;

  // Encontramos el jueves que inició
  // la semana cinematográfica actual.
  const inicioSemana = new Date(hoy);

  inicioSemana.setDate(
    hoy.getDate() - diasDesdeJueves
  );

  // La semana termina 6 días después:
  // miércoles.
  const finSemana = new Date(inicioSemana);

  finSemana.setDate(
    inicioSemana.getDate() + 6
  );

  // Convertimos la fecha a YYYY-MM-DD
  // usando fecha local.
  const anio = finSemana.getFullYear();

  const mes = String(
    finSemana.getMonth() + 1
  ).padStart(2, '0');

  const dia = String(
    finSemana.getDate()
  ).padStart(2, '0');

  const fechaFinSemana =
    `${anio}-${mes}-${dia}`;

  return (data ?? [])

  

    // La película debe estar habilitada.
    .filter(
      fila => fila.visible === true
    )
    
    // Próximamente significa que se estrena
    // después de terminar la semana actual.
    .filter(
      fila =>
        fila.fecha_estreno_cinebera >
        fechaFinSemana
    )

    .map(
      fila =>
        this.mapearPeliculaSupabase(fila)
    );
}

}