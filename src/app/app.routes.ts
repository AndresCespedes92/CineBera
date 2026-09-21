import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';

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
 * FUNCIONES DE UNA PELÍCULA
 *
 * ":id" es un parámetro de ruta.
 *
 * Permite utilizar una misma pantalla para
 * diferentes películas.
 *
 * Ejemplos:
 *
 * /pelicula/1/funciones
 * /pelicula/2/funciones
 * /pelicula/15/funciones
 */
{
  path: 'pelicula/:id/funciones',

  loadComponent: () =>
    import(
      './pages/cliente/funciones-pelicula/funciones-pelicula'
    )
      .then(m => m.FuncionesPelicula)
},



/*
 * ÁREA DE ADMINISTRACIÓN
 *
 * "admin" funciona como ruta padre.
 *
 * Todas las rutas definidas dentro de "children"
 * pertenecen al área administrativa.
 */
{
  path: 'admin',

  /*
   * Antes de utilizar esta configuración de ruta,
   * comprobamos que el usuario tenga rol admin.
   */
  canMatch: [roleGuard],

  loadComponent: () =>
    import('./layouts/admin-layout/admin-layout')
      .then(m => m.AdminLayout),

  children: [

    /*
     * /admin/home
     */
    {
      path: 'home',

      /*
       * Verificamos que exista una sesión activa
       * antes de activar la pantalla.
       */
      canActivate: [authGuard],

      loadComponent: () =>
        import('./pages/admin/home/home')
          .then(m => m.Home)
    },


    /*
     * /admin/peliculas
     */
    {
      path: 'peliculas',

      loadComponent: () =>
        import('./pages/admin/peliculas/peliculas')
          .then(m => m.Peliculas)
    },


    /*
     * /admin/peliculas/nueva
     */
    {
      path: 'peliculas/nueva',

      loadComponent: () =>
        import(
          './pages/admin/peliculas/nueva-pelicula/nueva-pelicula'
        )
          .then(m => m.NuevaPelicula)
    }

  ]
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