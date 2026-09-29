import { RouterLink } from '@angular/router';
import { HoraCortaPipe } from '../../../pipes/hora-corta';
import { MatButtonModule } from '@angular/material/button';
import { Resenas } from '../../../components/resenas/resenas';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  ActivatedRoute, Router
} from '@angular/router';

import { Sala } from '../../../models/sala';

import { SalaService } from '../../../services/sala';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  PeliculaService
} from '../../../services/pelicula';

import {
  FuncionService
} from '../../../services/funcion';


@Component({
  selector: 'app-funciones-pelicula',

  imports: [MatButtonModule, HoraCortaPipe, RouterLink, Resenas],

  templateUrl: './funciones-pelicula.html',
  styleUrl: './funciones-pelicula.css'
})
export class FuncionesPelicula implements OnInit {

  


  /*
   * Película seleccionada por el cliente.
   */
  pelicula: Pelicula | null = null;

  /*
 * =====================================================
 * ESTADO DE CARGA
 * =====================================================
 *
 * Nos permite diferenciar dos situaciones:
 *
 * pelicula === null porque todavía estamos
 * consultando Supabase
 *
 * de
 *
 * pelicula === null porque realmente
 * no existe la película.
 */
cargando: boolean = true;


  /*
   * Funciones disponibles de esa película.
   *
   * Por ahora utilizamos any[].
   * Después podemos tiparlo con Funcion
   * cuando terminemos de definir exactamente
   * qué información necesita esta pantalla.
   */
  funciones: any[] = [];

  /*
 * Salas activas del cine.
 *
 * Las usamos para transformar el sala_id
 * de una función en un nombre entendible
 * para el cliente.
 */
salas: Sala[] = [];


  /*
   * ID de la película recibido
   * mediante la URL.
   *
   * Ejemplo:
   *
   * /pelicula/5/funciones
   *
   * idPelicula = 5
   */
  idPelicula: number = 0;


  constructor(
    private route: ActivatedRoute,
    private peliculaService: PeliculaService,
    private funcionService: FuncionService,
    private changeDetectorRef: ChangeDetectorRef,
    private salaService: SalaService,
    private router: Router
  ) {}


