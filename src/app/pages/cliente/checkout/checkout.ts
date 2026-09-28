import {
  Component,
  OnInit,
  signal,
  computed,
  OnDestroy
} from '@angular/core';

import {
  Usuario
} from '../../../services/usuario';

import {
  CompraService
} from '../../../services/compra';

import {
  CuponService
} from '../../../services/cupon';

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
   * BENEFICIO DE PRIMERA COMPRA
   * =====================================================
   *
   * Indica si el usuario actual puede recibir
   * el 20% de descuento por primera compra.
   *
   * Es un Signal porque el resultado llega de
   * una consulta asincrónica a Supabase.
   */
  esPrimeraCompra =
    signal<boolean>(false);


/*
 * =====================================================
 * PORCENTAJE DE PRIMERA COMPRA
 * =====================================================
 *
 * Antes teníamos:
 *
 * readonly DESCUENTO_PRIMERA_COMPRA = 20;
 *
 * Eso significaba que el porcentaje estaba
 * escrito directamente en Angular.
 *
 * Ahora comienza en 0 y luego será cargado
 * desde la tabla "cupones" de Supabase.
 */
porcentajePrimeraCompra =
  signal<number>(0);


  /*
 * =====================================================
 * BENEFICIO PARA MAYORES DE 50 AÑOS
 * =====================================================
 *
 * Indica si el usuario cumple la condición
 * de edad para utilizar el cupón +50.
 */
esMayor50 =
  signal<boolean>(false);


/*
 * Porcentaje configurado en Supabase
 * para el cupón destinado a mayores de 50.
 *
 * Comienza en cero hasta que CuponService
 * recupere la configuración.
 */
porcentajeMayor50 =
  signal<number>(0);


  /*
   * =====================================================
   * TEMPORIZADOR DE COMPRA
   * =====================================================
   *
   * Guarda cuántos segundos quedan para completar
   * la operación.
   *
   * Checkout NO crea otros 10 minutos.
   * Recupera el vencimiento que nació en Butacas.
   */
  segundosRestantes =
    signal<number>(0);


  /*
   * Indica si la reserva ya venció.
   */
  reservaVencida =
    signal<boolean>(false);


  /*
   * computed() genera un valor derivado.
   *
   * Por ejemplo:
   *
   * 543 segundos
   *
   * se transforma en:
   *
   * 09:03
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
   * La conservamos para poder detenerlo
   * cuando Angular destruya el componente.
   */
  private intervaloTemporizador:
    ReturnType<typeof setInterval> | null = null;


  constructor(
    private route: ActivatedRoute,
    private butacaService: ButacaService,
    private funcionService: FuncionService,
    private peliculaService: PeliculaService,
    private salaService: SalaService,
    private usuarioService: Usuario,


    /*
    * CuponService obtiene desde Supabase
    * la configuración de las promociones.
    */
    private cuponService: CuponService,

    /*
     * CompraService administra las operaciones
     * relacionadas con compras en Supabase.
     */
    private compraService: CompraService,

    /*
     * Auth nos permite saber si existe
     * un usuario autenticado.
     */
    private authService: Auth,

    /*
     * Router nos permite navegar hacia
     * la pantalla de pago o volver a Butacas.
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
     * Reconstruimos el checkout.
     */
    this.cargarCheckout();

  }


  /*
   * =====================================================
   * CARGAR CHECKOUT
   * =====================================================
   *
   * Reconstruye toda la información necesaria
   * para mostrar el resumen de compra.
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


    /*
     * Guardamos las butacas encontradas
     * dentro del Signal.
     */
    this.butacasReservadas.set(
      reserva
    );


    /*
     * Todas las butacas del mismo token
     * pertenecen a la misma función.
     */
    const funcionId =
      reserva[0].funcion_id;


    /*
     * =====================================================
     * RECUPERAMOS EL TEMPORIZADOR
     * =====================================================
     *
     * Es el mismo vencimiento que nació
     * en la pantalla de Butacas.
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
     * La función conoce pelicula_id y sala_id.
     * Utilizamos esos datos para reconstruir
     * el resto del resumen.
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
     * =====================================================
     * PASO 4: BENEFICIO DE PRIMERA COMPRA
     * =====================================================
     *
     * IMPORTANTE:
     *
     * Esta comprobación debe realizarse DESPUÉS
     * de comprobar que la reserva existe.
     *
     * En la versión anterior había quedado
     * accidentalmente dentro de:
     *
     * if (reserva.length === 0)
     *
     * y por eso los console.log no aparecían
     * durante una reserva válida.
     */
    const sesion =
      await this.authService
        .obtenerSesion();


    /*
 * =====================================================
 * BENEFICIO DE PRIMERA COMPRA
 * =====================================================
 *
 * Para aplicar el beneficio necesitamos comprobar
 * dos cosas:
 *
 * 1. Que exista un usuario registrado.
 * 2. Que exista un cupón activo de primera compra.
 */
