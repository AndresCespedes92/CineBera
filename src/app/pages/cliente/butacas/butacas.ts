import {
  Component,
  OnInit,
  OnDestroy,
  signal
} from '@angular/core';

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


    /*
     * paramMap devuelve texto.
     *
     * Lo convertimos a number porque nuestros
     * IDs de funciones son numéricos.
     */
    this.idFuncion =
      Number(idRecibido);

    /*
    * Una vez que conocemos qué función estamos
    * visualizando, podemos escuchar sus cambios.
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
   * Obtenemos solamente las butacas que
   * el usuario seleccionó en la pantalla.
   */
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
   * Intentamos crear la reserva temporal.
   *
   * Si funciona:
   * devuelve un UUID.
   *
   * Si falla:
   * devuelve null.
   */
  const reservaToken =
    await this.butacaService.reservarButacas(
      this.idFuncion,
      seleccionadas
    );


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
   * Compara el mapa físico generado
   * con los registros de Supabase.
   *
   * Si coinciden:
   *
   * fila + número
   *
   * marcamos esa butaca como ocupada.
   */
  aplicarButacasOcupadas(): void {


    /*
     * Utilizamos update() porque queremos
     * modificar el valor ACTUAL del Signal.
     */
    this.filasButacas.update(

      filasActuales =>

        filasActuales.map(

          fila =>

            fila.map(

              butaca => {


                /*
                 * some() devuelve true cuando
                 * encuentra al menos un registro
                 * que cumple la condición.
                 *
                 * Ejemplo:
                 *
                 * función 25
                 * fila A
                 * número 7
                 */
                const estaOcupada =
                  this.butacasOcupadas.some(

                    registro =>

                      registro.fila ===
                        butaca.fila &&

                      registro.numero ===
                        butaca.numero

                  );


                /*
                 * Si Supabase informa que esta
                 * butaca está ocupada, generamos
                 * un nuevo objeto con ese estado.
                 */
                if (
                  estaOcupada
                ) {

                  return {

                    ...butaca,

                    estado: 'ocupada' as const

                  };

                }


                /*
                 * Si no está ocupada,
                 * no modificamos la butaca.
                 */
                return butaca;

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

}