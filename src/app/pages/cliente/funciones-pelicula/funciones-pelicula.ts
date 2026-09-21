import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Pelicula } from '../../../models/pelicula';
import { PeliculaService } from '../../../services/pelicula';

@Component({
  imports: [],
  selector: 'app-funciones-pelicula',
  styleUrl: './funciones-pelicula.css',
  templateUrl: './funciones-pelicula.html',
})
export class FuncionesPelicula {
  
  pelicula: Pelicula | undefined;
  /*
   * Guardaremos el ID recibido desde la URL.
   *
   * Ejemplo:
   * /pelicula/1/funciones
   *
   * idPelicula = 1
   */
  idPelicula: number;


  /*
   * ActivatedRoute es una dependencia proporcionada
   * por Angular.
   *
   * Nos permite acceder a la información de la
   * ruta que se encuentra actualmente activa.
   */
  constructor(
    private route: ActivatedRoute,
    private peliculaService: PeliculaService
  ) {

    /*
     * snapshot:
     * obtenemos una "foto" del estado actual de la ruta.
     *
     * paramMap:
     * contiene los parámetros definidos en la URL.
     *
     * get('id'):
     * recupera el valor correspondiente a :id.
     */
    const idRecibido =
      this.route.snapshot.paramMap.get('id');


    /*
     * Los parámetros de una URL llegan como texto.
     *
     * Por ejemplo:
     * "1"
     *
     * Como nuestro ID de Pelicula es number,
     * utilizamos Number() para convertirlo.
     */
    this.idPelicula = Number(idRecibido);

    this.pelicula =
    this.peliculaService.obtenerPeliculaPorId(
      this.idPelicula
    );

  }

}