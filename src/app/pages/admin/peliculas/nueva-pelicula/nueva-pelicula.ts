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
  Pelicula,
  FormatoPelicula,
  ClasificacionEdad
} from '../../../../models/pelicula';

import {
  TmdbDetallePelicula,
  TmdbPelicula
} from '../../../../models/tmdb-peliculas';

import { TmdbService } from '../../../../services/tmdb';


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
   * se encarga de comunicarse con la API de TMDB.
   *
   * ChangeDetectorRef:
   * nos permite indicarle a Angular que revise
   * inmediatamente la vista cuando llega la segunda
   * respuesta asíncrona de TMDB.
   */
  constructor(
    private tmdbService: TmdbService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  // =====================================================
  // BÚSQUEDA TMDB
  // =====================================================

  /*
   * Texto que escribe el administrador
   * en el buscador.
   */
  textoBusquedaTmdb: string = '';


  /*
   * Resultados obtenidos desde TMDB.
   */
  resultadosTmdb: TmdbPelicula[] = [];


  /*
   * Película seleccionada desde los
   * resultados de búsqueda.
   *
   * Contiene los datos básicos:
   *
   * título
   * sinopsis
   * póster
   * fecha
   * valoración
   */
  peliculaTmdbSeleccionada:
    TmdbPelicula | null = null;


  /*
   * Contiene el detalle completo obtenido
   * mediante /movie/{id}.
   *
   * Acá encontramos información adicional
   * como duración y géneros.
   */
  detalleTmdbSeleccionado:
    TmdbDetallePelicula | null = null;


  // =====================================================
  // PAGINACIÓN
  // =====================================================

  paginaActual: number = 1;

  peliculasPorPagina: number = 10;


  /*
   * Devuelve solamente las películas
   * correspondientes a la página actual.
   *
   * Ejemplo:
   *
   * página 1 → slice(0, 10)
   * página 2 → slice(10, 20)
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
   * Calcula la cantidad total de páginas.
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
  // OPCIONES CINEBERA
  // =====================================================

  /*
   * Estos datos NO vienen de TMDB.
   *
   * Representan las opciones que CineBera
   * puede ofrecer para una película.
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
  // OPCIONES SELECCIONADAS
  // =====================================================

  /*
   * Los géneros vienen automáticamente
   * desde TMDB.
   */
  generosSeleccionados: string[] = [];


  /*
   * Formatos e idiomas sí son seleccionados
   * manualmente por el administrador.
   */
  formatosSeleccionados:
    FormatoPelicula[] = [];

  idiomasSeleccionados:
    string[] = [];


  // =====================================================
  // FORMULARIO REACTIVO
  // =====================================================

  /*
   * El formulario mantiene tanto los datos
   * obtenidos desde TMDB como los datos
   * propios de CineBera.
   *
   * Algunos controles no se editan actualmente
   * desde el HTML, pero nos sirven para preparar
   * el objeto que luego enviaremos a Supabase.
   */

  peliculaForm = new FormGroup({

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
     * Esta valoración es la recibida desde TMDB.
     *
     * Más adelante la diferenciaremos de
     * las reseñas propias de CineBera.
     */
    valoracion: new FormControl(
      0,
      {
        nonNullable: true
      }
    ),


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


    fechaEstreno: new FormControl(
      '',
      {
        nonNullable: true,
        validators: [
          Validators.required
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
   * Evitamos consultar TMDB
   * si el buscador está vacío.
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
         * Guardamos los resultados
         * obtenidos desde TMDB.
         */
        this.resultadosTmdb =
          respuesta.results;


        /*
         * Cada búsqueda nueva comienza
         * nuevamente en la página 1.
         */
        this.paginaActual = 1;


        /*
         * La respuesta de TMDB llega
         * de manera asíncrona.
         *
         * Forzamos a Angular a revisar
         * inmediatamente la vista para
         * mostrar los resultados con
         * un solo click.
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
  // SELECCIONAR PELÍCULA TMDB
  // =====================================================

  seleccionarPeliculaTmdb(
    pelicula: TmdbPelicula
  ): void {

    /*
     * Guardamos inmediatamente la película
     * seleccionada desde los resultados.
     */
    this.peliculaTmdbSeleccionada =
      pelicula;


    /*
     * Limpiamos el detalle anterior.
     *
     * Esto es importante si primero elegimos
     * una película y después seleccionamos otra.
     *
     * No queremos mostrar durante unos milisegundos
     * la duración o géneros de la película anterior.
     */
    this.detalleTmdbSeleccionado =
      null;

    this.generosSeleccionados = [];


    /*
     * La búsqueda de TMDB ya nos dio estos datos,
     * por lo tanto podemos cargarlos inmediatamente.
     */
    this.peliculaForm.patchValue({

      titulo:
        pelicula.title,

      sinopsis:
        pelicula.overview,

      fechaEstreno:
        pelicula.release_date,

      valoracion:
        pelicula.vote_average,

      /*
       * Todavía no recibimos la duración.
       *
       * La dejamos temporalmente en 0 hasta
       * recibir el detalle.
       */
      duracion: 0

    });


    /*
     * Ahora hacemos una segunda consulta.
     *
     * Utilizamos el ID de TMDB para obtener
     * información más completa.
     */
    this.tmdbService
      .obtenerDetallePelicula(
        pelicula.id
      )
      .subscribe({

        next: (detalle) => {

          /*
           * Guardamos el detalle completo.
           */
          this.detalleTmdbSeleccionado =
            detalle;


          /*
           * TMDB devuelve:
           *
           * [
           *   {
           *     id: 12,
           *     name: 'Aventura'
           *   },
           *   {
           *     id: 878,
           *     name: 'Ciencia ficción'
           *   }
           * ]
           *
           * Con map() generamos:
           *
           * [
           *   'Aventura',
           *   'Ciencia ficción'
           * ]
           */
          this.generosSeleccionados =
            detalle.genres.map(
              genero => genero.name
            );


          /*
           * Actualizamos la duración dentro
           * de nuestro Reactive Form.
           *
           * Si TMDB devuelve null,
           * utilizamos 0.
           */
          this.peliculaForm.patchValue({

            duracion:
              detalle.runtime ?? 0

          });


          /*
           * La consulta de detalle es asíncrona.
           *
           * Forzamos una revisión de la vista
           * después de actualizar duración,
           * géneros y detalle.
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
  // PÓSTER TMDB
  // =====================================================

  /*
   * TMDB devuelve solamente algo parecido a:
   *
   * /abc123.jpg
   *
   * El servicio construye la URL completa.
   */
  obtenerPoster(
    posterPath: string | null
  ): string {

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
       * includes() evita agregar el mismo
       * formato dos veces.
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
       * filter() genera un nuevo array
       * sin el formato desmarcado.
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
  // GUARDAR PELÍCULA
  // =====================================================

  guardarPelicula(): void {


    // -----------------------------------------------------
    // 1. Debe existir una película seleccionada desde TMDB
    // -----------------------------------------------------

    if (!this.peliculaTmdbSeleccionada) {

      console.log(
        'Debe seleccionar una película desde TMDB.'
      );

      return;
    }


    // -----------------------------------------------------
    // 2. Validamos el Reactive Form
    // -----------------------------------------------------

    if (this.peliculaForm.invalid) {

      this.peliculaForm
        .markAllAsTouched();

      console.log(
        'El formulario contiene errores.'
      );

      return;
    }


    // -----------------------------------------------------
    // 3. Validamos géneros
    // -----------------------------------------------------

    /*
     * Los géneros ya no son seleccionados
     * manualmente.
     *
     * Deben haber sido obtenidos desde TMDB.
     */
    if (
      this.generosSeleccionados.length === 0
    ) {

      console.log(
        'TMDB no proporcionó géneros para esta película.'
      );

      return;
    }


    // -----------------------------------------------------
    // 4. Validamos formatos CineBera
    // -----------------------------------------------------

    if (
      this.formatosSeleccionados.length === 0
    ) {

      console.log(
        'Debe seleccionar al menos un formato.'
      );

      return;
    }


    // -----------------------------------------------------
    // 5. Validamos idiomas CineBera
    // -----------------------------------------------------

    if (
      this.idiomasSeleccionados.length === 0
    ) {

      console.log(
        'Debe seleccionar al menos un idioma.'
      );

      return;
    }


    // -----------------------------------------------------
    // 6. Construimos nuestro objeto Pelicula
    // -----------------------------------------------------

    const nuevaPelicula: Pelicula = {

      /*
       * ID temporal.
       *
       * En el próximo bloque Supabase
       * generará nuestro ID real.
       */
      id: 0,


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
       * Ya no cargamos imágenes manualmente.
       *
       * Utilizamos el póster proporcionado
       * por TMDB.
       */
      imagenes:
        this.peliculaTmdbSeleccionada.poster_path
          ? [
              this.obtenerPoster(
                this.peliculaTmdbSeleccionada
                  .poster_path
              )
            ]
          : [],


      precioPreventa:
        this.peliculaForm.controls
          .precioPreventa.value,


      precioVenta:
        this.peliculaForm.controls
          .precioVenta.value,


      fechaEstreno:
        this.peliculaForm.controls
          .fechaEstreno.value,


      /*
       * IMPORTANTE:
       *
       * Por ahora nuestro modelo Pelicula
       * utiliza valoracion para las reseñas
       * propias de CineBera.
       *
       * Una película nueva todavía no tiene
       * reseñas internas.
       *
       * La valoración de TMDB se mantiene
       * separada en el formulario/detalle.
       */
      valoracion: 0,


      cantidadResenas: 0,


      clasificacionEdad:
        this.peliculaForm.controls
          .clasificacionEdad.value,


      visible:
        this.peliculaForm.controls
          .visible.value

    };


    // -----------------------------------------------------
    // 7. RESULTADO TEMPORAL
    // -----------------------------------------------------

    /*
     * Todavía no guardamos en Supabase.
     *
     * Primero verificamos que el objeto final
     * tenga exactamente los datos esperados.
     */
    console.log(
      'Película preparada para guardar:',
      nuevaPelicula
    );

  }

}