import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { Resena, ResumenResenas, VentaPelicula } from '../models/resena';
import { Pelicula } from '../models/pelicula';

@Injectable({ providedIn: 'root' })
export class ResenaService {
  async obtener(peliculaId: number): Promise<Resena[]> {
    // Paginamos para que el límite REST no trunque el listado ni el promedio local.
    const filas: Resena[] = [];
    for (let desde = 0; ; desde += 500) {
      const { data, error } = await supabase.from('resenas').select('*').eq('pelicula_id', peliculaId)
        .order('created_at', { ascending: false }).order('usuario_id').range(desde, desde + 499);
      if (error) throw new Error('No se pudieron cargar las reseñas.');
      filas.push(...(data ?? []));
      if ((data ?? []).length < 500) return filas;
    }
  }

  async guardar(peliculaId: number, estrellas: number, comentario: string, editar: boolean): Promise<void> {
    if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5 || !comentario.trim() || comentario.trim().length > 300)
      throw new Error('Elegí entre 1 y 5 estrellas y escribí un comentario de hasta 300 caracteres.');
    const { data: { user }, error: sesionError } = await supabase.auth.getUser();
    if (sesionError || !user || user.is_anonymous) throw new Error('Iniciá sesión con tu cuenta para escribir una reseña.');
    const datos = { estrellas, comentario: comentario.trim() };
    // La clave compuesta y RLS también protegen contra duplicados y escrituras ajenas.
    const consulta = editar
      ? supabase.from('resenas').update(datos).eq('pelicula_id', peliculaId).eq('usuario_id', user.id)
      : supabase.from('resenas').insert({ ...datos, pelicula_id: peliculaId, usuario_id: user.id });
    const { data, error } = await consulta.select('pelicula_id').single();
    if (error || !data) throw new Error(error?.code === '23505'
      ? 'Ya tenés una reseña. Recargá la lista para editarla.' : 'No se pudo guardar la reseña. Volvé a cargar e intentá nuevamente.');
  }

  async obtenerResumen(ids: number[]): Promise<ResumenResenas[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('resenas_resumen').select('*').in('pelicula_id', ids);
    if (error) throw new Error('No se pudieron cargar las valoraciones CineBera.');
    return (data ?? []).map(r => ({...r, promedio: Number(r.promedio), cantidad: Number(r.cantidad)}));
  }

  async obtenerVentas(ids: number[]): Promise<VentaPelicula[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('ranking_peliculas').select('*').in('pelicula_id', ids)
      .order('entradas_vendidas', { ascending: false }).order('pelicula_id').limit(3);
    if (error) throw new Error('No se pudo cargar el Top 3.');
    return (data ?? []).map(r => ({...r, entradas_vendidas: Number(r.entradas_vendidas)}));
  }

  filtrar(peliculas: Pelicula[], texto: string, genero: string): Pelicula[] {
    const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    return peliculas.filter(p => normalizar(p.titulo).includes(normalizar(texto)) && (!genero || p.generos.includes(genero)));
  }

  ordenar(peliculas: Pelicula[], ventas: VentaPelicula[]): Pelicula[] {
    const cantidades = new Map(ventas.map(v => [v.pelicula_id, v.entradas_vendidas]));
    return [...peliculas].sort((a,b) => (cantidades.get(b.id) ?? 0) - (cantidades.get(a.id) ?? 0) || a.id - b.id);
  }
}