  /*
   * Cuando se inicia la pantalla:
   *
   * 1. Leemos el ID de la URL.
   * 2. Buscamos la película.
   * 3. Buscamos sus funciones activas.
   */
  async ngOnInit(): Promise<void> {


    /*
     * PASO 1
     *
     * Obtenemos :id desde la URL.
     */
    const idRecibido =
      this.route.snapshot
        .paramMap
        .get('id');


    /*
     * Los parámetros de URL son texto.
     *
     * "5" → 5
     */
    this.idPelicula =
      Number(idRecibido);


    /*
     * PASO 2
     *
     * Buscamos la película en Supabase.
     */
    this.pelicula =
      await this.peliculaService
        .obtenerPeliculaPorId(
          this.idPelicula
        );

        /*
 * También cargamos las salas activas
 * para poder mostrar sus nombres.
 */
this.salas =
  await this.salaService
    .obtenerSalasActivas();


/*
 * PASO 3
 *
 * Calculamos la semana cinematográfica actual.
 *
 * CineBera trabaja:
 * jueves → miércoles.
 */
const hoy = new Date();

const diasDesdeJueves =
  (hoy.getDay() - 4 + 7) % 7;


/*
 * Buscamos el jueves que inició
 * la semana cinematográfica actual.
 */
const inicioSemana =
  new Date(hoy);

inicioSemana.setDate(
  hoy.getDate() - diasDesdeJueves
);


/*
 * La semana termina el miércoles,
 * seis días después.
 */
const finSemana =
  new Date(inicioSemana);

finSemana.setDate(
  inicioSemana.getDate() + 6
);


/*
 * Función auxiliar para convertir una fecha
 * local al formato que utiliza Supabase:
 *
 * YYYY-MM-DD
 */
const convertirFechaLocal =
  (fecha: Date): string => {

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  };


/*
 * Por defecto consultamos la semana
 * cinematográfica actual.
 *
 * Esto corresponde a una película que
 * ya está en cartelera.
 */
let fechaInicio =
  convertirFechaLocal(inicioSemana);

let fechaFin =
  convertirFechaLocal(finSemana);


/*
 * Si la película todavía no se estrenó
 * en CineBera, estamos entrando desde
 * Próximamente / Preventa.
 *
 * En ese caso no debemos consultar la
 * semana actual, porque sus funciones
 * pueden pertenecer a la semana siguiente.
 */
if (
  this.pelicula &&
  this.pelicula.fechaEstreno > fechaFin
) {

  /*
   * La consulta comienza exactamente en
   * la fecha de estreno de CineBera.
   *
   * Ejemplo:
   * Super Mario → 01/10/2026.
   */
  fechaInicio =
    this.pelicula.fechaEstreno;


  /*
   * Calculamos hasta qué día permitimos
   * consultar funciones de preventa.
   *
   * Tomamos el estreno y buscamos el
   * miércoles que termina esa nueva
   * semana cinematográfica.
   */
  const fechaEstreno =
    new Date(
      `${this.pelicula.fechaEstreno}T00:00:00`
    );


  /*
   * Calculamos cuántos días hay desde
   * el estreno hasta el próximo miércoles.
   *
   * getDay():
   * domingo = 0
   * miércoles = 3
   */
  const diasHastaMiercoles =
    (3 - fechaEstreno.getDay() + 7) % 7;


  const finSemanaPreventa =
    new Date(fechaEstreno);

  finSemanaPreventa.setDate(
    fechaEstreno.getDate() +
    diasHastaMiercoles
  );


  fechaFin =
    convertirFechaLocal(
      finSemanaPreventa
    );
}


/*
 * PASO 4
 *
 * Traemos las funciones activas
 * de la semana cinematográfica actual.
 */
const {
  data,
  error
} =
  await this.funcionService
    .obtenerFuncionesSemana(
      fechaInicio,
      fechaFin
    );


    /*
     * Si Supabase devuelve un error,
     * lo mostramos para poder diagnosticarlo.
     */
    if (error) {

  console.error(
    'Error obteniendo funciones de la película:',
    error
  );

  /*
   * Aunque ocurrió un error, la consulta terminó.
   */
  this.cargando = false;

  this.changeDetectorRef
    .detectChanges();

  return;
}


    /*
     * PASO 5
     *
     * Guardamos las funciones encontradas.
     *
     * Si Supabase devuelve null,
     * utilizamos un array vacío.
     */
   this.funciones =
  (data ?? [])
    .filter(funcion => {

      /*
       * Primero verificamos que la función
       * pertenezca a la película seleccionada.
       */
      if (
        funcion.pelicula_id !==
        this.idPelicula
      ) {
        return false;
      }


      /*
       * Construimos la fecha y hora completa
       * de la función.
       *
       * Ejemplo:
       * fecha = 2026-09-24
       * hora  = 18:30:00
       *
       * Resultado:
       * 2026-09-24T18:30:00
       */
      const fechaHoraFuncion =
        new Date(
          `${funcion.fecha}T${funcion.hora}`
        );


      /*
       * Solamente dejamos las funciones
       * cuya fecha/hora todavía no pasó.
       */
      return fechaHoraFuncion > hoy;

    });

/*
 * Todas las consultas necesarias terminaron.
 *
 * A partir de este momento Angular ya puede
 * decidir si mostrar la película o indicar
 * que no fue encontrada.
 */
this.cargando = false;
    /*
     * Actualizamos la vista después
     * de las consultas asíncronas.
     */
    this.changeDetectorRef
      .detectChanges();


    /*
     * Logs temporales de prueba.
     */
    console.log(
      'PELÍCULA SELECCIONADA:',
      this.pelicula
    );

    console.log(
      'FUNCIONES DE LA PELÍCULA:',
      this.funciones
    );

  }

  /*
 * Recibe el ID de una sala
 * y devuelve su nombre.
 *
 * Ejemplo:
 * 3 → "Sala 3"
 */
obtenerNombreSala(
  salaId: number
): string {

  const sala =
    this.salas.find(
      sala => sala.id === salaId
    );

  return sala
    ? sala.nombre
    : 'Sala no disponible';
}

/*
 * Navega desde la función seleccionada
 * hacia la pantalla de butacas.
 */
elegirFuncion(
  funcionId: number
): void {

  this.router.navigate([
    '/funcion',
    funcionId,
    'butacas'
  ]);

}

}