import {
  Injectable
} from '@angular/core';

import {
  supabase
} from '../supabase';

import {
  NuevaFuncionSupabase, SolicitudFuncion, FuncionGuardada
} from '../models/funcion';

import { SalaService } from './sala';
import { Sala } from '../models/sala';

/* Los intervalos incluyen la media hora de preparación de la sala. */
interface OcupacionSala {
  salaId: number;
  inicio: Date;
  fin: Date;
}

interface FuncionConDuracion {
  sala_id: number;
  fecha: string;
  hora: string;
  peliculas: { duracion: number } | null;
}

@Injectable({
  providedIn: 'root'
})
export class FuncionService {


  constructor(private salaService: SalaService) {}

  async crearFuncion(funcion: SolicitudFuncion) {
    const { data, error } = await this.crearFunciones([funcion]);
    return { data: data?.[0] ?? null, error };
  }

  /* Primero planificamos TODO en memoria. Si una fecha no tiene sala,
   * salimos sin ejecutar ningún insert. Las lecturas son nuevas en cada guardado.
   * Dos administradores simultáneos todavía pueden consultar el mismo estado:
   * esa carrera es una limitación conocida de esta solución académica. */
  async crearFunciones(solicitudes: SolicitudFuncion[]): Promise<{
    data: FuncionGuardada[] | null;
    error: { message: string } | null;
  }> {
    let funcionesParaGuardar: NuevaFuncionSupabase[];
    try {
      if (!solicitudes.length) throw new Error('Agregá al menos una función.');
      const salas = await this.salaService.obtenerSalasActivas(true);
      const { data: peliculas, error } = await supabase.from('peliculas')
        .select('id, duracion, formatos, idiomas')
        .in('id', solicitudes.map(solicitud => solicitud.pelicula_id));
      if (error) throw new Error('No se pudieron obtener las películas. Volvé a intentar.');
      const ocupaciones = await this.obtenerOcupaciones();
      funcionesParaGuardar = [];

      for (const solicitud of solicitudes) {
        const pelicula = peliculas?.find(pelicula => pelicula.id === solicitud.pelicula_id);
        if (!pelicula || !Number.isFinite(pelicula.duracion) || pelicula.duracion <= 0) {
          throw new Error('La película no existe o no tiene una duración válida.');
        }
        if (!pelicula.formatos?.includes(solicitud.formato) ||
            !pelicula.idiomas?.includes(solicitud.idioma)) {
          throw new Error('El formato o idioma no está habilitado para la película.');
        }
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(solicitud.hora) || solicitud.hora < '17:00') {
          throw new Error('Indicá un horario válido a partir de las 17:00.');
        }
        const intervalo = this.calcularIntervalo(solicitud.fecha, solicitud.hora, pelicula.duracion);
        const sala = this.buscarSalaDisponible(salas, ocupaciones, intervalo.inicio, intervalo.fin);
        if (!sala) {
          const dia = intervalo.inicio.toLocaleDateString('es-AR', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
          });
          throw new Error('No hay una sala disponible para ' + dia + ' a las ' +
            solicitud.hora + '. No se guardó ninguna función del lote.');
        }
        funcionesParaGuardar.push({
          pelicula_id: solicitud.pelicula_id, fecha: solicitud.fecha, hora: solicitud.hora,
          formato: solicitud.formato, idioma: solicitud.idioma, sala_id: sala.id, activa: true
        });
        // La próxima solicitud debe considerar también esta asignación pendiente.
        ocupaciones.push({ salaId: sala.id, inicio: intervalo.inicio, fin: intervalo.fin });
      }
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message :
        'No se pudo consultar la disponibilidad. No se guardó ninguna función.' } };
    }

    // Un solo insert del array; no guardamos mientras seguimos buscando salas.
    try {
      const { data, error } = await supabase.from('funciones')
        .insert(funcionesParaGuardar).select();
      if (error) return { data: null, error: {
        message: 'No se pudo guardar la programación. Recargá antes de reintentar.'
      } };
      return { data: data as FuncionGuardada[] | null, error: null };
    } catch {
      // Una interrupción de red puede dejar el resultado desconocido para el navegador.
      return { data: null, error: { message:
        'No se pudo confirmar el guardado. Recargá la programación antes de reintentar.' } };
    }
  }

  /* for prueba cada sala en orden. some devuelve true apenas encuentra
   * una función que se superpone. Los límites iguales NO son conflicto. */
  buscarSalaDisponible(salas: Sala[], ocupaciones: OcupacionSala[], inicio: Date, fin: Date): Sala | null {
    for (const sala of salas) {
      const tieneConflicto = ocupaciones.some(funcion =>
        funcion.salaId === sala.id && inicio < funcion.fin && fin > funcion.inicio
      );
      if (!tieneConflicto) return sala;
    }
    return null;
  }

  private calcularIntervalo(fecha: string, hora: string, duracion: number): { inicio: Date; fin: Date } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?$/.test(hora) ||
        !Number.isFinite(duracion) || duracion <= 0) {
      throw new Error('Hay una fecha, horario o duración inválida. Revisá la programación.');
    }
    const inicio = new Date(fecha + 'T' + hora);
    const [anio, mes, dia] = fecha.split('-').map(Number);
    if (Number.isNaN(inicio.getTime()) || inicio.getFullYear() !== anio ||
        inicio.getMonth() + 1 !== mes || inicio.getDate() !== dia) {
      throw new Error('Hay una fecha inválida. Revisá la programación.');
    }
    const fin = new Date(inicio);
    fin.setMinutes(fin.getMinutes() + duracion + 30);
    return { inicio, fin };
  }

  /* Incluimos todas las fechas: una película del día anterior puede terminar
   * en el siguiente. Leemos por páginas para no ignorar funciones si Supabase
   * limita una respuesta a 1000 filas. No consultamos sólo el primer jueves. */
  private async obtenerOcupaciones(): Promise<OcupacionSala[]> {
    const ocupaciones: OcupacionSala[] = [];
    const tamanioPagina = 1000;
    for (let desde = 0; ; desde += tamanioPagina) {
      const { data, error } = await supabase.from('funciones')
        .select('sala_id, fecha, hora, peliculas(duracion)')
        .eq('activa', true).order('id').range(desde, desde + tamanioPagina - 1);
      if (error || !data) throw new Error('No se pudieron obtener las funciones. Volvé a intentar.');
      const funciones = data as unknown as FuncionConDuracion[];
      for (const funcion of funciones) {
        if (funcion.sala_id == null || !funcion.peliculas) {
          throw new Error('Hay una función sin sala o película. Revisá la programación.');
        }
        const intervalo = this.calcularIntervalo(funcion.fecha, funcion.hora, funcion.peliculas.duracion);
        ocupaciones.push({ salaId: funcion.sala_id, inicio: intervalo.inicio, fin: intervalo.fin });
      }
      if (funciones.length < tamanioPagina) break;
    }
    return ocupaciones;
  }

  /*
   * Obtiene todas las funciones
   * ordenadas por fecha.
   */
  async obtenerFunciones() {

    return await supabase
      .from('funciones')
      .select('*')
      .order(
        'fecha',
        {
          ascending: true
        }
      );

  }

  async obtenerFuncionesPorFecha(fecha: string) {
  return await supabase
    .from('funciones')
    .select('*')
    .eq('fecha', fecha)
    .eq('activa', true)
    .order('sala_id', { ascending: true })
    .order('hora', { ascending: true });
}

