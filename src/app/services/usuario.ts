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

/** Solo datos existentes en perfiles; no incluye email de Auth. */
export interface EmpleadoListado {
  id: string;
  nombre: string | null;
  apellido: string | null;
  rol: string;
  dias_vacaciones: number | null;
}
@Injectable({
  providedIn: 'root',
})
export class Usuario {
  async listarEmpleados() {
    return await supabase
      .from('perfiles')
      .select('id,nombre,apellido,rol,dias_vacaciones')
      .eq('rol', 'empleado')
      .order('apellido')
      .order('nombre')
      .returns<EmpleadoListado[]>();
  }
  /** Personal nunca admite elegir admin ni modifica perfiles existentes. */
  async crearPerfilEmpleado(perfil: Omit<NuevoPerfil, 'rol'>) {
    return this.crearPerfil({ ...perfil, rol: 'empleado' });
  }

  /**
   * Guarda los datos personales del usuario
   * en la tabla "perfiles".
   */
  async crearPerfil(perfil: NuevoPerfil) {
    return await supabase.from('perfiles').insert(perfil);
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
    return await supabase.from('perfiles').select('*').eq('id', idUsuario).single();
  }

  /*
   * Calcula la edad actual de una persona
   * a partir de su fecha de nacimiento.
   *
   * No alcanza con hacer:
   *
   * año actual - año nacimiento
   *
   * porque puede ocurrir que este año
   * todavía no haya cumplido años.
   */
  calcularEdad(fechaNacimiento: string): number {
    const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);

    const hoy = new Date();

    /*
     * Primero hacemos el cálculo básico
     * utilizando solamente los años.
     */
    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    /*
     * Ahora comprobamos si este año
     * ya pasó el cumpleaños.
     */
    const diferenciaMes = hoy.getMonth() - nacimiento.getMonth();

    /*
     * Restamos un año cuando:
     *
     * - todavía no llegó el mes del cumpleaños
     *
     * O
     *
     * - estamos en el mismo mes,
     *   pero todavía no llegó el día.
     */
    if (diferenciaMes < 0 || (diferenciaMes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad;
  }

  /*
   * Determina si una edad cumple con la
   * clasificación de una película.
   *
   * ATP → cualquier edad.
   * +13 → 13 años o más.
   * +18 → 18 años o más.
   */
  cumpleRestriccionEdad(edad: number, clasificacion: 'ATP' | '+13' | '+18'): boolean {
    switch (clasificacion) {
      case 'ATP':
        return true;

      case '+13':
        return edad >= 13;

      case '+18':
        return edad >= 18;

      default:
        return false;
    }
  }
}
