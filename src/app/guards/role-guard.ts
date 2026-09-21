import { inject } from '@angular/core';
import {
  CanMatchFn,
  Router
} from '@angular/router';

import { Auth } from '../services/auth';
import { Usuario } from '../services/usuario';


/**
 * Permite utilizar las rutas administrativas
 * solamente cuando el usuario autenticado
 * posee rol "admin".
 */
export const roleGuard: CanMatchFn = async () => {

  const authService = inject(Auth);
  const usuarioService = inject(Usuario);
  const router = inject(Router);


  // 1. Obtenemos la sesión actual.
  const sesion =
    await authService.obtenerSesion();


  // Sin sesión no corresponde acceder al Admin.
  if (!sesion) {
    return router.createUrlTree(['/login']);
  }


  /*
   * 2. La sesión nos proporciona el UUID
   * del usuario autenticado.
   *
   * Con ese UUID buscamos su perfil.
   */
  const { data: perfil, error } =
    await usuarioService.obtenerPerfil(
      sesion.user.id
    );


  // Si el perfil no existe o hubo un error,
  // no permitimos acceder al área administrativa.
  if (error || !perfil) {

    console.error(
      'No se pudo obtener el perfil del usuario.',
      error?.message
    );

    return router.createUrlTree(['/']);
  }


  // 3. Comprobamos el rol.
  if (perfil.rol === 'admin') {
    return true;
  }


  // Está autenticado, pero NO está autorizado.
  return router.createUrlTree(['/']);
};