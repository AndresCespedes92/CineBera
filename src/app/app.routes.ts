import { Routes } from '@angular/router';

export const routes: Routes = [

  /*
   * LOGIN
   *
   * Angular no carga el componente Login
   * al iniciar la aplicación.
   *
   * Lo importa recién cuando el usuario
   * navega a /login.
   */
  {
    path: 'login',

    loadComponent: () =>
      import('./pages/login/login')
        .then(m => m.Login)
  },


  /*
   * REGISTRO DE CLIENTE
   */
  {
    path: 'registro',

    loadComponent: () =>
      import('./pages/registro/registro')
        .then(m => m.Registro)
  },

  {
  path: 'cartelera',

  loadComponent: () =>
    import('./pages/cliente/home/home')
      .then(modulo => modulo.Home)
},

  /*
   * DASHBOARD ADMINISTRADOR
   */
  {
    path: 'admin/home',

    loadComponent: () =>
      import('./pages/admin/home/home')
        .then(m => m.Home)
  },


  /*
   * GESTIÓN DE PELÍCULAS
   */
  {
    path: 'admin/peliculas',

    loadComponent: () =>
      import('./pages/admin/peliculas/peliculas')
        .then(m => m.Peliculas)
  },


  /*
   * ALTA DE PELÍCULA
   */
  {
    path: 'admin/peliculas/nueva',

    loadComponent: () =>
      import(
        './pages/admin/peliculas/nueva-pelicula/nueva-pelicula'
      )
        .then(m => m.NuevaPelicula)
  },


  /*
   * Si ingresamos solamente a:
   *
   * localhost:4200
   *
   * CineBera puede ser visitado sin iniciar sesión
   */
  {
  path: '',
  redirectTo: 'cartelera',
  pathMatch: 'full'
},


  /*
   * Ruta comodín.
   *
   * Cualquier dirección que Angular
   * no reconozca vuelve al Login.
   */
  {
  path: '**',

  loadComponent: () =>
    import('./pages/error/error')
      .then(modulo => modulo.Error)
}

];