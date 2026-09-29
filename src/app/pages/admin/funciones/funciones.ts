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

import { SolicitudFuncion, FuncionGuardada } from '../../../models/funcion';

import {
  SalaService
} from '../../../services/sala';


/*
 * Representa una función que el administrador
 * está armando en pantalla.
 *
 * Puede ser un borrador (id y salaId nulos) o una función ya guardada.
 *
 * Es similar a un producto agregado a un carrito:
 * existe temporalmente hasta que el usuario
 * confirma toda la programación semanal.
 */
interface FuncionTemporal {

  peliculaId: number;

  peliculaTitulo: string;

  id: number | null;

  fecha: string;

  salaId: number | null;

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


  fechasSeleccionadas: string[] = [];
  cargando = true;
  guardando = false;
  errorCarga = '';
  mensaje = '';
  resultadoGuardado: string[] = [];


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
  await this.cargarDatos();
}

/* Se puede reintentar una carga fallida sin cambiar la semana ni perder borradores. */
async cargarDatos(): Promise<void> {
  this.cargando = true;
  this.errorCarga = '';
  try {
    this.generarSemanasDisponibles();
    if (!this.fechaInicioSemana && this.semanasDisponibles.length) {
      this.fechaInicioSemana = this.semanasDisponibles[0].inicio;
    }
    this.peliculas = await this.peliculaService.obtenerPeliculas();
    this.salas = await this.salaService.obtenerSalasActivas(true);
    await this.generarSemana();
  } catch {
    this.errorCarga = 'No se pudieron cargar los datos de programación. Volvé a intentar.';
  } finally {
    this.cargando = false;
    this.changeDetectorRef.detectChanges();
  }
}

  /*
   * Genera los siete días de la
   * semana cinematográfica seleccionada.
   *
   * jueves → miércoles
   */
  async generarSemana(): Promise<void> {
    this.resultadoGuardado = [];
    this.mensaje = '';

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
      this.fechasSeleccionadas = [...this.fechasSemana];
      await this.cargarProgramacionGuardada();

    

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
   * Queremos encontrar el jueves
   * que inició la semana cinematográfica
   * ACTUAL.
   *
   * La semana del cine es:
   *
   * jueves → miércoles
   *
   * Ejemplo:
   *
   * Hoy: miércoles 23/09/2026
   *
   * Semana actual:
   * 17/09/2026 → 23/09/2026
   */
  const diaActual =
    hoy.getDay();


  /*
   * getDay() devuelve:
   *
   * domingo   = 0
   * lunes     = 1
   * martes    = 2
   * miércoles = 3
   * jueves    = 4
   * viernes   = 5
   * sábado    = 6
   *
   * Calculamos cuántos días debemos
   * retroceder hasta el último jueves.
   */
  const diasDesdeJueves =
    (diaActual - 4 + 7) % 7;


  /*
   * Creamos una copia de la fecha actual.
   *
   * No modificamos "hoy" directamente.
   */
  const primerJueves =
    new Date(hoy);


  /*
   * Retrocedemos hasta el jueves
   * que inició la semana actual.
   */
  primerJueves.setDate(
    hoy.getDate() - diasDesdeJueves
  );


  /*
   * Generamos doce semanas comenzando
   * por la semana cinematográfica actual.
   */
  for (let i = 0; i < 12; i++) {

    /*
     * Inicio de cada semana.
     */
    const inicio =
      new Date(primerJueves);


    inicio.setDate(
      primerJueves.getDate() + (i * 7)
    );


    /*
     * Cada semana termina seis días
     * después del jueves:
     *
     * jueves + 6 días = miércoles.
     */
    const fin =
      new Date(inicio);


    fin.setDate(
      inicio.getDate() + 6
    );


    /*
     * Convertimos las fechas al formato
     * utilizado por nuestra aplicación
     * y Supabase.
     */
    const inicioTexto =
      this.convertirFechaAString(inicio);


    const finTexto =
      this.convertirFechaAString(fin);


    /*
     * Agregamos la semana al selector.
     */
    this.semanasDisponibles.push({

      inicio:
        inicioTexto,

      fin:
        finTexto,

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

  /* Una solicitud por fecha; la sala permanece pendiente hasta el guardado. */
  agregarFuncionTemporal(): void {
    if (this.cargando || this.guardando || this.errorCarga) return;
    const pelicula = this.obtenerPeliculaSeleccionada();
    if (!pelicula || !this.hora || !this.formato || !this.idioma ||
        this.fechasSeleccionadas.length === 0) {
      this.mensaje = 'Seleccioná película, días, horario, formato e idioma.';
      return;
    }
    if (this.hora < '17:00') {
      this.mensaje = 'Las funciones deben comenzar a partir de las 17:00.';
      return;
    }
    if (!pelicula.formatos.some(formato => formato === this.formato) ||
        !pelicula.idiomas.includes(this.idioma) || pelicula.duracion <= 0) {
      this.mensaje = 'Revisá la duración, el formato y el idioma de la película.';
      return;
    }
    for (const fecha of this.fechasSemana.filter(dia => this.fechasSeleccionadas.includes(dia))) {
      this.programacionTemporal.push({
        id: null, fecha, peliculaId: pelicula.id, peliculaTitulo: pelicula.titulo,
        salaId: null, salaNombre: 'Se asignará al guardar', hora: this.hora,
        duracion: pelicula.duracion,
        horaFin: this.calcularFinal(fecha, this.hora, pelicula.duracion),
        salaDisponibleDesde: this.calcularFinal(fecha, this.hora, pelicula.duracion + 30),
        formato: this.formato, idioma: this.idioma, guardada: false
      });
    }
    this.hora = '';
    this.formato = '';
    this.idioma = '';
    this.mensaje = '';
    this.resultadoGuardado = [];
  }

  seleccionarDia(fecha: string, seleccionado: boolean): void {
    this.fechasSeleccionadas = seleccionado
      ? [...this.fechasSeleccionadas, fecha]
      : this.fechasSeleccionadas.filter(dia => dia !== fecha);
  }

  nombreDia(fecha: string): string {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long' });
  }

  /* Este cálculo es sólo presentación. FuncionService calcula la disponibilidad.
   * Mostramos también la fecha final para no ocultar cruces de medianoche. */
  calcularFinal(fecha: string, hora: string, minutos: number): string {
    const final = new Date(fecha + 'T' + hora);
    final.setMinutes(final.getMinutes() + minutos);
    return this.formatearFecha(this.convertirFechaAString(final)) + ' ' +
      String(final.getHours()).padStart(2, '0') + ':' +
      String(final.getMinutes()).padStart(2, '0');
  }

  private representarFuncion(fila: FuncionGuardada): FuncionTemporal {
    const pelicula = this.peliculas.find(p => p.id === fila.pelicula_id);
    const sala = this.salas.find(s => s.id === fila.sala_id);
    return {
      id: fila.id, fecha: fila.fecha, peliculaId: fila.pelicula_id,
      peliculaTitulo: pelicula?.titulo ?? 'Película #' + fila.pelicula_id,
      salaId: fila.sala_id, salaNombre: sala?.nombre ?? 'Sala #' + fila.sala_id,
      hora: fila.hora.substring(0, 5), duracion: pelicula?.duracion ?? 0,
      horaFin: pelicula ? this.calcularFinal(fila.fecha, fila.hora, pelicula.duracion) : 'Sin duración',
      salaDisponibleDesde: pelicula ? this.calcularFinal(fila.fecha, fila.hora, pelicula.duracion + 30) : 'Sin duración',
      formato: fila.formato, idioma: fila.idioma, guardada: true
    };
  }

  async cargarProgramacionGuardada(): Promise<void> {
    if (this.fechasSemana.length !== 7) return;
    this.cargando = true;
    this.errorCarga = '';
    try {
      const { data, error } = await this.funcionService.obtenerFuncionesSemana(
        this.fechasSemana[0], this.fechasSemana[6]
      );
      if (error) throw error;
      // Las funciones históricas de una sala desactivada también deben verse.
      for (const fila of data ?? []) {
        if (!this.salas.some(sala => sala.id === fila.sala_id)) {
          this.salas.push({ id: fila.sala_id, nombre: 'Sala ' + fila.sala_id, activa: false });
        }
      }
      // Conservamos los borradores si se recarga después de una baja individual.
      this.programacionTemporal = [
        ...this.obtenerPendientes(),
        ...(data ?? []).map(fila => this.representarFuncion(fila as FuncionGuardada))
      ];
    } catch {
      this.errorCarga = 'No se pudo cargar la programación. Volvé a intentar.';
    } finally {
      this.cargando = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  obtenerPendientes(): FuncionTemporal[] {
    return this.programacionTemporal.filter(funcion => !funcion.guardada);
  }

  obtenerFuncionesDeSala(salaId: number): FuncionTemporal[] {
    return this.programacionTemporal.filter(funcion => funcion.salaId === salaId)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  }

  async eliminarFuncionTemporal(funcion: FuncionTemporal): Promise<void> {
    if (this.guardando || this.cargando) return;
    if (!funcion.guardada) {
      this.programacionTemporal = this.programacionTemporal.filter(item => item !== funcion);
      return;
    }
    if (!confirm('¿Desactivar ' + funcion.peliculaTitulo + ' el ' +
        this.formatearFecha(funcion.fecha) + ' a las ' + funcion.hora +
        ' en ' + funcion.salaNombre + '? Las demás fechas se conservan.')) return;
    this.guardando = true;
    try {
      const { data, error } = await this.funcionService.desactivarFuncion(funcion.id!);
      if (error || !data) throw error;
      this.programacionTemporal = this.programacionTemporal.filter(item => item !== funcion);
      this.mensaje = 'Función desactivada correctamente.';
    } catch {
      this.mensaje = 'No se pudo desactivar la función. Recargá la programación.';
    } finally {
      this.guardando = false;
      this.changeDetectorRef.detectChanges();
    }
  }

  async guardarProgramacionSemanal(): Promise<void> {
    if (this.guardando || this.cargando || this.errorCarga) return;
    const pendientes = this.obtenerPendientes();
    if (!pendientes.length) return;
    const solicitudes: SolicitudFuncion[] = pendientes.map(funcion => ({
      pelicula_id: funcion.peliculaId, fecha: funcion.fecha, hora: funcion.hora,
      formato: funcion.formato, idioma: funcion.idioma
    }));
    this.guardando = true;
    this.mensaje = '';
    this.resultadoGuardado = [];
    try {
      const { data, error } = await this.funcionService.crearFunciones(solicitudes);
      if (error) {
        this.mensaje = error.message;
        return;
      }
      if (!data || data.length !== pendientes.length) {
        this.mensaje = 'La respuesta está incompleta. Recargá la programación antes de reintentar.';
        return;
      }
      const asignadas = (data ?? []).map(fila => this.representarFuncion(fila));
      this.programacionTemporal = [
        ...this.programacionTemporal.filter(funcion => funcion.guardada), ...asignadas
      ];
      this.resultadoGuardado = asignadas.map(funcion =>
        this.nombreDia(funcion.fecha) + ' ' + this.formatearFecha(funcion.fecha) +
        ' ' + funcion.hora + ' — Sala asignada automáticamente: ' + funcion.salaNombre
      );
      this.mensaje = 'Programación guardada correctamente.';
    } catch {
      this.mensaje = 'No se pudo confirmar el resultado. Recargá la programación antes de reintentar.';
    } finally {
      this.guardando = false;
      this.changeDetectorRef.detectChanges();
    }
  }
}
