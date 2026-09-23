import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  RouterLink
} from '@angular/router';

import {
  NgTemplateOutlet
} from '@angular/common';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  PeliculaService
} from '../../../services/pelicula';

import {
  PageHeader
} from '../../../components/page-header/page-header';


@Component({
  selector: 'app-peliculas',

  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    NgTemplateOutlet
  ],

  templateUrl: './peliculas.html',
  styleUrl: './peliculas.css'
})
export class Peliculas implements OnInit {


  /*
   * Array donde guardaremos las películas
   * obtenidas desde Supabase.
   *
   * Antes teníamos películas escritas
   * manualmente (mock).
   *
   * Ahora comienza vacío:
   *
   * []
   *
   * y se completa cuando consultamos
   * la base de datos.
   */
  peliculas: Pelicula[] = [];


  /*
   * Texto que escribe el administrador
   * en el buscador.
   *
   * Está conectado al input mediante:
   *
   * [(ngModel)]="textoBusqueda"
   */
  textoBusqueda: string = '';


  /*
   * Angular nos entrega las dependencias
   * que necesita este componente.
   *
   * PeliculaService:
   * se encarga de trabajar con las películas.
   *
   * ChangeDetectorRef:
   * nos permite actualizar la vista después
   * de terminar la consulta asíncrona.
   */
  constructor(
    private peliculaService: PeliculaService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  /*
   * ngOnInit pertenece al ciclo de vida
   * de un componente Angular.
   *
   * Angular ejecuta este método
   * cuando se inicializa la pantalla.
   *
   * Lo usamos para traer las películas
   * reales desde Supabase.
   */
  async ngOnInit(): Promise<void> {

    /*
     * Le pedimos al servicio las películas.
     *
     * Como obtenerPeliculas() es asíncrono,
     * utilizamos await.
     */
    this.peliculas =
      await this.peliculaService
        .obtenerPeliculas();


    /*
     * Avisamos a Angular que los datos
     * cambiaron después de la operación
     * asíncrona.
     */
    this.changeDetectorRef
      .detectChanges();
  }


  /*
 * Cambia la visibilidad de una película
 * y guarda el cambio en Supabase.
 */
async cambiarVisibilidad(
  pelicula: Pelicula
): Promise<void> {

  /*
   * Calculamos cuál será el nuevo estado.
   *
   * Si actualmente:
   * visible = true
   *
   * entonces:
   * nuevoEstado = false
   *
   * y viceversa.
   */
  const nuevoEstado =
    !pelicula.visible;


  /*
   * Le pedimos al servicio que actualice
   * la película en Supabase.
   */
  const { error } =
    await this.peliculaService
      .cambiarVisibilidad(
        pelicula.id,
        nuevoEstado
      );


  /*
   * Si Supabase devuelve un error,
   * no modificamos la interfaz.
   */
  if (error) {

    console.error(
      'Error cambiando visibilidad:',
      error
    );

    alert(
      'No se pudo cambiar la visibilidad de la película.'
    );

    return;
  }


  /*
   * Supabase confirmó el cambio.
   *
   * Ahora actualizamos el objeto que
   * Angular está mostrando.
   */
  pelicula.visible =
    nuevoEstado;


  /*
   * Actualizamos la vista.
   */
  this.changeDetectorRef
    .detectChanges();
}


  /*
   * Devuelve las películas que deben
   * aparecer en la tabla según lo que
   * escribió el usuario en el buscador.
   */
  obtenerPeliculasFiltradas(): Pelicula[] {

    /*
     * Convertimos el texto a minúsculas
     * para que la búsqueda no dependa
     * de mayúsculas/minúsculas.
     *
     * trim() elimina espacios innecesarios
     * al principio y al final.
     */
    const texto =
      this.textoBusqueda
        .toLowerCase()
        .trim();


    /*
     * Si el administrador no escribió nada,
     * mostramos todas las películas.
     */
    if (texto === '') {

      return this.peliculas;
    }


    /*
     * filter() crea un nuevo array
     * solamente con las películas
     * que cumplen la condición.
     *
     * includes() pregunta si el título
     * contiene el texto buscado.
     */
    return this.peliculas.filter(
      pelicula =>
        pelicula.titulo
          .toLowerCase()
          .includes(texto)
    );
  }

}