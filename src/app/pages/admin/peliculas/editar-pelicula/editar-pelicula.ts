import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  Pelicula,
  FormatoPelicula,
  ClasificacionEdad
} from '../../../../models/pelicula';

import {
  PeliculaService
} from '../../../../services/pelicula';


@Component({
  selector: 'app-editar-pelicula',

  imports: [
    FormsModule,
    RouterLink
  ],

  templateUrl: './editar-pelicula.html',
  styleUrl: './editar-pelicula.css'
})
export class EditarPelicula implements OnInit {


  // =========================================================
  // DATOS PRINCIPALES
  // =========================================================

  /*
   * ID recibido desde la URL.
   *
   * /admin/peliculas/5/editar
   *
   * idPelicula = 5
   */
  idPelicula: number = 0;


  /*
   * Película obtenida desde Supabase.
   */
  pelicula: Pelicula | null = null;


  /*
   * Mientras esperamos la respuesta
   * de Supabase mostramos "Cargando...".
   */
  cargando: boolean = true;

  guardando: boolean = false;


  // =========================================================
  // OPCIONES DEL FORMULARIO
  // =========================================================

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


  clasificacionesDisponibles: ClasificacionEdad[] = [
    'ATP',
    '+13',
    '+18'
  ];


  // =========================================================
  // FECHA DE ESTRENO CINEBERA
  // =========================================================

  /*
   * En vez de utilizar directamente:
   *
   * <input type="date">
   *
   * vamos a trabajar con tres select:
   *
   * Día | Mes | Año
   *
   * Es más claro para el usuario y mantenemos
   * el mismo criterio que usamos al crear
   * una película.
   */
  diaEstreno: number | null = null;

  mesEstreno: number | null = null;

  anioEstreno: number | null = null;


  /*
   * Días disponibles:
   *
   * 1, 2, 3 ... 31
   */
  dias: number[] =
    Array.from(
      { length: 31 },
      (_, indice) => indice + 1
    );


  /*
   * Meses disponibles:
   *
   * 1 ... 12
   */
  meses: number[] =
    Array.from(
      { length: 12 },
      (_, indice) => indice + 1
    );


  /*
   * Generamos años automáticamente.
   *
   * Por ejemplo, si estamos en 2026:
   *
   * 2026, 2027, 2028 ... 2036
   */
  anios: number[] =
    Array.from(
      { length: 11 },
      (_, indice) =>
        new Date().getFullYear() + indice
    );


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private route: ActivatedRoute,
    private peliculaService: PeliculaService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  // =========================================================
  // INICIALIZACIÓN
  // =========================================================

  async ngOnInit(): Promise<void> {


    /*
     * Obtenemos :id desde la URL.
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');


    /*
     * Los parámetros de URL llegan
     * como string.
     *
     * "5" -> 5
     */
    this.idPelicula =
      Number(idRecibido);


    /*
     * Validamos el ID antes de consultar.
     */
    if (
      !this.idPelicula ||
      this.idPelicula <= 0
    ) {

      this.cargando = false;

      this.changeDetectorRef
        .detectChanges();

      return;
    }


    /*
     * Obtenemos la película real
     * desde Supabase.
     */
    this.pelicula =
      await this.peliculaService
        .obtenerPeliculaPorId(
          this.idPelicula
        );


    /*
     * Si encontramos la película,
     * separamos su fecha.
     *
     * Supabase:
     *
     * "2026-10-15"
     *
     * se transforma en:
     *
     * año = 2026
     * mes = 10
     * día = 15
     */
    if (this.pelicula) {

      this.cargarFechaEstreno(
        this.pelicula.fechaEstreno
      );
    }


    /*
     * Terminó la carga.
     */
    this.cargando = false;


    /*
     * Actualizamos la vista.
     */
    this.changeDetectorRef
      .detectChanges();
  }


  // =========================================================
  // FECHA
  // =========================================================

