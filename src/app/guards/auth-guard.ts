import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/** Perfil, historial y beneficios requieren una cuenta registrada. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  try {
    const sesion = await auth.obtenerSesion();
    return sesion && !sesion.user.is_anonymous ? true : router.createUrlTree(['/login']);
  } catch { return router.createUrlTree(['/login']); }
};
