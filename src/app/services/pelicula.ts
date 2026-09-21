import { Injectable } from '@angular/core';
import { Pelicula } from '../models/pelicula';

@Injectable({
  providedIn: 'root'
})
export class PeliculaService {

  /*
   * Por ahora utilizamos datos locales.
   *
   * Más adelante este servicio será responsable
   * de consultar las películas desde Supabase.
   *
   * De esta manera los componentes no necesitan
   * saber de dónde provienen los datos.
   */
  private peliculas: Pelicula[] = [
    {
      id: 1,
      titulo: 'Dune',
      sinopsis: 'Paul Atreides llega al planeta Arrakis.',
      duracion: 155,
      generos: ['Ciencia ficción'],
      formatos: ['2D', '3D'],
      idiomas: ['Español', 'Subtitulada'],
      imagenes: [],
      precioPreventa: 7000,
      precioVenta: 9000,
      fechaEstreno: '2026-10-01',
      valoracion: 4.5,
      cantidadResenas: 120,
      clasificacionEdad: '+13',
      visible: true
    }
  ];


  /*
   * Devuelve todas las películas disponibles.
   */
  obtenerPeliculas(): Pelicula[] {

    return this.peliculas;

  }


  /*
   * Busca una película utilizando su ID.
   *
   * find() recorre el array hasta encontrar
   * la primera película cuyo ID coincida.
   */
  obtenerPeliculaPorId(id: number): Pelicula | undefined {

    return this.peliculas.find(
      pelicula => pelicula.id === id
    );

  }

}