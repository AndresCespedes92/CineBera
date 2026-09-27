import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';

import {
  PeliculaService
} from '../services/pelicula';

import {
  Pelicula
} from '../models/pelicula';


@Directive({
  selector: '[appEnPreventa]',
  standalone: true
})
export class EnPreventa {

  /*
   * TemplateRef representa el bloque HTML
   * sobre el cual usamos la directiva.
   *
   * ViewContainerRef representa el lugar
   * donde Angular puede insertar o quitar
   * ese bloque.
   */
  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainerRef: ViewContainerRef,
    private peliculaService: PeliculaService
  ) {}


  /*
   * Al utilizar:
   *
   * *appEnPreventa="pelicula"
   *
   * Angular envía esa película a este Input.
   *
   * Como el Input tiene el mismo nombre que
   * el selector de la directiva, Angular sabe
   * que ese es el valor principal recibido.
   */
  @Input()
  set appEnPreventa(
    pelicula: Pelicula
  ) {

    /*
     * Primero eliminamos cualquier vista
     * que pudiera existir anteriormente.
     *
     * Esto es importante si Angular vuelve
     * a evaluar la directiva con otra película.
     */
    this.viewContainerRef.clear();


    const hoy = new Date();

    hoy.setHours(
      0,
      0,
      0,
      0
    );


    const estreno =
      new Date(
        `${pelicula.fechaEstreno}T00:00:00`
      );


    const diferenciaMilisegundos =
      estreno.getTime() -
      hoy.getTime();


    const milisegundosPorDia =
      1000 * 60 * 60 * 24;


    const diasHastaEstreno =
      Math.ceil(
        diferenciaMilisegundos /
        milisegundosPorDia
      );


    const estaEnPreventa =
      diasHastaEstreno >= 1 &&
      diasHastaEstreno <= 7;


    /*
     * Una directiva estructural no oculta
     * simplemente el elemento.
     *
     * Si se cumple la condición, Angular
     * crea la vista.
     *
     * Si no se cumple, no la crea.
     */
    if (estaEnPreventa) {

      this.viewContainerRef
        .createEmbeddedView(
          this.templateRef
        );

    }

  }

}