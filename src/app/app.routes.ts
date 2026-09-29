import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';

export const routes: Routes = [
  { path: 'perfil', canActivate: [authGuard], loadComponent: () => import('./pages/cliente/perfil/perfil').then(m => m.Perfil) },
  { path: 'empleado', pathMatch: 'full', redirectTo: 'empleado/validar-entrada' },
  {path:'alertas',canActivate:[authGuard],loadComponent:()=>import('./pages/cliente/alertas/alertas').then(m=>m.Alertas)},
  {
    path: 'mis-peliculas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/cliente/mis-peliculas/mis-peliculas').then(m => m.MisPeliculas)
  },

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

{
  path: 'proximamente',

  loadComponent: () =>
    import(
      './pages/cliente/proximamente/proximamente'
    ).then(
      componente =>
        componente.Proximamente
    )
},

{
  /*
   * :id representa el ID de la compra
   * que queremos pagar.
   *
   * Ejemplo:
   * /pago/15
   */
  path: 'pago/:id',

  loadComponent: () =>
    import('./pages/cliente/pago/pago')
      .then(m => m.Pago)
},

{
  path: 'candy',

  /*
   * Lazy loading:
   * Angular carga el componente Candy
   * solamente cuando el usuario entra
   * a /candy.
   */
  loadComponent: () =>
    import('./pages/cliente/candy/candy')
      .then(m => m.Candy)
},

/*
 * =====================================================
 * PROGRAMA DE FIDELIZACIÓN
 * =====================================================
 *
 * El usuario registrado puede consultar sus puntos
 * y canjear las recompensas disponibles.
 */
{
  path: 'fidelizacion',
  canActivate: [authGuard],

  loadComponent: () =>
    import('./pages/cliente/fidelizacion/fidelizacion')
      .then(m => m.Fidelizacion)
},

{
  /*
   * El código de la entrada viaja como parámetro dinámico.
   *
   * Ejemplo:
   * /entrada/550e8400-e29b-41d4-a716-446655440000
   */
  path: 'entrada/:codigo',

  loadComponent: () =>
    import('./pages/cliente/entrada/entrada')
      .then(m => m.Entrada)
},

{
  /*
   * Pantalla utilizada por el personal del cine
   * para validar las entradas de los clientes.
   */
  path: 'empleado/validar-entrada',
  canMatch: [roleGuard],
  data: { roles: ['admin', 'empleado'] },

  loadComponent: () =>
    import('./pages/empleado/validar-entrada/validar-entrada')
      .then(m => m.ValidarEntrada)
},

{
  /*
   * El token identifica la reserva que
   * el cliente está intentando comprar.
   *
   * Ejemplo:
   * /checkout/550e8400-e29b-...
   */
  path: 'checkout/:token',

  loadComponent: () =>
    import('./pages/cliente/checkout/checkout')
      .then(m => m.Checkout)
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

{
  path: 'funcion/:id/butacas',

  loadComponent: () =>
    import('./pages/cliente/butacas/butacas')
      .then(m => m.Butacas)
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
  data: { roles: ['admin'] },

  loadComponent: () =>
    import('./layouts/admin-layout/admin-layout')
      .then(m => m.AdminLayout),

  children: [
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: 'auditoria', loadComponent: () => import('./pages/admin/auditoria/auditoria').then(m => m.Auditoria) },
    { path: 'graficos', loadComponent: () => import('./pages/admin/graficos/graficos').then(m => m.Graficos) },
    { path: 'reportes', loadComponent: () => import('./pages/admin/reportes/reportes').then(m => m.Reportes) },
    { path: 'candy', loadComponent: () => import('./pages/admin/candy/candy').then(m => m.AdminCandy) },
    { path: 'combos', loadComponent: () => import('./pages/admin/combos/combos').then(m => m.Combos) },

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

    {
  path: 'recompensas',

  loadComponent: () =>
    import(
      './pages/admin/recompensas/recompensas'
    )
      .then(
        m => m.Recompensas
      )
},

    /*
    * =====================================================
    * ADMINISTRACIÓN DE CUPONES
    * =====================================================
    *
    * Esta pantalla solamente queda disponible dentro
    * del layout administrativo.
    *
    * Además utilizamos loadComponent para mantener
    * el lazy loading que usamos en el proyecto.
    */
    {
      path: 'cupones',

      loadComponent: () =>
        import('./pages/admin/cupones/cupones')
          .then(m => m.Cupones)
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


    {
      path: 'funciones',

      loadComponent: () =>
        import(
          './pages/admin/funciones/funciones'
        ).then(
          componente =>
            componente.Funciones
        )
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
    },

    {
      path: 'peliculas/:id/editar',
      loadComponent: () =>
        import('./pages/admin/peliculas/editar-pelicula/editar-pelicula')
          .then(m => m.EditarPelicula)
    },

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
