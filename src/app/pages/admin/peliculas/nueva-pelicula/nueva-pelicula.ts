import {
  ChangeDetectorRef,
  Component
} from '@angular/core';

import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { RouterLink } from '@angular/router';

import {
  FormatoPelicula,
  ClasificacionEdad,
  NuevaPeliculaSupabase
} from '../../../../models/pelicula';

import {
  TmdbDetallePelicula,
  TmdbPelicula
} from '../../../../models/tmdb-peliculas';

import {
  TmdbService
} from '../../../../services/tmdb';

import {
  PeliculaService
} from '../../../../services/pelicula';


@Component({
  selector: 'app-nueva-pelicula',

  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule
  ],

  templateUrl: './nueva-pelicula.html',
  styleUrl: './nueva-pelicula.css'
})
export class NuevaPelicula {


  // =====================================================
  // DEPENDENCIAS
  // =====================================================

  /*
   * TmdbService:
   * se comunica con la API externa de TMDB.
   *
   * PeliculaService:
   * se comunica con nuestra tabla "peliculas"
   * de Supabase.
   *
   * ChangeDetectorRef:
   * permite actualizar inmediatamente la vista
   * cuando llegan respuestas asíncronas.
   */
  constructor(
    private tmdbService: TmdbService,
    private peliculaService: PeliculaService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  // =====================================================
  // BÚSQUEDA EN TMDB
  // =====================================================

  /*
   * Texto escrito por el administrador
   * para buscar una película.
   */
  textoBusquedaTmdb: string = '';


  /*
   * Resultados obtenidos desde TMDB.
   */
  resultadosTmdb: TmdbPelicula[] = [];


  /*
   * Película elegida dentro de los
   * resultados de búsqueda.
   *
   * Este objeto contiene los datos básicos
   * obtenidos desde /search/movie.
   */
  peliculaTmdbSeleccionada:
    TmdbPelicula | null = null;


  /*
   * Información más completa de la película.
   *
   * Se obtiene mediante /movie/{id}.
   *
   * Incluye, por ejemplo:
   * - duración
   * - géneros completos
   */
  detalleTmdbSeleccionado:
    TmdbDetallePelicula | null = null;


  // =====================================================
  // PAGINACIÓN DE RESULTADOS TMDB
  // =====================================================

  paginaActual: number = 1;

  peliculasPorPagina: number = 10;


  /*
   * Devuelve únicamente los resultados
   * correspondientes a la página actual.
   */
  get peliculasPaginadas(): TmdbPelicula[] {

    const inicio =
      (this.paginaActual - 1) *
      this.peliculasPorPagina;

    const fin =
      inicio +
      this.peliculasPorPagina;

    return this.resultadosTmdb.slice(
      inicio,
      fin
    );
  }


  /*
   * Calcula cuántas páginas necesitamos
   * para mostrar los resultados disponibles.
   */
  get totalPaginas(): number {

    return Math.ceil(
      this.resultadosTmdb.length /
      this.peliculasPorPagina
    );
  }


  paginaSiguiente(): void {

    if (
      this.paginaActual <
      this.totalPaginas
    ) {

      this.paginaActual++;
    }
  }


  paginaAnterior(): void {

    if (this.paginaActual > 1) {

      this.paginaActual--;
    }
  }


  // =====================================================
  // OPCIONES PROPIAS DE CINEBERA
  // =====================================================

  /*
   * Estos valores NO vienen desde TMDB.
   *
   * Son decisiones propias del cine.
   */

  formatosDisponibles: FormatoPelicula[] = [
    '2D',
    '3D',
    '4D',
    '5D'
  ];


  idiomasDisponibles: string[] = [
    'Castellano',
    'Subtitulada'
  ];


  clasificacionesDisponibles:
    ClasificacionEdad[] = [
      'ATP',
      '+13',
      '+18'
    ];


  // =====================================================
  // FECHA DE ESTRENO CINEBERA
  // =====================================================

  /*
   * Al igual que hicimos en Registro,
   * utilizamos tres dropdowns:
   *
   * Día
   * Mes
   * Año
   */

  get dias(): number[] {

  const mes =
    Number(
      this.peliculaForm.controls
        .mesEstrenoCinebera.value
    );

  const anio =
    Number(
      this.peliculaForm.controls
        .anioEstrenoCinebera.value
    );

  /*
   * Mientras todavía no eligió mes,
   * mostramos los 31 días.
   */
  if (!mes) {
    return Array.from(
      { length: 31 },
      (_, indice) => indice + 1
    );
  }

  /*
   * Si todavía no eligió año usamos
   * el año actual provisionalmente.
   */
  const anioParaCalcular =
    anio || new Date().getFullYear();

  /*
   * Día 0 del mes siguiente =
   * último día del mes actual.
   *
   * Ejemplo:
   * new Date(2026, 2, 0)
   * devuelve el último día de febrero.
   */
  const cantidadDias =
    new Date(
      anioParaCalcular,
      mes,
      0
    ).getDate();

  return Array.from(
    { length: cantidadDias },
    (_, indice) => indice + 1
  );
}

  meses: number[] =
    Array.from(
      { length: 12 },
      (_, indice) => indice + 1
    );


  /*
   * Para una fecha de estreno no necesitamos
   * años históricos como en fecha de nacimiento.
   *
   * Permitimos seleccionar desde el año actual
   * hasta nueve años hacia adelante.
   */
  anios: number[] =
    Array.from(
      { length: 10 },
      (_, indice) =>
        new Date().getFullYear() + indice
    );


  // =====================================================
  // OPCIONES SELECCIONADAS
  // =====================================================

  /*
   * Los géneros vienen automáticamente
   * desde TMDB.
   */
  generosSeleccionados: string[] = [];


  /*
   * Formatos e idiomas son seleccionados
   * manualmente por el administrador.
   */
  formatosSeleccionados:
    FormatoPelicula[] = [];


  idiomasSeleccionados:
    string[] = [];


  // =====================================================
  // FORMULARIO REACTIVO
  // =====================================================

  peliculaForm = new FormGroup({


    // ---------------------------------------------------
    // INFORMACIÓN OBTENIDA DESDE TMDB
    // ---------------------------------------------------

    titulo: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(2)
        ]
      }
    ),


