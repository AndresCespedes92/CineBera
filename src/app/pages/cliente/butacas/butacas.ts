import {
  Component,
  OnInit
} from '@angular/core';

import {
  ActivatedRoute
} from '@angular/router';

import {
  Butaca
} from '../../../models/butaca';

import { EstadoButaca } from '../../../directives/estado-butaca';

import { FuncionService } from '../../../services/funcion';
import { PeliculaService } from '../../../services/pelicula';
import { Pelicula } from '../../../models/pelicula';

@Component({
  selector: 'app-butacas',
  imports: [EstadoButaca],
  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnInit {

  funcion: any | null = null;

  pelicula: Pelicula | null = null;

  /*
   * ID de la función seleccionada.
   *
   * Ejemplo:
   * /funcion/37/butacas
   *
   * idFuncion = 37
   */
  idFuncion: number = 0;

  readonly RECARGO_VIP = 0.30;


  /*
   * Mapa completo de la sala.
   *
   * Cada posición del array representa
   * una fila de butacas.
   */
  filasButacas: Butaca[][] = [];


  constructor(
  private route: ActivatedRoute,
  private funcionService: FuncionService,
  private peliculaService: PeliculaService
) {}


  ngOnInit(): void {

    /*
     * Leemos el ID de la función
     * recibido mediante la URL.
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');

    this.idFuncion =
      Number(idRecibido);

      this.cargarDatosFuncion();


    /*
     * Generamos la estructura física
     * de la sala.
     */
    this.generarMapaSala();


    console.log(
      'FUNCIÓN SELECCIONADA:',
      this.idFuncion
    );

    console.log(
      'MAPA DE BUTACAS:',
      this.filasButacas
    );
  }


  /*
   * Genera automáticamente las
   * 20 filas efectivas de butacas.
   *
   * J no contiene butacas porque
   * representa espacio físico.
   */
  generarMapaSala(): void {

    const filas = [
      'A', 'B', 'C', 'D', 'E',
      'F', 'G', 'H', 'I',

      // J no se genera porque queda vacía.

      'K',

      'L', 'M', 'N', 'Ñ',
      'O', 'P', 'Q',

      'R', 'S', 'T'
    ];


    for (const fila of filas) {

      const butacasFila: Butaca[] = [];


      /*
       * K es la fila accesible.
       *
       * Tiene:
       * 2 + 10 + 2 = 14 lugares.
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
          fila: fila,
          numero: numero,

          tipo:
            fila === 'K'
              ? 'accesible'
              : esVip
                ? 'vip'
                : 'normal',

          estado: 'disponible'
        });

      }


      this.filasButacas.push(
        butacasFila
      );

    }

  }

  /*
 * Devuelve las butacas correspondientes
 * al sector izquierdo.
 *
 * Normal/VIP: 4
 * Accesible: 2
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
 * Devuelve las butacas del sector central.
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
 * Devuelve las butacas
 * del sector derecho.
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
 * Permite seleccionar o deseleccionar
 * una butaca.
 *
 * Una butaca ocupada no puede modificarse.
 */
seleccionarButaca(
  butaca: Butaca
): void {

  if (butaca.estado === 'ocupada') {
    return;
  }

  const nuevoEstado =
    butaca.estado === 'disponible'
      ? 'seleccionada'
      : 'disponible';


  /*
   * Recorremos las filas y reemplazamos
   * solamente la butaca seleccionada
   * por un NUEVO objeto.
   */
  this.filasButacas =
    this.filasButacas.map(
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
    );
}

obtenerButacasSeleccionadas(): Butaca[] {

  return this.filasButacas
    .flat()
    .filter(
      butaca => butaca.estado === 'seleccionada'
    );
}

async cargarDatosFuncion(): Promise<void> {

  this.funcion =
    await this.funcionService
      .obtenerFuncionPorId(this.idFuncion);

  if (!this.funcion) {
    return;
  }

  this.pelicula =
    await this.peliculaService
      .obtenerPeliculaPorId(
        this.funcion.pelicula_id
      );
}

/*
 * Calcula el precio final de una butaca.
 *
 * Parte del precio base de la película
 * (venta o preventa) y luego aplica las
 * reglas propias del tipo de butaca.
 */
obtenerPrecioButaca(
  butaca: Butaca
): number {

  const precioBase =
    this.obtenerPrecioBase();

  /*
   * Las butacas VIP tienen un recargo
   * del 30% sobre el precio base.
   */
  if (butaca.tipo === 'vip') {

    return precioBase *
      (1 + this.RECARGO_VIP);
  }

  /*
   * Las butacas normales y accesibles
   * mantienen el precio base.
   */
  return precioBase;
}

calcularTotal(): number {

  return this
    .obtenerButacasSeleccionadas()
    .reduce(
      (total, butaca) =>
        total + this.obtenerPrecioButaca(butaca),
      0
    );
}

/*
 * Determina si la compra actual se encuentra
 * dentro del período de preventa.
 *
 * La preventa comienza 7 días antes del estreno
 * de la película y termina cuando llega el día
 * del estreno.
 */
estaEnPreventa(): boolean {

  // Sin película cargada no podemos conocer
  // la fecha de estreno.
  if (!this.pelicula) {
    return false;
  }

  /*
   * Creamos la fecha de estreno a partir
   * de la fecha configurada por CineBera.
   */
  const fechaEstreno =
    new Date(
      `${this.pelicula.fechaEstreno}T00:00:00`
    );

  /*
   * Calculamos cuándo comienza la preventa.
   *
   * Creamos una copia para no modificar
   * accidentalmente fechaEstreno.
   */
  const inicioPreventa =
    new Date(fechaEstreno);

  inicioPreventa.setDate(
    inicioPreventa.getDate() - 7
  );

  // Representa el momento actual en el que
  // el cliente está intentando comprar.
  const ahora = new Date();

  /*
   * Estamos en preventa solamente si:
   *
   * inicioPreventa <= ahora < fechaEstreno
   */
  return (
    ahora >= inicioPreventa &&
    ahora < fechaEstreno
  );
}

/*
 * Devuelve el precio base que corresponde
 * según la etapa comercial de la película.
 *
 * Todavía NO aplica recargos por tipo de butaca.
 */
obtenerPrecioBase(): number {

  // Evitamos calcular un precio si todavía
  // no se cargaron los datos de la película.
  if (!this.pelicula) {
    return 0;
  }

  /*
   * Durante el período de preventa usamos
   * el precio especial configurado para preventa.
   */
  if (this.estaEnPreventa()) {
    return this.pelicula.precioPreventa;
  }

  /*
   * Fuera del período de preventa usamos
   * el precio normal de venta.
   */
  return this.pelicula.precioVenta;
}

}