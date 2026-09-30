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
    const { data: perfil, error } = await usuarios.obtenerPerfil(sesion.user.id);
    const roles: string[] = route.data?.['roles'] ?? ['admin'];
    if (error || !perfil) return router.createUrlTree(['/']);
    if (roles.includes(perfil.rol)) return true;
    // El rechazo devuelve al usuario a un área que corresponde a su perfil.
    const destino =
      perfil.rol === 'empleado'
        ? '/empleado/validar-entrada'
        : perfil.rol === 'admin'
          ? '/admin/home'
          : '/';
    return router.createUrlTree([destino]);
  } catch {
    return router.createUrlTree(['/login']);
  }
};
