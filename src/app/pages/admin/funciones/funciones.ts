import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { RouterLink } from '@angular/router';

import {
  FormsModule
} from '@angular/forms';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  Sala
} from '../../../models/sala';

import {
  PeliculaService
} from '../../../services/pelicula';

import { FuncionService } from '../../../services/funcion';

import { NuevaFuncionSupabase } from '../../../models/funcion';

import {
  SalaService
} from '../../../services/sala';


/*
 * Representa una función que el administrador
 * está armando en pantalla.
 *
 * Todavía NO está guardada en Supabase.
 *
 * Es similar a un producto agregado a un carrito:
 * existe temporalmente hasta que el usuario
 * confirma toda la programación semanal.
 */
interface FuncionTemporal {

  peliculaId: number;

  peliculaTitulo: string;

  salaId: number;

  salaNombre: string;

  hora: string;

  duracion: number;

  horaFin: string;

  salaDisponibleDesde: string;

  formato: string;

  idioma: string;

  guardada: boolean;

}


@Component({
  selector: 'app-funciones',

  imports: [
    FormsModule, RouterLink
  ],

  templateUrl: './funciones.html',
  styleUrl: './funciones.css'
})
export class Funciones implements OnInit {


  /*
   * Películas obtenidas desde Supabase.
   */
  peliculas: Pelicula[] = [];


  /*
   * Salas activas obtenidas desde Supabase.
   */
  salas: Sala[] = [];


  /*
   * Película seleccionada actualmente
   * en el formulario.
   */
  peliculaIdSeleccionada:
    number | null = null;


  /*
   * Sala seleccionada actualmente
   * en el formulario.
   */
  salaIdSeleccionada:
    number | null = null;


  /*
   * Jueves que comienza la semana
   * cinematográfica seleccionada.
   *
   * Ejemplo:
   * 2026-09-24
   */
  fechaInicioSemana = '';


  /*
   * Los siete días correspondientes
   * a la semana seleccionada.
   *
   * jueves → miércoles
   */
  fechasSemana: string[] = [];


  /*
   * Horario que el administrador
   * está configurando.
   */
  hora = '';


  /*
   * Formato seleccionado.
   *
   * Ejemplo:
   * 2D
   * 3D
   */
  formato = '';


  /*
   * Idioma seleccionado.
   *
   * Ejemplo:
   * Castellano
   * Subtitulado
   */
  idioma = '';


  /*
   * Próximas semanas disponibles
   * para programar.
   */
  semanasDisponibles: {
    inicio: string;
    fin: string;
    descripcion: string;
  }[] = [];


  /*
   * Esta es nuestra "mesa de trabajo".
   *
   * Cada vez que el administrador agregue
   * una función, se incorporará a este array.
   *
   * Todavía no estamos guardando nada
   * en Supabase.
   */
  programacionTemporal:
    FuncionTemporal[] = [];


  constructor(
  private peliculaService: PeliculaService,
  private salaService: SalaService,
  private funcionService: FuncionService,
  private changeDetectorRef: ChangeDetectorRef
) {}


  /*
 * Devuelve el objeto completo de la
 * película seleccionada actualmente.
 *
 * En el select solamente guardamos el ID,
 * pero para conocer formatos e idiomas
 * necesitamos acceder a toda la película.
 */
obtenerPeliculaSeleccionada(): Pelicula | undefined {

  return this.peliculas.find(
    pelicula =>
      pelicula.id === this.peliculaIdSeleccionada
  );
}


/*
 * Devuelve solamente los formatos
 * habilitados para la película seleccionada.
 *
 * Ejemplo:
 *
 * Dune:
 * formatos = ['2D', '3D']
 *
 * Entonces el select de Funciones
 * solamente mostrará 2D y 3D.
 */
obtenerFormatosDisponibles(): string[] {

  const pelicula =
    this.obtenerPeliculaSeleccionada();

  if (!pelicula) {
    return [];
  }

  return pelicula.formatos;
}


/*
 * Devuelve solamente los idiomas
 * habilitados para la película seleccionada.
 */
obtenerIdiomasDisponibles(): string[] {

  const pelicula =
    this.obtenerPeliculaSeleccionada();

  if (!pelicula) {
    return [];
  }

  return pelicula.idiomas;
}


/*
 * Cada vez que cambiamos de película,
 * limpiamos formato e idioma.
 *
 * Esto evita conservar una opción
 * perteneciente a la película anterior.
 */
alCambiarPelicula(): void {

  this.formato = '';
  this.idioma = '';
}

