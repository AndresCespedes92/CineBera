import { Component, OnInit } from '@angular/core';
import {
  Router,
  RouterLink
} from '@angular/router';
import { supabase } from '../../supabase';
import { FormsModule } from '@angular/forms';

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
    private router: Router
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

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: this.email,
      password: this.password
    });
  if (error) {
    console.error(
      'Error al iniciar sesión:',
      error.message
    );
    return;
  }
  
  this.router.navigate(['/admin/home']);
}

}

