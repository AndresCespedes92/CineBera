/*
 * Componente externo encargado de transformar
 * un texto en un código QR visual.
 */
import { QRCodeComponent } from 'angularx-qrcode';


import {
  Component,
  OnInit,
  signal
} from '@angular/core';


/*
 * ActivatedRoute nos permite leer información
 * que llega mediante la URL.
 */
import { ActivatedRoute } from '@angular/router';


/*
 * Modelo principal de la entrada.
 */
import {
  Entrada as EntradaModel
} from '../../../models/entrada';


/*
 * Services utilizados por esta pantalla.
 *
 * Cada Service tiene una responsabilidad específica
 * y se ocupa de comunicarse con los datos
 * correspondientes.
 */
import {
  EntradaService
} from '../../../services/entrada';

import {
  CompraService
} from '../../../services/compra';

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
  ButacaService
} from '../../../services/butaca';


@Component({
  selector: 'app-entrada',

  /*
   * Este componente es standalone, por lo tanto
   * declara directamente qué otros componentes
   * necesita utilizar.
   */
  standalone: true,

  /*
   * QRCodeComponent permite utilizar:
   *
   * <qrcode></qrcode>
   *
   * dentro del HTML.
   */
  imports: [
    QRCodeComponent
  ],

  templateUrl: './entrada.html',
  styleUrl: './entrada.css'
})
export class Entrada implements OnInit {


  /*
   * =====================================================
   * ESTADO DE LA PANTALLA
   * =====================================================
   */


  /*
   * Entrada que estamos mostrando.
   *
   * Comienza en null porque al crear el componente
   * todavía no consultamos Supabase.
   */
  entrada =
    signal<EntradaModel | null>(null);


  /*
   * Compra que originó la entrada.
   *
   * Por ahora usamos any porque primero estamos
   * verificando las estructuras reales que devuelven
   * nuestros Services.
   *
   * Más adelante podemos reemplazar any por
   * interfaces específicas.
   */
  compra =
    signal<any | null>(null);


  /*
   * Función correspondiente a la compra.
   */
  funcion =
    signal<any | null>(null);


  /*
   * Película proyectada en esa función.
   */
  pelicula =
    signal<any | null>(null);


  /*
   * Sala donde se realiza la función.
   */
  sala =
    signal<any | null>(null);


  /*
   * Una compra puede tener varias butacas,
   * por eso utilizamos un array.
   */
  butacas =
    signal<any[]>([]);


  /*
   * Nos permite distinguir:
   *
   * "todavía estoy cargando"
   *
   * de:
   *
   * "terminé de cargar pero no encontré entrada".
   */
  cargando =
    signal<boolean>(true);



  /*
   * =====================================================
   * INYECCIÓN DE DEPENDENCIAS
   * =====================================================
   *
   * Angular crea el componente y nos entrega
   * automáticamente las instancias de los Services
   * que necesitamos.
   */
  constructor(

    /*
     * Permite leer el :codigo de la URL.
     */
    private route: ActivatedRoute,

    /*
     * Services encargados de obtener
     * cada parte de la información.
     */
    private entradaService: EntradaService,
    private compraService: CompraService,
    private funcionService: FuncionService,
    private peliculaService: PeliculaService,
    private salaService: SalaService,
    private butacaService: ButacaService

  ) {}



