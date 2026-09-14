import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  /*
   * Router es el servicio de Angular que nos permite
   * navegar entre pantallas desde TypeScript.
   *
   * Es parecido a decir:
   * "cuando pase algo, llevame a otra dirección". La linea de abajo le dice a Angular NECESITO USAR EL ROUTER DENTRO DE ESTE
   * COMPONENTE -> LLAMADO DEPENDENCY INJECTION
   * es como viajar en colectivo, no me compro el colectivo sino que el servicio de transporte me lleva
   */
  constructor(private router: Router) {}
  /*
   * Por ahora NO validamos usuario ni contraseña.
   * Simplemente simulamos que el login fue correcto
   * para poder avanzar con la estructura del sistema.
   */
  ingresar(): void {
    console.log('Login simulado correctamente');
    /*
     * Navegamos hacia:
     * localhost:4200/admin/home
     */
    this.router.navigate(['/admin/home']);
  }

}
