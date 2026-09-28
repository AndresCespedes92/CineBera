import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  FidelizacionService
} from '../../../services/fidelizacion';

import {
  ActivatedRoute,
  Router
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

import { EntradaService } from '../../../services/entrada';


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
  private router: Router,
  private compraService: CompraService,

  /*
   * Lo necesitamos para convertir
   * las reservas en ocupaciones definitivas.
   */
  private butacaService: ButacaService,
  private entradaService: EntradaService,
  private fidelizacionService: FidelizacionService,
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

  /*
   * Obtenemos el valor actual del Signal.
   *
   * Recordá:
   * this.compra es el Signal.
   * this.compra() es su valor actual.
   */
  const compraActual = this.compra();


  /*
   * Si por algún motivo no tenemos una compra
   * cargada, no podemos continuar.
   */
  if (!compraActual) {
    return;
  }


  /*
   * Evitamos volver a pagar una compra
   * que ya fue confirmada.
   */
  if (compraActual.estado !== 'pendiente') {
    return;
  }


  /*
   * PASO 1:
   * Marcamos la compra como pagada.
   */
  const compraConfirmada =
    await this.compraService.confirmarCompra(
      compraActual.id
    );


  /*
   * Si Supabase no pudo confirmar la compra,
   * detenemos el proceso.
   */
  if (!compraConfirmada) {

    console.error(
      'No se pudo confirmar la compra.'
    );

    return;

  }


  /*
   * PASO 2:
   * Las butacas que estaban temporalmente
   * reservadas pasan a estar ocupadas.
   */
  const butacasConfirmadas =
    await this.butacaService.confirmarButacasReserva(
      compraConfirmada.reserva_token
    );


  if (!butacasConfirmadas) {

    console.error(
      'La compra fue pagada, pero no se pudieron confirmar las butacas.'
    );

    return;

  }


  /*
   * Actualizamos el Signal para que Angular
   * refleje inmediatamente el nuevo estado.
   */
  this.compra.set(compraConfirmada);


  /*
   * PASO 3:
   * Antes de crear una entrada preguntamos
   * si ya existe una para esta compra.
   *
   * Esto evita duplicados si posteriormente
   * el usuario recarga o repite alguna acción.
   */
  let entrada =
    await this.entradaService.obtenerEntradaPorCompra(
      compraConfirmada.id
    );


  /*
   * Si todavía no existe, la creamos.
   */
  if (!entrada) {

    entrada =
      await this.entradaService.crearEntrada(
        compraConfirmada.id
      );

  }


  /*
   * Si tampoco pudimos crearla,
   * detenemos la navegación.
   */
  if (!entrada) {

    console.error(
      'El pago fue confirmado, pero no se pudo generar la entrada.'
    );

    return;

  }

  /*
 * =====================================================
 * PASO 4: ACREDITAR PUNTOS DE FIDELIZACIÓN
 * =====================================================
 *
 * La compra ya está:
 *
 * - pagada
 * - con sus butacas confirmadas
 * - con su entrada generada
 *
 * Por lo tanto, este es un buen momento para
 * acreditar los puntos correspondientes.
 *
 * Regla del negocio:
 *
 * $1 gastado = 1 punto.
 *
 * IMPORTANTE:
 * solamente los usuarios registrados acumulan puntos.
 *
 * Las compras anónimas tienen usuario_id = null,
 * por lo tanto no participan del programa.
 */
if (compraConfirmada.usuario_id) {

  const puntosAcreditados =
    await this.fidelizacionService
      .acreditarPuntosPorCompra(
        compraConfirmada.id,
        compraConfirmada.usuario_id,
        compraConfirmada.total
      );


  if (puntosAcreditados) {

    console.log(
      'Puntos acreditados:',
      Math.floor(compraConfirmada.total)
    );

  }
  else {

    /*
     * Un problema con los puntos NO invalida
     * una compra que ya fue pagada correctamente.
     *
     * Por eso registramos el problema,
     * pero no detenemos la navegación.
     */
    console.warn(
      'La compra fue completada, pero no se pudieron acreditar los puntos.'
    );

  }

}
else {

  /*
   * Las compras anónimas no tienen un perfil
   * al cual asociar puntos.
   */
  console.log(
    'Compra anónima: no se acreditan puntos.'
  );

}

  /*
 * =====================================================
 * FINALIZAR LA OPERACIÓN TEMPORAL
 * =====================================================
 *
 * La compra ya fue pagada correctamente.
 *
 * Por lo tanto, el temporizador utilizado durante
 * la selección y el checkout ya no tiene sentido.
 *
 * IMPORTANTE:
 * solamente eliminamos el estado temporal de compra.
 * NO cerramos la sesión del usuario.
 */
const claveTemporizador =
  `cinebera-expira-funcion-${compraActual.funcion_id}`;

sessionStorage.removeItem(
  claveTemporizador
);


  /*
   * PASO 4:
   * Navegamos utilizando el código público
   * de la entrada, no su ID interno.
   *
   * Ejemplo:
   *
   * /entrada/550e8400-e29b-41d4-a716-446655440000
   */
  await this.router.navigate([
  '/entrada',
  entrada.codigo
]);

}

}