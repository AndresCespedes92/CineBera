import { Component } from '@angular/core';
import { Navbar } from '../../../components/navbar/navbar';
import { PeliculaCard } from '../../../components/pelicula-card/pelicula-card';
import { Pelicula } from '../../../models/pelicula';
import { Router } from '@angular/router';
import { PeliculaService } from '../../../services/pelicula';

@Component({
  imports: [Navbar, PeliculaCard],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  peliculas: Pelicula[] = [];
/*
 * Recibe desde PeliculaCard la película
 * seleccionada por el usuario.
 *
 * Utilizamos su ID para construir una ruta dinámica
 * hacia las funciones correspondientes.
 *
 * Ejemplo:
 *
 * pelicula.id = 1
 *
 * Resultado:
 * /pelicula/1/funciones
 */

constructor(
  private router: Router,
  private peliculaService: PeliculaService
) {
  
this.peliculas = this.peliculaService.obtenerPeliculas();

}

/*
   * Recibe la película emitida por PeliculaCard
   * mediante @Output y navega hacia sus funciones.
   */
  seleccionarPelicula(pelicula: Pelicula): void {

    this.router.navigate([
      '/pelicula',
      pelicula.id,
      'funciones'
    ]);

  }

}