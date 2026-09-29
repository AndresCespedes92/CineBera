import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { Combo, SeleccionCombo } from '../models/combo';
import { Compra } from '../models/compra';
import { PedidoCandy } from '../models/pedido-candy';

export interface ProductoCombo { id: number; nombre: string; categoria: string; }

@Injectable({ providedIn: 'root' })
export class ComboService {
  async obtenerTodos(): Promise<Combo[]> {
    const { data, error } = await supabase.from('combos').select('*').order('id');
    if (error) throw new Error('No se pudieron cargar los combos.');
    return (data ?? []).map(c => ({ ...c, precio: Number(c.precio) }));
  }

  async obtenerProductos(): Promise<ProductoCombo[]> {
    const { data, error } = await supabase.from('productos_candy')
      .select('id,nombre,categorias_candy!inner(nombre,activo)').eq('activo', true).eq('categorias_candy.activo', true).order('nombre');
    if (error) throw new Error('No se pudieron cargar los productos para combos.');
    return (data ?? []).map(p => {
      const categoria = p.categorias_candy as unknown as { nombre: string };
      return { id: p.id, nombre: p.nombre, categoria: categoria.nombre };
    });
  }

  async obtenerDisponibles(): Promise<Combo[]> {
    const combos = await this.obtenerTodos();
    const productos = await this.obtenerProductos();
    return combos.filter(c => c.activo && this.productosValidos(c, productos));
  }

  private productosValidos(combo: Omit<Combo, 'id'>, productos: ProductoCombo[]): boolean {
    return productos.some(p => p.id === combo.pochoclo_id && p.categoria === 'Pochoclos') &&
      productos.some(p => p.id === combo.bebida_id && p.categoria === 'Bebidas');
  }

  async guardar(combo: Omit<Combo, 'id'>, id?: number): Promise<void> {
    if (!combo.nombre.trim() || combo.nombre.trim().length > 80 || !Number.isFinite(combo.precio) || combo.precio <= 0 ||
        Math.abs(combo.precio * 100 - Math.round(combo.precio * 100)) > 0.00001) {
      throw new Error('Ingresá nombre y precio mayor a cero, con hasta dos decimales.');
    }
    if (!this.productosValidos(combo, await this.obtenerProductos())) throw new Error('Elegí un pochoclo y una bebida activos.');
    const datos = { nombre: combo.nombre.trim(), precio: combo.precio, pochoclo_id: combo.pochoclo_id, bebida_id: combo.bebida_id, activo: combo.activo };
    const resultado = id
      ? await supabase.from('combos').update(datos).eq('id', id).select('id').maybeSingle()
      : await supabase.from('combos').insert(datos).select('id').single();
    if (resultado.error || !resultado.data) throw new Error('No se pudo guardar el combo. Verificá tu sesión de administrador.');
  }

  async cambiarEstado(id: number, activo: boolean): Promise<void> {
    const { data, error } = await supabase.from('combos').update({ activo }).eq('id', id).select('id').maybeSingle();
    if (error || !data) throw new Error('No se pudo cambiar el estado del combo.');
  }

  guardarSeleccion(token: string, seleccion: SeleccionCombo | null): void {
    if (seleccion) sessionStorage.setItem(`cinebera-combo-${token}`, JSON.stringify(seleccion));
    else sessionStorage.removeItem(`cinebera-combo-${token}`);
  }

  obtenerSeleccion(token: string): SeleccionCombo | null {
    try {
      const s = JSON.parse(sessionStorage.getItem(`cinebera-combo-${token}`) ?? 'null');
      return s && Number.isInteger(s.combo?.id) && Number.isInteger(s.cantidad) && s.cantidad > 0 ? s : null;
    } catch { return null; }
  }

  async validarSeleccion(seleccion: SeleccionCombo, entradas: number): Promise<void> {
    this.validarCantidad(seleccion.cantidad, entradas);
    const actual = (await this.obtenerDisponibles()).find(c => c.id === seleccion.combo.id);
    if (!actual || actual.precio !== seleccion.combo.precio || actual.pochoclo_id !== seleccion.combo.pochoclo_id ||
      actual.bebida_id !== seleccion.combo.bebida_id || actual.nombre !== seleccion.combo.nombre) {
      throw new Error('El combo cambió o ya no está disponible. Actualizá los combos y seleccioná nuevamente.');
    }
  }

  private validarCantidad(cantidad: number, entradas: number): void {
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > entradas) throw new Error('No podés elegir más combos que entradas.');
  }

  /** Cada combo reemplaza una entrada, empezando por las de mayor precio.
   * El precio fijo ya incluye VIP; las promociones solo afectan las restantes. */
  calcularImportes(precios: number[], porcentaje: number, seleccion: SeleccionCombo | null) {
    if (seleccion) this.validarCantidad(seleccion.cantidad, precios.length);
    const cantidad = seleccion?.cantidad ?? 0;
    const subtotal = [...precios].sort((a, b) => b - a).slice(cantidad).reduce((s, p) => s + p, 0);
    const descuento = Math.round(subtotal * porcentaje) / 100;
    const combos = Math.round((seleccion?.combo.precio ?? 0) * cantidad * 100) / 100;
    return { entradas: Math.round((subtotal - descuento) * 100) / 100, descuento, combos,
      total: Math.round((subtotal - descuento + combos) * 100) / 100 };
  }

  validarPedido(compra: Compra, pedido: PedidoCandy | null): void {
    if (!compra.combo_id) {
      if (pedido?.detalles.some(d => (d.cantidadCombo ?? 0) > 0)) throw new Error('El pedido todavía contiene un combo anterior. Volvé al checkout.');
      return;
    }
    if (!pedido || pedido.estado === 'cancelado' || !compra.combo_cantidad ||
      ![compra.combo_pochoclo_id, compra.combo_bebida_id].every(id => pedido.detalles.some(d =>
        d.productoId === id && d.cantidadCombo === compra.combo_cantidad && d.cantidad >= (d.cantidadCombo ?? 0)))) {
      throw new Error('Faltan los productos del combo. Volvé al checkout para completar la compra.');
    }
  }
}
