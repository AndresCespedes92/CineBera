import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { FilaReporte, ReporteVentas } from '../models/reporte';

interface CompraReporte {
  id: number; total: number | string; pagada_at: string; reserva_token: string; funcion_id: number;
  pedidos_candy: { estado: string; total: number | string }[] | { estado: string; total: number | string } | null;
}
export function fechaBuenosAires(fecha = new Date()): string {
  return new Date(fecha.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}
export function validarPeriodo(desde: string, hasta: string): string[] {
  const fechaValida = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f) &&
    Number.isFinite(Date.parse(f)) && new Date(f).toISOString().slice(0, 10) === f;
  if (!fechaValida(desde) || !fechaValida(hasta) || desde > hasta) throw new Error('Ingresá un rango de fechas válido.');
  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400000 + 1;
  if (dias > 366) throw new Error('Consultá como máximo 366 días por reporte.');
  return Array.from({length: dias}, (_, i) => new Date(Date.parse(desde) + i * 86400000).toISOString().slice(0, 10));
}
const vacia = (fecha: string): FilaReporte => ({fecha, compras: 0, entradas: 0, entradasCombos: 0, candy: 0, total: 0});
const centavos = (n: number | string) => {
  const valor = Number(n);
  if (!Number.isFinite(valor) || valor < 0) throw new Error('Hay un importe inválido en las ventas.');
  return Math.round(valor * 100);
};

@Injectable({providedIn: 'root'})
export class ReporteService {
  async obtener(desde: string, hasta: string): Promise<ReporteVentas> {
    const dias = validarPeriodo(desde, hasta);
    const usuario = await supabase.auth.getUser();
    if (usuario.error || !usuario.data.user || usuario.data.user.is_anonymous) throw new Error('Iniciá sesión como administrador.');
    const perfil = await supabase.from('perfiles').select('rol').eq('id', usuario.data.user.id).single();
    if (perfil.error || perfil.data?.rol !== 'admin') throw new Error('Se requiere rol administrador.');
    const fin = new Date(Date.parse(hasta) + 86400000).toISOString().slice(0, 10);
    const compras: CompraReporte[] = [];
    // Paginación estable por ID: no truncar reportes al límite de Supabase.
    let ultimo = 0;
    for (;;) {
      const r = await supabase.from('compras')
        .select('id,total,pagada_at,reserva_token,funcion_id,pedidos_candy(estado,total)')
        .eq('estado', 'pagada').gte('pagada_at', desde + 'T00:00:00-03:00')
        .lt('pagada_at', fin + 'T00:00:00-03:00').gt('id', ultimo).order('id').limit(500);
      if (r.error) throw new Error('No se pudieron consultar las ventas.');
      const pagina = (r.data ?? []) as unknown as CompraReporte[];
      compras.push(...pagina);
      if (pagina.length < 500) break;
      ultimo = pagina[pagina.length - 1].id;
    }
    const cantidades = new Map<string, number>();
    for (let inicio = 0; inicio < compras.length; inicio += 100) {
      const tokens = compras.slice(inicio, inicio + 100).map(c => c.reserva_token);
      let ultimoId = 0;
      for (;;) {
        const r = await supabase.from('butacas_funcion').select('id,funcion_id,reserva_token')
          .eq('estado', 'ocupada').in('reserva_token', tokens).gt('id', ultimoId).order('id').limit(500);
        if (r.error) throw new Error('No se pudo consultar la cantidad de entradas.');
        const pagina = r.data ?? [];
        for (const b of pagina) {
          const clave = b.funcion_id + ':' + b.reserva_token;
          cantidades.set(clave, (cantidades.get(clave) ?? 0) + 1);
        }
        if (pagina.length < 500) break;
        ultimoId = pagina[pagina.length - 1].id;
      }
    }
    const filas = dias.map(vacia);
    const porDia = new Map(filas.map(f => [f.fecha, f]));
    let comprasSinButacas = 0;
    for (const c of compras) {
      const fila = porDia.get(fechaBuenosAires(new Date(c.pagada_at)));
      if (!fila) throw new Error('Una venta tiene fecha fuera del período.');
      const pedidos = Array.isArray(c.pedidos_candy) ? c.pedidos_candy : c.pedidos_candy ? [c.pedidos_candy] : [];
      fila.compras++;
      const entradas = cantidades.get(c.funcion_id + ':' + c.reserva_token) ?? 0;
      if (!entradas) comprasSinButacas++;
      fila.entradas += entradas;
      fila.entradasCombos += centavos(c.total);
      fila.candy += pedidos.filter(p => p.estado === 'pagado').reduce((s, p) => s + centavos(p.total), 0);
    }
    const totales = vacia('TOTAL');
    for (const fila of filas) {
      fila.total = fila.entradasCombos + fila.candy;
      for (const campo of ['compras', 'entradas', 'entradasCombos', 'candy', 'total'] as const) totales[campo] += fila[campo];
    }
    for (const fila of [...filas, totales]) {
      fila.entradasCombos /= 100; fila.candy /= 100; fila.total /= 100;
    }
    return {desde, hasta, comprasSinButacas, generado: new Date().toISOString(), filas, totales};
  }
}
