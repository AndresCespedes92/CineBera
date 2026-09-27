import {
  Component,
  OnInit,
  signal,
  computed,
  OnDestroy
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
export class Checkout implements OnInit, OnDestroy {


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

  /*
 * =====================================================
 * TEMPORIZADOR DE COMPRA
 * =====================================================
 *
 * Guarda cuántos segundos quedan para completar
 * la operación.
 *
 * No creamos otros 10 minutos en Checkout.
 * Vamos a recuperar el vencimiento que nació
 * en la pantalla de Butacas.
 */
segundosRestantes =
  signal<number>(0);


/*
 * Indica si la reserva ya venció.
 *
 * Nos servirá para impedir que el usuario
 * continúe hacia el pago cuando llegue a 00:00.
 */
reservaVencida =
  signal<boolean>(false);


/*
 * computed() genera un valor derivado.
 *
 * segundosRestantes:
 * 543
 *
 * se transforma en:
 * "09:03"
 *
 * No necesitamos guardar ambas cosas.
 * Guardamos los segundos y Angular calcula
 * automáticamente su representación visual.
 */
tiempoRestante = computed(() => {

  const segundos =
    this.segundosRestantes();

  const minutos =
    Math.floor(segundos / 60);

  const segundosSobrantes =
    segundos % 60;

  return (
    String(minutos).padStart(2, '0') +
    ':' +
    String(segundosSobrantes).padStart(2, '0')
  );

});


/*
 * Referencia al setInterval.
 *
 * La conservamos para poder detenerlo cuando
 * Angular destruya este componente.
 */
private intervaloTemporizador:
  ReturnType<typeof setInterval> | null = null;


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
 * =====================================================
 * RECUPERAMOS EL TEMPORIZADOR
 * =====================================================
 *
 * Ahora conocemos funcionId.
 *
 * Es el mismo ID que utilizó Butacas para guardar:
 *
 * cinebera-expira-funcion-25
 *
 * Por lo tanto Checkout puede recuperar exactamente
 * el mismo vencimiento.
 */
this.iniciarTemporizador(
  funcionId
);


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
 * No permitimos avanzar hacia el pago
 * si terminó el tiempo de la operación.
 */
if (this.reservaVencida()) {

  console.log(
    'La reserva venció. Debe seleccionar nuevamente las butacas.'
  );

  return;

}

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

/*
 * =====================================================
 * TEMPORIZADOR
 * =====================================================
 *
 * Checkout NO crea un nuevo vencimiento.
 *
 * Recupera el que fue creado cuando el usuario
 * ingresó a la pantalla de Butacas.
 */
private iniciarTemporizador(
  funcionId: number
): void {

  /*
   * Construimos exactamente la misma clave
   * utilizada por Butacas.
   *
   * Ejemplo:
   *
   * cinebera-expira-funcion-25
   */
  const clave =
    `cinebera-expira-funcion-${funcionId}`;


  /*
   * Recuperamos el vencimiento almacenado
   * en esta pestaña del navegador.
   */
  const vencimientoGuardado =
    sessionStorage.getItem(clave);


  /*
   * Si no existe vencimiento significa que
   * esta operación no tiene un temporizador válido.
   *
   * Por seguridad la consideramos vencida.
   */
  if (!vencimientoGuardado) {

    this.segundosRestantes.set(0);

    this.reservaVencida.set(true);

    return;

  }


  /*
   * sessionStorage guarda texto.
   *
   * Lo convertimos nuevamente a number porque
   * Date.now() también devuelve un número.
   */
  const vencimiento =
    Number(vencimientoGuardado);


  /*
   * Actualizamos inmediatamente el contador.
   *
   * Así no esperamos un segundo para mostrarlo.
   */
  this.actualizarTemporizador(
    vencimiento
  );


  /*
   * Si actualizarTemporizador detectó que
   * ya estaba vencido, no tiene sentido
   * crear el setInterval.
   */
  if (this.reservaVencida()) {

    return;

  }


  /*
   * Cada segundo volvemos a comparar
   * el vencimiento contra la hora actual.
   */
  this.intervaloTemporizador =
    setInterval(() => {

      this.actualizarTemporizador(
        vencimiento
      );

    }, 1000);

}


/*
 * Calcula cuántos segundos faltan realmente.
 *
 * IMPORTANTE:
 *
 * No hacemos:
 *
 * segundosRestantes - 1
 *
 * porque eso podría desincronizarse.
 *
 * Siempre comparamos:
 *
 * vencimiento - Date.now()
 */
private actualizarTemporizador(
  vencimiento: number
): void {

  const diferencia =
    vencimiento - Date.now();


  if (diferencia <= 0) {

  /*
   * El contador llegó a cero.
   *
   * Primero actualizamos la interfaz para impedir
   * que el usuario continúe con una reserva vencida.
   */
  this.segundosRestantes.set(0);
  this.reservaVencida.set(true);

  /*
   * Ya no necesitamos ejecutar el intervalo
   * cada segundo.
   */
  this.detenerTemporizador();


  /*
   * Liberamos en Supabase las butacas pertenecientes
   * a esta operación.
   *
   * No necesitamos bloquear la interfaz esperando
   * el resultado, por eso el método que contiene
   * este código puede seguir siendo void.
   */
  void this.liberarReservaVencida();

  return;
}


  /*
   * Todavía tenemos tiempo.
   */
  this.reservaVencida.set(false);


  const segundos =
    Math.ceil(
      diferencia / 1000
    );


  this.segundosRestantes.set(
    segundos
  );

}


/*
 * Detiene el setInterval.
 *
 * Esto NO borra el vencimiento de sessionStorage.
 *
 * Queremos que el tiempo siga existiendo si
 * navegamos entre las pantallas de la compra.
 */
private detenerTemporizador(): void {

  if (this.intervaloTemporizador) {

    clearInterval(
      this.intervaloTemporizador
    );

    this.intervaloTemporizador = null;

  }

}


/*
 * Angular ejecuta ngOnDestroy cuando abandonamos
 * la pantalla de Checkout.
 *
 * Limpiamos el setInterval para no dejar un proceso
 * ejecutándose sobre un componente destruido.
 */
ngOnDestroy(): void {

  this.detenerTemporizador();

}

/*
 * Permite volver al mapa de butacas para modificar
 * una reserva que ya fue creada.
 *
 * IMPORTANTE:
 * no creamos una reserva nueva.
 *
 * Enviamos el reservaToken actual mediante un
 * query parameter para que Butacas pueda reconocer
 * cuáles lugares pertenecen a esta operación.
 *
 * Ejemplo:
 *
 * /funcion/25/butacas?reserva=abc-123
 */
async modificarButacas(): Promise<void> {

  /*
   * Recuperamos la función que ya fue cargada
   * para este checkout.
   */
  const funcionActual =
    this.funcion();


  /*
   * Si todavía no tenemos la función,
   * no sabemos a qué mapa de butacas regresar.
   */
  if (!funcionActual) {

    console.error(
      'No se encontró la función de la reserva.'
    );

    return;
  }


  /*
   * Volvemos al mismo mapa de butacas.
   *
   * El ID de la función viaja como route parameter:
   *
   * /funcion/25/butacas
   *
   * El token viaja como query parameter:
   *
   * ?reserva=abc-123
   */
  await this.router.navigate(
    [
      '/funcion',
      funcionActual.id,
      'butacas'
    ],
    {
      queryParams: {
        reserva:
          this.reservaToken
      }
    }
  );

}

/*
 * Se ejecuta cuando finalizan los diez minutos.
 *
 * Su responsabilidad es sincronizar el vencimiento
 * visual con el estado persistente de Supabase.
 */
private async liberarReservaVencida(): Promise<void> {

  /*
   * Sin token no podemos identificar qué reserva
   * debemos liberar.
   */
  if (!this.reservaToken) {
    return;
  }


  const liberada =
    await this.butacaService.liberarReserva(
      this.reservaToken
    );


  if (!liberada) {

    console.error(
      'No fue posible liberar la reserva vencida.'
    );

    return;
  }


  console.log(
    'Reserva vencida liberada correctamente.'
  );

  /*
 * La operación terminó.
 *
 * Eliminamos también el vencimiento guardado
 * en esta pestaña para que una futura compra
 * pueda comenzar con un temporizador nuevo.
 */
const funcionActual =
  this.funcion();

if (funcionActual) {

  const clave =
    `cinebera-expira-funcion-${funcionActual.id}`;

  sessionStorage.removeItem(clave);

}

}




}