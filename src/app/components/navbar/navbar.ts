import { AlertaService } from '../../services/alerta';
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../services/auth';
import { Usuario } from '../../services/usuario';


@Component({
  selector: 'app-navbar',

  /*
   * Navbar es standalone.
   *
   * RouterLink es necesario porque utilizamos
   * routerLink dentro del HTML.
   */
  imports: [
    RouterLink
  ],

  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {

  /*
   * =====================================================
   * ESTADO DE LA NAVBAR
   * =====================================================
   *
   * usuarioAutenticado nos permite saber si debemos
   * mostrar las opciones de un cliente registrado
   * o las opciones de un visitante anónimo.
   */
  errorAlertas=signal(false);

  usuarioAutenticado =
    signal<boolean>(false);


  /*
   * Guardamos solamente el nombre que necesitamos
   * mostrar en la interfaz.
   *
   * No necesitamos guardar todo el perfil solamente
   * para escribir "Hola, Andrés".
   */
  nombreUsuario =
    signal<string>('');


  /*
   * =====================================================
   * INYECCIÓN DE DEPENDENCIAS
   * =====================================================
   *
   * Angular nos entrega los servicios que necesita
   * este componente.
   *
   * AuthService:
   *   trabaja con la sesión de Supabase Auth.
   *
   * UsuarioService:
   *   trabaja con nuestra tabla perfiles.
   *
   * Router:
   *   permite navegar desde TypeScript.
   */
  constructor(
    private authService: Auth,
    private usuarioService: Usuario,
    private router: Router,
    public alertas: AlertaService
  ) {}


  /*
   * ngOnInit se ejecuta cuando Angular crea
   * el componente Navbar.
   *
   * Aprovechamos ese momento para comprobar
   * si existe una sesión.
   */
  async ngOnInit(): Promise<void> {

    await this.cargarUsuario();
    if(this.usuarioAutenticado()) {
      try {await this.alertas.consultar();} catch {this.errorAlertas.set(true);this.alertas.noLeidas.set(0);}
    }

  }


  /*
   * =====================================================
   * CARGAR USUARIO
   * =====================================================
   *
   * Determina si estamos navegando como:
   *
   * - visitante anónimo
   * - usuario autenticado
   */
  private async cargarUsuario(): Promise<void> {

    /*
     * Preguntamos a Supabase Auth si existe
     * una sesión actualmente.
     */
    const sesion =
      await this.authService.obtenerSesion();


    /*
     * Si no existe usuario autenticado,
     * dejamos la navbar en modo visitante.
     */
    if (!sesion?.user?.id || sesion.user.is_anonymous) {

      this.usuarioAutenticado.set(false);

      this.nombreUsuario.set('');

      return;
    }


    /*
     * Existe una sesión.
     */
    this.usuarioAutenticado.set(true);


    /*
     * Ahora buscamos nuestro perfil de negocio.
     *
     * Recordá que obtenerPerfil() devuelve
     * la respuesta completa de Supabase:
     *
     * {
     *   data: {...},
     *   error: ...
     * }
     */
    const respuestaPerfil =
      await this.usuarioService.obtenerPerfil(
        sesion.user.id
      );


    const perfil =
      respuestaPerfil.data;


    /*
     * Si encontramos el perfil mostramos su nombre.
     */
    if (perfil?.nombre) {

      this.nombreUsuario.set(
        perfil.nombre
      );

    }

  }


  /*
   * =====================================================
   * CERRAR SESIÓN
   * =====================================================
   */
  async cerrarSesion(): Promise<void> {

    /*
     * Supabase elimina la sesión autenticada.
     */
    await this.authService.logout();
    this.alertas.noLeidas.set(0);


    /*
     * Actualizamos inmediatamente los Signals.
     *
     * Así Angular vuelve a renderizar la navbar
     * en modo visitante.
     */
    this.usuarioAutenticado.set(false);

    this.nombreUsuario.set('');


    /*
     * Finalmente volvemos a la cartelera.
     */
    await this.router.navigate([
      '/'
    ]);

  }

}