/* Cada fecha puede tener una sala diferente: la baja se hace por ID. */
async desactivarFuncion(id: number) {
  return await supabase.from('funciones').update({ activa: false })
    .eq('id', id).eq('activa', true).select('id').maybeSingle();
}

/*
 * Obtiene todas las funciones activas
 * desde una fecha determinada.
 *
 * Lo vamos a usar para construir
 * la cartelera del cliente.
 *
 * Ejemplo:
 *
 * hoy = 2026-09-23
 *
 * traerá funciones:
 * 23/09
 * 24/09
 * 25/09
 * ...
 *
 * pero no funciones anteriores.
 */
async obtenerFuncionesActivasDesde(
  fecha: string
) {

  return await supabase
    .from('funciones')
    .select('*')
    .eq('activa', true)
    .gte('fecha', fecha)
    .order(
      'fecha',
      {
        ascending: true
      }
    )
    .order(
      'hora',
      {
        ascending: true
      }
    );

}

/*
 * Obtiene las funciones activas de una
 * película desde una fecha determinada.
 *
 * Se utiliza cuando el cliente entra a:
 *
 * /pelicula/:id/funciones
 */
async obtenerFuncionesPorPelicula(
  peliculaId: number,
  fechaDesde: string
) {

  return await supabase
    .from('funciones')
    .select('*')
    .eq('pelicula_id', peliculaId)
    .eq('activa', true)
    .gte('fecha', fechaDesde)
    .order('fecha', {
      ascending: true
    })
    .order('hora', {
      ascending: true
    });

}

/*
 * Obtiene las funciones activas que pertenecen
 * únicamente a una semana cinematográfica.
 *
 * La semana de CineBera funciona:
 *
 * jueves -> miércoles
 *
 * Ejemplo:
 *
 * 17/09/2026 -> 23/09/2026
 */
async obtenerFuncionesSemana(
  fechaInicio: string,
  fechaFin: string
) {

  return await supabase
    .from('funciones')
    .select('*')
    .eq('activa', true)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', {
      ascending: true
    })
    .order('hora', {
      ascending: true
    });

}

async obtenerFuncionPorId(
  idFuncion: number
): Promise<any | null> {

  const { data, error } = await supabase
    .from('funciones')
    .select('*')
    .eq('id', idFuncion)
    .single();

  if (error) {
    console.error(
      'Error al obtener la función:',
      error
    );

    return null;
  }

  return data;
}




}