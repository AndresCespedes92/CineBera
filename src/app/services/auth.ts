import { Injectable } from '@angular/core';
import { supabase } from '../supabase';


/**
 * AuthService
 * --------------------------------------------------
 * RESPONSABILIDAD:
 *
 * Centralizar la lógica relacionada con la
 * autenticación de usuarios.
 *
 * Los componentes NO necesitan conocer directamente
 * cómo funciona Supabase Auth.
 *
 *
 * FLUJO:
 *
 * RegistroComponent
 *        │
 *        │ solicita registrar usuario
 *        ▼
 *   AuthService
 *        │
 *        │ utiliza Supabase
 *        ▼
 *   Supabase Auth
 * 
 * Inyectable le dice a Angular:Esta clase puede participar del sistema de Inyección de Dependencias.
 * providedIn: 'root'  Angular puede proporcionar una instancia de este servicio a toda la aplicación.
 * Cuando un componente diga: Necesito un AuthService. Angular puede entregárselo.
 */


@Injectable({
  providedIn: 'root'
})

export class Auth {


  /**
   * Registra un nuevo usuario utilizando
   * email y contraseña.
   *
   * Recibimos solamente los datos que necesita
   * Supabase Auth para crear la identidad.
   *
   * Los datos personales como nombre, apellido,
   * fecha de nacimiento, etc. los guardaremos
   * posteriormente en la tabla perfiles.
   */
  async registrar(
    email: string,
    password: string
  ) {

    /*
     * El componente no necesita saber que por debajo
     * estamos utilizando signUp() de Supabase.
     *
     * Esa responsabilidad queda encapsulada
     * dentro del servicio.
     */
    return await supabase.auth.signUp({
      email: email,
      password: password
    });
  }

  /**
 * Inicia sesión utilizando email y contraseña.
 *
 * El componente Login no necesita conocer
 * directamente cómo funciona Supabase Auth.
 */
async login(
  email: string,
  password: string
) {

  return await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });
}

/**
 * Obtiene la sesión actual de Supabase.
 *
 * Si existe una sesión, significa que hay
 * un usuario autenticado actualmente.
 *
 * Si no existe, session será null.
 */
async obtenerSesion() {

  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    console.error(
      'Error al obtener la sesión:',
      error.message
    );

    return null;
  }

  return data.session;
}

/**
 * Cierra la sesión actual del usuario.
 */
async logout() {

  const { error } =
    await supabase.auth.signOut();

  return { error };
}

}