    sinopsis: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(10)
        ]
      }
    ),


    duracion: new FormControl(
      0,
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(1)
        ]
      }
    ),


    /*
     * Esta es la valoración externa
     * proporcionada por TMDB.
     *
     * No debe confundirse con las futuras
     * reseñas de usuarios de CineBera.
     */
    valoracion: new FormControl(
      0,
      {
        nonNullable: true
      }
    ),


    /*
     * Fecha de estreno original
     * proporcionada por TMDB.
     */
    fechaEstrenoTmdb: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }
    ),


    // ---------------------------------------------------
    // FECHA DE ESTRENO EN CINEBERA
    // ---------------------------------------------------

    /*
     * CineBera puede estrenar la película
     * en una fecha diferente de la fecha
     * original informada por TMDB.
     */

    diaEstrenoCinebera: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }
    ),


    mesEstrenoCinebera: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }
    ),


    anioEstrenoCinebera: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }
    ),


    // ---------------------------------------------------
    // CONFIGURACIÓN COMERCIAL CINEBERA
    // ---------------------------------------------------

    precioPreventa: new FormControl(
      0,
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(0)
        ]
      }
    ),


    precioVenta: new FormControl(
      0,
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.min(0)
        ]
      }
    ),


    clasificacionEdad:
      new FormControl<ClasificacionEdad>(
        'ATP',
        {
          nonNullable: true,
          validators: [
            Validators.required
          ]
        }
      ),


    visible: new FormControl(
      true,
      {
        nonNullable: true
      }
    )

  });


  // =====================================================
  // BUSCAR PELÍCULAS EN TMDB
  // =====================================================

  buscarEnTmdb(): void {

    /*
     * trim() elimina espacios sobrantes.
     *
     * Si el usuario no escribió nada,
     * no hacemos una petición innecesaria.
     */
    if (!this.textoBusquedaTmdb.trim()) {
      return;
    }


    this.tmdbService
      .buscarPeliculas(
        this.textoBusquedaTmdb
      )
      .subscribe({

        next: (respuesta) => {

          /*
           * Guardamos los resultados recibidos.
           */
          this.resultadosTmdb =
            respuesta.results;


          /*
           * Cada búsqueda comienza
           * desde la primera página.
           */
          this.paginaActual = 1;


          /*
           * Forzamos la actualización inmediata
           * de la vista cuando llega la respuesta.
           *
           * Esto solucionó el problema donde
           * necesitábamos hacer dos clicks
           * en "Buscar".
           */
          this.changeDetectorRef
            .detectChanges();

        },


        error: (error) => {

          console.error(
            'Error consultando TMDB:',
            error
          );

        }

      });

  }


  // =====================================================
  // SELECCIONAR PELÍCULA DESDE TMDB
  // =====================================================

  seleccionarPeliculaTmdb(
    pelicula: TmdbPelicula
  ): void {


    /*
     * Guardamos inmediatamente la película
     * seleccionada.
     */
    this.peliculaTmdbSeleccionada =
      pelicula;


    /*
     * Limpiamos información detallada
     * de una posible selección anterior.
     *
     * Ejemplo:
     *
     * Seleccionamos Batman
     * y después Dune.
     *
     * No queremos mostrar durante unos
     * instantes los géneros de Batman
     * mientras esperamos los de Dune.
     */
    this.detalleTmdbSeleccionado =
      null;

    this.generosSeleccionados = [];


    /*
     * Estos datos ya vienen en el resultado
     * básico de búsqueda.
     */
    this.peliculaForm.patchValue({

      titulo:
        pelicula.title,

      sinopsis:
        pelicula.overview,

      fechaEstrenoTmdb:
        pelicula.release_date,

      valoracion:
        pelicula.vote_average,

      /*
       * La duración llegará mediante
       * la consulta de detalle.
       */
      duracion: 0

    });


    /*
     * Segunda petición a TMDB.
     *
     * Ahora utilizamos el ID para obtener
     * información más completa.
     */
    this.tmdbService
      .obtenerDetallePelicula(
        pelicula.id
      )
      .subscribe({

        next: (detalle) => {


          /*
           * Guardamos el objeto completo.
           */
          this.detalleTmdbSeleccionado =
            detalle;


          /*
           * TMDB devuelve géneros como:
           *
           * [
           *   { id: 12, name: 'Aventura' },
           *   { id: 878, name: 'Ciencia ficción' }
           * ]
           *
           * Nosotros queremos:
           *
           * [
           *   'Aventura',
           *   'Ciencia ficción'
           * ]
           *
           * map() transforma un array
           * en otro array.
           */
          this.generosSeleccionados =
            detalle.genres.map(
              genero => genero.name
            );


          /*
           * Actualizamos la duración.
           *
           * ?? 0 significa:
           *
           * si runtime es null o undefined,
           * utilizar 0.
           */
          this.peliculaForm.patchValue({

            duracion:
              detalle.runtime ?? 0

          });


          /*
           * Actualizamos inmediatamente
           * la vista.
           *
           * Esto solucionó el problema
           * donde duración y géneros
           * aparecían recién después
           * de un segundo click.
           */
          this.changeDetectorRef
            .detectChanges();

        },


        error: (error) => {

          console.error(
            'Error obteniendo detalle de TMDB:',
            error
          );

        }

      });

  }


  // =====================================================
  // PÓSTER DE TMDB
  // =====================================================

  obtenerPoster(
    posterPath: string | null
  ): string {

    /*
     * TMDB nos entrega solamente una parte
     * de la dirección del póster.
     *
     * TmdbService se encarga de construir
     * la URL completa.
     */
    return this.tmdbService
      .obtenerUrlPoster(
        posterPath
      );
  }


  // =====================================================
  // SELECCIÓN DE FORMATOS
  // =====================================================

  cambiarFormato(
    formato: FormatoPelicula,
    seleccionado: boolean
  ): void {

    if (seleccionado) {

      /*
       * Evitamos agregar el mismo formato
       * más de una vez.
       */
      if (
        !this.formatosSeleccionados
          .includes(formato)
      ) {

        this.formatosSeleccionados
          .push(formato);
      }

    } else {

      /*
       * Creamos un nuevo array sin
       * el formato que fue desmarcado.
       */
      this.formatosSeleccionados =
        this.formatosSeleccionados.filter(
          item => item !== formato
        );

    }

  }


  // =====================================================
  // SELECCIÓN DE IDIOMAS
  // =====================================================

  cambiarIdioma(
    idioma: string,
    seleccionado: boolean
  ): void {

    if (seleccionado) {

      if (
        !this.idiomasSeleccionados
          .includes(idioma)
      ) {

        this.idiomasSeleccionados
          .push(idioma);
      }

    } else {

      this.idiomasSeleccionados =
        this.idiomasSeleccionados.filter(
          item => item !== idioma
        );

    }

  }


  // =====================================================
  // VALIDACIÓN DE FECHA CINEBERA
  // =====================================================

  /*
   * Los tres selects tienen Validators.required,
   * pero eso solamente comprueba que tengan valor.
   *
   * También necesitamos impedir fechas imposibles:
   *
   * 31 / 02 / 2026
   * 31 / 04 / 2026
   *
   * Este método verifica que la fecha realmente
   * exista en el calendario.
   */
  fechaEstrenoCineberaValida(): boolean {

    const dia =
      Number(
        this.peliculaForm.controls
          .diaEstrenoCinebera.value
      );

    const mes =
      Number(
        this.peliculaForm.controls
          .mesEstrenoCinebera.value
      );

    const anio =
      Number(
        this.peliculaForm.controls
          .anioEstrenoCinebera.value
      );


    /*
     * Si alguno todavía está vacío,
     * dejamos que Validators.required
     * se encargue del error.
     */
    if (!dia || !mes || !anio) {
      return false;
    }


    /*
     * JavaScript utiliza meses desde 0:
     *
     * Enero = 0
     * Febrero = 1
     * ...
     *
     * Por eso hacemos mes - 1.
     */
    const fecha =
      new Date(
        anio,
        mes - 1,
        dia
      );


    /*
     * Ejemplo:
     *
     * Si intentamos crear:
     *
     * 31/02/2026
     *
     * JavaScript lo convierte en una
     * fecha de marzo.
     *
     * Al comparar nuevamente día,
     * mes y año detectamos que no coincide.
     */
    return (
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia
    );

  }


  // =====================================================
  // GUARDAR PELÍCULA
  // =====================================================

  async guardarPelicula(): Promise<void> {


    // ---------------------------------------------------
    // 1. VALIDAMOS QUE HAYA UNA PELÍCULA TMDB
    // ---------------------------------------------------

    if (!this.peliculaTmdbSeleccionada) {

      console.log(
        'Debe seleccionar una película desde TMDB.'
      );

      return;
    }


    // ---------------------------------------------------
    // 2. VALIDAMOS EL REACTIVE FORM
    // ---------------------------------------------------

    if (this.peliculaForm.invalid) {

      /*
       * Marcamos todos los controles
       * como tocados para poder mostrar
       * los errores en pantalla.
       */
      this.peliculaForm
        .markAllAsTouched();

      console.log(
        'El formulario contiene errores.'
      );

      return;
    }


    // ---------------------------------------------------
    // 3. VALIDAMOS LA FECHA REAL
    // ---------------------------------------------------

    if (
      !this.fechaEstrenoCineberaValida()
    ) {

      console.log(
        'La fecha de estreno en CineBera no es válida.'
      );

      return;
    }


    // ---------------------------------------------------
    // 4. VALIDAMOS GÉNEROS TMDB
    // ---------------------------------------------------

    /*
     * Los géneros ya no son ingresados
     * manualmente.
     *
     * Deben haber llegado desde TMDB.
     */
    if (
      this.generosSeleccionados.length === 0
    ) {

      console.log(
        'TMDB no proporcionó géneros para esta película.'
      );

      return;
    }


    // ---------------------------------------------------
    // 5. VALIDAMOS FORMATOS
    // ---------------------------------------------------

    if (
      this.formatosSeleccionados.length === 0
    ) {

      console.log(
        'Debe seleccionar al menos un formato.'
      );

      return;
    }


    // ---------------------------------------------------
    // 6. VALIDAMOS IDIOMAS
    // ---------------------------------------------------

    if (
      this.idiomasSeleccionados.length === 0
    ) {

      console.log(
        'Debe seleccionar al menos un idioma.'
      );

      return;
    }


    // ---------------------------------------------------
    // 7. CONSTRUIMOS LA FECHA CINEBERA
    // ---------------------------------------------------

    /*
     * Los selects nos entregan:
     *
     * Día = 5
     * Mes = 9
     * Año = 2026
     *
     * Supabase DATE espera:
     *
     * 2026-09-05
     */

    const dia =
      String(
        this.peliculaForm.controls
          .diaEstrenoCinebera.value
      ).padStart(
        2,
        '0'
      );


    const mes =
      String(
        this.peliculaForm.controls
          .mesEstrenoCinebera.value
      ).padStart(
        2,
        '0'
      );


    const anio =
      this.peliculaForm.controls
        .anioEstrenoCinebera.value;


    const fechaEstrenoCinebera =
      `${anio}-${mes}-${dia}`;


    // ---------------------------------------------------
    // 8. CONSTRUIMOS EL OBJETO PARA SUPABASE
    // ---------------------------------------------------

    /*
     * NuevaPeliculaSupabase representa
     * exactamente la estructura que espera
     * nuestra tabla "peliculas".
     */
    const nuevaPelicula:
      NuevaPeliculaSupabase = {


      /*
       * Identificador externo.
       *
       * El ID interno de CineBera será
       * generado por Supabase.
       */
      tmdb_id:
        this.peliculaTmdbSeleccionada.id,


      titulo:
        this.peliculaForm.controls
          .titulo.value,


      sinopsis:
        this.peliculaForm.controls
          .sinopsis.value,


      duracion:
        this.peliculaForm.controls
          .duracion.value,


      generos:
        this.generosSeleccionados,


      formatos:
        this.formatosSeleccionados,


      idiomas:
        this.idiomasSeleccionados,


      /*
       * Si TMDB tiene póster guardamos
       * su URL completa.
       *
       * Si no tiene, guardamos null.
       */
      poster_url:
        this.peliculaTmdbSeleccionada
          .poster_path
          ? this.obtenerPoster(
              this.peliculaTmdbSeleccionada
                .poster_path
            )
          : null,


      precio_preventa:
        this.peliculaForm.controls
          .precioPreventa.value,


      precio_venta:
        this.peliculaForm.controls
          .precioVenta.value,


      /*
       * Fecha original obtenida
       * automáticamente desde TMDB.
       */
      fecha_estreno_tmdb:
        this.peliculaForm.controls
          .fechaEstrenoTmdb.value,


      /*
       * Fecha definida manualmente
       * por el administrador de CineBera.
       */
      fecha_estreno_cinebera:
        fechaEstrenoCinebera,


      /*
       * Valoración externa de TMDB.
       */
      valoracion_tmdb:
        this.peliculaForm.controls
          .valoracion.value,


      /*
       * Una película nueva todavía
       * no tiene reseñas de CineBera.
       */
      valoracion_cinebera: 0,

      cantidad_resenas: 0,


      clasificacion_edad:
        this.peliculaForm.controls
          .clasificacionEdad.value,


      visible:
        this.peliculaForm.controls
          .visible.value

    };


    // ---------------------------------------------------
    // 9. GUARDAMOS EN SUPABASE
    // ---------------------------------------------------

    /*
     * El componente no habla directamente
     * con Supabase.
     *
     * Delega esa responsabilidad
     * a PeliculaService.
     */
    const {
      data,
      error
    } = await this.peliculaService
      .crearPelicula(
        nuevaPelicula
      );


    // ---------------------------------------------------
    // 10. CONTROLAMOS LA RESPUESTA
    // ---------------------------------------------------

    if (error) {

      console.error(
        'Error guardando película:',
        error.message
      );

      return;
    }


    /*
     * Si llegamos hasta acá,
     * la película fue insertada correctamente.
     */
    console.log(
      'Película guardada correctamente:',
      data
    );

  }

}