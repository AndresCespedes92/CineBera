import {
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  signal
} from '@angular/core';

import {
  ActivatedRoute
} from '@angular/router';

import {
  ItemCarritoCandy
} from '../../../models/item-carrito-candy';

import {
  Navbar
} from '../../../components/navbar/navbar';

import {
  ProductoCandy
} from '../../../models/producto-candy';

import {
  CandyService
} from '../../../services/candy';


@Component({
  selector: 'app-candy',

  imports: [
    Navbar
  ],

  templateUrl: './candy.html',
  styleUrl: './candy.css'
})
export class Candy implements OnInit {

  /*
 * Compra a la que quedará asociado
 * el pedido de Candy.
 *
 * null significa que el cliente entró
 * a Candy sin venir desde una compra.
 */
compraId: number | null = null;


/*
 * Nos permite evitar que el usuario presione
 * varias veces "Confirmar pedido" mientras
 * Supabase está procesando la operación.
 */
guardandoPedido: boolean = false;


/*
 * Guardamos el ID devuelto por Supabase
 * cuando el pedido se crea correctamente.
 *
 * También nos sirve para saber que este carrito
 * ya fue confirmado.
 */
pedidoCreadoId: number | null = null;


/*
 * Mensaje simple para informar al usuario
 * qué ocurrió al confirmar el pedido.
 *
 * Más adelante podemos reemplazar estos mensajes
 * por nuestro sistema visual reutilizable.
 */
mensajePedido: string = '';


  /*
   * Productos disponibles para comprar.
   *
   * El componente no consulta Supabase
   * directamente. Esa responsabilidad
   * pertenece a CandyService.
   */
  productos: ProductoCandy[] = [];


  /*
   * Mientras esperamos la respuesta
   * de Supabase mostramos un estado
   * de carga en la pantalla.
   */
  cargando: boolean = true;


  /*
 * El carrito es un estado que puede cambiar
 * constantemente mientras el usuario compra.
 *
 * Por eso usamos signal().
 *
 * Inicialmente el carrito está vacío.
 */
carrito =
  signal<ItemCarritoCandy[]>([]);


/*
 * computed() representa un valor derivado.
 *
 * Nosotros NO guardamos manualmente el total.
 * Angular lo calcula a partir del carrito.
 *
 * Si cambia una cantidad o se agrega/elimina
 * un producto, el total se recalcula.
 */
totalCarrito =
  computed(() => {

    return this.carrito()
      .reduce(
        (total, item) =>
          total +
          (
            item.producto.precio *
            item.cantidad
          ),
        0
      );

  });


  constructor(
  private candyService: CandyService,
  private changeDetectorRef: ChangeDetectorRef,
  private route: ActivatedRoute
) {}


  /*
   * ngOnInit se ejecuta cuando Angular
   * crea este componente.
   *
   * Aprovechamos ese momento para
   * solicitar el catálogo al servicio.
   */
  async ngOnInit(): Promise<void> {

    /*
 * Intentamos recuperar el ID de compra
 * recibido en la URL.
 *
 * Ejemplo:
 *
 * /candy?compra=42
 */
const compraRecibida =
  this.route.snapshot
    .queryParamMap
    .get('compra');


/*
 * queryParamMap siempre devuelve texto
 * o null.
 *
 * Por eso convertimos el valor a number.
 */
if (compraRecibida) {

  const idConvertido =
    Number(compraRecibida);


  /*
   * Solamente guardamos el ID si
   * realmente representa un número.
   */
  if (!Number.isNaN(idConvertido)) {

    this.compraId =
      idConvertido;

  }

}

    this.productos =
      await this.candyService
        .obtenerProductosActivos();


    /*
     * La consulta terminó,
     * haya encontrado productos o no.
     */
    this.cargando = false;


    /*
     * Forzamos la actualización visual
     * después de la operación asíncrona,
     * siguiendo el patrón que ya utilizamos
     * en otras pantallas del proyecto.
     */
    this.changeDetectorRef
      .detectChanges();

  }