  /*
   * Se ejecuta cuando Angular
   * carga esta pantalla.
   */
  async ngOnInit(): Promise<void> {

    /*
     * Obtenemos las películas
     * desde Supabase.
     */
    this.peliculas =
      await this.peliculaService
        .obtenerPeliculas();


    /*
     * Obtenemos las salas activas
     * desde Supabase.
     */
    this.salas =
      await this.salaService
        .obtenerSalasActivas();


    /*
     * Generamos las semanas que
     * aparecerán en el dropdown.
     */
    this.generarSemanasDisponibles();


    /*
     * Actualizamos la vista después
     * de las operaciones asíncronas.
     */
    this.changeDetectorRef
      .detectChanges();

  }


  /*
   * Genera los siete días de la
   * semana cinematográfica seleccionada.
   *
   * jueves → miércoles
   */
  generarSemana(): void {

    if (!this.fechaInicioSemana) {

      this.fechasSemana = [];

      return;

    }


    const partes =
      this.fechaInicioSemana.split('-');


    const anio =
      Number(partes[0]);

    const mes =
      Number(partes[1]) - 1;

    const dia =
      Number(partes[2]);


    const fechaInicio =
      new Date(
        anio,
        mes,
        dia
      );


    /*
     * JavaScript representa:
     *
     * 0 = Domingo
     * 1 = Lunes
     * 2 = Martes
     * 3 = Miércoles
     * 4 = Jueves
     * 5 = Viernes
     * 6 = Sábado
     *
     * El dropdown ya ofrece solamente
     * jueves, pero dejamos la validación
     * como segunda barrera.
     */
    if (fechaInicio.getDay() !== 4) {

      alert(
        'La programación semanal debe comenzar un jueves.'
      );

      this.fechaInicioSemana = '';

      this.fechasSemana = [];

      return;

    }


    this.fechasSemana = [];


    /*
     * Generamos siete días.
     */
    for (let i = 0; i < 7; i++) {

      const fecha =
        new Date(fechaInicio);


      fecha.setDate(
        fechaInicio.getDate() + i
      );


      this.fechasSemana.push(
        this.convertirFechaAString(fecha)
      );

    }

      /*
      * Una vez construida la semana,
      * buscamos si ya existe programación
      * guardada para ella.
      */
      this.cargarProgramacionGuardada();

    

  }



  /*
   * Genera las próximas 12 semanas
   * disponibles.
   *
   * Todas comienzan un jueves.
   */
  generarSemanasDisponibles(): void {

    this.semanasDisponibles = [];


    const hoy =
      new Date();


    /*
     * Calculamos cuántos días faltan
     * hasta el próximo jueves.
     *
     * Si hoy es jueves:
     * resultado = 0.
     */
    const diasHastaJueves =
      (4 - hoy.getDay() + 7) % 7;


    const primerJueves =
      new Date(hoy);


    primerJueves.setDate(
      hoy.getDate() + diasHastaJueves
    );


    /*
     * Generamos doce semanas.
     */
    for (let i = 0; i < 12; i++) {

      const inicio =
        new Date(primerJueves);


      inicio.setDate(
        primerJueves.getDate() + (i * 7)
      );


      /*
       * La semana termina
       * seis días después:
       *
       * jueves + 6 = miércoles.
       */
      const fin =
        new Date(inicio);


      fin.setDate(
        inicio.getDate() + 6
      );


      const inicioTexto =
        this.convertirFechaAString(inicio);


      const finTexto =
        this.convertirFechaAString(fin);


      this.semanasDisponibles.push({

        inicio: inicioTexto,

        fin: finTexto,

        descripcion:
          `${this.formatearFecha(inicioTexto)} → ${this.formatearFecha(finTexto)}`

      });

    }

  }


  /*
   * Convierte un objeto Date:
   *
   * Date
   *
   * a:
   *
   * YYYY-MM-DD
   *
   * Este formato es cómodo para
   * trabajar internamente y después
   * guardar en Supabase.
   */
  convertirFechaAString(
    fecha: Date
  ): string {

    const anio =
      fecha.getFullYear();


    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const dia =
      String(
        fecha.getDate()
      ).padStart(
        2,
        '0'
      );


    return `${anio}-${mes}-${dia}`;

  }


  /*
   * Convierte:
   *
   * 2026-09-24
   *
   * en:
   *
   * 24/09/2026
   *
   * Solamente cambia la forma
   * de mostrar la fecha.
   */
  formatearFecha(
    fecha: string
  ): string {

    const [
      anio,
      mes,
      dia
    ] = fecha.split('-');


    return `${dia}/${mes}/${anio}`;

  }

