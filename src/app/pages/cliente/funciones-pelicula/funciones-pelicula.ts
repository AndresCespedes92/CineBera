import {
  ChangeDetectorRef,
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

import {
  FuncionService
} from '../../../services/funcion';


@Component({
  selector: 'app-funciones-pelicula',

  imports: [],

  templateUrl: './funciones-pelicula.html',
  styleUrl: './funciones-pelicula.css'
})
export class FuncionesPelicula implements OnInit {


  /*
   * Película seleccionada por el cliente.
   */
  pelicula: Pelicula | null = null;


  /*
   * Funciones disponibles de esa película.
   *
   * Por ahora utilizamos any[].
   * Después podemos tiparlo con Funcion
   * cuando terminemos de definir exactamente
   * qué información necesita esta pantalla.
   */
  funciones: any[] = [];


  /*
   * ID de la película recibido
   * mediante la URL.
   *
   * Ejemplo:
   *
   * /pelicula/5/funciones
   *
   * idPelicula = 5
   */
  idPelicula: number = 0;


  constructor(
    private route: ActivatedRoute,
    private peliculaService: PeliculaService,
    private funcionService: FuncionService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  /*
   * Cuando se inicia la pantalla:
   *
   * 1. Leemos el ID de la URL.
   * 2. Buscamos la película.
   * 3. Buscamos sus funciones activas.
   */
  async ngOnInit(): Promise<void> {


    /*
     * PASO 1
     *
     * Obtenemos :id desde la URL.
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');


    /*
     * Los parámetros de URL son texto.
     *
     * "5" → 5
     */
    this.idPelicula =
      Number(idRecibido);


    /*
     * PASO 2
     *
     * Buscamos la película en Supabase.
     */
    this.pelicula =
      await this.peliculaService
        .obtenerPeliculaPorId(
          this.idPelicula
        );


    /*
     * PASO 3
     *
     * Generamos la fecha de hoy
     * para no traer funciones de
     * días anteriores.
     */
    const hoy =
      new Date()
        .toISOString()
        .split('T')[0];


    /*
     * PASO 4
     *
     * Buscamos únicamente las funciones
     * activas correspondientes a esta película.
     */
    const {
      data,
      error
    } =
      await this.funcionService
        .obtenerFuncionesPorPelicula(
          this.idPelicula,
          hoy
        );


    /*
     * Si Supabase devuelve un error,
     * lo mostramos para poder diagnosticarlo.
     */
    if (error) {

      console.error(
        'Error obteniendo funciones de la película:',
        error
      );

      return;
    }


    /*
     * PASO 5
     *
     * Guardamos las funciones encontradas.
     *
     * Si Supabase devuelve null,
     * utilizamos un array vacío.
     */
    this.funciones =
      data ?? [];


    /*
     * Actualizamos la vista después
     * de las consultas asíncronas.
     */
    this.changeDetectorRef
      .detectChanges();


    /*
     * Logs temporales de prueba.
     */
    console.log(
      'PELÍCULA SELECCIONADA:',
      this.pelicula
    );

    console.log(
      'FUNCIONES DE LA PELÍCULA:',
      this.funciones
    );

  }

}