import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  Navbar
} from '../../../components/navbar/navbar';

import {
  PeliculaCard
} from '../../../components/pelicula-card/pelicula-card';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  PeliculaService
} from '../../../services/pelicula';


@Component({
  selector: 'app-home',

  imports: [
    Navbar,
    PeliculaCard
  ],

  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {


  /*
   * Películas que se mostrarán
   * en la cartelera.
   *
   * Comienza vacío porque debemos
   * obtener los datos desde Supabase.
   */
  peliculas: Pelicula[] = [];


  constructor(
    private router: Router,
    private peliculaService: PeliculaService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  /*
   * Cuando se inicia Home,
   * solicitamos las películas reales
   * almacenadas en Supabase.
   */
  async ngOnInit(): Promise<void> {

    this.peliculas =
      await this.peliculaService
        .obtenerCartelera();


    /*
     * Supabase trabaja de forma asíncrona.
     *
     * Una vez que recibimos las películas,
     * le indicamos a Angular que actualice
     * inmediatamente la vista.
     *
     * Ya utilizamos esta misma solución
     * en NuevaPelicula con TMDB.
     */
    this.changeDetectorRef
      .detectChanges();


    /*
     * Temporalmente dejamos este console.log
     * para comprobar los datos.
     */
    console.log(
      'PELÍCULAS MOSTRADAS EN CARTELERA:',
      this.peliculas
    );

  }


  /*
   * PeliculaCard emite mediante @Output
   * la película seleccionada.
   *
   * Home recibe el evento y navega
   * hacia sus funciones.
   */
  seleccionarPelicula(
    pelicula: Pelicula
  ): void {

    this.router.navigate([
      '/pelicula',
      pelicula.id,
      'funciones'
    ]);

  }

}