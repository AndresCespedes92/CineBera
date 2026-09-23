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

}