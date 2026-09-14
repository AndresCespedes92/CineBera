import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Home } from './pages/admin/home/home';
import { Peliculas } from './pages/admin/peliculas/peliculas';
import { NuevaPelicula } from './pages/admin/peliculas/nueva-pelicula/nueva-pelicula';

export const routes: Routes = [
  //Pantalla de ingreso para Administradores y Empleados.
  {
    path: 'login',
    component: Login
  },
  // Pantalla principal del panel administrativo.
  {
    path: 'admin/home',
    component: Home
  },
  /*
   * Si el usuario entra solamente a:
   *
   * localhost:4200
   *
   * Angular lo redirige automáticamente hacia /login.
   */
  {
    path: 'admin/peliculas',
    component: Peliculas
  },
  {
    path: 'admin/peliculas/nueva',
    component: NuevaPelicula
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  /*
   * El doble asterisco representa cualquier dirección
   * que Angular no conozca.
   *
   * Ejemplo:
   * /cualquier-cosa
   *
   * Por ahora también lo mandamos al login.
   */
  {
    path: '**',
    redirectTo: 'login'
  }
];