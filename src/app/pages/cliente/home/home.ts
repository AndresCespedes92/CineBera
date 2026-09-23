import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  Navbar
} from '../../../components/navbar/navbar';

import {
  PeliculaCard
} from '../../../components/pelicula-card/pelicula-card';

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
  selector: 'app-home',

  imports: [
    Navbar,
    PeliculaCard
  ],

  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {


  /*
   * Películas que finalmente se mostrarán
   * en la cartelera del cliente.
   *
   * No alcanza con que una película exista:
   * también debe tener una función activa.
   */
  peliculas: Pelicula[] = [];


  /*
   * Angular nos entrega los servicios
   * mediante inyección de dependencias.
   *
   * Router:
   * permite navegar a otra pantalla.
   *
   * PeliculaService:
   * obtiene las películas.
   *
   * FuncionService:
   * obtiene las funciones programadas.
   *
   * ChangeDetectorRef:
   * fuerza la actualización visual después
   * de recibir información asíncrona.
   */
  constructor(
    private router: Router,
    private peliculaService: PeliculaService,
    private funcionService: FuncionService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}


  /*
   * ngOnInit se ejecuta cuando Angular
   * inicializa esta pantalla.
   *
   * Acá construimos la cartelera real.
   */
  async ngOnInit(): Promise<void> {

  /*
   * 1. Obtenemos las películas visibles.
   */
  const peliculasDisponibles =
    await this.peliculaService
      .obtenerCartelera();


  /*
   * 2. Obtenemos la fecha actual. Para probar la semana que viene const hoy = new Date(2026, 8, 24);
   */
  const hoy =
    new Date();


  /*
   * getDay():
   *
   * domingo   = 0
   * lunes     = 1
   * martes    = 2
   * miércoles = 3
   * jueves    = 4
   * viernes   = 5
   * sábado    = 6
   *
   * Queremos encontrar el jueves
   * que inició la semana actual.
   */
  const diasDesdeJueves =
    (hoy.getDay() - 4 + 7) % 7;


  /*
   * Calculamos el jueves inicial.
   */
  const inicioSemana =
    new Date(hoy);

  inicioSemana.setDate(
    hoy.getDate() - diasDesdeJueves
  );


  /*
   * El miércoles final es
   * seis días después.
   */
  const finSemana =
    new Date(inicioSemana);

  finSemana.setDate(
    inicioSemana.getDate() + 6
  );


  /*
   * Convertimos las fechas al formato
   * YYYY-MM-DD utilizado por Supabase.
   *
   * Lo hacemos con fecha local para evitar
   * problemas de UTC.
   */
  const convertirFechaLocal = (
    fecha: Date
  ): string => {

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


  const fechaInicio =
    convertirFechaLocal(
      inicioSemana
    );

  const fechaFin =
    convertirFechaLocal(
      finSemana
    );


  /*
   * 3. Buscamos únicamente las funciones
   * de la semana cinematográfica vigente.
   */
  const {
    data: funciones,
    error
  } =
    await this.funcionService
      .obtenerFuncionesSemana(
        fechaInicio,
        fechaFin
      );


  if (error) {

    console.error(
      'Error obteniendo funciones:',
      error
    );

    return;
  }


  /*
   * 4. Obtenemos los IDs únicos
   * de películas programadas esta semana.
   */
  const peliculasConFuncion =
    new Set(
      (funciones ?? [])
        .map(
          funcion =>
            funcion.pelicula_id
        )
    );


  /*
   * 5. Mostramos solamente las películas
   * programadas durante la semana vigente.
   */
  this.peliculas =
    peliculasDisponibles.filter(
      pelicula =>
        peliculasConFuncion.has(
          pelicula.id
        )
    );


  this.changeDetectorRef
    .detectChanges();


  /*
   * Logs temporales para comprobar
   * la regla de negocio.
   */
  console.log(
    'SEMANA ACTUAL:',
    fechaInicio,
    '→',
    fechaFin
  );

  console.log(
    'FUNCIONES SEMANA ACTUAL:',
    funciones
  );

  console.log(
    'IDS CARTELERA:',
    peliculasConFuncion
  );

  console.log(
    'PELÍCULAS MOSTRADAS EN CARTELERA:',
    this.peliculas
  );

}


  /*
   * PeliculaCard emite mediante @Output
   * la película seleccionada.
   *
   * Home recibe ese evento y utiliza Router
   * para navegar hacia las funciones
   * de esa película.
   *
   * Ejemplo:
   *
   * /pelicula/5/funciones
   */
  seleccionarPelicula(
    pelicula: Pelicula
  ): void {

    this.router.navigate([
      '/pelicula',
      pelicula.id,
      'funciones'
    ]);

  }

}