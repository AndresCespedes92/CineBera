import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

import { Auth } from '../services/auth';


/**
 * Protege rutas que requieren que exista
 * un usuario autenticado.
 *
 * Por ahora NO verifica roles.
 * Solamente comprueba si existe una sesión.
 */
export const authGuard: CanActivateFn = async () => {

  /*
   * Los Guards funcionales no tienen constructor.
   *
   * Por eso utilizamos inject() para pedirle
   * dependencias al sistema de Angular.
   */
  const authService = inject(Auth);
  const router = inject(Router);


  // Consultamos la sesión actual.
  const sesion =
    await authService.obtenerSesion();


  /*
   * Si existe sesión, permitimos que Angular
   * active la ruta solicitada.
   */
  if (sesion) {
    return true;
  }


  /*
   * Si no existe sesión, en lugar de activar
   * la ruta protegida devolvemos una UrlTree
   * que representa la ruta /login.
   */
  return router.createUrlTree(['/login']);
};