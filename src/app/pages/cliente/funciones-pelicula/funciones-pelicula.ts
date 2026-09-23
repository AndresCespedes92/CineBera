import {
  Component,
  OnInit
} from '@angular/core';

import {
  ActivatedRoute
} from '@angular/router';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  PeliculaService
} from '../../../services/pelicula';


@Component({
  selector: 'app-funciones-pelicula',
  imports: [],
  templateUrl: './funciones-pelicula.html',
  styleUrl: './funciones-pelicula.css'
})
export class FuncionesPelicula implements OnInit {


  /*
   * Película que obtendremos desde Supabase.
   *
   * null significa que todavía no tenemos
   * una película cargada.
   */
  pelicula: Pelicula | null = null;


  /*
   * ID recibido mediante la URL.
   *
   * Ejemplo:
   *
   * /pelicula/5/funciones
   *
   * idPelicula = 5
   */
  idPelicula: number = 0;


  /*
   * ActivatedRoute:
   * permite leer información de la URL.
   *
   * PeliculaService:
   * se encarga de obtener la película
   * desde Supabase.
   */
  constructor(
    private route: ActivatedRoute,
    private peliculaService: PeliculaService
  ) {}


  /*
   * Angular ejecuta ngOnInit cuando
   * inicializa este componente.
   *
   * Lo hacemos async porque necesitamos
   * esperar una consulta a Supabase.
   */
  async ngOnInit(): Promise<void> {


    /*
     * Obtenemos el parámetro :id
     * definido en nuestra ruta.
     *
     * Por ejemplo:
     *
     * /pelicula/5/funciones
     *
     * idRecibido = "5"
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');


    /*
     * Los parámetros de la URL son string.
     *
     * Number() convierte:
     *
     * "5" -> 5
     */
    this.idPelicula =
      Number(idRecibido);


    /*
     * Ahora obtenerPeliculaPorId()
     * consulta Supabase.
     *
     * Por eso utilizamos await:
     * esperamos que termine la consulta
     * antes de guardar el resultado.
     */
    this.pelicula =
      await this.peliculaService
        .obtenerPeliculaPorId(
          this.idPelicula
        );
  }

}