  /*
   * Recibe una fecha de Supabase:
   *
   * "2026-10-15"
   *
   * y la divide para poder mostrar:
   *
   * Día: 15
   * Mes: 10
   * Año: 2026
   */
  cargarFechaEstreno(
    fecha: string
  ): void {


    if (!fecha) {
      return;
    }


    const partes =
      fecha.split('-');


    /*
     * Esperamos exactamente:
     *
     * YYYY-MM-DD
     */
    if (partes.length !== 3) {
      return;
    }


    this.anioEstreno =
      Number(partes[0]);

    this.mesEstreno =
      Number(partes[1]);

    this.diaEstreno =
      Number(partes[2]);


    /*
     * Si editamos una película de un año
     * que no estaba en nuestro listado,
     * lo agregamos para poder mostrarlo.
     */
    if (
      this.anioEstreno &&
      !this.anios.includes(
        this.anioEstreno
      )
    ) {

      this.anios.push(
        this.anioEstreno
      );

      this.anios.sort(
        (a, b) => a - b
      );
    }
  }


  /*
   * Construye nuevamente la fecha
   * en el formato que necesita Supabase.
   *
   * Día: 5
   * Mes: 9
   * Año: 2026
   *
   * Resultado:
   *
   * 2026-09-05
   */
  construirFechaEstreno(): string | null {


    if (
      this.diaEstreno === null ||
      this.mesEstreno === null ||
      this.anioEstreno === null
    ) {

      return null;
    }


    /*
     * padStart agrega el cero cuando
     * tenemos un solo dígito.
     *
     * 5 -> "05"
     */
    const dia =
      String(this.diaEstreno)
        .padStart(2, '0');


    const mes =
      String(this.mesEstreno)
        .padStart(2, '0');


    return (
      `${this.anioEstreno}-${mes}-${dia}`
    );
  }

  /*
 * Verifica que la combinación
 * Día / Mes / Año sea una fecha real.
 *
 * Ejemplos:
 *
 * 15/10/2026 -> válida
 * 31/04/2026 -> inválida
 * 29/02/2026 -> inválida
 * 29/02/2028 -> válida
 */
validarFechaEstreno(): boolean {

  /*
   * Primero verificamos que el usuario
   * haya seleccionado los tres valores.
   */
  if (
    this.diaEstreno === null ||
    this.mesEstreno === null ||
    this.anioEstreno === null
  ) {

    alert(
      'Debe seleccionar día, mes y año para la fecha de estreno.'
    );

    return false;
  }


  /*
   * JavaScript utiliza los meses
   * comenzando desde 0:
   *
   * enero = 0
   * febrero = 1
   * ...
   * diciembre = 11
   *
   * Por eso hacemos mes - 1.
   */
  const fecha =
    new Date(
      this.anioEstreno,
      this.mesEstreno - 1,
      this.diaEstreno
    );


  /*
   * JavaScript "corrige" automáticamente
   * fechas imposibles.
   *
   * Por ejemplo:
   *
   * new Date(2026, 1, 31)
   *
   * no da error.
   * JavaScript la convierte en marzo.
   *
   * Por eso comparamos el resultado
   * contra lo que eligió el usuario.
   */
  const fechaEsValida =
    fecha.getFullYear() === this.anioEstreno &&
    fecha.getMonth() === this.mesEstreno - 1 &&
    fecha.getDate() === this.diaEstreno;


  if (!fechaEsValida) {

    alert(
      'La fecha seleccionada no es válida. Revisá el día, mes y año.'
    );

    return false;
  }


  return true;
}


  // =========================================================
  // FORMATOS
  // =========================================================

  /*
   * Indica si la película tiene
   * determinado formato.
   */
  tieneFormato(
    formato: FormatoPelicula
  ): boolean {


    if (!this.pelicula) {
      return false;
    }


    return this.pelicula
      .formatos
      .includes(formato);
  }


  /*
   * Agrega o elimina un formato
   * cuando marcamos/desmarcamos
   * un checkbox.
   */
  cambiarFormato(
    formato: FormatoPelicula,
    seleccionado: boolean
  ): void {


    if (!this.pelicula) {
      return;
    }


    /*
     * Si lo marcaron:
     * agregamos el formato.
     */
    if (seleccionado) {


      /*
       * Evitamos duplicados.
       */
      if (
        !this.pelicula
          .formatos
          .includes(formato)
      ) {

        this.pelicula
          .formatos
          .push(formato);
      }

    }


    /*
     * Si lo desmarcaron:
     * eliminamos el formato.
     */
    else {

      this.pelicula.formatos =
        this.pelicula
          .formatos
          .filter(
            item =>
              item !== formato
          );
    }
  }


