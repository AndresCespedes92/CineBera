import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed
} from '@angular/core';

import { Usuario } from '../../../services/usuario';
import { Auth } from '../../../services/auth';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  Butaca
} from '../../../models/butaca';

import {
  EstadoButaca
} from '../../../directives/estado-butaca';

import {
  FuncionService
} from '../../../services/funcion';

import {
  PeliculaService
} from '../../../services/pelicula';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  ButacaService
} from '../../../services/butaca';

import {
  ButacaFuncion
} from '../../../models/butaca-funcion';

import {
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  supabase
} from '../../../supabase';


@Component({
  selector: 'app-butacas',
  imports: [
    EstadoButaca
  ],
  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnInit, OnDestroy {

  /*
 * Mensaje relacionado específicamente
 * con restricciones de edad.
 */
mensajeEdad = signal<string>('');

/*
 * Cantidad de segundos que le quedan al usuario
 * para completar la operación.
 *
 * Es un Signal porque la pantalla debe reaccionar
 * cada vez que cambia el tiempo.
 */
segundosRestantes = signal<number>(0);


/*
 * Valor derivado de segundosRestantes.
 *
 * Ejemplo:
 *
 * 598 segundos
 *      ↓
 * "09:58"
 *
 * computed() se vuelve a calcular automáticamente
 * cuando cambia segundosRestantes().
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
 * Guardamos la referencia del setInterval
 * para poder detenerlo cuando corresponda.
 */
private intervaloTemporizador:
  ReturnType<typeof setInterval> | null = null;

      /*
    * Guarda la conexión Realtime actualmente
    * utilizada por esta pantalla.
    *
    * Al principio no existe porque todavía
    * no nos suscribimos.
    */
    private canalRealtime:
      RealtimeChannel | null = null


  /*
   * ID de la función seleccionada.
   *
   * Ejemplo:
   * /funcion/37/butacas
   *
   * idFuncion = 37
   */
  idFuncion: number = 0;


  /*
 * Token de la reserva que estamos editando.
 *
 * Normalmente vale null porque el usuario entra
 * por primera vez al mapa de butacas.
 *
 * Solamente tendrá valor cuando venga desde Checkout:
 *
 * /funcion/25/butacas?reserva=abc123
 */
reservaTokenEdicion: string | null = null;


  /*
   * Guarda la función que el usuario
   * seleccionó previamente.
   *
   * Desde acá podemos obtener:
   * - película
   * - sala
   * - fecha
   * - horario
   * - formato
   * - idioma
   */
  funcion: any | null = null;


  /*
   * Guarda la película asociada a la función.
   *
   * La necesitamos principalmente para conocer:
   * - precio normal
   * - precio preventa
   * - fecha de estreno
   */
  pelicula: Pelicula | null = null;


  /*
   * Registros que devuelve Supabase desde
   * la tabla butacas_funcion.
   *
   * IMPORTANTE:
   *
   * acá NO están las 546 butacas físicas.
   *
   * Solamente guardamos las butacas que tienen
   * algún estado persistido para esta función,
   * por ejemplo:
   *
   * A7 → ocupada
   */
  butacasOcupadas: ButacaFuncion[] = [];


  /*
   * Recargo aplicado a las butacas VIP.
   *
   * 0.30 representa un 30%.
   */
  readonly RECARGO_VIP = 0.30;


  /*
   * SIGNAL PRINCIPAL DE ESTA PANTALLA.
   *
   * Contiene el mapa completo de la sala.
   *
   * Antes utilizábamos:
   *
   * filasButacas: Butaca[][] = [];
   *
   * Ahora utilizamos un Signal porque el mapa
   * cambia dinámicamente:
   *
   * 1. Generamos las butacas como disponibles.
   * 2. Supabase responde cuáles están ocupadas.
   * 3. El usuario selecciona/deselecciona.
   *
   * Cuando actualizamos este Signal,
   * Angular sabe que el estado cambió.
   */
  filasButacas = signal<Butaca[][]>([]);


  constructor(

    /*
     * ActivatedRoute permite leer información
     * que llega mediante la URL.
     */
    private route: ActivatedRoute,

    /*
     * Servicio encargado de consultar funciones.
     */
    private funcionService: FuncionService,

    /*
     * Servicio encargado de consultar películas.
     */
    private peliculaService: PeliculaService,

    /*
     * Servicio encargado de consultar el estado
     * de las butacas en Supabase.
     */
    private butacaService: ButacaService,

    private router: Router,

    private authService: Auth,
    private usuarioService: Usuario

    
  ) {}


  /*
   * ngOnInit se ejecuta cuando Angular
   * inicializa este componente.
   */
  ngOnInit(): void {


    /*
     * Leemos el ID recibido por la URL.
     *
     * Ejemplo:
     *
     * /funcion/25/butacas
     *
     * idRecibido = "25"
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');


    this.idFuncion =
  Number(idRecibido);

  /*
 * Revisamos si además del ID de la función
 * recibimos un token de reserva.
 *
 * snapshot.queryParamMap se utiliza para leer
 * parámetros que aparecen después del "?".
 *
 * Ejemplo:
 *
 * /funcion/25/butacas?reserva=abc123
 */
this.reservaTokenEdicion =
  this.route.snapshot
    .queryParamMap
    .get('reserva');


/*
 * Si vale null:
 * estamos creando una reserva nueva.
 *
 * Si contiene un token:
 * estamos modificando una reserva existente.
 */
console.log(
  'Reserva en edición:',
  this.reservaTokenEdicion
);


/*
 * =====================================================
 * TEMPORIZADOR DE COMPRA
 * =====================================================
 *
 * En este punto ya conocemos el ID de la función.
 *
 * Esto es importante porque iniciarTemporizador()
 * utiliza ese ID para guardar el vencimiento en:
 *
 * sessionStorage
 *
 * Ejemplo:
 *
 * cinebera-expira-funcion-25
 *
 * De esta manera cada función puede tener
 * su propia operación de compra.
 */
this.iniciarTemporizador();


/*
 * Una vez que conocemos qué función estamos
 * visualizando, podemos escuchar sus cambios
 * mediante Supabase Realtime.
 */
this.iniciarRealtime();


    /*
     * Primero generamos físicamente el mapa.
     *
     * Esto debe ocurrir ANTES de aplicar las
     * ocupaciones obtenidas desde Supabase.
     */
    this.generarMapaSala();


    /*
     * Cargamos la información comercial:
     *
     * función → película → precios.
     */
    this.cargarDatosFuncion();


    /*
     * Consultamos qué butacas están ocupadas
     * específicamente para esta función.
     */
    this.cargarButacasOcupadas();


  }

/*
 * Angular ejecuta este método automáticamente
 * cuando abandonamos la pantalla.
 *
 * Cerramos Realtime para no dejar una
 * suscripción funcionando innecesariamente.
 */
    ngOnDestroy(): void {

      /*
        * Detenemos el reloj del componente.
        *
        * IMPORTANTE:
        * no eliminamos sessionStorage porque queremos
        * que el tiempo continúe si vamos a Checkout
        * y después volvemos a Butacas.
        */
        this.detenerTemporizador();

      if (this.canalRealtime) {

        supabase.removeChannel(
          this.canalRealtime
        );

                

        this.canalRealtime = null;

      }

    }
  /*
   * =====================================================
   * GENERACIÓN DEL MAPA
   * =====================================================
   *
   * Generamos las 20 filas efectivas de butacas.
   *
   * J NO tiene butacas porque representa
   * espacio físico.
   */
  generarMapaSala(): void {


    const filas = [

      'A', 'B', 'C', 'D', 'E',
      'F', 'G', 'H', 'I',

      // J queda físicamente vacía.

      'K',

      'L', 'M', 'N', 'Ñ',
      'O', 'P', 'Q',

      'R', 'S', 'T'

    ];


    /*
     * Array temporal.
     *
     * Construimos todo el mapa acá y solamente
     * cuando está terminado actualizamos el Signal.
     */
    const mapaSala: Butaca[][] = [];


    for (const fila of filas) {


      const butacasFila: Butaca[] = [];


      /*
       * La fila K es accesible.
       *
       * K:
       * 2 + 10 + 2 = 14
       *
       * Resto:
       * 4 + 20 + 4 = 28
       */
      const cantidad =
        fila === 'K'
          ? 14
          : 28;


      /*
       * Las filas R, S y T pertenecen
       * al sector VIP.
       */
      const esVip =
        fila === 'R' ||
        fila === 'S' ||
        fila === 'T';


      /*
       * Generamos cada butaca de la fila.
       */
      for (
        let numero = 1;
        numero <= cantidad;
        numero++
      ) {


        butacasFila.push({

          fila: fila,

          numero: numero,

          tipo:
            fila === 'K'
              ? 'accesible'
              : esVip
                ? 'vip'
                : 'normal',

          /*
           * Inicialmente todas se consideran
           * disponibles.
           *
           * Después Supabase puede cambiar
           * algunas a "ocupada".
           */
          estado: 'disponible'

        });

      }


      /*
       * Agregamos la fila terminada
       * al mapa temporal.
       */
      mapaSala.push(
        butacasFila
      );

    }


    /*
     * set() reemplaza el valor completo
     * almacenado por el Signal.
     *
     * Además notifica a Angular que
     * este estado cambió.
     */
    this.filasButacas.set(
      mapaSala
    );

  }


  /*
   * =====================================================
   * DISTRIBUCIÓN VISUAL DE LA SALA
   * =====================================================
   */


  /*
   * Devuelve las butacas del sector izquierdo.
   *
   * Normal/VIP → 4
   * Accesible   → 2
   */
  obtenerSectorIzquierdo(
    fila: Butaca[]
  ): Butaca[] {


    const cantidad =
      fila[0].tipo === 'accesible'
        ? 2
        : 4;


    return fila.slice(
      0,
      cantidad
    );

  }


  /*
   * Devuelve el sector central.
   *
   * Normal/VIP:
   * números 5 a 24.
   *
   * Accesible:
   * números 3 a 12.
   */
  obtenerSectorCentral(
    fila: Butaca[]
  ): Butaca[] {


    if (
      fila[0].tipo === 'accesible'
    ) {

      return fila.slice(
        2,
        12
      );

    }


    return fila.slice(
      4,
      24
    );

  }


  /*
   * Devuelve el sector derecho.
   *
   * Normal/VIP → últimos 4.
   * Accesible   → últimos 2.
   */
  obtenerSectorDerecho(
    fila: Butaca[]
  ): Butaca[] {


    if (
      fila[0].tipo === 'accesible'
    ) {

      return fila.slice(
        12,
        14
      );

    }


    return fila.slice(
      24,
      28
    );

  }


  /*
   * =====================================================
   * SELECCIÓN DE BUTACAS
   * =====================================================
   */


  /*
   * Selecciona o deselecciona una butaca.
   *
   * IMPORTANTE:
   * una butaca ocupada no puede modificarse.
   */
  seleccionarButaca(
    butaca: Butaca
  ): void {


    if (
      butaca.estado === 'ocupada'
    ) {

      return;

    }


    /*
     * Si estaba disponible:
     *
     * disponible → seleccionada
     *
     * Si ya estaba seleccionada:
     *
     * seleccionada → disponible
     */
    const nuevoEstado =
      butaca.estado === 'disponible'
        ? 'seleccionada'
        : 'disponible';


    /*
     * update() permite modificar el Signal
     * utilizando su valor actual.
     *
     * "filasActuales" representa el Butaca[][]
     * que actualmente contiene el Signal.
     */
    this.filasButacas.update(

      filasActuales =>

        filasActuales.map(

          fila =>

            fila.map(

              asiento => {


                /*
                 * Buscamos exactamente la butaca
                 * sobre la que hizo click el usuario.
                 */
                if (
                  asiento.fila === butaca.fila &&
                  asiento.numero === butaca.numero
                ) {


                  /*
                   * Creamos un NUEVO objeto.
                   *
                   * El spread (...) copia todas
                   * las propiedades existentes.
                   *
                   * Luego reemplazamos solamente
                   * el estado.
                   */
                  return {

                    ...asiento,

                    estado: nuevoEstado

                  };

                }


                /*
                 * Las demás butacas permanecen
                 * exactamente iguales.
                 */
                return asiento;

              }

            )

        )

    );

  }


  /*
   * Devuelve solamente las butacas
   * seleccionadas actualmente.
   */
  obtenerButacasSeleccionadas(): Butaca[] {


    /*
     * filasButacas() LEE el valor del Signal.
     *
     * flat():
     * transforma Butaca[][] en Butaca[].
     *
     * filter():
     * conserva solamente las seleccionadas.
     */
    return this.filasButacas()
      .flat()
      .filter(
        butaca =>
          butaca.estado === 'seleccionada'
      );

  }


/*
 * Intenta reservar las butacas seleccionadas
 * y, si la reserva es exitosa, lleva al cliente
 * a la pantalla de checkout.
 */
async continuarCompra(): Promise<void> {

  /*
 * Aunque el botón esté deshabilitado visualmente,
 * también protegemos la lógica TypeScript.
 *
 * La interfaz no debe ser nuestra única validación.
 */
if (this.segundosRestantes() <= 0) {

  console.error(
    'El tiempo para completar la compra finalizó.'
  );

  return;
}

  /*
   * Antes de crear una reserva en Supabase,
   * comprobamos la restricción de edad.
   */
  const edadValida =
    await this.validarRestriccionEdad();


  if (!edadValida) {

    /*
     * No llegamos a reservarButacas().
     *
     * Por lo tanto no bloqueamos asientos
     * innecesariamente en Supabase.
     */
    return;

  }


  // DESDE ACÁ continúa el código que ya teníamos.

  const seleccionadas =
    this.obtenerButacasSeleccionadas();


  /*
   * No permitimos continuar sin seleccionar
   * al menos una butaca.
   */
  if (seleccionadas.length === 0) {

    console.log(
      'Debe seleccionar al menos una butaca.'
    );

    return;
  }

  /*
 * Recuperamos el vencimiento que nació cuando
 * entramos a la pantalla de Butacas.
 *
 * Ese mismo vencimiento viajará a Supabase.
 */
const claveVencimiento =
  `cinebera-expira-funcion-${this.idFuncion}`;

const vencimientoGuardado =
  sessionStorage.getItem(
    claveVencimiento
  );


/*
 * Si por alguna razón no existe el vencimiento,
 * no permitimos crear una reserva inconsistente.
 */
if (!vencimientoGuardado) {

  console.error(
    'No se encontró el vencimiento de la operación.'
  );

  return;
}


const vencimientoOperacion =
  Number(
    vencimientoGuardado
  );

/*
 * =====================================================
 * CREAR O ACTUALIZAR LA RESERVA
 * =====================================================
 *
 * Tenemos dos caminos posibles:
 *
 * 1. reservaTokenEdicion === null
 *    → el usuario está reservando por primera vez.
 *
 * 2. reservaTokenEdicion tiene un token
 *    → el usuario volvió desde Checkout y está
 *      modificando una reserva existente.
 */

let reservaToken: string | null;


/*
 * CAMINO 1:
 * estamos editando una reserva existente.
 */
if (this.reservaTokenEdicion) {

  /*
   * No generamos otro token.
   *
   * Le pedimos al servicio que compare:
   *
   * - las butacas anteriores;
   * - las butacas seleccionadas ahora.
   */
  const actualizacionExitosa =
    await this.butacaService.actualizarReserva(
      this.reservaTokenEdicion,
      this.idFuncion,
      seleccionadas,
      vencimientoOperacion
    );


  /*
   * Si Supabase no pudo actualizar la reserva,
   * detenemos el proceso.
   */
  if (!actualizacionExitosa) {

    console.error(
      'No fue posible actualizar la reserva.'
    );

    /*
     * Volvemos a consultar Supabase para que
     * el mapa represente el estado real.
     */
    await this.cargarButacasOcupadas();

    return;
  }


  /*
   * Conservamos exactamente el mismo token.
   *
   * Ejemplo:
   *
   * Antes:
   * H5 + H6 → ABC123
   *
   * Después:
   * H6 + H7 → ABC123
   */
  reservaToken =
    this.reservaTokenEdicion;

}


/*
 * CAMINO 2:
 * es una reserva completamente nueva.
 */
else {

  reservaToken =
    await this.butacaService.reservarButacas(
      this.idFuncion,
      seleccionadas,
      vencimientoOperacion
    );

}


  /*
   * CAMINO DE ERROR
   *
   * Si no recibimos token significa que
   * Supabase no pudo crear la reserva.
   */
  if (!reservaToken) {

    console.error(
      'No fue posible reservar las butacas.'
    );


    /*
     * Recargamos la ocupación porque una posible
     * causa es que otro cliente haya reservado
     * alguna de estas butacas antes que nosotros.
     */
    await this.cargarButacasOcupadas();


    /*
     * return termina el método.
     *
     * Por lo tanto, si hubo un error,
     * nunca llegamos al router.navigate().
     */
    return;
  }


  /*
   * CAMINO EXITOSO
   *
   * Si llegamos hasta acá significa que:
   *
   * reservaToken !== null
   *
   * Ejemplo:
   * "550e8400-e29b-41d4-a716-446655440000"
   */
  console.log(
    'Reserva creada:',
    reservaToken
  );


  /*
   * Navegamos al checkout.
   *
   * El token viaja como parámetro dinámico
   * dentro de la URL.
   *
   * Ejemplo:
   *
   * /checkout/550e8400-e29b-41d4-a716-446655440000
   */
  await this.router.navigate([
    '/checkout',
    reservaToken
  ]);

}


  /*
   * =====================================================
   * INFORMACIÓN DE LA FUNCIÓN Y PELÍCULA
   * =====================================================
   */


  /*
   * Obtiene la función seleccionada.
   *
   * Después utiliza pelicula_id para
   * obtener la película correspondiente.
   */
  async cargarDatosFuncion(): Promise<void> {


    this.funcion =
      await this.funcionService
        .obtenerFuncionPorId(
          this.idFuncion
        );


    if (
      !this.funcion
    ) {

      return;

    }


    this.pelicula =
      await this.peliculaService
        .obtenerPeliculaPorId(
          this.funcion.pelicula_id
        );

  }


  /*
   * =====================================================
   * PRECIOS
   * =====================================================
   */


  /*
   * Determina si actualmente estamos
   * dentro del período de preventa.
   *
   * La preventa comienza 7 días antes
   * del estreno configurado en CineBera.
   */
  estaEnPreventa(): boolean {


    if (
      !this.pelicula
    ) {

      return false;

    }


    /*
     * Convertimos la fecha almacenada
     * en la película a un objeto Date.
     */
    const fechaEstreno =
      new Date(
        `${this.pelicula.fechaEstreno}T00:00:00`
      );


    /*
     * Creamos una COPIA.
     *
     * Así no modificamos accidentalmente
     * fechaEstreno.
     */
    const inicioPreventa =
      new Date(
        fechaEstreno
      );


    /*
     * Retrocedemos 7 días.
     */
    inicioPreventa.setDate(
      inicioPreventa.getDate() - 7
    );


    const ahora =
      new Date();


    /*
     * Estamos en preventa cuando:
     *
     * inicioPreventa <= ahora < fechaEstreno
     */
    return (
      ahora >= inicioPreventa &&
      ahora < fechaEstreno
    );

  }


  /*
   * Obtiene el precio base correspondiente.
   *
   * Todavía NO aplica recargo VIP.
   */
  obtenerPrecioBase(): number {


    if (
      !this.pelicula
    ) {

      return 0;

    }


    if (
      this.estaEnPreventa()
    ) {

      return this.pelicula
        .precioPreventa;

    }


    return this.pelicula
      .precioVenta;

  }


  /*
   * Calcula el precio individual
   * de una butaca.
   */
  obtenerPrecioButaca(
    butaca: Butaca
  ): number {


    const precioBase =
      this.obtenerPrecioBase();


    /*
     * VIP tiene un recargo del 30%.
     */
    if (
      butaca.tipo === 'vip'
    ) {

      return precioBase *
        (1 + this.RECARGO_VIP);

    }


    /*
     * Normal y accesible mantienen
     * el precio base.
     */
    return precioBase;

  }


  /*
   * Calcula el total correspondiente
   * a todas las butacas seleccionadas.
   */
  calcularTotal(): number {


    return this
      .obtenerButacasSeleccionadas()
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
   * OCUPACIÓN DESDE SUPABASE
   * =====================================================
   */


  /*
   * Consulta qué butacas tienen un registro
   * asociado a la función actual.
   */
  async cargarButacasOcupadas(): Promise<void> {



    this.butacasOcupadas =
      await this.butacaService
        .obtenerButacasOcupadas(
          this.idFuncion
        );


    /*
     * Debug temporal.
     *
     * Nos permite verificar qué información
     * realmente devolvió Supabase.
     */
    console.log(
      'BUTACAS RECIBIDAS DE SUPABASE:',
      this.butacasOcupadas
    );


    /*
     * Aplicamos esos registros
     * sobre el mapa generado.
     */
    this.aplicarButacasOcupadas();


    /*
     * Debug temporal para comprobar A7.
     *
     * IMPORTANTE:
     * como filasButacas ahora es Signal,
     * debemos leerlo utilizando ().
     */
    const a7 =
      this.filasButacas()
        .flat()
        .find(

          butaca =>
            butaca.fila === 'A' &&
            butaca.numero === 7

        );

  }


  /*
 * Aplica sobre el mapa físico la información
 * recuperada desde Supabase.
 *
 * Ahora distinguimos entre:
 *
 * 1. una butaca bloqueada por otra operación;
 * 2. una butaca que pertenece a MI reserva.
 *
 * Esto permite regresar desde Checkout y editar
 * las butacas seleccionadas anteriormente.
 */
aplicarButacasOcupadas(): void {


  this.filasButacas.update(

    filasActuales =>

      filasActuales.map(

        fila =>

          fila.map(

            butaca => {


              /*
               * Buscamos si existe un registro de
               * Supabase para esta posición.
               *
               * A diferencia de some(), find()
               * nos devuelve el OBJETO encontrado.
               *
               * Necesitamos el objeto porque queremos
               * consultar su reserva_token.
               */
              const registro =
                this.butacasOcupadas.find(

                  ocupada =>
                    ocupada.fila === butaca.fila &&
                    ocupada.numero === butaca.numero

                );


              /*
               * No existe ningún bloqueo.
               *
               * La butaca continúa disponible.
               */
              if (!registro) {

                return {
                  ...butaca,
                  estado: 'disponible'
                };

              }


              /*
               * La butaca pertenece a la reserva
               * que estamos modificando.
               *
               * Por eso NO debemos bloquearla:
               * debe aparecer seleccionada.
               */
              if (
                this.reservaTokenEdicion &&
                registro.reserva_token ===
                  this.reservaTokenEdicion &&
                registro.estado === 'reservada'
              ) {

                return {
                  ...butaca,
                  estado: 'seleccionada'
                };

              }


              /*
               * Si llegamos acá significa que:
               *
               * - pertenece a otra reserva, o
               * - ya fue comprada definitivamente.
               *
               * En ambos casos el usuario actual
               * no puede seleccionarla.
               */
              return {
                ...butaca,
                estado: 'ocupada'
              };

            }

          )

      )

  );

}



  /*
 * Inicia la escucha de cambios Realtime
 * para la función que estamos visualizando.
 */
iniciarRealtime(): void {

  /*
   * Le pedimos al ButacaService que
   * escuche cambios de ESTA función.
   */
  this.canalRealtime =
    this.butacaService
      .suscribirseACambiosButacas(

        this.idFuncion,

        /*
         * Esta función se ejecutará cada vez
         * que Supabase informe un cambio.
         *
         * Por ahora usamos una estrategia simple:
         *
         * hubo cambio
         *      ↓
         * volvemos a consultar las butacas
         *      ↓
         * actualizamos nuestro Signal
         */
        async () => {

          console.log(
            'Cambio Realtime detectado en butacas'
          );

          await this.cargarButacasOcupadas();

        }

      );

}

/*
 * Comprueba si el usuario actual cumple
 * la restricción de edad de la película.
 *
 * ATP no requiere ningún control adicional.
 */
async validarRestriccionEdad(): Promise<boolean> {

  /*
   * Si todavía no cargamos la película,
   * no podemos validar la clasificación.
   */
  if (!this.pelicula) {
    return false;
  }


  /*
   * ATP significa que no existe una
   * edad mínima para comprar.
   */
  if (this.pelicula.clasificacionEdad === 'ATP') {
    return true;
  }


  /*
   * Obtenemos la sesión actual para saber
   * qué usuario está intentando comprar.
   */
  const sesion =
    await this.authService.obtenerSesion();


  /*
   * Si no hay usuario autenticado, no podemos
   * aplicar la edad desde un perfil.
   *
   * IMPORTANTE:
   * esto lo resolveremos aparte cuando hagamos
   * completamente la compra anónima.
   */
  if (!sesion?.user?.id) {
    return true;
  }


  /*
   * Buscamos el perfil, porque la fecha de
   * nacimiento está guardada en perfiles.
   *
   * Ajustá solamente esta llamada si tu
   * obtenerPerfil() tiene otro nombre/firma.
   */
  /*
 * obtenerPerfil() devuelve la respuesta de Supabase.
 *
 * Esa respuesta contiene:
 *
 * {
 *   data: { ...perfil... },
 *   error: ...
 * }
 *
 * Por eso extraemos solamente "data".
 */
const respuestaPerfil =
  await this.usuarioService.obtenerPerfil(
    sesion.user.id
  );


/*
 * Nos quedamos con el registro real
 * que está dentro de data.
 */
const perfil =
  respuestaPerfil.data;


  /*
   * Si el usuario está registrado pero por algún
   * motivo no podemos obtener su fecha de nacimiento,
   * no permitimos continuar con una película restringida.
   */
  if (!perfil?.fecha_nacimiento) {

    this.mensajeEdad.set(
      'No pudimos verificar tu edad.'
    );

    return false;

  }


  /*
   * Reutilizamos el método que acabamos
   * de crear en UsuarioService.
   */
  const edad =
    this.usuarioService.calcularEdad(
      perfil.fecha_nacimiento
    );


  /*
   * Segunda responsabilidad:
   * comprobar la edad calculada contra
   * la clasificación de la película.
   */
  const puedeComprar =
    this.usuarioService.cumpleRestriccionEdad(
      edad,
      this.pelicula.clasificacionEdad
    );


  if (!puedeComprar) {

    this.mensajeEdad.set(
      `Esta película es ${this.pelicula.clasificacionEdad}. ` +
      `No cumplís con la edad mínima requerida para comprar la entrada.`
    );

    return false;

  }


  return true;

}

/*
 * Inicia el tiempo disponible para comprar.
 *
 * Si el usuario ya había comenzado esta misma
 * operación, recuperamos el vencimiento existente
 * en lugar de darle otros 10 minutos.
 */
iniciarTemporizador(): void {

  /*
   * Usamos la función como parte de la clave.
   *
   * Así una operación para la función 25
   * no se mezcla con una operación para la 40.
   */
  const clave =
    `cinebera-expira-funcion-${this.idFuncion}`;


  const vencimientoGuardado =
    sessionStorage.getItem(clave);


  let vencimiento: number;


  if (vencimientoGuardado) {

    /*
     * Ya existía una operación.
     *
     * Recuperamos la fecha de vencimiento.
     */
    vencimiento =
      Number(vencimientoGuardado);

  } else {

    /*
     * Primera vez que entra.
     *
     * Date.now() trabaja en milisegundos.
     *
     * 10 minutos:
     * 10 × 60 × 1000
     */
    vencimiento =
      Date.now() +
      (30 * 1000);


    sessionStorage.setItem(
      clave,
      String(vencimiento)
    );

  }


  /*
   * Actualizamos inmediatamente para que
   * el usuario no tenga que esperar un segundo
   * para ver 10:00.
   */
  this.actualizarTemporizador(
    vencimiento
  );


  /*
   * Cada segundo volvemos a calcular
   * cuánto tiempo queda.
   */
  this.intervaloTemporizador =
    setInterval(() => {

      this.actualizarTemporizador(
        vencimiento
      );

    }, 1000);

}

/*
 * Compara la hora actual contra
 * el vencimiento de la operación.
 */
private actualizarTemporizador(
  vencimiento: number
): void {

  const diferencia =
    vencimiento - Date.now();


  /*
   * Si llegamos a cero,
   * la operación venció.
   */
  if (diferencia <= 0) {

  /*
   * El tiempo disponible para completar
   * la operación terminó.
   */
  this.segundosRestantes.set(0);

  /*
   * Ya no necesitamos seguir ejecutando
   * el setInterval cada segundo.
   */
  this.detenerTemporizador();


  /*
   * Si tenemos un reservaTokenEdicion significa
   * que el usuario llegó desde Checkout y existen
   * butacas temporalmente reservadas en Supabase.
   *
   * En ese caso debemos liberarlas.
   */
  if (this.reservaTokenEdicion) {

    void this.liberarReservaVencida();

  }

  return;
}


  /*
   * Convertimos milisegundos a segundos.
   *
   * Math.ceil evita mostrar 09:59
   * inmediatamente después de comenzar.
   */
  const segundos =
    Math.ceil(
      diferencia / 1000
    );


  this.segundosRestantes.set(
    segundos
  );

}

/*
 * Detiene solamente el setInterval.
 *
 * No modifica el vencimiento guardado.
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
 * Libera la reserva cuando el tiempo termina
 * mientras el usuario está en el mapa de butacas.
 *
 * Este caso ocurre principalmente cuando el usuario
 * volvió desde Checkout para modificar su selección.
 */
private async liberarReservaVencida(): Promise<void> {

  /*
   * Sin token no existe una reserva persistida
   * que podamos identificar.
   */
  if (!this.reservaTokenEdicion) {
    return;
  }


  /*
   * Pedimos al servicio que elimine todas las
   * butacas temporales asociadas a este token.
   */
  const liberada =
    await this.butacaService.liberarReserva(
      this.reservaTokenEdicion
    );


  if (!liberada) {

    console.error(
      'No fue posible liberar la reserva vencida.'
    );

    return;
  }


  /*
   * La reserva dejó de existir en Supabase.
   */
  console.log(
    'Reserva vencida liberada correctamente.'
  );


  /*
   * También eliminamos el vencimiento local.
   *
   * De esta forma una futura operación no reutiliza
   * accidentalmente un temporizador ya vencido.
   */
  const clave =
    `cinebera-expira-funcion-${this.idFuncion}`;

  sessionStorage.removeItem(clave);


  /*
   * El token ya no representa una reserva válida.
   */
  this.reservaTokenEdicion = null;

  /*
 * La reserva ya fue eliminada de Supabase,
 * pero nuestras butacas siguen teniendo localmente
 * el estado "seleccionada".
 *
 * Por eso también debemos limpiar el estado visual
 * que mantiene Angular.
 */
this.filasButacas.update(

  filasActuales =>

    filasActuales.map(

      fila =>

        fila.map(

          butaca => {

            /*
             * Solamente limpiamos las butacas que
             * pertenecían a nuestra selección local.
             *
             * Las ocupadas por otros usuarios no
             * deben modificarse.
             */
            if (butaca.estado === 'seleccionada') {

              return {
                ...butaca,
                estado: 'disponible'
              };

            }

            return butaca;

          }

        )

    )

);


  /*
   * Volvemos a consultar Supabase para que el mapa
   * muestre las butacas recién liberadas.
   */
  await this.cargarButacasOcupadas();

}


/*
 * Inicia una operación completamente nueva
 * para la misma función.
 *
 * NO cerramos la sesión del usuario.
 * Solamente descartamos los datos temporales
 * correspondientes a la compra anterior.
 */
async iniciarNuevaSeleccion(): Promise<void> {

  const clave =
    `cinebera-expira-funcion-${this.idFuncion}`;


  /*
   * Nos aseguramos de no reutilizar
   * un vencimiento anterior.
   */
  sessionStorage.removeItem(clave);


  /*
   * La reserva anterior ya venció,
   * por lo que este token deja de representar
   * la operación actual.
   */
  this.reservaTokenEdicion = null;


  /*
   * Quitamos también ?reserva=... de la URL.
   *
   * Seguimos en la misma función.
   */
  await this.router.navigate(
    [
      '/funcion',
      this.idFuncion,
      'butacas'
    ],
    {
      queryParams: {}
    }
  );


  /*
   * Creamos los nuevos diez minutos.
   */
  this.iniciarTemporizador();

}


/*
 * Abandona el proceso de compra y regresa
 * a la cartelera principal.
 *
 * La sesión del usuario permanece abierta.
 */
async volverACartelera(): Promise<void> {

  const clave =
    `cinebera-expira-funcion-${this.idFuncion}`;

  sessionStorage.removeItem(clave);

  await this.router.navigate([
    '/cartelera'
  ]);

}


}