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
  selector: 'app-proximamente',

  imports: [
    Navbar,
    PeliculaCard
  ],

  templateUrl: './proximamente.html',
  styleUrl: './proximamente.css'
})
export class Proximamente implements OnInit {


  /*
   * Contendrá solamente películas cuya
   * fecha de estreno CineBera sea futura.
   */
  peliculas: Pelicula[] = [];


  constructor(
    private peliculaService: PeliculaService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  /*
   * Al iniciar la pantalla consultamos
   * los próximos estrenos.
   */
  async ngOnInit(): Promise<void> {

    this.peliculas =
      await this.peliculaService
        .obtenerProximamente();


    /*
     * Actualizamos la vista después
     * de recibir los datos asíncronos.
     */
    this.changeDetectorRef
      .detectChanges();

  }


  /*
   * Por ahora reutilizamos el mismo evento
   * de PeliculaCard.
   *
   * Más adelante esta navegación nos permitirá
   * mostrar preventa o funciones según corresponda.
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