  /*
 * Indica si la película tiene
 * habilitado determinado idioma.
 *
 * Funciona igual que tieneFormato().
 */
tieneIdioma(
  idioma: string
): boolean {

  if (!this.pelicula) {
    return false;
  }

  return this.pelicula
    .idiomas
    .includes(idioma);
}


/*
 * Agrega o elimina un idioma
 * de la película.
 *
 * Ejemplo:
 *
 * idiomas = ['Castellano']
 *
 * Si marcamos "Subtitulada":
 *
 * idiomas = [
 *   'Castellano',
 *   'Subtitulada'
 * ]
 */
cambiarIdioma(
  idioma: string,
  seleccionado: boolean
): void {

  if (!this.pelicula) {
    return;
  }


  /*
   * Si se marcó el checkbox,
   * agregamos el idioma.
   */
  if (seleccionado) {

    /*
     * Evitamos duplicados.
     */
    if (
      !this.pelicula
        .idiomas
        .includes(idioma)
    ) {

      this.pelicula
        .idiomas
        .push(idioma);
    }

  }


  /*
   * Si se desmarcó,
   * eliminamos el idioma.
   */
  else {

    this.pelicula.idiomas =
      this.pelicula
        .idiomas
        .filter(
          item =>
            item !== idioma
        );
  }
}

  async guardarCambios(): Promise<void> {

  /*
   * No podemos guardar si la película
   * todavía no fue cargada.
   */
  if (!this.pelicula) {
    return;
  }


  /*
   * Validamos que Día / Mes / Año
   * formen una fecha real.
   */
  if (!this.validarFechaEstreno()) {
    return;
  }


  /*
   * No permitimos precios negativos.
   */
  if (
    this.pelicula.precioPreventa < 0 ||
    this.pelicula.precioVenta < 0
  ) {

    alert(
      'Los precios no pueden ser negativos.'
    );

    return;
  }


  /*
   * Una película debe tener al menos
   * un formato disponible.
   */
  if (this.pelicula.formatos.length === 0) {

    alert(
      'Debe seleccionar al menos un formato.'
    );

    return;
  }


  /*
   * Una película debe tener
   * al menos un idioma.
   */
  if (this.pelicula.idiomas.length === 0) {

    alert(
      'Debe seleccionar al menos un idioma.'
    );

    return;
  }


  /*
   * Convertimos Día / Mes / Año al
   * formato utilizado por Supabase.
   *
   * 15 / 10 / 2026
   *
   * se transforma en:
   *
   * 2026-10-15
   */
  const fechaEstreno =
    this.construirFechaEstreno();


  if (!fechaEstreno) {
    return;
  }


  /*
   * Marcamos que comenzó el guardado.
   */
  this.guardando = true;


  /*
   * Enviamos solamente los datos
   * administrados por CineBera.
   *
   * No modificamos título, sinopsis,
   * duración, géneros, etc.
   */
  const { error } =
    await this.peliculaService
      .actualizarPelicula(
        this.pelicula.id,
        {
          fechaEstreno: fechaEstreno,
          precioPreventa:
            this.pelicula.precioPreventa,

          precioVenta:
            this.pelicula.precioVenta,

          clasificacionEdad:
            this.pelicula.clasificacionEdad,

          formatos:
            this.pelicula.formatos,

          idiomas:
            this.pelicula.idiomas,

          visible:
            this.pelicula.visible
        }
      );


  /*
   * Terminó la operación.
   */
  this.guardando = false;


  /*
   * Si Supabase devuelve un error,
   * informamos al usuario.
   */
  if (error) {

    console.error(
      'Error actualizando película:',
      error
    );

    alert(
      'No se pudieron guardar los cambios.'
    );

    return;
  }


  /*
   * Actualizamos también nuestro objeto
   * local con la fecha construida.
   */
  this.pelicula.fechaEstreno =
    fechaEstreno;


  alert(
    'Película actualizada correctamente.'
  );


  this.changeDetectorRef
    .detectChanges();
}

}