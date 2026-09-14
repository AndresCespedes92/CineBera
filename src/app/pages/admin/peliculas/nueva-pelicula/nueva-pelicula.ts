import { Component } from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { AdminNavbar } from '../../../../components/admin-navbar/admin-navbar';

import {
  Pelicula,
  FormatoPelicula,
  ClasificacionEdad
} from '../../../../models/pelicula';


@Component({
  selector: 'app-nueva-pelicula',

  /*
   * Como este componente utiliza Reactive Forms,
   * necesitamos importar ReactiveFormsModule.
   *
   * También reutilizamos el navbar administrativo.
   */
  imports: [
    AdminNavbar,
    ReactiveFormsModule
  ],

  templateUrl: './nueva-pelicula.html',
  styleUrl: './nueva-pelicula.css'
})
export class NuevaPelicula {


  // =====================================================
  // OPCIONES DISPONIBLES
  // =====================================================

  /*
   * Estas listas representan las opciones que el usuario
   * puede seleccionar al crear una película.
   *
   * Por ahora son datos fijos.
   * Más adelante algunos podrían venir desde Supabase.
   */

  generosDisponibles: string[] = [
    'Acción',
    'Aventura',
    'Ciencia ficción',
    'Comedia',
    'Drama',
    'Terror',
    'Animación',
    'Crimen'
  ];


  /*
   * No usamos string[].
   *
   * Usamos FormatoPelicula[] porque en pelicula.ts
   * definimos que solamente existen:
   *
   * '2D' | '3D' | '4D' | '5D'
   *
   * De esta manera TypeScript evita que podamos
   * agregar por error algo como '6D'.
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


  /*
   * También tipamos las clasificaciones usando
   * el tipo ClasificacionEdad definido en pelicula.ts.
   */
  clasificacionesDisponibles: ClasificacionEdad[] = [
    'ATP',
    '+13',
    '+18'
  ];


  // =====================================================
  // OPCIONES SELECCIONADAS
  // =====================================================

  /*
   * Estas propiedades guardan solamente las opciones
   * seleccionadas por el usuario.
   */

  generosSeleccionados: string[] = [];

  formatosSeleccionados: FormatoPelicula[] = [];

  idiomasSeleccionados: string[] = [];

  /*
 * Archivos reales seleccionados por el usuario.
 *
 * File es un tipo nativo del navegador que representa
 * un archivo elegido desde el dispositivo.
 */
imagenesSeleccionadas: File[] = [];


/*
 * Estas URLs temporales nos permiten mostrar
 * una vista previa de las imágenes en pantalla.
 *
 * Todavía NO están guardadas en Supabase.
 */
imagenesPreview: string[] = [];


  // =====================================================
  // FORMULARIO REACTIVO
  // =====================================================

  /*
   * FormGroup representa el formulario completo.
   *
   * Cada FormControl representa un campo.
   *
   * Usamos nonNullable para indicar que estos controles
   * siempre tendrán un valor y nunca serán null.
   *
   * Esto simplifica mucho el código al momento de
   * construir finalmente nuestro objeto Pelicula.
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


    /*
     * Este FormControl solamente acepta:
     *
     * ATP
     * +13
     * +18
     *
     * Esto evita tener que hacer un "as" más adelante.
     */
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
  // SELECCIÓN DE IMAGENES
  // =====================================================
  /*
 * Se ejecuta cuando el usuario selecciona imágenes
 * desde el input type="file".
 */
seleccionarImagenes(event: Event): void {
  /*
   * event.target representa el elemento HTML
   * que disparó el evento.
   *
   * Le aclaramos a TypeScript que ese elemento
   * es un input HTML.
   */
  const input =
    event.target as HTMLInputElement;
  /*
   * Si el usuario no seleccionó ningún archivo,
   * terminamos el método.
   */
  if (!input.files) {
    return;
  }
  /*
   * input.files no es exactamente un array normal.
   *
   * Array.from() lo transforma en un File[]
   * para que podamos trabajar cómodamente.
   */
  const archivosSeleccionados =
    Array.from(input.files);
  /*
   * Guardamos los archivos reales.
   */
  this.imagenesSeleccionadas =
    archivosSeleccionados;
  /*
   * Antes de generar nuevos previews,
   * liberamos las URLs temporales anteriores.
   *
   * Esto evita consumir memoria innecesariamente.
   */
  this.imagenesPreview.forEach(
    url => URL.revokeObjectURL(url)
  );
  /*
   * Por cada File creamos una URL temporal.
   *
   * Ejemplo conceptual:
   *
   * foto.jpg
   *    ↓
   * blob:http://localhost:4200/...
   */
  this.imagenesPreview =
    this.imagenesSeleccionadas.map(
      archivo =>
        URL.createObjectURL(archivo)
    );
  console.log(
    'Imágenes seleccionadas:',
    this.imagenesSeleccionadas
  );

}


  // =====================================================
  // SELECCIÓN DE GÉNEROS
  // =====================================================

  /*
   * Cuando se marca un checkbox:
   * agregamos el género con push().
   *
   * Cuando se desmarca:
   * lo eliminamos usando filter().
   */
  cambiarGenero(
    genero: string,
    seleccionado: boolean
  ): void {

    if (seleccionado) {

      this.generosSeleccionados.push(genero);

    } else {

      this.generosSeleccionados =
        this.generosSeleccionados.filter(
          item => item !== genero
        );

    }


    console.log(
      'Géneros seleccionados:',
      this.generosSeleccionados
    );

  }


