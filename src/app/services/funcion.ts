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

  async obtenerFuncionesPorFecha(fecha: string) {
  return await supabase
    .from('funciones')
    .select('*')
    .eq('fecha', fecha)
    .eq('activa', true)
    .order('sala_id', { ascending: true })
    .order('hora', { ascending: true });
}

async desactivarFuncionSemanal(
  peliculaId: number,
  salaId: number,
  hora: string,
  fechaInicio: string,
  fechaFin: string
) {

  return await supabase
    .from('funciones')
    .update({
      activa: false
    })
    .eq('pelicula_id', peliculaId)
    .eq('sala_id', salaId)
    .eq('hora', hora)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .eq('activa', true);
}

/*
 * Obtiene todas las funciones activas
 * desde una fecha determinada.
 *
 * Lo vamos a usar para construir
 * la cartelera del cliente.
 *
 * Ejemplo:
 *
 * hoy = 2026-09-23
 *
 * traerá funciones:
 * 23/09
 * 24/09
 * 25/09
 * ...
 *
 * pero no funciones anteriores.
 */
async obtenerFuncionesActivasDesde(
  fecha: string
) {

  return await supabase
    .from('funciones')
    .select('*')
    .eq('activa', true)
    .gte('fecha', fecha)
    .order(
      'fecha',
      {
        ascending: true
      }
    )
    .order(
      'hora',
      {
        ascending: true
      }
    );

}

/*
 * Obtiene las funciones activas de una
 * película desde una fecha determinada.
 *
 * Se utiliza cuando el cliente entra a:
 *
 * /pelicula/:id/funciones
 */
async obtenerFuncionesPorPelicula(
  peliculaId: number,
  fechaDesde: string
) {

  return await supabase
    .from('funciones')
    .select('*')
    .eq('pelicula_id', peliculaId)
    .eq('activa', true)
    .gte('fecha', fechaDesde)
    .order('fecha', {
      ascending: true
    })
    .order('hora', {
      ascending: true
    });

}

/*
 * Obtiene las funciones activas que pertenecen
 * únicamente a una semana cinematográfica.
 *
 * La semana de CineBera funciona:
 *
 * jueves -> miércoles
 *
 * Ejemplo:
 *
 * 17/09/2026 -> 23/09/2026
 */
async obtenerFuncionesSemana(
  fechaInicio: string,
  fechaFin: string
) {

  return await supabase
    .from('funciones')
    .select('*')
    .eq('activa', true)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', {
      ascending: true
    })
    .order('hora', {
      ascending: true
    });

}




}