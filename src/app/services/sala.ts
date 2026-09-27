import {
  Injectable
} from '@angular/core';

import {
  supabase
} from '../supabase';

import { Sala } from '../models/sala';


@Injectable({
  providedIn: 'root'
})
export class SalaService {


  /*
   * Obtiene solamente las salas
   * habilitadas para utilizarse.
   */
  async obtenerSalasActivas(): Promise<Sala[]> {

    const {
      data,
      error
    } = await supabase
      .from('salas')
      .select('*')
      .eq(
        'activa',
        true
      )
      .order(
        'nombre',
        {
          ascending: true
        }
      );


    if (error) {

      console.error(
        'Error obteniendo salas:',
        error
      );

      return [];
    }


    return data ?? [];

  }


  /*
 * Obtiene una sala específica utilizando su ID.
 *
 * Este método es útil cuando ya conocemos
 * exactamente qué sala necesitamos.
 *
 * Ejemplo:
 * una función tiene sala_id = 3
 * → buscamos solamente la Sala 3.
 */
async obtenerSalaPorId(
  salaId: number
): Promise<Sala | null> {

  const {
    data,
    error
  } = await supabase
    .from('salas')
    .select('*')
    .eq(
      'id',
      salaId
    )
    .single();


  /*
   * Si Supabase devuelve un error,
   * informamos el problema y devolvemos null.
   */
  if (error) {

    console.error(
      'Error obteniendo la sala:',
      error
    );

    return null;
  }


  /*
   * Si todo salió correctamente,
   * devolvemos la sala encontrada.
   */
  return data;

}

}