if (sesion?.user?.id) {

  /*
 * =====================================================
 * CUPÓN PARA MAYORES DE 50
 * =====================================================
 *
 * Recuperamos el perfil porque allí tenemos
 * fecha_nacimiento.
 */
const respuestaPerfil =
  await this.usuarioService
    .obtenerPerfil(
      sesion.user.id
    );

const perfil =
  respuestaPerfil.data;


/*
 * Recuperamos también la configuración
 * actual del cupón +50.
 */
const cuponMayor50 =
  await this.cuponService
    .obtenerCuponPorTipo(
      'mayor_50'
    );


if (
  perfil?.fecha_nacimiento &&
  cuponMayor50
) {

  const edad =
    this.calcularEdad(
      perfil.fecha_nacimiento
    );


  /*
   * El requisito habla de usuarios
   * mayores de 50 años.
   *
   * Por eso utilizamos > 50.
   *
   * Una persona de exactamente 50 todavía
   * no cumple "mayor de 50".
   */
  this.esMayor50.set(
    edad > 50
  );


  this.porcentajeMayor50.set(
    cuponMayor50.porcentaje
  );


  console.log(
    'Edad del usuario:',
    edad
  );

} else {

  this.esMayor50.set(false);

  this.porcentajeMayor50.set(0);

  this.esMayor50.set(false);
this.porcentajeMayor50.set(0);

}

  /*
   * Primero verificamos si el usuario
   * ya tiene alguna compra pagada.
   */
  const tieneComprasAnteriores =
    await this.compraService
      .tieneComprasPagadas(
        sesion.user.id
      );


  /*
   * Ahora pedimos a Supabase la configuración
   * actual del cupón de primera compra.
   *
   * Ya no asumimos que vale 20%.
   */
  const cuponPrimeraCompra =
    await this.cuponService
      .obtenerCuponPorTipo(
        'primera_compra'
      );


  /*
   * El beneficio corresponde solamente si:
   *
   * - no tiene compras pagadas
   * - existe un cupón activo
   */
  const correspondeBeneficio =
    !tieneComprasAnteriores &&
    cuponPrimeraCompra !== null;


  this.esPrimeraCompra.set(
    correspondeBeneficio
  );


  /*
   * Si encontramos el cupón guardamos
   * su porcentaje.
   *
   * Si no existe o está desactivado,
   * dejamos el porcentaje en cero.
   */
  this.porcentajePrimeraCompra.set(
    cuponPrimeraCompra?.porcentaje ?? 0
  );

} else {

  /*
   * Una compra anónima no puede utilizar
   * el beneficio de primera compra.
   */
  this.esPrimeraCompra.set(false);

  this.porcentajePrimeraCompra.set(0);

}


    /*
     * =====================================================
     * LOGS TEMPORALES DE PRUEBA
     * =====================================================
     *
     * Los dejamos por ahora para comprobar
     * que la promoción funciona.
     *
     * Después de probarla los podemos eliminar.
     */
    console.log(
      '¿Es primera compra?',
      this.esPrimeraCompra()
    );

    console.log(
  'Porcentaje primera compra:',
  this.porcentajePrimeraCompra()
);

    console.log(
      'Subtotal:',
      this.calcularTotal()
    );

    console.log(
      'Descuento:',
      this.calcularDescuento()
    );

    console.log(
      'Total final:',
      this.calcularTotalFinal())

console.log(
  '¿Es mayor de 50?',
  this.esMayor50()
);

