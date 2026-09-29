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
  async obtenerSalasActivas(lanzarError = false): Promise<Sala[]> {

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
        'id',
        {
          ascending: true
        }
      );


    if (error) {

      console.error(
        'Error obteniendo salas:',
        error
      );

      // Un error de lectura no significa que no existan salas disponibles.
      // La planificación pide detenerse; los consumidores anteriores conservan su comportamiento.
      if (lanzarError) {
        throw new Error('No se pudieron obtener las salas. Volvé a intentar.');
      }
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
