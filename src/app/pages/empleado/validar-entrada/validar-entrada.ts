import { Navbar } from '../../../components/navbar/navbar';
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
import { Beneficio } from '../../../models/beneficio';
import { FidelizacionService } from '../../../services/fidelizacion';

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
  imports: [Navbar,
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

  beneficioCandy = signal<Beneficio | null>(null);
  errorCandy = signal('');

  async buscarCanjeCandy(codigo: string): Promise<void> {
    this.errorCandy.set('');
    this.procesando.set(true);
    this.entrada.set(null);
    this.pedidoCandy.set(null);
    this.beneficioCandy.set(null);
    try {
      const beneficio = await this.fidelizacionService.buscarBeneficioCandy(codigo.trim());
      this.beneficioCandy.set(beneficio);
      this.mensaje.set(!beneficio ? 'Canje no encontrado.' : beneficio.entregado_at
        ? 'Este canje ya fue entregado.' : 'Canje válido. Entregar una unidad del producto indicado.');
    } catch (error) {
      this.mensaje.set(error instanceof Error ? error.message : 'No se pudo consultar el canje.');
    } finally { this.procesando.set(false); }
  }

  async entregarCanjeCandy(): Promise<void> {
    const beneficio = this.beneficioCandy();
    if (!beneficio || beneficio.entregado_at || this.procesando()) return;
    this.procesando.set(true);
    try {
      const entregado = await this.fidelizacionService.entregarBeneficioCandy(beneficio.id);
      if (!entregado) {
        await this.buscarCanjeCandy(beneficio.codigo_beneficio);
        this.mensaje.set('No se confirmó una nueva entrega. Revisá el estado del canje.');
        return;
      }
      this.beneficioCandy.set(entregado);
      this.mensaje.set('Beneficio Candy entregado correctamente.');
    } catch (error) {
      this.mensaje.set(error instanceof Error ? error.message : 'No se pudo confirmar la entrega.');
    } finally { this.procesando.set(false); }
  }

  


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
  private candyService: CandyService,
  private fidelizacionService: FidelizacionService
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
  this.errorCandy.set('');


  /*
   * La entrada conoce la compra que la originó:
   *
   * entrada.compra_id
   *
   * Usamos ese ID para buscar el pedido Candy.
   */
  try {
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
  } catch (error) {
    this.errorCandy.set(error instanceof Error ? error.message : 'No se pudo consultar Candy.');
  }

}


  /*
   * Busca una entrada utilizando el
   * código manual ingresado por el empleado.
   */
  async buscarEntrada(): Promise<void> {

    if (this.procesando()) return;
    this.errorCandy.set('');
    this.beneficioCandy.set(null);
    this.pedidoCandy.set(null);
    const codigoCanje = this.codigoManual.trim().replace(/^CINEBERA-CANJE:/, '');
    if (/^[0-9a-f-]{36}$/i.test(codigoCanje)) {
      await this.buscarCanjeCandy(codigoCanje);
      return;
    }

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
    const entradaActual = this.entrada();
    if (!entradaActual || this.procesando()) return;
    if (entradaActual.utilizada) {
      this.mensaje.set('Esta entrada ya fue utilizada.');
      return;
    }
    this.procesando.set(true);
    try {
      const entradaUtilizada = await this.entradaService.utilizarEntrada(entradaActual.id);
      if (!entradaUtilizada) {
        await this.buscarEntrada();
        return;
      }
      this.entrada.set(entradaUtilizada);
      this.mensaje.set('Ingreso autorizado. Entrada utilizada correctamente.');
    } catch (error) {
      this.mensaje.set(error instanceof Error ? error.message : 'No se pudo confirmar el ingreso. Reintentá.');
    } finally { this.procesando.set(false); }
  }

 /*
 * Recibe el texto detectado por la cámara
 * y busca la entrada correspondiente en Supabase.
 */
async qrLeido(resultado: string): Promise<void> {

  if (this.procesando() || !this.scannerActivo()) return;
  if (resultado.startsWith('CINEBERA-CANJE:') && this.scannerActivo()) {
    this.scannerActivo.set(false);
    await this.buscarCanjeCandy(resultado.slice('CINEBERA-CANJE:'.length));
    return;
  }
  this.beneficioCandy.set(null);
  this.pedidoCandy.set(null);

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
  const pedido = this.pedidoCandy();
  if (!pedido || pedido.entregado || pedido.estado !== 'pagado' || this.procesando()) return;
  this.procesando.set(true);
  try {
    const entregado = await this.candyService.entregarPedido(pedido.id);
    if (!entregado) {
      this.mensaje.set('No se confirmó una nueva entrega. Revisá el estado del pedido.');
      const entrada = this.entrada();
      if (entrada) await this.cargarCandyDeEntrada(entrada);
      return;
    }
    this.pedidoCandy.set(entregado);
    this.mensaje.set('Pedido Candy entregado correctamente.');
  } catch (error) {
    this.mensaje.set(error instanceof Error ? error.message : 'No se pudo confirmar la entrega.');
  } finally { this.procesando.set(false); }
}

/*
 * Limpia la entrada actual y vuelve
 * a habilitar el lector QR.
 */
escanearOtraEntrada(): void {

  this.beneficioCandy.set(null);
  this.errorCandy.set('');

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