console.log(
  'Porcentaje cupón +50:',
  this.porcentajeMayor50()
);



    /*
     * Terminamos de cargar todos los datos.
     */
    this.cargando.set(false);

  }


  /*
   * =====================================================
   * PREVENTA
   * =====================================================
   *
   * Determina si la compra se está realizando
   * dentro del período de preventa.
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
   * Durante preventa:
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
   * =====================================================
   * TIPO DE BUTACA
   * =====================================================
   *
   * K       → accesible
   * R/S/T   → VIP
   * resto   → normal
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
   * Calcula el precio individual
   * de una butaca.
   *
   * Las VIP tienen un recargo del 30%.
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
   * =====================================================
   * SUBTOTAL
   * =====================================================
   *
   * Suma el precio de todas las butacas
   * ANTES de aplicar promociones.
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
 * =====================================================
 * DESCUENTO
 * =====================================================
 *
 * Calcula cuánto dinero corresponde descontar
 * por el beneficio de primera compra.
 *
 * IMPORTANTE:
 *
 * El porcentaje ya NO está escrito directamente
 * en Angular.
 *
 * Ahora proviene de la tabla "cupones"
 * de Supabase.
 *
 * Ejemplo:
 *
 * subtotal = $10.000
 * porcentajePrimeraCompra() = 20
 *
 * descuento = $2.000
 */

/*
 * =====================================================
 * CALCULAR EDAD
 * =====================================================
 *
 * Recibe una fecha de nacimiento y devuelve
 * la edad real de la persona.
 *
 * No alcanza con hacer:
 *
 * año actual - año nacimiento
 *
 * porque puede ocurrir que este año todavía
 * no haya cumplido años.
 */
calcularEdad(
  fechaNacimiento: string
): number {

  const nacimiento =
    new Date(
      `${fechaNacimiento}T00:00:00`
    );

  const hoy =
    new Date();


  /*
   * Primera aproximación.
   */
  let edad =
    hoy.getFullYear() -
    nacimiento.getFullYear();


  /*
   * Comprobamos si este año ya pasó
   * su cumpleaños.
   */
  const diferenciaMes =
    hoy.getMonth() -
    nacimiento.getMonth();


  if (
    diferenciaMes < 0 ||
    (
      diferenciaMes === 0 &&
      hoy.getDate() < nacimiento.getDate()
    )
  ) {

    edad--;

  }


  return edad;
}


/*
 * =====================================================
 * PORCENTAJE DE DESCUENTO APLICADO
 * =====================================================
 *
 * Un usuario puede cumplir más de una promoción.
 *
 * Por ejemplo:
 *
 * - Primera compra → 30%
 * - Mayor de 50    → 15%
 *
 * Los descuentos NO se acumulan.
 *
 * Entre los beneficios que correspondan al usuario,
 * utilizamos el porcentaje más alto.
 */
porcentajeDescuentoAplicado(): number {

  /*
   * Empezamos sin ningún beneficio.
   */
  let porcentaje = 0;


  /*
   * Si corresponde primera compra,
   * consideramos ese porcentaje.
   */
  if (this.esPrimeraCompra()) {

    porcentaje =
      this.porcentajePrimeraCompra();

  }


  /*
   * Si también corresponde el beneficio +50,
   * comparamos ambos porcentajes.
   *
   * Math.max() devuelve el número mayor.
   *
   * Ejemplo:
   *
   * Math.max(30, 15)
   *
   * resultado → 30
   */
  if (this.esMayor50()) {

    porcentaje =
      Math.max(
        porcentaje,
        this.porcentajeMayor50()
      );

  }


  return porcentaje;
}


/*
 * =====================================================
 * DESCUENTO EN DINERO
 * =====================================================
 *
 * Convierte el porcentaje elegido anteriormente
 * en el importe que debemos descontar.
 *
 * Ejemplo:
 *
 * subtotal = $10.000
 * porcentaje = 30
 *
 * descuento = $3.000
 */
calcularDescuento(): number {

  const subtotal =
    this.calcularTotal();

  const porcentaje =
    this.porcentajeDescuentoAplicado();


  return (
    subtotal *
    porcentaje /
    100
  );

}


/*
 * =====================================================
 * TOTAL FINAL
 * =====================================================
 *
 * Este es el importe que efectivamente
 * deberá pagar el cliente.
 *
 * subtotal - descuento = total final
 */