  // =====================================================
  // SELECCIÓN DE FORMATOS
  // =====================================================

  /*
   * El parámetro formato también utiliza
   * el tipo FormatoPelicula.
   *
   * Por eso este método nunca debería recibir
   * un formato inválido.
   */
  cambiarFormato(
    formato: FormatoPelicula,
    seleccionado: boolean
  ): void {

    if (seleccionado) {

      this.formatosSeleccionados.push(formato);

    } else {

      this.formatosSeleccionados =
        this.formatosSeleccionados.filter(
          item => item !== formato
        );

    }


    console.log(
      'Formatos seleccionados:',
      this.formatosSeleccionados
    );

  }


  // =====================================================
  // SELECCIÓN DE IDIOMAS
  // =====================================================

  cambiarIdioma(
    idioma: string,
    seleccionado: boolean
  ): void {

    if (seleccionado) {

      this.idiomasSeleccionados.push(idioma);

    } else {

      this.idiomasSeleccionados =
        this.idiomasSeleccionados.filter(
          item => item !== idioma
        );

    }


    console.log(
      'Idiomas seleccionados:',
      this.idiomasSeleccionados
    );

  }

  /*
 * Elimina una imagen seleccionada antes
 * de guardar la película.
 */
eliminarImagen(indice: number): void {
  /*
   * Liberamos la URL temporal.
   */
  URL.revokeObjectURL(
    this.imagenesPreview[indice]
  );
  /*
   * Eliminamos el archivo real.
   */
  this.imagenesSeleccionadas.splice(
    indice,
    1
  );


  /*
   * Eliminamos también su preview.
   */
  this.imagenesPreview.splice(
    indice,
    1
  );

}


  // =====================================================
  // GUARDAR PELÍCULA
  // =====================================================

  /*
   * Este método se ejecuta cuando el usuario
   * envía el formulario.
   */
  guardarPelicula(): void {


    // ---------------------------------------------------
    // 1. Validamos los FormControl
    // ---------------------------------------------------

    if (this.peliculaForm.invalid) {

      /*
       * Marcamos todos los campos como touched.
       *
       * Esto permite que los mensajes de validación
       * aparezcan aunque el usuario haya intentado
       * guardar sin tocar algunos campos.
       */
      this.peliculaForm.markAllAsTouched();

      console.log(
        'El formulario contiene errores.'
      );

      return;
    }


    // ---------------------------------------------------
    // 2. Validamos opciones múltiples
    // ---------------------------------------------------

    /*
     * Los géneros, formatos e idiomas todavía
     * no forman parte directamente del FormGroup.
     *
     * Por eso hacemos estas validaciones manualmente.
     */

    if (this.generosSeleccionados.length === 0) {
      console.log(
        'Debe seleccionar al menos un género.'
      );
      return;
    }
    if (this.formatosSeleccionados.length === 0) {
      console.log(
        'Debe seleccionar al menos un formato.'
      );
      return;
    }
    if (this.idiomasSeleccionados.length === 0) {
      console.log(
        'Debe seleccionar al menos un idioma.'
      );
      return;
    }
    if (this.imagenesSeleccionadas.length === 0) {
      console.log(
        'Debe seleccionar al menos una imagen.'
      );
      return;
    }


    // ---------------------------------------------------
    // 3. Construimos el objeto Pelicula
    // ---------------------------------------------------

    /*
     * En este punto transformamos los datos
     * del formulario en un objeto de nuestro
     * modelo Pelicula.
     *
     * Gracias a nonNullable ya no necesitamos
     * utilizar ?? '' o ?? 0.
     */

    const nuevaPelicula: Pelicula = {

      /*
       * Por ahora usamos un ID temporal.
       *
       * Cuando trabajemos con Supabase,
       * normalmente será la base de datos
       * quien genere el identificador.
       */
      id: 4,


      titulo:
        this.peliculaForm.controls.titulo.value,


      sinopsis:
        this.peliculaForm.controls.sinopsis.value,


      duracion:
        this.peliculaForm.controls.duracion.value,


      generos:
        this.generosSeleccionados,


      formatos:
        this.formatosSeleccionados,


      idiomas:
        this.idiomasSeleccionados,


            /*
      * Por ahora usamos URLs temporales del navegador.
      *
      * Cuando conectemos Supabase Storage,
      * acá irán las URLs reales guardadas en la nube.
      */
      imagenes:
        this.imagenesPreview,


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
       * Una película nueva todavía no recibió
       * ninguna reseña.
       */
      valoracion: 0,

      cantidadResenas: 0,


      /*
       * Este valor ya está correctamente tipado
       * como ClasificacionEdad.
       *
       * No necesitamos usar:
       *
       * as 'ATP' | '+13' | '+18'
       */
      clasificacionEdad:
        this.peliculaForm.controls
          .clasificacionEdad.value,


      visible:
        this.peliculaForm.controls.visible.value

    };


    // ---------------------------------------------------
    // 4. Resultado
    // ---------------------------------------------------

    /*
     * Por ahora solamente mostramos el resultado
     * en la consola.
     *
     * Más adelante este objeto será enviado
     * a un Service y finalmente a Supabase.
     */
    console.log(
      'Película preparada para guardar:',
      nuevaPelicula
    );

  }

}