import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  CompraService
} from '../../../services/compra';

import {
  Auth
} from '../../../services/auth';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  ButacaService
} from '../../../services/butaca';

import {
  FuncionService
} from '../../../services/funcion';

import {
  PeliculaService
} from '../../../services/pelicula';

import {
  SalaService
} from '../../../services/sala';

import {
  ButacaFuncion
} from '../../../models/butaca-funcion';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  Sala
} from '../../../models/sala';


@Component({
  selector: 'app-checkout',
  imports: [],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout implements OnInit {


  /*
   * Token que identifica la reserva actual.
   *
   * Lo obtenemos desde:
   *
   * /checkout/:token
   */
  reservaToken: string = '';


  /*
   * Butacas que pertenecen a esta reserva.
   */
  butacasReservadas =
    signal<ButacaFuncion[]>([]);


  /*
   * Datos de la función seleccionada.
   *
   * Por ahora usamos any porque nuestro
   * FuncionService todavía trabaja así.
   *
   * Más adelante podemos crear una interface Funcion
   * para mejorar el tipado.
   */
  funcion =
    signal<any | null>(null);


  /*
   * Película correspondiente a la función.
   */
  pelicula =
    signal<Pelicula | null>(null);


  /*
   * Sala donde se proyectará la función.
   */
  sala =
    signal<Sala | null>(null);


  /*
   * Controla si todavía estamos recuperando
   * información desde Supabase.
   */
  cargando =
    signal<boolean>(true);


  constructor(
  private route: ActivatedRoute,

  private butacaService: ButacaService,
  private funcionService: FuncionService,
  private peliculaService: PeliculaService,
  private salaService: SalaService,

  /*
   * CompraService se encargará de crear
   * o buscar la operación comercial.
   */
  private compraService: CompraService,

  /*
   * AuthService nos permite saber si la
   * compra pertenece a un usuario registrado
   * o si es una compra anónima.
   */
  private authService: Auth,

  /*
   * Router nos permitirá avanzar hacia
   * la futura pantalla de pago.
   */
  private router: Router
) {}


  ngOnInit(): void {

    /*
     * Recuperamos :token desde la URL.
     */
    const tokenRecibido =
      this.route.snapshot
        .paramMap
        .get('token');


    /*
     * Sin token no podemos identificar
     * qué reserva debemos mostrar.
     */
    if (!tokenRecibido) {

      this.cargando.set(false);

      return;
    }


    this.reservaToken =
      tokenRecibido;


    /*
     * Iniciamos la reconstrucción
     * del resumen de compra.
     */
    this.cargarCheckout();

  }


  /*
   * Reconstruye toda la información necesaria
   * para mostrar el resumen.
   */
  async cargarCheckout(): Promise<void> {

    /*
     * PASO 1:
     *
     * buscamos las butacas utilizando
     * el token de reserva.
     */
    const reserva =
      await this.butacaService
        .obtenerReservaPorToken(
          this.reservaToken
        );


    /*
     * Si no encontramos butacas,
     * la reserva no existe o dejó de ser válida.
     */
    if (reserva.length === 0) {

      this.cargando.set(false);

      return;
    }


    this.butacasReservadas.set(
      reserva
    );


    /*
     * Todas las butacas del mismo token
     * pertenecen a la misma función.
     *
     * Por eso podemos obtener funcion_id
     * utilizando la primera butaca.
     */
    const funcionId =
      reserva[0].funcion_id;


    /*
     * PASO 2:
     *
     * buscamos la función.
     */
    const funcionEncontrada =
      await this.funcionService
        .obtenerFuncionPorId(
          funcionId
        );


    if (!funcionEncontrada) {

      this.cargando.set(false);

      return;
    }


    this.funcion.set(
      funcionEncontrada
    );


    /*
     * PASO 3:
     *
     * La función conoce:
     *
     * - pelicula_id
     * - sala_id
     *
     * Entonces podemos buscar ambos datos.
     */
    const peliculaEncontrada =
      await this.peliculaService
        .obtenerPeliculaPorId(
          funcionEncontrada.pelicula_id
        );


    const salaEncontrada =
      await this.salaService
        .obtenerSalaPorId(
          funcionEncontrada.sala_id
        );


    this.pelicula.set(
      peliculaEncontrada
    );

    this.sala.set(
      salaEncontrada
    );


    /*
     * Ya tenemos todos los datos necesarios
     * para mostrar el resumen.
     */
    this.cargando.set(false);

  }


  /*
   * Determina si la compra se está realizando
   * dentro del período de preventa.
   *
   * La preventa comienza 7 días antes
   * de la fecha de estreno en CineBera.
   */
  estaEnPreventa(): boolean {

    const peliculaActual =
      this.pelicula();


    if (!peliculaActual) {

      return false;
    }


    const fechaEstreno =
      new Date(
        `${peliculaActual.fechaEstreno}T00:00:00`
      );


    const inicioPreventa =
      new Date(
        fechaEstreno
      );


    inicioPreventa.setDate(
      inicioPreventa.getDate() - 7
    );


    const ahora =
      new Date();


    return (
      ahora >= inicioPreventa &&
      ahora < fechaEstreno
    );

  }


  /*
   * Obtiene el precio base de la entrada.
   *
   * Antes del estreno y dentro de los
   * siete días de preventa:
   * precioPreventa.
   *
   * Desde el estreno:
   * precioVenta.
   */
  obtenerPrecioBase(): number {

    const peliculaActual =
      this.pelicula();


    if (!peliculaActual) {

      return 0;
    }


    if (this.estaEnPreventa()) {

      return peliculaActual.precioPreventa;
    }


    return peliculaActual.precioVenta;

  }


  /*
   * Devuelve el tipo físico de una butaca.
   *
   * Nuestro mapa utiliza:
   *
   * K → accesible
   * R/S/T → VIP
   * resto → normal
   */
  obtenerTipoButaca(
    butaca: ButacaFuncion
  ): 'normal' | 'accesible' | 'vip' {

    if (butaca.fila === 'K') {

      return 'accesible';
    }


    if (
      butaca.fila === 'R' ||
      butaca.fila === 'S' ||
      butaca.fila === 'T'
    ) {

      return 'vip';
    }


    return 'normal';

  }


  /*
   * Calcula el precio individual.
   *
   * Las butacas VIP tienen un
   * recargo del 30%.
   */
  obtenerPrecioButaca(
    butaca: ButacaFuncion
  ): number {

    const precioBase =
      this.obtenerPrecioBase();


    if (
      this.obtenerTipoButaca(butaca)
      === 'vip'
    ) {

      return precioBase * 1.30;
    }


    return precioBase;

  }


  /*
   * Suma el precio de todas las
   * butacas de la reserva.
   */
  calcularTotal(): number {

    return this.butacasReservadas()
      .reduce(
        (
          total,
          butaca
        ) =>
          total +
          this.obtenerPrecioButaca(
            butaca
          ),
        0
      );

  }

  /*
 * Prepara la compra antes de ingresar
 * a la pantalla de pago.
 *
 * IMPORTANTE:
 * en este punto todavía NO estamos cobrando.
 */
async irAlPago(): Promise<void> {

  /*
   * Necesitamos una función válida porque
   * la compra debe quedar asociada a ella.
   */
  const funcionActual =
    this.funcion();


  if (!funcionActual) {

    console.error(
      'No se encontró la función de la compra.'
    );

    return;
  }


  /*
   * Primero verificamos si ya habíamos creado
   * una compra para esta reserva.
   *
   * Esto evita crear una compra nueva cada vez
   * que el usuario presiona el botón.
   */
  const compraExistente =
    await this.compraService
      .obtenerCompraPorReserva(
        this.reservaToken
      );


  /*
   * Si ya existe, simplemente continuamos
   * utilizando esa misma compra.
   */
  if (compraExistente) {

    console.log(
      'Compra pendiente existente:',
      compraExistente
    );


    /*
     * Más adelante esta será nuestra
     * pantalla de pago.
     */
    await this.router.navigate([
      '/pago',
      compraExistente.id
    ]);

    return;
  }


  /*
   * No existe todavía una compra.
   *
   * Consultamos la sesión actual.
   */
  const sesion =
    await this.authService
      .obtenerSesion();


  /*
   * Si existe usuario:
   *
   * usuario_id = UUID
   *
   * Si no existe:
   *
   * usuario_id = null
   *
   * Esto permite también la compra anónima.
   */
  const usuarioId =
    sesion?.user?.id ?? null;


  /*
   * Creamos la compra en estado pendiente.
   *
   * El total proviene del resumen que
   * acabamos de calcular.
   */
  const nuevaCompra =
    await this.compraService
      .crearCompra({

        reserva_token:
          this.reservaToken,

        usuario_id:
          usuarioId,

        funcion_id:
          funcionActual.id,

        total:
          this.calcularTotal()

      });


  /*
   * Si Supabase no pudo crear la compra,
   * detenemos el flujo.
   */
  if (!nuevaCompra) {

    console.error(
      'No fue posible crear la compra.'
    );

    return;
  }


  console.log(
    'Compra pendiente creada:',
    nuevaCompra
  );


  /*
   * La compra existe correctamente.
   *
   * Ahora podemos avanzar hacia pago.
   */
  await this.router.navigate([
    '/pago',
    nuevaCompra.id
  ]);

}

}