import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  Renderer2
} from '@angular/core';

import {
  Butaca
} from '../models/butaca';


@Directive({
  selector: '[appEstadoButaca]'
})
export class EstadoButaca implements OnChanges {

  /*
   * La directiva recibe la butaca
   * sobre la cual tiene que trabajar.
   */
  @Input()
  appEstadoButaca!: Butaca;


  constructor(
    private elemento: ElementRef,
    private renderer: Renderer2
  ) {}


  /*
   * Se ejecuta cuando cambia el valor
   * recibido por la directiva.
   */
  ngOnChanges(): void {

    if (!this.appEstadoButaca) {
      return;
    }

    this.actualizarApariencia();
  }


  private actualizarApariencia(): void {

    const butaca =
      this.appEstadoButaca;


    /*
     * Primero quitamos las clases anteriores.
     */
    this.renderer.removeClass(
      this.elemento.nativeElement,
      'butaca-vip'
    );

    this.renderer.removeClass(
      this.elemento.nativeElement,
      'butaca-accesible'
    );

    this.renderer.removeClass(
      this.elemento.nativeElement,
      'butaca-seleccionada'
    );

    this.renderer.removeClass(
      this.elemento.nativeElement,
      'butaca-ocupada'
    );


    /*
     * Aplicamos una clase según
     * el TIPO de butaca.
     */
    if (butaca.tipo === 'vip') {

      this.renderer.addClass(
        this.elemento.nativeElement,
        'butaca-vip'
      );

    }


    if (butaca.tipo === 'accesible') {

      this.renderer.addClass(
        this.elemento.nativeElement,
        'butaca-accesible'
      );

    }


    /*
     * Y otra según su ESTADO.
     */
    if (butaca.estado === 'seleccionada') {

      this.renderer.addClass(
        this.elemento.nativeElement,
        'butaca-seleccionada'
      );

    }


    if (butaca.estado === 'ocupada') {

      this.renderer.addClass(
        this.elemento.nativeElement,
        'butaca-ocupada'
      );

      this.renderer.setProperty(
        this.elemento.nativeElement,
        'disabled',
        true
      );

    } else {

      this.renderer.setProperty(
        this.elemento.nativeElement,
        'disabled',
        false
      );

    }

  }

}