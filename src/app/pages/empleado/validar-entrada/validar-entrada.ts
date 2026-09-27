/*
 * Componente de ZXing encargado de acceder
 * a la cámara y reconocer códigos QR.
 */
import { ZXingScannerModule } from '@zxing/ngx-scanner';

import {
  Component,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { EntradaService } from '../../../services/entrada';
import { Entrada } from '../../../models/entrada';

import {
  CandyService
} from '../../../services/candy';

import {
  PedidoCandy
} from '../../../models/pedido-candy';


@Component({
  selector: 'app-validar-entrada',
  standalone: true,

  /*
   * FormsModule nos permite utilizar [(ngModel)]
   * en el input del código manual.
   */
  imports: [
    FormsModule,

    /*
     * Nos permite utilizar <zxing-scanner>
     * dentro del HTML.
     */
    ZXingScannerModule
  ],

  templateUrl: './validar-entrada.html',
  styleUrl: './validar-entrada.css'
})
export class ValidarEntrada {

  


  /*
   * Guarda lo que escribe el empleado.
   *
   * Ejemplo:
   * A7K3P9XZ
   */
  codigoManual = '';


  /*
   * Entrada encontrada en Supabase.
   *
   * null significa que todavía no tenemos
   * una entrada seleccionada.
   */
  entrada = signal<Entrada | null>(null);

  /*
 * Pedido Candy asociado a la misma compra
 * que originó la entrada.
 *
 * null puede significar:
 *
 * - todavía no buscamos Candy
 * - la compra no tiene pedido Candy
 */
pedidoCandy =
  signal<PedidoCandy | null>(null);


  /*
   * Mensaje que mostraremos en pantalla.
   *
   * Por ahora usamos un Signal sencillo.
   * Más adelante podremos reemplazarlo por
   * nuestro componente reutilizable de mensajes.
   */
  mensaje = signal<string>('');


  /*
   * Nos permitirá mostrar un estado de carga
   * mientras esperamos a Supabase.
   */
  procesando = signal<boolean>(false);

  /*
 * Controla si la cámara debe seguir escaneando.
 *
 * Cuando detectamos un QR la pausamos para evitar
 * procesar el mismo código muchas veces seguidas.
 */
scannerActivo = signal<boolean>(true);


 constructor(
  private entradaService: EntradaService,

  /*
   * Angular crea/injecta el servicio.
   *
   * Lo utilizaremos para consultar el pedido
   * Candy asociado a la compra de la entrada.
   */
  private candyService: CandyService
) {}

/*
 * Busca el pedido Candy asociado a una entrada.
 *
 * Tanto la búsqueda manual como el QR terminan
 * obteniendo un objeto Entrada.
 *
 * Por eso centralizamos acá la lógica de Candy
 * en lugar de repetirla en ambos caminos.
 */
async cargarCandyDeEntrada(
  entradaEncontrada: Entrada
): Promise<void> {

  /*
   * Limpiamos cualquier pedido anterior.
   *
   * Esto evita mostrar accidentalmente
   * el Candy de la entrada previamente escaneada.
   */
  this.pedidoCandy.set(null);


  /*
   * La entrada conoce la compra que la originó:
   *
   * entrada.compra_id
   *
   * Usamos ese ID para buscar el pedido Candy.
   */
  const pedido =
    await this.candyService
      .obtenerPedidoPorCompra(
        entradaEncontrada.compra_id
      );


  /*
   * pedido puede ser:
   *
   * PedidoCandy → compró Candy.
   * null        → no compró Candy.
   */
  this.pedidoCandy.set(pedido);

}


  /*
   * Busca una entrada utilizando el
   * código manual ingresado por el empleado.
   */
  async buscarEntrada(): Promise<void> {

    /*
     * Eliminamos espacios accidentales.
     *
     * Por ejemplo:
     * " A7K3P9XZ " → "A7K3P9XZ"
     */
    const codigo =
      this.codigoManual.trim();


    if (!codigo) {

      this.mensaje.set(
        'Ingresá un código de entrada.'
      );

      return;

    }


    this.procesando.set(true);
    this.mensaje.set('');
    this.entrada.set(null);


    const entradaEncontrada =
      await this.entradaService
        .obtenerEntradaPorCodigoManual(codigo);


    this.procesando.set(false);


    /*
     * El código no corresponde a ninguna entrada.
     */
    if (!entradaEncontrada) {

      this.mensaje.set(
        'Entrada no encontrada.'
      );

      return;

    }


    /*
     * Guardamos la entrada encontrada.
     */
    this.entrada.set(
      entradaEncontrada
    );

    /*
 * Además de mostrar la entrada,
 * buscamos si su compra tiene Candy.
 */
await this.cargarCandyDeEntrada(
  entradaEncontrada
);


    /*
     * Si ya fue utilizada, NO permitimos
     * volver a validarla.
     */
    if (entradaEncontrada.utilizada) {

      this.mensaje.set(
        'Esta entrada ya fue utilizada.'
      );

      return;

    }


    this.mensaje.set(
      'Entrada válida. Puede ser utilizada.'
    );

  }


  /*
   * Confirma el ingreso del cliente.
   *
   * Este método solamente se ejecutará
   * después de haber encontrado una entrada.
   */
  async validarEntrada(): Promise<void> {

    const entradaActual =
      this.entrada();


    if (!entradaActual) {
      return;
    }


    /*
     * Evitamos intentar utilizar nuevamente
     * una entrada que ya sabemos que fue usada.
     */
    if (entradaActual.utilizada) {

      this.mensaje.set(
        'Esta entrada ya fue utilizada.'
      );

      return;

    }


    this.procesando.set(true);


    /*
     * EntradaService hace el UPDATE real
     * contra Supabase.
     */
    const entradaUtilizada =
      await this.entradaService.utilizarEntrada(
        entradaActual.id
      );


    this.procesando.set(false);


    /*
     * Si devuelve null, no pudo actualizarse.
     *
     * Una posibilidad es que otro empleado
     * haya validado la misma entrada antes.
     */
    if (!entradaUtilizada) {

      this.mensaje.set(
        'La entrada no pudo ser validada. Puede haber sido utilizada anteriormente.'
      );

      /*
       * Volvemos a consultar para obtener
       * el estado actual de Supabase.
       */
      await this.buscarEntrada();

      return;

    }


    /*
     * Actualizamos nuestro Signal con la
     * versión que devuelve Supabase.
     */
    this.entrada.set(
      entradaUtilizada
    );


    this.mensaje.set(
      'Ingreso autorizado. Entrada utilizada correctamente.'
    );

  }

 /*
 * Recibe el texto detectado por la cámara
 * y busca la entrada correspondiente en Supabase.
 */
async qrLeido(resultado: string): Promise<void> {

  /*
   * Si ya estamos procesando un QR,
   * ignoramos nuevas lecturas.
   */
  if (!this.scannerActivo()) {
    return;
  }


  /*
   * Verificamos que sea un QR generado
   * por nuestra aplicación.
   */
  if (!resultado.startsWith('CINEBERA:')) {

    this.mensaje.set(
      'El código QR no pertenece a CineBera.'
    );

    return;

  }


  /*
   * Pausamos inmediatamente el scanner.
   *
   * Esto evita:
   * lectura 1 → lectura 2 → lectura 3...
   * mientras el QR continúa frente a la cámara.
   */
  this.scannerActivo.set(false);
  this.procesando.set(true);
  this.entrada.set(null);


  /*
   * Quitamos nuestro prefijo y obtenemos
   * el UUID real de la entrada.
   */
  const codigoEntrada =
    resultado
      .replace('CINEBERA:', '')
      .trim();


  /*
   * Reutilizamos el mismo EntradaService.
   *
   * No necesitamos crear otra consulta
   * solamente porque ahora llegamos desde un QR.
   */
  const entradaEncontrada =
    await this.entradaService
      .obtenerEntradaPorCodigo(codigoEntrada);


  this.procesando.set(false);


  /*
   * El QR tenía formato CineBera pero el UUID
   * no existe en nuestra base de datos.
   */
  if (!entradaEncontrada) {

    this.mensaje.set(
      'La entrada no existe.'
    );

    return;

  }


  /*
   * Guardamos la entrada encontrada.
   */
  this.entrada.set(
    entradaEncontrada
  );


  /*
 * El QR identifica la entrada.
 *
 * Desde la entrada obtenemos compra_id
 * y desde la compra buscamos Candy.
 */
await this.cargarCandyDeEntrada(
  entradaEncontrada
);


  /*
   * Si ya fue utilizada, NO permitimos
   * volver a autorizar el ingreso.
   */
  if (entradaEncontrada.utilizada) {

    this.mensaje.set(
      'Esta entrada ya fue utilizada.'
    );

    return;

  }


  /*
   * Llegamos acá solamente si:
   *
   * - el QR pertenece a CineBera
   * - la entrada existe
   * - todavía no fue utilizada
   */
  this.mensaje.set(
    'Entrada válida. Puede autorizar el ingreso.'
  );

}

/*
 * Confirma la entrega del pedido Candy.
 *
 * Esta acción es independiente de validar
 * la entrada para ingresar a la sala.
 */
async entregarCandy(): Promise<void> {

  /*
   * Recuperamos el pedido que actualmente
   * está cargado en pantalla.
   */
  const pedidoActual =
    this.pedidoCandy();


  /*
   * Si no existe pedido Candy,
   * no hay nada para entregar.
   */
  if (!pedidoActual) {
    return;
  }


  /*
   * Evitamos intentar entregar nuevamente
   * un pedido que ya sabemos que fue entregado.
   */
  if (pedidoActual.entregado) {

    this.mensaje.set(
      'El pedido Candy ya fue entregado.'
    );

    return;
  }


  this.procesando.set(true);


  /*
   * CandyService realiza el UPDATE real
   * contra Supabase.
   *
   * Supabase solamente permitirá el cambio
   * si entregado continúa siendo false.
   */
  const pedidoEntregado =
    await this.candyService.entregarPedido(
      pedidoActual.id
    );


  this.procesando.set(false);


  /*
   * null significa que no se pudo realizar
   * la actualización.
   *
   * Por ejemplo, otro empleado pudo haber
   * entregado el pedido unos segundos antes.
   */
  if (!pedidoEntregado) {

    this.mensaje.set(
      'El pedido Candy no pudo ser entregado. Puede haber sido entregado anteriormente.'
    );

    /*
     * Volvemos a consultar el estado real
     * usando la entrada actualmente cargada.
     */
    const entradaActual =
      this.entrada();

    if (entradaActual) {

      await this.cargarCandyDeEntrada(
        entradaActual
      );

    }

    return;
  }


  /*
   * Actualizamos el Signal con la información
   * real que acaba de devolver Supabase.
   *
   * Angular actualizará automáticamente
   * el HTML que depende de pedidoCandy().
   */
  this.pedidoCandy.set(
    pedidoEntregado
  );


  this.mensaje.set(
    'Pedido Candy entregado correctamente.'
  );

}


/*
 * Limpia la entrada actual y vuelve
 * a habilitar el lector QR.
 */
escanearOtraEntrada(): void {

  this.entrada.set(null);

  /*
   * También debemos limpiar el Candy
   * relacionado con la entrada anterior.
   */
  this.pedidoCandy.set(null);

  this.mensaje.set('');

  this.codigoManual = '';

  this.scannerActivo.set(true);

}

}