  /*
 * Agrega un producto al carrito.
 *
 * Si todavía no existe:
 * cantidad inicial = 1.
 *
 * Si ya existe:
 * aumentamos su cantidad.
 */
agregarProducto(
  producto: ProductoCandy
): void {

  /*
   * Buscamos si el producto ya está
   * dentro del carrito.
   */
  const itemExistente =
    this.carrito()
      .find(
        item =>
          item.producto.id ===
          producto.id
      );


  if (itemExistente) {

    /*
     * Si ya existe, generamos un nuevo array
     * actualizando solamente ese producto.
     *
     * No modificamos directamente el array
     * anterior. Esto mantiene un estado
     * predecible y hace que Signal detecte
     * claramente el cambio.
     */
    this.carrito.update(
      carritoActual =>

        carritoActual.map(
          item => {

            if (
              item.producto.id ===
              producto.id
            ) {

              return {
                ...item,
                cantidad:
                  item.cantidad + 1
              };

            }

            return item;

          }
        )
    );

  } else {

    /*
     * Si el producto todavía no existe,
     * agregamos un nuevo ItemCarritoCandy.
     */
    this.carrito.update(
      carritoActual => [
        ...carritoActual,
        {
          producto,
          cantidad: 1
        }
      ]
    );

  }

}

/*
 * Aumenta en una unidad la cantidad
 * de un producto que ya está en el carrito.
 */
aumentarCantidad(
  productoId: number
): void {

  this.carrito.update(
    carritoActual =>

      carritoActual.map(
        item => {

          if (
            item.producto.id === productoId
          ) {

            return {
              ...item,
              cantidad: item.cantidad + 1
            };

          }

          return item;

        }
      )
  );

}


/*
 * Disminuye en una unidad la cantidad.
 *
 * No permitimos cantidades menores a 1.
 * Si el cliente quiere sacar completamente
 * el producto, utilizamos eliminarProducto().
 */
disminuirCantidad(
  productoId: number
): void {

  this.carrito.update(
    carritoActual =>

      carritoActual.map(
        item => {

          if (
            item.producto.id === productoId &&
            item.cantidad > 1
          ) {

            return {
              ...item,
              cantidad: item.cantidad - 1
            };

          }

          return item;

        }
      )
  );

}


/*
 * Elimina completamente un producto
 * del carrito.
 *
 * filter() crea un nuevo array conservando
 * solamente los elementos que cumplen
 * la condición.
 */
eliminarProducto(
  productoId: number
): void {

  this.carrito.update(
    carritoActual =>

      carritoActual.filter(
        item =>
          item.producto.id !== productoId
      )
  );

}


/*
 * Confirma el carrito actual y lo convierte
 * en un pedido persistido en Supabase.
 */
async confirmarPedido(): Promise<void> {

  /*
   * No podemos crear un pedido si Candy
   * no está asociado a una compra.
   */
  if (this.compraId === null) {

    this.mensajePedido =
      'Este pedido no está asociado a una compra.';

    return;
  }


  /*
   * Tampoco tiene sentido crear
   * un pedido sin productos.
   */
  if (this.carrito().length === 0) {

    this.mensajePedido =
      'Agregá al menos un producto.';

    return;
  }


  /*
   * Evitamos una segunda confirmación
   * mientras la primera todavía se procesa.
   */
  if (this.guardandoPedido) {
    return;
  }


  this.guardandoPedido = true;
  this.mensajePedido = '';


  /*
   * Le pasamos al servicio:
   *
   * 1. La compra relacionada.
   * 2. El estado actual del carrito.
   * 3. El total calculado por computed().
   */
  const pedidoId =
    await this.candyService.crearPedido(
      this.compraId,
      this.carrito(),
      this.totalCarrito()
    );


  if (pedidoId === null) {

    this.mensajePedido =
      'No se pudo crear el pedido.';

    this.guardandoPedido = false;

    return;
  }


  /*
   * Si Supabase devuelve un ID,
   * sabemos que el pedido fue creado.
   */
  this.pedidoCreadoId = pedidoId;

  this.mensajePedido =
    'Pedido de Candy creado correctamente.';

  this.guardandoPedido = false;
}

}