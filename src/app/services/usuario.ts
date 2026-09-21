import { Injectable } from '@angular/core';
import { supabase } from '../supabase';


/**
 * Representa los datos necesarios para crear
 * el perfil de un usuario en nuestra base de datos.
 *
 * IMPORTANTE:
 * No incluimos email ni contraseña.
 *
 * - email y contraseña pertenecen a Supabase Auth.
 * - estos datos pertenecen a la tabla "perfiles".
 */
export interface NuevoPerfil {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  grupo_sanguineo: string;
  color_ojos: string;
  dias_vacaciones: number;
  rol: string;
}


@Injectable({
  providedIn: 'root'
})
export class Usuario {

  /**
   * Guarda los datos personales del usuario
   * en la tabla "perfiles".
   */
  async crearPerfil(perfil: NuevoPerfil) {

    return await supabase
      .from('perfiles')
      .insert(perfil);
  }

  /**
 * Busca el perfil correspondiente a un usuario.
 *
 * Recibimos el UUID generado por Supabase Auth
 * y buscamos la fila que tenga ese mismo ID
 * en la tabla "perfiles".
 * SELECT *
  FROM perfiles
  WHERE id = idUsuario
 */
  async obtenerPerfil(idUsuario: string) {

    return await supabase
      .from('perfiles')
      .select('*')
      .eq('id', idUsuario)
      .single();
  }


}