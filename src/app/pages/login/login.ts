import { Component, OnInit } from '@angular/core';
import {
  Router,
  RouterLink
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';
import { Usuario } from '../../services/usuario';

@Component({
  selector: 'app-login',

  /*
   * RouterLink:
   * se utiliza desde el HTML para navegar
   * hacia el registro de clientes.
   */
  imports: [
    RouterLink,
    FormsModule
  ],

  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email: string = '';
  password: string = '';

  /*
   * Router es un servicio de Angular.
   *
   * Angular lo inyecta mediante el constructor
   * para que podamos navegar desde TypeScript.
   * Angular, cuando inicialices este componente, ejecutá esto
   */
  constructor(
    private router: Router,
    private authService: Auth,
    private usuarioService: Usuario
  ) {}

  
  /*
   * LOGIN TEMPORAL
   *
   * Todavía no existe autenticación real.
   *
   * Por ahora enviamos directamente al Dashboard
   * para poder continuar desarrollando el flujo
   * administrativo.
   *
   * Más adelante:
   *
   * ingresar()
   *     ↓
   * AuthService
   *     ↓
   * Supabase
   *     ↓
   * usuario autenticado
   *     ↓
   * consultar rol
   *     ↓
   * redireccionar
   */
  async ingresar(): Promise<void> {

  // PASO 1:
  // Intentamos iniciar sesión.
  const { data, error } =
    await this.authService.login(
      this.email,
      this.password
    );


  // Si las credenciales son incorrectas,
  // detenemos el flujo.
  if (error) {

    console.error(
      'Error al iniciar sesión:',
      error.message
    );

    return;
  }


  // Verificamos que Supabase realmente
  // haya devuelto un usuario.
  if (!data.user) {

    console.error(
      'No se obtuvo el usuario autenticado.'
    );

    return;
  }


  /*
   * PASO 2:
   *
   * Auth ya nos dijo QUIÉN es el usuario.
   *
   * Ahora buscamos información propia
   * de CineBera utilizando su UUID.
   */
  const { data: perfil, error: perfilError } =
    await this.usuarioService.obtenerPerfil(
      data.user.id
    );


  // Si no pudimos obtener el perfil,
  // no podemos saber qué rol tiene.
  if (perfilError || !perfil) {

    console.error(
      'Error al obtener el perfil:',
      perfilError?.message
    );

    return;
  }


  /*
   * PASO 3:
   *
   * Decidimos a dónde navegar según
   * el rol almacenado en "perfiles".
   */
  if (perfil.rol === 'admin') {

    this.router.navigate(['/admin/home']);

  } else if (perfil.rol === 'empleado') {

    this.router.navigate(['/empleado']);

  } else {

    this.router.navigate(['/']);
  }
}

}

