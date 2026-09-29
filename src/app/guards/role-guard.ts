import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { Usuario } from '../services/usuario';

/** Reutiliza el rol del perfil; cada ruta declara los roles admitidos. */
export const roleGuard: CanMatchFn = async (route) => {
  const auth = inject(Auth);
  const usuarios = inject(Usuario);
  const router = inject(Router);
  try {
    const sesion = await auth.obtenerSesion();
    if (!sesion || sesion.user.is_anonymous) return router.createUrlTree(['/login']);
    const {data: perfil, error} = await usuarios.obtenerPerfil(sesion.user.id);
    const roles: string[] = route.data?.['roles'] ?? ['admin'];
    return !error && perfil && roles.includes(perfil.rol) ? true : router.createUrlTree(['/']);
  } catch { return router.createUrlTree(['/login']); }
};
