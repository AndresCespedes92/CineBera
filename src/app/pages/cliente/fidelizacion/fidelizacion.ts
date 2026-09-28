import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  FidelizacionService
} from '../../../services/fidelizacion';

import {
  Auth
} from '../../../services/auth';

import {
  Recompensa
} from '../../../models/recompensa';

import {
  MovimientoPuntos
} from '../../../models/movimiento-puntos';

@Component({
  selector: 'app-fidelizacion',
  imports: [],
  templateUrl: './fidelizacion.html',
  styleUrl: './fidelizacion.css'
})
export class Fidelizacion implements OnInit {

  /*
 * =====================================================
 * HISTORIAL DE CANJES
 * =====================================================
 *
 * Contiene los canjes realizados por
 * el usuario actualmente autenticado.
 */
historialCanjes =
  signal<MovimientoPuntos[]>([]);


  /*
   * =====================================================
   * ESTADO DE LA PANTALLA
   * =====================================================
   *
   * Guarda el saldo actual del usuario.
   */
  saldo =
    signal<number>(0);


  /*
   * Recompensas activas configuradas
   * actualmente por el administrador.
   */
  recompensas =
    signal<Recompensa[]>([]);


  /*
   * Mientras consultamos Supabase podemos
   * informar al usuario que estamos cargando.
   */
  cargando =
    signal<boolean>(true);


  /*
   * Guarda el ID de la recompensa que
   * actualmente estamos procesando.
   *
   * null = ningún canje en curso.
   */
  recompensaCanjeandoId =
    signal<number | null>(null);


  /*
   * =====================================================
   * INYECCIÓN DE DEPENDENCIAS
   * =====================================================
   *
   * Auth:
   * nos permite identificar al usuario.
   *
   * FidelizacionService:
   * concentra puntos, recompensas y canjes.
   */
  constructor(
    private authService: Auth,
    private fidelizacionService: FidelizacionService
  ) {}


  /*
   * Angular ejecuta ngOnInit cuando
   * se inicializa esta pantalla.
   */
  async ngOnInit(): Promise<void> {

    await this.cargarDatos();

  }


  /*
   * =====================================================
   * CARGAR DATOS
   * =====================================================
   *
   * Recuperamos:
   *
   * - sesión
   * - saldo de puntos
   * - recompensas disponibles
   */
  async cargarDatos(): Promise<void> {

    this.cargando.set(true);


    const sesion =
      await this.authService
        .obtenerSesion();


    /*
     * El programa de fidelización solamente
     * corresponde a usuarios registrados.
     */
    if (!sesion?.user?.id) {

      this.saldo.set(0);

      this.recompensas.set([]);

      this.cargando.set(false);

      return;

    }


    /*
     * Obtenemos saldo y recompensas.
     */
    const saldo =
      await this.fidelizacionService
        .obtenerSaldoPuntos(
          sesion.user.id
        );


    const recompensas =
      await this.fidelizacionService
        .obtenerRecompensasActivas();

    /*
 * También recuperamos los canjes anteriores
 * del usuario.
 */
const historialCanjes =
  await this.fidelizacionService
    .obtenerHistorialCanjes(
      sesion.user.id
    );


    /*
 * =====================================================
 * ACTUALIZAMOS EL ESTADO DE LA PANTALLA
 * =====================================================
 *
 * Los datos anteriores son variables locales.
 *
 * Ahora los guardamos dentro de los Signals para
 * que Angular pueda reflejarlos en el HTML.
 */
this.saldo.set(
  saldo
);

this.recompensas.set(
  recompensas
);

this.historialCanjes.set(
  historialCanjes
);


this.cargando.set(false);

  }


  /*
   * =====================================================
   * PUEDE CANJEAR
   * =====================================================
   *
   * Determina si el saldo actual alcanza
   * para una recompensa.
   *
   * Ejemplo:
   *
   * saldo = 300
   * recompensa = 500
   *
   * false
   */
  puedeCanjear(
    recompensa: Recompensa
  ): boolean {

    return (
      this.saldo() >=
      recompensa.puntos_necesarios
    );

  }


  /*
   * =====================================================
   * CANJEAR
   * =====================================================
   *
   * Solicita al service realizar el canje.
   */
  async canjear(
    recompensa: Recompensa
  ): Promise<void> {

    /*
     * Primera validación desde la interfaz.
     *
     * El Service vuelve a comprobar el saldo.
     *
     * Tener ambas validaciones evita depender
     * solamente del botón.
     */
    if (!this.puedeCanjear(recompensa)) {

      alert(
        'No tenés puntos suficientes para esta recompensa.'
      );

      return;

    }


    const sesion =
      await this.authService
        .obtenerSesion();


    if (!sesion?.user?.id) {

      return;

    }


    /*
     * Guardamos qué recompensa estamos procesando.
     */
    this.recompensaCanjeandoId.set(
      recompensa.id
    );


    const resultado =
      await this.fidelizacionService
        .canjearRecompensa(
          sesion.user.id,
          recompensa
        );


    this.recompensaCanjeandoId.set(null);


    if (!resultado) {

      alert(
        'No se pudo realizar el canje.'
      );

      return;

    }


    alert(
      `Canje realizado: ${recompensa.nombre}`
    );


    /*
     * Volvemos a consultar los datos.
     *
     * Como el canje creó un movimiento negativo,
     * el saldo debería aparecer actualizado.
     */
    await this.cargarDatos();

  }

}