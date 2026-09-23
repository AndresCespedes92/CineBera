import {
  Injectable
} from '@angular/core';

import {
  supabase
} from '../supabase';

import {
  NuevaFuncionSupabase
} from '../models/funcion';


@Injectable({
  providedIn: 'root'
})
export class FuncionService {


  /*
   * Guarda una sola función.
   *
   * Lo dejamos porque puede ser útil
   * más adelante para editar/agregar
   * funciones individuales.
   */
  async crearFuncion(
    funcion: NuevaFuncionSupabase
  ) {

    return await supabase
      .from('funciones')
      .insert(funcion)
      .select()
      .single();

  }


  /*
   * Guarda varias funciones juntas.
   *
   * Este método será utilizado por
   * la programación semanal.
   *
   * En lugar de hacer:
   *
   * INSERT
   * INSERT
   * INSERT
   * INSERT...
   *
   * enviamos un array completo
   * a Supabase.
   */
  async crearFunciones(
    funciones: NuevaFuncionSupabase[]
  ) {

    return await supabase
      .from('funciones')
      .insert(funciones)
      .select();

  }


  /*
   * Obtiene todas las funciones
   * ordenadas por fecha.
   */
  async obtenerFunciones() {

    return await supabase
      .from('funciones')
      .select('*')
      .order(
        'fecha',
        {
          ascending: true
        }
      );

  }

}