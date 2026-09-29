import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { validarPeriodo } from './reporte';
import { DatoGrafico, Estadisticas } from '../models/grafico';

export function periodoGrafico(fecha: string, tipo: 'semana' | 'mes') {
  validarPeriodo(fecha, fecha);
  if (tipo !== 'semana' && tipo !== 'mes') throw new Error('Elegí semana o mes.');
  const inicio = new Date(fecha);
  const fin = new Date(fecha);
  if (tipo === 'semana') {
    inicio.setUTCDate(inicio.getUTCDate() - (inicio.getUTCDay() + 6) % 7);
    fin.setTime(inicio.getTime() + 6 * 86400000);
  } else {
    inicio.setUTCDate(1); fin.setUTCMonth(fin.getUTCMonth() + 1, 0);
  }
  return {desde: inicio.toISOString().slice(0, 10), hasta: fin.toISOString().slice(0, 10), tipo};
}
export function ordenarGrafico(datos: DatoGrafico[]): DatoGrafico[] {
  return datos.sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es') || a.id - b.id);
}
interface ButacaEstadistica {
  id: number; funcion_id: number; reserva_token: string | null;
  funciones: { fecha: string; pelicula_id: number; peliculas: {titulo: string} | null };
}
interface DetalleEstadistica { id: number; producto_id: number; cantidad: number; productos_candy: {nombre: string} | null; }

@Injectable({providedIn: 'root'})
export class EstadisticaService {
  async obtener(fecha: string, tipo: 'semana' | 'mes'): Promise<Estadisticas> {
    const periodo = periodoGrafico(fecha, tipo);
    const usuario = await supabase.auth.getUser();
    if (usuario.error || !usuario.data.user || usuario.data.user.is_anonymous) throw new Error('Iniciá sesión como administrador.');
    const perfil = await supabase.from('perfiles').select('rol').eq('id', usuario.data.user.id).single();
    if (perfil.error || perfil.data?.rol !== 'admin') throw new Error('Se requiere rol administrador.');
    const butacas: ButacaEstadistica[] = [];
    let ultimo = 0;
    for (;;) {
      const r = await supabase.from('butacas_funcion')
        .select('id,funcion_id,reserva_token,funciones!inner(fecha,pelicula_id,peliculas(titulo))')
        .eq('estado', 'ocupada').gte('funciones.fecha', periodo.desde).lte('funciones.fecha', periodo.hasta)
        .gt('id', ultimo).order('id').limit(500);
      if (r.error) throw new Error('No se pudieron consultar las butacas vendidas.');
      const pagina = (r.data ?? []) as unknown as ButacaEstadistica[];
      butacas.push(...pagina);
      if (pagina.length < 500) break;
      ultimo = pagina[pagina.length - 1].id;
    }
    const tokens = [...new Set(butacas.map(b => b.reserva_token).filter((t): t is string => !!t))];
    const pagadas = new Set<string>();
    for (let i = 0; i < tokens.length; i += 100) {
      let ultimoId = 0;
      for (;;) {
        const r = await supabase.from('compras').select('id,reserva_token,funcion_id')
          .eq('estado', 'pagada').in('reserva_token', tokens.slice(i, i + 100)).gt('id', ultimoId).order('id').limit(500);
        if (r.error) throw new Error('No se pudo verificar el estado de las compras.');
        const pagina = r.data ?? [];
        for (const c of pagina) pagadas.add(c.funcion_id + ':' + c.reserva_token);
        if (pagina.length < 500) break;
        ultimoId = pagina[pagina.length - 1].id;
      }
    }
    const peliculas = new Map<number, DatoGrafico>();
    for (const b of butacas) {
      if (!pagadas.has(b.funcion_id + ':' + b.reserva_token)) continue;
      const id = b.funciones.pelicula_id;
      const fila = peliculas.get(id) ?? {id, nombre: b.funciones.peliculas?.titulo ?? 'Película #' + id, cantidad: 0};
      fila.cantidad++; peliculas.set(id, fila);
    }
    const candy = new Map<number, DatoGrafico>();
    const fin = new Date(Date.parse(periodo.hasta) + 86400000).toISOString().slice(0, 10);
    ultimo = 0;
    for (;;) {
      const r = await supabase.from('detalles_pedido_candy')
        .select('id,producto_id,cantidad,productos_candy(nombre),pedidos_candy!inner(estado,compras!inner(estado,pagada_at))')
        .eq('pedidos_candy.estado', 'pagado').eq('pedidos_candy.compras.estado', 'pagada')
        .gte('pedidos_candy.compras.pagada_at', periodo.desde + 'T00:00:00-03:00')
        .lt('pedidos_candy.compras.pagada_at', fin + 'T00:00:00-03:00').gt('id', ultimo).order('id').limit(500);
      if (r.error) throw new Error('No se pudieron consultar las ventas Candy.');
      const pagina = (r.data ?? []) as unknown as DetalleEstadistica[];
      for (const d of pagina) {
        if (!Number.isSafeInteger(d.cantidad) || d.cantidad <= 0) throw new Error('Hay cantidades Candy inválidas.');
        const fila = candy.get(d.producto_id) ?? {id: d.producto_id, nombre: d.productos_candy?.nombre ?? 'Producto #' + d.producto_id, cantidad: 0};
        // cantidad ya incluye unidades del combo; no sumar cantidad_combo otra vez.
        fila.cantidad += d.cantidad; candy.set(d.producto_id, fila);
      }
      if (pagina.length < 500) break;
      ultimo = pagina[pagina.length - 1].id;
    }
    return {...periodo, peliculas: ordenarGrafico([...peliculas.values()]), candy: ordenarGrafico([...candy.values()])};
  }
}