calcularTotalFinal(): number {

  return (
    this.calcularTotal() -
    this.calcularDescuento()
  );

}


  /*
   * =====================================================
   * IR AL PAGO
   * =====================================================
   *
   * Prepara la compra antes de ingresar
   * a la pantalla de pago.
   *
   * En este punto todavía NO estamos cobrando.
   */
  async irAlPago(): Promise<void> {


    /*
     * No permitimos avanzar si terminó
     * el tiempo de la reserva.
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
     * Verificamos si ya habíamos creado
     * una compra para esta reserva.
     *
     * Esto evita duplicados si el usuario
     * presiona varias veces el botón.
     */
    const compraExistente =
      await this.compraService
        .obtenerCompraPorReserva(
          this.reservaToken
        );


    if (compraExistente) {

      console.log(
        'Compra pendiente existente:',
        compraExistente
      );


      await this.router.navigate([
        '/pago',
        compraExistente.id
      ]);


      return;
    }


    /*
     * No existe todavía una compra.
     *
     * Recuperamos la sesión actual.
     */
    const sesion =
      await this.authService
        .obtenerSesion();


    /*
     * Usuario registrado:
     *
     * usuario_id = UUID
     *
     * Compra anónima:
     *
     * usuario_id = null
     */
    const usuarioId =
      sesion?.user?.id ?? null;


    /*
     * Creamos la compra en estado pendiente.
     *
     * IMPORTANTE:
     *
     * Antes guardábamos:
     *
     * this.calcularTotal()
     *
     * Eso ignoraba promociones.
     *
     * Ahora guardamos calcularTotalFinal(),
     * que representa lo que realmente deberá pagar.
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
            this.calcularTotalFinal()

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
     * Avanzamos hacia Pago.
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
   * Recupera el creado en Butacas.
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
     * en esta pestaña.
     */
    const vencimientoGuardado =
      sessionStorage.getItem(clave);


    /*
     * Si no existe vencimiento,
     * consideramos la operación vencida.
     */
    if (!vencimientoGuardado) {

      this.segundosRestantes.set(0);

      this.reservaVencida.set(true);

      return;
    }


    /*
     * sessionStorage guarda strings.
     * Lo convertimos nuevamente a number.
     */
    const vencimiento =
      Number(vencimientoGuardado);


    /*
     * Actualizamos inmediatamente.
     */
    this.actualizarTemporizador(
      vencimiento
    );


    /*
     * Si ya estaba vencido,
     * no creamos el intervalo.
     */
    if (this.reservaVencida()) {

      return;
    }


    /*
     * Cada segundo recalculamos
     * cuánto tiempo queda realmente.
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
   * Siempre hacemos:
   *
   * vencimiento - Date.now()
   *
   * en lugar de simplemente restar uno.
   */
  private actualizarTemporizador(
    vencimiento: number
  ): void {

    const diferencia =
      vencimiento - Date.now();


    if (diferencia <= 0) {

      /*
       * La reserva llegó a cero.
       */
      this.segundosRestantes.set(0);

      this.reservaVencida.set(true);


      /*
       * Ya no necesitamos ejecutar
       * el intervalo.
       */
      this.detenerTemporizador();


      /*
       * Liberamos las butacas
       * correspondientes a esta reserva.
       */
      void this.liberarReservaVencida();


      return;
    }


    /*
     * Todavía tenemos tiempo disponible.
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
   * NO elimina el vencimiento de sessionStorage
   * porque queremos conservarlo mientras
   * navegamos entre pantallas.
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
   * Angular ejecuta ngOnDestroy cuando
   * abandonamos Checkout.
   *
   * Evitamos dejar un setInterval ejecutándose
   * sobre un componente que ya no existe.
   */
  ngOnDestroy(): void {

    this.detenerTemporizador();

  }


  /*
   * =====================================================
   * MODIFICAR BUTACAS
   * =====================================================
   *
   * Permite volver al mapa sin crear
   * una reserva nueva.
   */
  async modificarButacas(): Promise<void> {

    const funcionActual =
      this.funcion();


    /*
     * Sin función no sabemos a qué
     * mapa debemos regresar.
     */
    if (!funcionActual) {

      console.error(
        'No se encontró la función de la reserva.'
      );

      return;
    }


    /*
     * Volvemos al mapa correspondiente.
     *
     * Route parameter:
     *
     * /funcion/25/butacas
     *
     * Query parameter:
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
   * =====================================================
   * LIBERAR RESERVA VENCIDA
   * =====================================================
   *
   * Sincroniza el vencimiento visual
   * con Supabase.
   */
  private async liberarReservaVencida(): Promise<void> {

    /*
     * Sin token no podemos identificar
     * qué reserva debemos liberar.
     */
    if (!this.reservaToken) {

      return;
    }


    const liberada =
      await this.butacaService
        .liberarReserva(
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
     * Eliminamos también el vencimiento
     * almacenado en sessionStorage.
     */
    const funcionActual =
      this.funcion();


    if (funcionActual) {

      const clave =
        `cinebera-expira-funcion-${funcionActual.id}`;

      sessionStorage.removeItem(
        clave
      );

    }

  }

}