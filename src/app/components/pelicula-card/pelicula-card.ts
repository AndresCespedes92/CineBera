import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Pelicula } from '../../models/pelicula';

@Component({
  imports: [],
  selector: 'app-pelicula-card',
  styleUrl: './pelicula-card.css',
  templateUrl: './pelicula-card.html',
})
export class PeliculaCard {
/*
   * La película no pertenece originalmente a este componente.
   *
   * El componente padre se la entrega mediante @Input.
   */
  @Input({ required: true })
  pelicula!: Pelicula;

  
/*
   * OUTPUT
   *
   * Permite que este componente hijo comunique
   * al componente padre que el usuario seleccionó
   * una película.
   *
   * EventEmitter<Pelicula> indica que el evento
   * enviará un objeto de tipo Pelicula.
   *
   * Flujo:
   *
   * PeliculaCard → Home
   */
  @Output()
  peliculaSeleccionada = new EventEmitter<Pelicula>();


  /*
   * Se ejecuta cuando el usuario presiona
   * el botón "Ver funciones".
   *
   * emit() dispara nuestro evento personalizado
   * y envía la película actual al componente padre.
   */
  verFunciones(): void {

    this.peliculaSeleccionada.emit(
      this.pelicula
    );

  }

  /*
 * Convierte la fecha almacenada como:
 *
 * 2026-01-15
 *
 * al formato que queremos mostrar:
 *
 * 15/01/2026
 *
 * No modificamos el valor de Supabase.
 * Solamente cambiamos cómo se muestra.
 */
formatearFecha(fecha: string): string {

  if (!fecha) {
    return '';
  }

  const partes = fecha.split('-');

  if (partes.length !== 3) {
    return fecha;
  }

  const [
    anio,
    mes,
    dia
  ] = partes;

  return `${dia}/${mes}/${anio}`;
}

}