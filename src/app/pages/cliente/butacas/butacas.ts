import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed
} from '@angular/core';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { NgClass } from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { RealtimeChannel } from '@supabase/supabase-js';

import { Butaca } from '../../../models/butaca';
import { ButacaFuncion } from '../../../models/butaca-funcion';
import { Pelicula } from '../../../models/pelicula';

import { EstadoButaca } from '../../../directives/estado-butaca';

import { FuncionService } from '../../../services/funcion';
import { PeliculaService } from '../../../services/pelicula';
import { ButacaService } from '../../../services/butaca';
import { Usuario } from '../../../services/usuario';
import { Auth } from '../../../services/auth';

import {
  fechaNacimientoValidator
} from '../../../validators/fecha-nacimiento.validator';

import { supabase } from '../../../supabase';


@Component({
  selector: 'app-butacas',

  /*
   * EstadoButaca:
   * directiva propia que modifica visualmente cada asiento.
   *
   * ReactiveFormsModule:
   * necesario para el formulario de edad del usuario anónimo.
   *
   * NgClass:
   * permite mostrar visualmente campos válidos/inválidos.
   */
  imports: [
    EstadoButaca,
    ReactiveFormsModule,
    NgClass
  ],

  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnInit, OnDestroy {


  // =====================================================
  // DATOS GENERALES
  // =====================================================

  /*
   * ID de la función que llega mediante la URL.
   *
   * Ejemplo:
   *
   * /funcion/25/butacas
   *
   * idFuncion = 25
   */
  idFuncion: number = 0;


  /*
   * Si venimos desde Checkout para modificar butacas,
   * recibimos el token mediante query param:
   *
   * ?reserva=TOKEN
   */
  reservaTokenEdicion: string | null = null;


  /*
   * Función y película actualmente seleccionadas.
   */
  funcion: any | null = null;

  pelicula: Pelicula | null = null;


  /*
   * Supabase solamente guarda butacas que tienen
   * un estado persistido: reservada u ocupada.
   */
  butacasOcupadas: ButacaFuncion[] = [];


  /*
   * Recargo aplicado a las butacas VIP.
   *
   * 0.30 = 30%.
   */
  readonly RECARGO_VIP = 0.30;


  // =====================================================
  // MAPA REACTIVO DE BUTACAS
  // =====================================================

  /*
   * Signal que contiene todo el mapa de la sala.
   *
   * Angular actualiza automáticamente la pantalla
   * cuando utilizamos set() o update().
   */
  filasButacas =
    signal<Butaca[][]>([]);


  // =====================================================
  // RESTRICCIÓN DE EDAD
  // =====================================================

  /*
   * Mensaje que mostramos cuando existe
   * algún problema relacionado con la edad.
   */
  mensajeEdad =
    signal<string>('');


  /*
   * Controla si debemos mostrar el formulario
   * de edad para un visitante anónimo.
   */
  mostrarValidacionEdadAnonimo =
    signal<boolean>(false);


  /*
   * Opciones utilizadas por los tres selects.
   *
   * Es el mismo criterio utilizado en Registro.
   */
  dias = Array.from(
    { length: 31 },
    (_, indice) => indice + 1
  );


  meses = [
    { numero: 1, nombre: 'Enero' },
    { numero: 2, nombre: 'Febrero' },
    { numero: 3, nombre: 'Marzo' },
    { numero: 4, nombre: 'Abril' },
    { numero: 5, nombre: 'Mayo' },
    { numero: 6, nombre: 'Junio' },
    { numero: 7, nombre: 'Julio' },
    { numero: 8, nombre: 'Agosto' },
    { numero: 9, nombre: 'Septiembre' },
    { numero: 10, nombre: 'Octubre' },
    { numero: 11, nombre: 'Noviembre' },
    { numero: 12, nombre: 'Diciembre' }
  ];


  anioActual =
    new Date().getFullYear();


  anios = Array.from(
    { length: 100 },
    (_, indice) => this.anioActual - indice
  );


  /*
   * Formulario utilizado únicamente para comprobar
   * la edad del comprador anónimo.
   *
   * No crea un perfil ni registra al usuario.
   */
  edadAnonimoForm = new FormGroup(
    {

      diaNacimiento:
        new FormControl<number | null>(
          null,
          {
            validators: [
              Validators.required
            ]
          }
        ),

      mesNacimiento:
        new FormControl<number | null>(
          null,
          {
            validators: [
              Validators.required
            ]
          }
        ),

      anioNacimiento:
        new FormControl<number | null>(
          null,
          {
            validators: [
              Validators.required
            ]
          }
        )

    },
    {
      /*
       * Este validator analiza día + mes + año juntos.
       *
       * Ejemplo:
       * 31 / febrero / 2000
       *
       * Los números existen individualmente,
       * pero juntos no forman una fecha válida.
       */
      validators: [
        fechaNacimientoValidator
      ]
    }
  );


  // =====================================================
  // TEMPORIZADOR
  // =====================================================

  /*
   * Cantidad de segundos restantes.
   */
  segundosRestantes =
    signal<number>(0);


  /*
   * computed() deriva un valor a partir del Signal
   * segundosRestantes.
   *
   * Ejemplo:
   * 598 → "09:58"
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
   * para poder detenerlo posteriormente.
   */
  private intervaloTemporizador:
    ReturnType<typeof setInterval> | null = null;


  // =====================================================
  // SUPABASE REALTIME
  // =====================================================

  /*
   * Referencia al canal Realtime activo.
   *
   * La utilizamos para eliminar la suscripción
   * cuando abandonamos la pantalla.
   */
  private canalRealtime:
    RealtimeChannel | null = null;


  // =====================================================
  // CONSTRUCTOR / INYECCIÓN DE DEPENDENCIAS
  // =====================================================

  constructor(

    private route: ActivatedRoute,

    private funcionService: FuncionService,

    private peliculaService: PeliculaService,

    private butacaService: ButacaService,

    private router: Router,

    private authService: Auth,

    private usuarioService: Usuario

  ) {}


  // =====================================================
  // INICIALIZACIÓN
  // =====================================================

  ngOnInit(): void {

    /*
     * Leemos el parámetro dinámico de la URL.
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');


    this.idFuncion =
      Number(idRecibido);


    /*
     * Comprobamos si estamos modificando
     * una reserva existente.
     */
    this.reservaTokenEdicion =
      this.route.snapshot
        .queryParamMap
        .get('reserva');


    console.log(
      'Reserva en edición:',
      this.reservaTokenEdicion
    );


    /*
     * Iniciamos el temporizador antes de comenzar
     * la operación de compra.
     */
    this.iniciarTemporizador();


    /*
     * Escuchamos cambios remotos en las butacas.
     */
    this.iniciarRealtime();


    /*
     * Primero generamos el mapa físico.
     */
    this.generarMapaSala();


    /*
     * Después cargamos función y película.
     */
    this.cargarDatosFuncion();


    /*
     * Finalmente aplicamos las ocupaciones
     * existentes en Supabase.
     */
    this.cargarButacasOcupadas();

  }


  // =====================================================
  // DESTRUCCIÓN DEL COMPONENTE
  // =====================================================

  ngOnDestroy(): void {

    /*
     * Detenemos solamente el intervalo.
     *
     * NO eliminamos sessionStorage porque el usuario
     * puede estar navegando hacia Checkout.
     */
    this.detenerTemporizador();


    /*
     * Cerramos la suscripción Realtime.
     */
    if (this.canalRealtime) {

      supabase.removeChannel(
        this.canalRealtime
      );

      this.canalRealtime = null;

    }

  }


  // =====================================================
  // GENERACIÓN DEL MAPA
  // =====================================================

  generarMapaSala(): void {

    /*
     * J representa espacio físico sin butacas.
     *
     * Por eso no aparece en este array.
     */
    const filas = [

      'A', 'B', 'C', 'D', 'E',
      'F', 'G', 'H', 'I',

      'K',

      'L', 'M', 'N', 'Ñ',
      'O', 'P', 'Q',

      'R', 'S', 'T'

    ];


    const mapaSala: Butaca[][] = [];


    for (const fila of filas) {

      const butacasFila: Butaca[] = [];


      /*
       * K:
       * 2 + 10 + 2 = 14 accesibles.
       *
       * Resto:
       * 4 + 20 + 4 = 28.
       */
      const cantidad =
        fila === 'K'
          ? 14
          : 28;


      /*
       * R, S y T son VIP.
       */
      const esVip =
        fila === 'R' ||
        fila === 'S' ||
        fila === 'T';


      for (
        let numero = 1;
        numero <= cantidad;
        numero++
      ) {

        butacasFila.push({

          fila,

          numero,

          tipo:
            fila === 'K'
              ? 'accesible'
              : esVip
                ? 'vip'
                : 'normal',

          /*
           * Todas nacen disponibles.
           *
           * Luego aplicamos la información
           * persistida en Supabase.
           */
          estado: 'disponible'

        });

      }


      mapaSala.push(
        butacasFila
      );

    }


    /*
     * Actualizamos todo el Signal de una vez.
     */
    this.filasButacas.set(
      mapaSala
    );

  }


  // =====================================================
  // DISTRIBUCIÓN VISUAL
  // =====================================================

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


  // =====================================================
  // SELECCIÓN DE BUTACAS
  // =====================================================

  seleccionarButaca(
    butaca: Butaca
  ): void {

    /*
     * Una butaca ocupada por otra operación
     * no puede modificarse.
     */
    if (
      butaca.estado === 'ocupada'
    ) {

      return;

    }


    /*
     * Alternamos:
     *
     * disponible ↔ seleccionada
     */
    const nuevoEstado =
      butaca.estado === 'disponible'
        ? 'seleccionada'
        : 'disponible';


    /*
     * Creamos nuevas referencias para que
     * el Signal notifique correctamente el cambio.
     */
    this.filasButacas.update(

      filasActuales =>

        filasActuales.map(

          fila =>

            fila.map(

              asiento => {

                if (
                  asiento.fila === butaca.fila &&
                  asiento.numero === butaca.numero
                ) {

                  return {

                    ...asiento,

                    estado: nuevoEstado

                  };

                }


                return asiento;

              }

            )

        )

    );

  }


  /*
   * Convierte Butaca[][] en Butaca[]
   * y conserva únicamente las seleccionadas.
   */
  obtenerButacasSeleccionadas(): Butaca[] {

    return this.filasButacas()
      .flat()
      .filter(
        butaca =>
          butaca.estado === 'seleccionada'
      );

  }


  // =====================================================
  // CONTINUAR COMPRA
  // =====================================================

  async continuarCompra(): Promise<void> {

    /*
     * Primera barrera:
     * una operación vencida no puede continuar.
     */
    if (
      this.segundosRestantes() <= 0
    ) {

      console.error(
        'El tiempo para completar la compra finalizó.'
      );

      return;

    }


    /*
     * Validamos edad ANTES de reservar.
     *
     * Así una persona que no cumple la restricción
     * no bloquea butacas innecesariamente.
     */
    const edadValida =
      await this.validarRestriccionEdad();


    if (!edadValida) {

      return;

    }


    const seleccionadas =
      this.obtenerButacasSeleccionadas();


    /*
     * Debe existir al menos una butaca.
     */
    if (
      seleccionadas.length === 0
    ) {

      console.log(
        'Debe seleccionar al menos una butaca.'
      );

      return;

    }


    /*
     * Recuperamos el mismo vencimiento que nació
     * al entrar al mapa.
     */
    const claveVencimiento =
      `cinebera-expira-funcion-${this.idFuncion}`;


    const vencimientoGuardado =
      sessionStorage.getItem(
        claveVencimiento
      );


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
     * El token puede provenir de una reserva
     * existente o de una reserva nueva.
     */
    let reservaToken: string | null;


    // -----------------------------------------------------
    // EDITAR RESERVA EXISTENTE
    // -----------------------------------------------------

    if (this.reservaTokenEdicion) {

      const actualizacionExitosa =
        await this.butacaService.actualizarReserva(

          this.reservaTokenEdicion,

          this.idFuncion,

          seleccionadas,

          vencimientoOperacion

        );


      if (!actualizacionExitosa) {

        console.error(
          'No fue posible actualizar la reserva.'
        );

        await this.cargarButacasOcupadas();

        return;

      }


      /*
       * Conservamos el mismo token.
       */
      reservaToken =
        this.reservaTokenEdicion;

    }


    // -----------------------------------------------------
    // CREAR RESERVA NUEVA
    // -----------------------------------------------------

    else {

      reservaToken =
        await this.butacaService.reservarButacas(

          this.idFuncion,

          seleccionadas,

          vencimientoOperacion

        );

    }


    /*
     * Si Supabase no pudo crear/actualizar
     * la reserva, detenemos el proceso.
     */
    if (!reservaToken) {

      console.error(
        'No fue posible reservar las butacas.'
      );

      await this.cargarButacasOcupadas();

      return;

    }


    console.log(
      'Reserva creada:',
      reservaToken
    );


    /*
     * Navegamos al checkout utilizando
     * el token como parámetro dinámico.
     */
    await this.router.navigate([

      '/checkout',

      reservaToken

    ]);

  }


  // =====================================================
  // FUNCIÓN Y PELÍCULA
  // =====================================================

  async cargarDatosFuncion(): Promise<void> {

    this.funcion =
      await this.funcionService
        .obtenerFuncionPorId(
          this.idFuncion
        );


    if (!this.funcion) {

      return;

    }


    this.pelicula =
      await this.peliculaService
        .obtenerPeliculaPorId(
          this.funcion.pelicula_id
        );

  }


  // =====================================================
  // PREVENTA Y PRECIOS
  // =====================================================

  estaEnPreventa(): boolean {

    if (!this.pelicula) {

      return false;

    }


    const fechaEstreno =
      new Date(
        `${this.pelicula.fechaEstreno}T00:00:00`
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


  obtenerPrecioBase(): number {

    if (!this.pelicula) {

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


  obtenerPrecioButaca(
    butaca: Butaca
  ): number {

    const precioBase =
      this.obtenerPrecioBase();


    /*
     * Las VIP tienen 30% de recargo.
     */
    if (
      butaca.tipo === 'vip'
    ) {

      return precioBase *
        (1 + this.RECARGO_VIP);

    }


    return precioBase;

  }


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


  // =====================================================
  // OCUPACIÓN DESDE SUPABASE
  // =====================================================

  async cargarButacasOcupadas(): Promise<void> {

    this.butacasOcupadas =
      await this.butacaService
        .obtenerButacasOcupadas(
          this.idFuncion
        );


    console.log(
      'BUTACAS RECIBIDAS DE SUPABASE:',
      this.butacasOcupadas
    );


    this.aplicarButacasOcupadas();

  }


  /*
   * Aplica los registros persistidos en Supabase
   * sobre nuestro mapa físico generado en Angular.
   */
  aplicarButacasOcupadas(): void {

    this.filasButacas.update(

      filasActuales =>

        filasActuales.map(

          fila =>

            fila.map(

              butaca => {

                /*
                 * Buscamos el registro persistido
                 * correspondiente a esta posición.
                 */
                const registro =
                  this.butacasOcupadas.find(

                    ocupada =>
                      ocupada.fila === butaca.fila &&
                      ocupada.numero === butaca.numero

                  );


                /*
                 * Sin registro → disponible.
                 */
                if (!registro) {

                  return {

                    ...butaca,

                    estado: 'disponible'

                  };

                }


                /*
                 * Si pertenece a la reserva que estamos
                 * editando, debe aparecer seleccionada.
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
                 * Cualquier otra reserva o compra
                 * aparece bloqueada.
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


  // =====================================================
  // SUPABASE REALTIME
  // =====================================================

  iniciarRealtime(): void {

    this.canalRealtime =
      this.butacaService
        .suscribirseACambiosButacas(

          this.idFuncion,

          async () => {

            console.log(
              'Cambio Realtime detectado en butacas'
            );


            /*
             * Ante un cambio remoto volvemos a consultar
             * el estado real de Supabase.
             */
            await this.cargarButacasOcupadas();

          }

        );

  }


  // =====================================================
  // VALIDACIÓN DE EDAD
  // =====================================================

  async validarRestriccionEdad(): Promise<boolean> {

    /*
     * Sin película todavía no podemos conocer
     * su clasificación.
     */
    if (!this.pelicula) {

      return false;

    }


    /*
     * ATP no tiene edad mínima.
     *
     * No necesitamos preguntar fecha de nacimiento.
     */
    if (
      this.pelicula.clasificacionEdad === 'ATP'
    ) {

      this.mensajeEdad.set('');

      this.mostrarValidacionEdadAnonimo.set(false);

      return true;

    }


    /*
     * Averiguamos si existe una sesión.
     */
    const sesion =
      await this.authService.obtenerSesion();


    // -----------------------------------------------------
    // USUARIO ANÓNIMO
    // -----------------------------------------------------

    if (!sesion?.user?.id) {

      /*
       * Si todavía no tenemos una fecha válida,
       * mostramos el formulario.
       */
      if (
        this.edadAnonimoForm.invalid
      ) {

        this.mostrarValidacionEdadAnonimo.set(
          true
        );


        /*
         * Permite que Angular muestre visualmente
         * los errores de los controles.
         */
        this.edadAnonimoForm.markAllAsTouched();


        this.mensajeEdad.set(
          `Esta película es ${this.pelicula.clasificacionEdad}. ` +
          `Ingresá una fecha de nacimiento válida para continuar.`
        );


        return false;

      }


      /*
       * Como el formulario es válido y los controles
       * son required, sabemos que existen valores.
       */
      const dia =
        this.edadAnonimoForm
          .controls
          .diaNacimiento
          .value!;


      const mes =
        this.edadAnonimoForm
          .controls
          .mesNacimiento
          .value!;


      const anio =
        this.edadAnonimoForm
          .controls
          .anioNacimiento
          .value!;


      /*
       * Convertimos los tres controles al formato
       * utilizado por calcularEdad():
       *
       * YYYY-MM-DD
       */
      const fechaNacimiento =
        `${anio}-` +
        `${String(mes).padStart(2, '0')}-` +
        `${String(dia).padStart(2, '0')}`;


      const edad =
        this.usuarioService.calcularEdad(
          fechaNacimiento
        );


      const puedeComprar =
        this.usuarioService.cumpleRestriccionEdad(

          edad,

          this.pelicula.clasificacionEdad

        );


      if (!puedeComprar) {

        this.mostrarValidacionEdadAnonimo.set(
          true
        );


        this.mensajeEdad.set(
          `Esta película es ${this.pelicula.clasificacionEdad}. ` +
          `No cumplís con la edad mínima requerida para comprar la entrada.`
        );


        return false;

      }


      /*
       * Anónimo + fecha válida + edad suficiente.
       */
      this.mostrarValidacionEdadAnonimo.set(
        false
      );

      this.mensajeEdad.set('');


      return true;

    }


    // -----------------------------------------------------
    // USUARIO REGISTRADO
    // -----------------------------------------------------

    /*
     * Para un usuario registrado NO preguntamos
     * nuevamente la fecha.
     *
     * Utilizamos la que ya existe en su perfil.
     */
    const respuestaPerfil =
      await this.usuarioService.obtenerPerfil(
        sesion.user.id
      );


    /*
     * obtenerPerfil() devuelve la respuesta completa
     * de Supabase, por eso accedemos a data.
     */
    const perfil =
      respuestaPerfil.data;


    if (!perfil?.fecha_nacimiento) {

      this.mensajeEdad.set(
        'No pudimos verificar tu edad.'
      );

      return false;

    }


    const edad =
      this.usuarioService.calcularEdad(
        perfil.fecha_nacimiento
      );


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


    this.mensajeEdad.set('');


    return true;

  }


  // =====================================================
  // TEMPORIZADOR DE COMPRA
  // =====================================================

  iniciarTemporizador(): void {

    /*
     * Evitamos dejar dos intervalos funcionando
     * si este método se ejecuta nuevamente.
     */
    this.detenerTemporizador();


    const clave =
      `cinebera-expira-funcion-${this.idFuncion}`;


    const vencimientoGuardado =
      sessionStorage.getItem(
        clave
      );


    let vencimiento: number;


    if (vencimientoGuardado) {

      /*
       * Ya existe una operación.
       *
       * Recuperamos SU vencimiento en lugar
       * de otorgar otros diez minutos.
       */
      vencimiento =
        Number(
          vencimientoGuardado
        );

    } else {

      /*
       * Nueva operación.
       *
       * 10 minutos:
       *
       * 10 × 60 × 1000 milisegundos.
       */
      vencimiento =
        Date.now() +
        (10 * 60 * 1000);


      sessionStorage.setItem(

        clave,

        String(vencimiento)

      );

    }


    /*
     * Actualizamos inmediatamente.
     */
    this.actualizarTemporizador(
      vencimiento
    );


    /*
     * Después actualizamos cada segundo.
     */
    this.intervaloTemporizador =
      setInterval(
        () => {

          this.actualizarTemporizador(
            vencimiento
          );

        },
        1000
      );

  }


  private actualizarTemporizador(
    vencimiento: number
  ): void {

    const diferencia =
      vencimiento - Date.now();


    if (
      diferencia <= 0
    ) {

      this.segundosRestantes.set(0);

      this.detenerTemporizador();


      /*
       * Si veníamos editando una reserva,
       * debemos liberar esas butacas.
       */
      if (
        this.reservaTokenEdicion
      ) {

        void this.liberarReservaVencida();

      }


      return;

    }


    const segundos =
      Math.ceil(
        diferencia / 1000
      );


    this.segundosRestantes.set(
      segundos
    );

  }


  /*
   * Detiene el reloj local pero conserva
   * el vencimiento en sessionStorage.
   */
  private detenerTemporizador(): void {

    if (
      this.intervaloTemporizador
    ) {

      clearInterval(
        this.intervaloTemporizador
      );


      this.intervaloTemporizador = null;

    }

  }


  // =====================================================
  // RESERVA VENCIDA
  // =====================================================

  private async liberarReservaVencida(): Promise<void> {

    if (
      !this.reservaTokenEdicion
    ) {

      return;

    }


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


    console.log(
      'Reserva vencida liberada correctamente.'
    );


    /*
     * Eliminamos también el temporizador local.
     */
    const clave =
      `cinebera-expira-funcion-${this.idFuncion}`;


    sessionStorage.removeItem(
      clave
    );


    /*
     * El token dejó de representar
     * una reserva válida.
     */
    this.reservaTokenEdicion = null;


    /*
     * Limpiamos visualmente las butacas
     * seleccionadas de nuestra operación.
     */
    this.filasButacas.update(

      filasActuales =>

        filasActuales.map(

          fila =>

            fila.map(

              butaca => {

                if (
                  butaca.estado === 'seleccionada'
                ) {

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
     * Finalmente sincronizamos nuevamente
     * con Supabase.
     */
    await this.cargarButacasOcupadas();

  }


  // =====================================================
  // NUEVA SELECCIÓN
  // =====================================================

  async iniciarNuevaSeleccion(): Promise<void> {

    const clave =
      `cinebera-expira-funcion-${this.idFuncion}`;


    /*
     * Eliminamos el vencimiento anterior.
     */
    sessionStorage.removeItem(
      clave
    );


    this.reservaTokenEdicion = null;


    /*
     * Limpiamos también la validación temporal
     * del comprador anónimo.
     *
     * Una nueva operación debe comenzar limpia.
     */
    this.edadAnonimoForm.reset();

    this.mostrarValidacionEdadAnonimo.set(
      false
    );

    this.mensajeEdad.set('');


    /*
     * Quitamos ?reserva=TOKEN de la URL.
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
     * Creamos un nuevo período de diez minutos.
     */
    this.iniciarTemporizador();

  }


  // =====================================================
  // VOLVER A CARTELERA
  // =====================================================

  async volverACartelera(): Promise<void> {

    const clave =
      `cinebera-expira-funcion-${this.idFuncion}`;


    sessionStorage.removeItem(
      clave
    );


    await this.router.navigate([
      '/cartelera'
    ]);

  }

}