  /*
   * =====================================================
   * INICIALIZACIÓN
   * =====================================================
   *
   * ngOnInit se ejecuta cuando Angular crea
   * esta pantalla.
   */
  async ngOnInit(): Promise<void> {


    /*
     * ===================================================
     * PASO 0 - LEER EL CÓDIGO DE LA URL
     * ===================================================
     *
     * Nuestra ruta tiene una estructura similar a:
     *
     * /entrada/:codigo
     *
     * Ejemplo:
     *
     * /entrada/9619ec72-...
     */
    const codigo =
      this.route.snapshot.paramMap.get(
        'codigo'
      );


    /*
     * Sin código no podemos identificar
     * qué entrada debemos buscar.
     */
    if (!codigo) {

      this.cargando.set(false);

      return;

    }



    /*
     * ===================================================
     * PASO 1 - OBTENER LA ENTRADA
     * ===================================================
     */
    const entradaEncontrada =
      await this.entradaService
        .obtenerEntradaPorCodigo(
          codigo
        );


    /*
     * Guardamos el resultado en nuestro Signal.
     *
     * Cuando cambia un Signal, Angular puede
     * actualizar automáticamente el HTML
     * que depende de él.
     */
    this.entrada.set(
      entradaEncontrada
    );


    /*
     * Si no existe la entrada,
     * no tiene sentido continuar.
     */
    if (!entradaEncontrada) {

      this.cargando.set(false);

      return;

    }



    /*
     * ===================================================
     * PASO 2 - OBTENER LA COMPRA
     * ===================================================
     *
     * La entrada contiene:
     *
     * compra_id
     *
     * Eso nos permite encontrar la compra
     * que generó esta entrada.
     *
     * Entrada
     *    ↓
     * compra_id
     *    ↓
     * Compra
     */
    const compraEncontrada =
      await this.compraService
        .obtenerCompraPorId(
          entradaEncontrada.compra_id
        );


    /*
     * Guardamos también la compra
     * en un Signal.
     */
    this.compra.set(
      compraEncontrada
    );


    console.log(
      'COMPRA DE LA ENTRADA:',
      compraEncontrada
    );


    /*
     * Sin compra tampoco podemos saber
     * qué función debemos buscar.
     */
    if (!compraEncontrada) {

      this.cargando.set(false);

      return;

    }



    /*
     * ===================================================
     * PASO 3 - OBTENER LA FUNCIÓN
     * ===================================================
     *
     * La compra contiene:
     *
     * funcion_id
     *
     * Entonces ahora tenemos:
     *
     * Entrada
     *    ↓
     * Compra
     *    ↓
     * funcion_id
     *    ↓
     * Función
     */
    const funcionEncontrada =
      await this.funcionService
        .obtenerFuncionPorId(
          compraEncontrada.funcion_id
        );


    this.funcion.set(
      funcionEncontrada
    );


    console.log(
      'FUNCIÓN DE LA ENTRADA:',
      funcionEncontrada
    );


    /*
     * Necesitamos la función para poder conocer
     * la película y la sala.
     */
    if (!funcionEncontrada) {

      this.cargando.set(false);

      return;

    }



    /*
     * ===================================================
     * PASO 4 - OBTENER LA PELÍCULA
     * ===================================================
     *
     * La función contiene pelicula_id.
     */
    const peliculaEncontrada =
      await this.peliculaService
        .obtenerPeliculaPorId(
          funcionEncontrada.pelicula_id
        );


    this.pelicula.set(
      peliculaEncontrada
    );



    /*
     * ===================================================
     * PASO 5 - OBTENER LA SALA
     * ===================================================
     *
     * La función contiene sala_id.
     */
    const salaEncontrada =
      await this.salaService
        .obtenerSalaPorId(
          funcionEncontrada.sala_id
        );


    this.sala.set(
      salaEncontrada
    );



    /*
     * ===================================================
     * PASO 6 - OBTENER LAS BUTACAS
     * ===================================================
     *
     * La compra conserva reserva_token.
     *
     * Ese mismo token quedó asociado a las butacas
     * utilizadas durante la operación.
     *
     * IMPORTANTE:
     *
     * después del pago las butacas ya no están:
     *
     * reservada
     *
     * sino:
     *
     * ocupada
     *
     * Por eso obtenerButacasPorToken()
     * no debe filtrar solamente por "reservada".
     */
    const butacasEncontradas =
      await this.butacaService
        .obtenerButacasPorToken(
          compraEncontrada.reserva_token
        );


    this.butacas.set(
      butacasEncontradas
    );



    /*
     * ===================================================
     * LOGS TEMPORALES DE DESARROLLO
     * ===================================================
     *
     * Estos logs nos permiten verificar la estructura
     * real de los datos antes de construir el HTML.
     *
     * Después podemos eliminarlos.
     */
    console.log(
      'PELÍCULA DE LA ENTRADA:',
      peliculaEncontrada
    );


    console.log(
      'SALA DE LA ENTRADA:',
      salaEncontrada
    );


    console.log(
      'BUTACAS DE LA ENTRADA:',
      butacasEncontradas
    );



    /*
     * ===================================================
     * FIN DE LA CARGA
     * ===================================================
     *
     * Llegamos acá después de intentar recuperar:
     *
     * Entrada
     * Compra
     * Función
     * Película
     * Sala
     * Butacas
     */
    this.cargando.set(false);

  }

}