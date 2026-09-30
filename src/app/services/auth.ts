import { Injectable } from '@angular/core';
import { supabase, crearClienteAltaPersonal } from '../supabase';

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
  providedIn: 'root',
})
export class Auth {
  /** signUp puede iniciar sesión. Usamos un cliente temporal, sin tocar el principal.
   * Sigue siendo registro público: respeta confirmación de correo y límites de Auth. */
  async registrarEmpleado(email: string, password: string) {
    const temporal = crearClienteAltaPersonal();
    try {
      const { data, error } = await temporal.auth.signUp({ email, password });
      if (error)
        throw new Error(
          'No se pudo crear la cuenta. Revisá los datos y la disponibilidad del registro.',
        );
      // Auth puede ocultar un correo duplicado devolviendo un usuario sin identidades.
      if (!data.user?.id || !data.user.identities?.length)
        throw new Error(
          'No se pudo confirmar un alta nueva. El correo puede estar registrado; no se modificó ningún perfil.',
        );
      return { id: data.user.id, requiereConfirmacion: !data.session };
    } finally {
      await temporal.auth.dispose();
    }
  }

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
  async registrar(email: string, password: string) {
    /*
     * El componente no necesita saber que por debajo
     * estamos utilizando signUp() de Supabase.
     *
     * Esa responsabilidad queda encapsulada
     * dentro del servicio.
     */
    return await supabase.auth.signUp({
      email: email,
      password: password,
    });
  }

  /**
   * Inicia sesión utilizando email y contraseña.
   *
   * El componente Login no necesita conocer
   * directamente cómo funciona Supabase Auth.
   */
  async login(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email: email,
      password: password,
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
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error al obtener la sesión:', error.message);

      return null;
    }

    return data.session;
  }

  /**
   * Cierra la sesión actual del usuario.
   */
  async logout() {
    const { error } = await supabase.auth.signOut();

    return { error };
  }
}