  agregarFuncionTemporal(): void {

  /*
   * Primero verificamos que el administrador
   * haya completado todos los datos.
   */
  if (
    !this.fechaInicioSemana ||
    this.peliculaIdSeleccionada === null ||
    this.salaIdSeleccionada === null ||
    !this.hora ||
    !this.formato ||
    !this.idioma
  ) {

    alert(
      'Completá todos los datos de la función.'
    );

    return;
  }


  /*
   * Las funciones de CineBera comienzan
   * a partir de las 17:00.
   */
  if (this.hora < '17:00') {

    alert(
      'Las funciones deben comenzar a partir de las 17:00.'
    );

    return;
  }


  /*
   * Buscamos los objetos completos porque
   * hasta ahora solamente tenemos sus IDs.
   */
  const pelicula =
    this.peliculas.find(
      pelicula =>
        pelicula.id === this.peliculaIdSeleccionada
    );


  const sala =
    this.salas.find(
      sala =>
        sala.id === this.salaIdSeleccionada
    );


  if (!pelicula || !sala) {

    alert(
      'No se pudo encontrar la película o la sala seleccionada.'
    );

    return;    
  }

  /*
 * Segunda barrera de seguridad:
 *
 * aunque el HTML solamente muestre opciones
 * permitidas, verificamos también desde TS.
 */
if (
  !pelicula.formatos.includes(
    this.formato as any
  )
) {

  alert(
    'El formato seleccionado no está habilitado para esta película.'
  );

  return;
}


if (
  !pelicula.idiomas.includes(
    this.idioma
  )
) {

  alert(
    'El idioma seleccionado no está habilitado para esta película.'
  );

  return;
}

  /*
 * Antes de agregar la función,
 * verificamos que la sala realmente
 * esté disponible.
 */
const disponible =
  this.horarioDisponible(
    sala.id,
    this.hora,
    pelicula.duracion
  );


if (!disponible) {

  alert(
    'Ese horario se superpone con otra función de la misma sala.'
  );

  return;

}

  

  /*
   * Calculamos cuándo termina la película.
   */
  const horaFin =
    this.calcularHoraFinal(
      this.hora,
      pelicula.duracion
    );


  /*
   * Después de terminar una película,
   * la sala necesita 30 minutos antes
   * de comenzar otra función.
   */
  const salaDisponibleDesde =
    this.calcularHoraFinal(
      horaFin,
      30
    );


  /*
   * Creamos la función temporal.
   *
   * Todavía NO va a Supabase.
   */
  const nuevaFuncion: FuncionTemporal = {

    peliculaId:
      pelicula.id,

    peliculaTitulo:
      pelicula.titulo,

    salaId:
      sala.id,

    salaNombre:
      sala.nombre,

    hora:
      this.hora,

    duracion:
      pelicula.duracion,

    horaFin:
      horaFin,

    salaDisponibleDesde:
      salaDisponibleDesde,

    formato:
      this.formato,

    idioma:
      this.idioma,

    guardada: false

  };


  /*
   * La agregamos a nuestra programación
   * temporal de Angular.
   */
  this.programacionTemporal.push(
    nuevaFuncion
  );


  /*
   * Ordenamos primero por sala
   * y después por horario.
   *
   * Así la programación será más
   * fácil de visualizar.
   */
  this.programacionTemporal.sort(
    (a, b) => {

      if (a.salaId !== b.salaId) {
        return a.salaId - b.salaId;
      }

      return a.hora.localeCompare(
        b.hora
      );

    }
  );


  /*
   * Limpiamos solamente los datos
   * propios de la función.
   *
   * Conservamos semana, película y sala
   * para poder cargar otro horario rápido.
   */
  this.hora = '';
  this.formato = '';
  this.idioma = '';

}

/*
 * Convierte una hora HH:mm a minutos.
 *
 * Ejemplo:
 *
 * 17:30
 *
 * 17 * 60 + 30 = 1050 minutos
 *
 * Esto hace mucho más fácil comparar horarios.
 */
convertirHoraAMinutos(
  hora: string
): number {

  const [
    horas,
    minutos
  ] = hora
    .split(':')
    .map(Number);

  return (
    horas * 60
  ) + minutos;

}

async cargarProgramacionGuardada(): Promise<void> {

  if (!this.fechaInicioSemana) {
    return;
  }

  const { data, error } =
    await this.funcionService.obtenerFuncionesPorFecha(
      this.fechaInicioSemana
    );

  console.log('Fecha consultada:', this.fechaInicioSemana);
console.log('Funciones recibidas:', data);
console.log('Error Supabase:', error);

  if (error) {
    console.error(
      'Error cargando programación:',
      error
    );
    return;
  }

  this.programacionTemporal = [];

  for (const fila of data ?? []) {

    const pelicula = this.peliculas.find(
      pelicula => pelicula.id === fila.pelicula_id
    );

    const sala = this.salas.find(
      sala => sala.id === fila.sala_id
    );

    if (!pelicula || !sala) {
      continue;
    }

    const hora = fila.hora.substring(0, 5);

    const horaFin =
      this.calcularHoraFinal(
        hora,
        pelicula.duracion
      );

    const salaDisponibleDesde =
      this.calcularHoraFinal(
        horaFin,
        30
      );

    this.programacionTemporal.push({
      peliculaId: pelicula.id,
      peliculaTitulo: pelicula.titulo,
      salaId: sala.id,
      salaNombre: sala.nombre,
      hora: hora,
      duracion: pelicula.duracion,
      horaFin: horaFin,
      salaDisponibleDesde: salaDisponibleDesde,
      formato: fila.formato,
      idioma: fila.idioma,
      guardada: true
    });
  }

  this.changeDetectorRef.detectChanges();
}



/*
 * Verifica si la nueva función puede
 * utilizar la sala en ese horario.
 *
 * Devuelve:
 *
 * true  → horario disponible
 * false → existe un conflicto
 */
horarioDisponible(
  salaId: number,
  horaNueva: string,
  duracionNueva: number
): boolean {

  const inicioNuevo =
    this.convertirHoraAMinutos(
      horaNueva
    );

  const finNuevo =
    inicioNuevo +
    duracionNueva +
    30;


  /*
   * Solamente nos interesan las funciones
   * que pertenecen a la misma sala.
   */
  const funcionesMismaSala =
    this.programacionTemporal.filter(
      funcion =>
        funcion.salaId === salaId
    );


  for (
    const funcionExistente
    of funcionesMismaSala
  ) {

    const inicioExistente =
      this.convertirHoraAMinutos(
        funcionExistente.hora
      );


    /*
     * Incluimos los 30 minutos necesarios
     * para preparar nuevamente la sala.
     */
    const finExistente =
      inicioExistente +
      funcionExistente.duracion +
      30;


    /*
     * Dos intervalos se superponen cuando:
     *
     * inicio A < fin B
     *
     * Y
     *
     * fin A > inicio B
     */
    const existeConflicto =
      inicioNuevo < finExistente &&
      finNuevo > inicioExistente;


    if (existeConflicto) {

      return false;

    }

  }


  return true;

}

/*
 * Suma minutos a una hora.
 *
 * También controla el cambio de día.
 *
 * Ejemplo:
 *
 * 23:00 + 180 minutos
 *
 * matemáticamente serían 26:00,
 * pero en formato reloj corresponde:
 *
 * 02:00 del día siguiente.
 */
calcularHoraFinal(
  horaInicial: string,
  minutosAgregar: number
): string {

  const [
    horas,
    minutos
  ] = horaInicial
    .split(':')
    .map(Number);


  const minutosTotales =
    (horas * 60) +
    minutos +
    minutosAgregar;


  /*
   * Un día tiene:
   *
   * 24 * 60 = 1440 minutos.
   *
   * El operador % hace que, si pasamos
   * las 24 horas, volvamos a comenzar
   * desde 00:00.
   */
  const minutosDentroDelDia =
    minutosTotales % (24 * 60);


  const horaFinal =
    Math.floor(
      minutosDentroDelDia / 60
    );


  const minutoFinal =
    minutosDentroDelDia % 60;


  return (
    String(horaFinal).padStart(2, '0') +
    ':' +
    String(minutoFinal).padStart(2, '0')
  );

}

/*
 * Permite sacar una función de la
 * programación antes de confirmarla.
 */
async eliminarFuncionTemporal(
  funcion: FuncionTemporal
): Promise<void> {

  /*
   * CASO 1:
   * La función todavía no fue guardada.
   *
   * Solamente existe en el array de Angular,
   * así que alcanza con quitarla de memoria.
   */
  if (!funcion.guardada) {

    this.programacionTemporal =
      this.programacionTemporal.filter(
        item => item !== funcion
      );

    return;
  }


  /*
   * CASO 2:
   * La función ya existe en Supabase.
   *
   * Antes de modificar la base de datos,
   * pedimos confirmación.
   */
  const confirmar = confirm(
    `¿Querés eliminar ${funcion.peliculaTitulo} ` +
    `de ${funcion.salaNombre} a las ${funcion.hora}?`
  );

  if (!confirmar) {
    return;
  }


  /*
   * Necesitamos conocer el inicio y el final
   * de la semana cinematográfica.
   */
  if (this.fechasSemana.length !== 7) {

    alert(
      'No se pudo determinar la semana seleccionada.'
    );

    return;
  }

  const fechaInicio =
    this.fechasSemana[0];

  const fechaFin =
    this.fechasSemana[6];


  /*
   * No borramos físicamente los registros.
   * Los marcamos como inactivos.
   */
  const { error } =
    await this.funcionService
      .desactivarFuncionSemanal(
        funcion.peliculaId,
        funcion.salaId,
        funcion.hora,
        fechaInicio,
        fechaFin
      );


  if (error) {

    console.error(
      'Error desactivando función:',
      error
    );

    alert(
      'No se pudo eliminar la función.'
    );

    return;
  }


  /*
   * Volvemos a consultar Supabase.
   *
   * Así la pantalla siempre refleja
   * el estado real de la base de datos.
   */
  await this.cargarProgramacionGuardada();

  alert(
    'Función eliminada correctamente.'
  );
}

/*
 * Devuelve las funciones temporales
 * correspondientes a una sala.
 *
 * Ejemplo:
 *
 * Sala 1
 *   → 17:00 Dune
 *   → 20:30 Superman
 *
 * Sala 2
 *   → 18:00 F1
 *
 * No modifica el array original.
 * Solamente filtra lo que necesitamos mostrar.
 */
obtenerFuncionesDeSala(
  salaId: number
): FuncionTemporal[] {

  return this.programacionTemporal
    .filter(
      funcion =>
        funcion.salaId === salaId
    )
    .sort(
      (a, b) =>
        a.hora.localeCompare(b.hora)
    );

}

/*
 * Convierte la programación temporal
 * en funciones reales y las guarda
 * en Supabase.
 */
async guardarProgramacionSemanal(): Promise<void> {

  /*
   * Debemos tener una semana seleccionada.
   */
  if (this.fechasSemana.length !== 7) {

    alert(
      'Seleccioná una semana válida antes de guardar.'
    );

    return;
  }


  /*
   * Debe existir por lo menos
   * una función configurada.
   */
  if (this.programacionTemporal.length === 0) {

    alert(
      'Agregá al menos una función antes de guardar.'
    );

    return;
  }


  /*
   * Acá construiremos los registros
   * que finalmente irán a Supabase.
   */
  const funcionesParaGuardar:
    NuevaFuncionSupabase[] = [];

    const funcionesNuevas =
    this.programacionTemporal.filter(
      funcion => !funcion.guardada
    );

    if (funcionesNuevas.length === 0) {
      alert(
        'No hay funciones nuevas para guardar.'
      );
      return;
    }


  /*
   * Recorremos cada función configurada.
   *
   * Ejemplo:
   *
   * Dune
   * Sala 1
   * 17:00
   */
  for (
  const funcion
  of funcionesNuevas
) {

    /*
     * Por cada configuración,
     * recorremos los siete días.
     */
    for (
      const fecha
      of this.fechasSemana
    ) {

      funcionesParaGuardar.push({

        pelicula_id:
          funcion.peliculaId,

        sala_id:
          funcion.salaId,

        fecha:
          fecha,

        hora:
          funcion.hora,

        formato:
          funcion.formato,

        idioma:
          funcion.idioma,

        activa:
          true

      });

    }

  }


  /*
   * Antes de guardar podemos ver
   * exactamente qué estamos enviando.
   *
   * Esto es útil durante desarrollo.
   */
  console.log(
    'Funciones para guardar:',
    funcionesParaGuardar
  );


  /*
   * Enviamos todo el array
   * al servicio.
   */
  const {
    data,
    error
  } =
    await this.funcionService
      .crearFunciones(
        funcionesParaGuardar
      );


  /*
   * Si Supabase devuelve un error,
   * no limpiamos la programación.
   *
   * Así el administrador no pierde
   * lo que estaba configurando.
   */
  if (error) {

    console.error(
      'Error guardando programación:',
      error
    );

    alert(
      'No se pudo guardar la programación.'
    );

    return;

  }


  /*
   * Si llegamos acá significa que
   * Supabase aceptó los registros.
   */
  console.log(
    'Programación guardada:',
    data
  );


  alert(
    'Programación semanal guardada correctamente.'
  );


  /*
   * Limpiamos la mesa de trabajo.
   *
   * No borramos la semana seleccionada
   * por ahora.
   */
  await this.cargarProgramacionGuardada();

}

}