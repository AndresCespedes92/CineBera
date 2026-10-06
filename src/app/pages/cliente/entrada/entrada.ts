import { IconoCine } from '../../../components/icono-cine/icono-cine';
import { MatButtonModule } from '@angular/material/button';
import { PasosCompra } from '../../../components/pasos-compra/pasos-compra';
/*
 * Componente externo encargado de transformar
 * un texto en un código QR visual.
 */
import { QRCodeComponent } from 'angularx-qrcode';


/*
 * jsPDF permite generar archivos PDF
 * directamente desde TypeScript.
 */
import { jsPDF } from 'jspdf';

import { DatePipe } from '@angular/common';
import { HoraCortaPipe } from '../../../pipes/hora-corta';


import {
  Component,
  OnInit,
  signal
} from '@angular/core';


/*
 * ActivatedRoute nos permite leer información
 * que llega mediante la URL.
 */
import { ActivatedRoute, RouterLink } from '@angular/router';


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

import {
  Router
} from '@angular/router';


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
  imports: [IconoCine, MatButtonModule, RouterLink, PasosCompra,
    QRCodeComponent,
    DatePipe,
    HoraCortaPipe
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
    private butacaService: ButacaService,
    private router: Router


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

  /*
 * =====================================================
 * DESCARGAR ENTRADA EN PDF
 * =====================================================
 *
 * Genera una representación descargable de la entrada
 * utilizando los mismos datos que ya cargamos
 * para mostrar la pantalla.
 *
 * No volvemos a consultar Supabase.
 */
descargarPDF(): void {
  if(this.compra()?.estado !== 'pagada') return;

  /*
   * Leemos el valor actual de nuestros Signals.
   */
  const entradaActual =
    this.entrada();

  const compraActual =
    this.compra();

  const funcionActual =
    this.funcion();

  const peliculaActual =
    this.pelicula();

  const salaActual =
    this.sala();

  const butacasActuales =
    this.butacas();


  /*
   * Si falta información fundamental,
   * no intentamos generar un PDF incompleto.
   */
  if (
    !entradaActual ||
    !compraActual ||
    !funcionActual ||
    !peliculaActual ||
    !salaActual
  ) {

    console.error(
      'No hay información suficiente para generar el PDF.'
    );

    return;
  }


  /*
   * Creamos un nuevo documento PDF.
   *
   * Por defecto jsPDF utiliza una hoja A4.
   */
  const pdf =
    new jsPDF();


  /*
   * ===================================================
   * ENCABEZADO
   * ===================================================
   */

  pdf.setFontSize(22);

  pdf.text(
    'CineBera',
    20,
    20
  );


  pdf.setFontSize(12);

  pdf.text(
    'Entrada digital',
    20,
    28
  );


  /*
   * Línea separadora.
   *
   * line(x1, y1, x2, y2)
   */
  pdf.line(
    20,
    33,
    190,
    33
  );


  /*
   * ===================================================
   * PELÍCULA
   * ===================================================
   */

  pdf.setFontSize(18);

  pdf.text(
    peliculaActual.titulo,
    20,
    45
  );


  pdf.setFontSize(11);

  pdf.text(
    `Clasificacion: ${peliculaActual.clasificacionEdad}`,
    20,
    53
  );


  /*
   * ===================================================
   * DATOS DE LA FUNCIÓN
   * ===================================================
   */

  pdf.setFontSize(12);


  /*
   * La fecha almacenada viene como:
   *
   * 2026-09-27
   *
   * Para el PDF la convertimos manualmente
   * a:
   *
   * 27/09/2026
   */
  const partesFecha =
    funcionActual.fecha.split('-');

  const fechaFormateada =
    `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;


  /*
   * La hora viene como:
   *
   * 17:30:00
   *
   * El pipe horaCorta produce:
   *
   * 17:30
   */
  const horaFormateada =
    new HoraCortaPipe().transform(funcionActual.hora);


  pdf.text(
    `Fecha: ${fechaFormateada}`,
    20,
    67
  );


  pdf.text(
    `Hora: ${horaFormateada}`,
    20,
    75
  );


  pdf.text(
    `Formato: ${funcionActual.formato}`,
    20,
    83
  );


  pdf.text(
    `Idioma: ${funcionActual.idioma}`,
    20,
    91
  );


  pdf.text(
    `Sala: ${salaActual.nombre}`,
    20,
    99
  );


  /*
   * ===================================================
   * BUTACAS
   * ===================================================
   *
   * map() transforma cada objeto ButacaFuncion
   * en un texto como:
   *
   * H6
   *
   * join() une esos textos:
   *
   * H6 - H7
   */
  const textoButacas =
    butacasActuales
      .map(
        butaca =>
          `${butaca.fila}${butaca.numero}`
      )
      .join(' - ');


  pdf.text(
    `Butacas: ${textoButacas}`,
    20,
    107
  );


  /*
   * ===================================================
   * RESTRICCIÓN DE EDAD
   * ===================================================
   */

  let posicionQR = 128;


  if (
    peliculaActual.clasificacionEdad === '+13'
  ) {

    pdf.setFontSize(11);

    pdf.text(
      'IMPORTANTE - Clasificacion +13',
      20,
      119
    );

    pdf.text(
      'Menores de 13 anos deben asistir acompanados por una persona adulta.',
      20,
      126
    );

    posicionQR = 143;

  }


  if (
    peliculaActual.clasificacionEdad === '+18'
  ) {

    pdf.setFontSize(11);

    pdf.text(
      'IMPORTANTE - Clasificacion +18',
      20,
      119
    );

    pdf.text(
      'Menores de 18 anos deben asistir acompanados por una persona adulta.',
      20,
      126
    );

    posicionQR = 143;

  }


  /*
   * ===================================================
   * QR
   * ===================================================
   *
   * El QR que vemos en pantalla está renderizado
   * por angularx-qrcode.
   *
   * Para esta primera versión del PDF reutilizamos
   * ese QR ya generado en el DOM.
   */
  const qrCanvas =
    document.querySelector(
      'qrcode canvas'
    ) as HTMLCanvasElement | null;


  if (qrCanvas) {

    /*
     * Convertimos el canvas en una imagen PNG
     * representada como Data URL.
     */
    const imagenQR =
      qrCanvas.toDataURL(
        'image/png'
      );


    /*
     * Agregamos la imagen al PDF.
     *
     * addImage(
     *   imagen,
     *   formato,
     *   x,
     *   y,
     *   ancho,
     *   alto
     * )
     */
    pdf.addImage(
      imagenQR,
      'PNG',
      75,
      posicionQR,
      60,
      60
    );

  }


  /*
   * ===================================================
   * CÓDIGO MANUAL
   * ===================================================
   */

  pdf.setFontSize(11);


  pdf.text(
    `Codigo manual: ${entradaActual.codigo_manual}`,
    20,
    posicionQR + 72
  );


  pdf.text(
    entradaActual.utilizada
      ? 'Estado: UTILIZADA'
      : 'Estado: VALIDA',
    20,
    posicionQR + 80
  );


  /*
   * ===================================================
   * DESCARGA
   * ===================================================
   *
   * Creamos un nombre reconocible.
   *
   * Ejemplo:
   *
   * CineBera-Interstellar-E9A2AA32.pdf
   */
  const nombreArchivo =
    `CineBera-${peliculaActual.titulo}-${entradaActual.codigo_manual}.pdf`;


  /*
   * save() hace que el navegador descargue
   * el documento generado.
   */
  pdf.save(
    nombreArchivo
  );

}

}
