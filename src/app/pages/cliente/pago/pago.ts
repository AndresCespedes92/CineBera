import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  ActivatedRoute
} from '@angular/router';

import {
  CompraService
} from '../../../services/compra';

import {
  Compra
} from '../../../models/compra';

import {
  ButacaService
} from '../../../services/butaca';


@Component({
  selector: 'app-pago',
  imports: [],
  templateUrl: './pago.html',
  styleUrl: './pago.css'
})
export class Pago implements OnInit {


  /*
   * Compra que el cliente está intentando pagar.
   *
   * Al principio es null porque todavía
   * no consultamos Supabase.
   */
  compra =
    signal<Compra | null>(null);


  /*
   * Controla el estado de carga de la pantalla.
   */
  cargando =
    signal<boolean>(true);


  constructor(
  private route: ActivatedRoute,
  private compraService: CompraService,

  /*
   * Lo necesitamos para convertir
   * las reservas en ocupaciones definitivas.
   */
  private butacaService: ButacaService
) {}


  ngOnInit(): void {

    /*
     * ActivatedRoute devuelve los parámetros
     * de la URL como texto.
     *
     * Por eso primero obtenemos un string.
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');


    /*
     * Si no recibimos ID no podemos
     * identificar la compra.
     */
    if (!idRecibido) {

      this.cargando.set(false);

      return;
    }


    /*
     * Convertimos:
     *
     * "15" → 15
     *
     * porque Compra.id es number.
     */
    const compraId =
      Number(idRecibido);


    /*
     * También verificamos que realmente
     * sea un número válido.
     */
    if (Number.isNaN(compraId)) {

      this.cargando.set(false);

      return;
    }


    this.cargarCompra(
      compraId
    );

  }


  /*
   * Recupera desde Supabase la compra
   * identificada por la URL.
   */
  async cargarCompra(
    compraId: number
  ): Promise<void> {

    const compraEncontrada =
      await this.compraService
        .obtenerCompraPorId(
          compraId
        );


    /*
     * Guardamos el resultado en nuestro Signal.
     *
     * Angular actualizará automáticamente
     * el HTML que depende de compra().
     */
    this.compra.set(
      compraEncontrada
    );


    this.cargando.set(false);

  }

  /*
 * Simula la aprobación del pago.
 *
 * En una integración real este método se
 * ejecutaría después de recibir la confirmación
 * del proveedor de pagos.
 */
async confirmarPago(): Promise<void> {

  const compraActual =
    this.compra();


  /*
   * No podemos confirmar algo
   * que no existe.
   */
  if (!compraActual) {

    console.error(
      'No existe una compra para confirmar.'
    );

    return;
  }


  /*
   * Evitamos intentar cobrar nuevamente
   * una compra que ya está pagada.
   */
  if (compraActual.estado !== 'pendiente') {

    console.log(
      'La compra ya fue procesada.'
    );

    return;
  }


  /*
   * PASO 1:
   *
   * confirmamos la compra.
   */
  const compraConfirmada =
    await this.compraService
      .confirmarCompra(
        compraActual.id
      );


  if (!compraConfirmada) {

    console.error(
      'No fue posible confirmar el pago.'
    );

    return;
  }


  /*
   * PASO 2:
   *
   * convertimos las butacas temporales
   * en butacas definitivamente ocupadas.
   */
  const butacasConfirmadas =
    await this.butacaService
      .confirmarButacasReserva(
        compraActual.reserva_token
      );


  if (!butacasConfirmadas) {

    console.error(
      'La compra fue confirmada pero hubo un problema con las butacas.'
    );

    return;
  }


  /*
   * Actualizamos nuestro Signal.
   *
   * No necesitamos volver a consultar
   * toda la compra porque confirmarCompra()
   * ya nos devolvió la fila actualizada.
   */
  this.compra.set(
    compraConfirmada
  );


  console.log(
    'Pago confirmado correctamente:',
    compraConfirmada
  );

}

}