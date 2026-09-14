import { Component } from '@angular/core';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { Pelicula } from '../../../models/pelicula';
/*
 * Para usar un imput necesitamos FormsModule
 */
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  imports: [AdminNavbar, FormsModule, RouterLink],
  selector: 'app-peliculas',
  styleUrl: './peliculas.css',
  templateUrl: './peliculas.html',
})
export class Peliculas {
  /*
 * Datos simulados.
 *
 * En esta primera etapa nos permiten desarrollar
 * y entender la interfaz sin depender de Supabase.
 *
 * Más adelante estos datos serán reemplazados
 * por una consulta a la base de datos.
 */
peliculas: Pelicula[] = [

  {
    id: 1,
    titulo: 'Dune: Parte Dos',
    sinopsis:
      'Paul Atreides continúa su viaje mientras se une a los Fremen.',
    duracion: 166,
    generos: [
      'Ciencia ficción',
      'Aventura'
    ],
    formatos: [
      '2D',
      '3D'
    ],
    idiomas: [
      'Castellano',
      'Subtitulada'
    ],
    imagenes: [
      'dune-portada.jpg'
    ],
    precioPreventa: 6500,
    precioVenta: 8000,
    fechaEstreno: '2026-10-15',
    valoracion: 4.7,
    cantidadResenas: 128,
    clasificacionEdad: '+13',
    visible: true
  },


  {
    id: 2,
    titulo: 'Interestelar',
    sinopsis:
      'Un grupo de exploradores viaja a través del espacio buscando un nuevo hogar para la humanidad.',
    duracion: 169,
    generos: [
      'Ciencia ficción',
      'Drama'
    ],
    formatos: [
      '2D'
    ],
    idiomas: [
      'Castellano',
      'Subtitulada'
    ],
    imagenes: [
      'interestelar-portada.jpg'
    ],
    precioPreventa: 6000,
    precioVenta: 7500,
    fechaEstreno: '2026-11-05',
    valoracion: 4.8,
    cantidadResenas: 245,
    clasificacionEdad: '+13',
    visible: true
  },

  {
    id: 3,
    titulo: 'El Padrino',
    sinopsis:
      'La historia de la familia Corleone y su organización criminal.',
    duracion: 175,
    generos: [
      'Drama',
      'Crimen'
    ],
    formatos: [
      '2D'
    ],
    idiomas: [
      'Subtitulada'
    ],
    imagenes: [
      'el-padrino-portada.jpg'
    ],
    precioPreventa: 5500,
    precioVenta: 7000,
    fechaEstreno: '2026-12-10',
    valoracion: 4.9,
    cantidadResenas: 389,
    clasificacionEdad: '+18',
    visible: false
  }
];



    /*
 * Cambia el estado de visibilidad de una película.
 *
 * Si está visible -> la oculta.
 * Si está oculta -> la vuelve visible.
 *
 * Recibimos la película completa como parámetro
 * porque necesitamos modificar específicamente
 * el objeto sobre el cual el usuario hizo click. el ! es como decir NOT lo pasa a false
 */

    cambiarVisibilidad(pelicula:Pelicula): void {
      pelicula.visible = !pelicula.visible;
    }

        /*
    * Texto que escribe el usuario en el buscador.
    */
    textoBusqueda: string = '';

      /*
 * Devuelve las películas cuyo título contiene
 * el texto escrito en el buscador.
 */
    obtenerPeliculasFiltradas(): Pelicula[] {
      const texto = this.textoBusqueda
        .toLowerCase()
        .trim();

      /*
      * Si no hay texto escrito,
      * devolvemos todas las películas.
      */
      if (texto === '') {
        return this.peliculas;
      }
      /*
      * filter() crea un nuevo array únicamente
      * con los elementos que cumplen la condición.
      */
      return this.peliculas.filter(
        pelicula =>
          pelicula.titulo
            .toLowerCase()
            .includes(texto)
      );
    }

}
