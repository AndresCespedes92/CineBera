import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { ItemCarritoCandy } from '../models/item-carrito-candy';
import { ProductoCandy } from '../models/producto-candy';
import { PedidoCandy } from '../models/pedido-candy';
import { SeleccionCombo } from '../models/combo';
import { CategoriaCandy } from '../models/categoria-candy';

@Injectable({ providedIn: 'root' })
export class CandyService {
  async obtenerCategorias(): Promise<CategoriaCandy[]> {
    const { data, error } = await supabase.from('categorias_candy').select('id,nombre,activo').order('nombre');
    if (error) throw new Error('No se pudieron cargar las categorías.');
    return data ?? [];
  }

  async obtenerProductosAdmin(): Promise<ProductoCandy[]> {
    const { data, error } = await supabase.from('productos_candy').select('*').order('nombre');
    if (error) throw new Error('No se pudieron cargar los productos.');
    return (data ?? []).map(p => ({ id: p.id, categoriaId: p.categoria_id, nombre: p.nombre,
      descripcion: p.descripcion, precio: Number(p.precio), imagenUrl: p.imagen_url, activo: p.activo }));
  }

  private async validarAdministrador(): Promise<void> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) throw new Error('Iniciá sesión como administrador.');
    const perfil = await supabase.from('perfiles').select('rol').eq('id', data.user.id).single();
    if (perfil.error || perfil.data?.rol !== 'admin') throw new Error('Se requiere rol administrador.');
  }

  async guardarProducto(producto: Omit<ProductoCandy, 'id'>, id?: number): Promise<void> {
    const nombre = producto.nombre.trim();
    const descripcion = producto.descripcion?.trim() || null;
    const imagen = producto.imagenUrl?.trim() || null;
    if (!nombre || nombre.length > 80 || (descripcion?.length ?? 0) > 500 ||
        !Number.isFinite(producto.precio) || producto.precio <= 0 || producto.precio > 99999999.99 ||
        Math.abs(producto.precio * 100 - Math.round(producto.precio * 100)) > 0.00001) {
      throw new Error('Ingresá nombre (hasta 80 caracteres), descripción (hasta 500) y precio positivo con hasta dos decimales.');
    }
    if (imagen) {
      try { if (!['http:', 'https:'].includes(new URL(imagen).protocol)) throw new Error(); }
      catch { throw new Error('La imagen debe ser una URL http o https válida.'); }
    }
    await this.validarAdministrador();
    const categorias = await this.obtenerCategorias();
    if (!categorias.some(c => c.id === producto.categoriaId)) throw new Error('Elegí una categoría existente.');
    const datos = { nombre, descripcion, precio: producto.precio, imagen_url: imagen,
      categoria_id: producto.categoriaId, activo: producto.activo };
    const resultado = id
      ? await supabase.from('productos_candy').update(datos).eq('id', id).select('id').maybeSingle()
      : await supabase.from('productos_candy').insert(datos).select('id').single();
    if (resultado.error || !resultado.data) throw new Error('No se pudo guardar el producto.');
  }

  async guardarCategoria(categoria: Omit<CategoriaCandy, 'id'>, id?: number): Promise<void> {
    const nombre = categoria.nombre.trim();
    if (!nombre || nombre.length > 80) throw new Error('Ingresá un nombre de categoría de hasta 80 caracteres.');
    await this.validarAdministrador();
    const categorias = await this.obtenerCategorias();
    const anterior = categorias.find(c => c.id === id);
    if (id && !anterior) throw new Error('La categoría ya no existe.');
    if (anterior && ['Pochoclos', 'Bebidas'].includes(anterior.nombre) && nombre !== anterior.nombre) {
      throw new Error('Pochoclos y Bebidas conservan su nombre porque los utilizan los combos.');
    }
    if (categorias.some(c => c.id !== id && c.nombre.toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'))) {
      throw new Error('Ya existe una categoría con ese nombre.');
    }
    const datos = { nombre, activo: categoria.activo };
    const resultado = id
      ? await supabase.from('categorias_candy').update(datos).eq('id', id).select('id').maybeSingle()
      : await supabase.from('categorias_candy').insert(datos).select('id').single();
    if (resultado.error || !resultado.data) throw new Error('No se pudo guardar la categoría.');
  }

  async cambiarEstadoProducto(id: number, activo: boolean): Promise<void> {
    await this.validarAdministrador();
    const { data, error } = await supabase.from('productos_candy').update({ activo }).eq('id', id).select('id').maybeSingle();
    if (error || !data) throw new Error('No se pudo cambiar el estado del producto.');
  }

  async cambiarEstadoCategoria(id: number, activo: boolean): Promise<void> {
    await this.validarAdministrador();
    const { data, error } = await supabase.from('categorias_candy').update({ activo }).eq('id', id).select('id').maybeSingle();
    if (error || !data) throw new Error('No se pudo cambiar el estado de la categoría.');
  }

  // El borrador pertenece a una reserva y sobrevive a la navegación y recarga.
  obtenerSeleccion(token: string): ItemCarritoCandy[] {
    try {
      const items = JSON.parse(sessionStorage.getItem(`cinebera-candy-${token}`) ?? '[]');
      return Array.isArray(items) ? items.filter(i => Number.isInteger(i?.producto?.id) && Number.isInteger(i.cantidad) && i.cantidad > 0) : [];
    } catch { return []; }
  }

  guardarSeleccion(token: string, items: ItemCarritoCandy[]): void {
    sessionStorage.setItem(`cinebera-candy-${token}`, JSON.stringify(items));
  }

  limpiarSeleccion(token: string): void { sessionStorage.removeItem(`cinebera-candy-${token}`); }

  async prepararPedidoCheckout(compraId: number, items: ItemCarritoCandy[], seleccion?: SeleccionCombo | null): Promise<void> {
    await this.validarCompra(compraId, 'pendiente');
    const existente = await this.obtenerPedidoPorCompra(compraId);
    if (existente?.estado === 'pagado') throw new Error('Este pedido ya fue pagado.');
    if (!existente && !items.length && !seleccion) return;
    if (items.some(i => !Number.isInteger(i.cantidad) || i.cantidad <= 0)) throw new Error('Cantidad Candy inválida.');
    const productos = items.length || seleccion ? await this.obtenerProductosActivos() : [];
    const detalles: { producto_id: number; cantidad: number; precio_unitario: number; subtotal: number; cantidad_combo?: number }[] = items.map(item => {
      const producto = productos.find(p => p.id === item.producto.id);
      if (!producto || producto.precio !== item.producto.precio) throw new Error('Cambió el catálogo Candy. Volvé a Candy para revisar la selección.');
      return { producto_id: producto.id, cantidad: item.cantidad, precio_unitario: producto.precio,
        subtotal: Math.round(producto.precio * item.cantidad * 100) / 100 };
    });
    if (seleccion) {
      if (!Number.isInteger(seleccion.cantidad) || seleccion.cantidad < 1) throw new Error('Cantidad de combos inválida.');
      for (const id of [seleccion.combo.pochoclo_id, seleccion.combo.bebida_id]) {
        const producto = productos.find(p => p.id === id);
        if (!producto) throw new Error('Un producto del combo ya no está disponible.');
        const detalle = detalles.find(d => d.producto_id === id);
        if (detalle) {
          detalle.cantidad += seleccion.cantidad;
          detalle.cantidad_combo = seleccion.cantidad;
        } else {
          detalles.push({ producto_id: id, cantidad: seleccion.cantidad, cantidad_combo: seleccion.cantidad,
            precio_unitario: producto.precio, subtotal: 0 });
        }
      }
    }
    const total = Math.round(detalles.reduce((s, d) => s + d.subtotal, 0) * 100) / 100;
    // Mientras reemplazamos detalles, el pedido no puede pagarse ni entregarse.
    let id = existente?.id;
    const cabecera = id
      ? await supabase.from('pedidos_candy').update({ estado: 'cancelado', total }).eq('id', id).neq('estado', 'pagado').select('id').maybeSingle()
      : await supabase.from('pedidos_candy').insert({ compra_id: compraId, estado: 'cancelado', total, entregado: false }).select('id').single();
    if (cabecera.error || !cabecera.data) throw new Error('No se pudo preparar Candy. Reintentá desde el checkout.');
    id = cabecera.data.id;
    const borrado = await supabase.from('detalles_pedido_candy').delete().eq('pedido_candy_id', id!);
    if (borrado.error) throw new Error('No se pudo actualizar Candy. Reintentá desde el checkout.');
    if (detalles.length) {
      const guardado = await supabase.from('detalles_pedido_candy').insert(detalles.map(d => ({ ...d, pedido_candy_id: id })));
      if (guardado.error) throw new Error('No se pudo guardar Candy. Reintentá desde el checkout.');
      const listo = await supabase.from('pedidos_candy').update({ estado: 'pendiente' }).eq('id', id!).eq('estado', 'cancelado').select('id').maybeSingle();
      if (listo.error || !listo.data) throw new Error('No se pudo completar Candy. Reintentá desde el checkout.');
    }
  }
  async obtenerProductosActivos(): Promise<ProductoCandy[]> {
    const { data, error } = await supabase.from('productos_candy').select('*,categorias_candy!inner(activo)')
      .eq('activo', true).eq('categorias_candy.activo', true).order('nombre');
    if (error) throw new Error('No se pudo cargar el catálogo Candy.');
    return (data ?? []).map(fila => ({
      id: fila.id, categoriaId: fila.categoria_id, nombre: fila.nombre,
      descripcion: fila.descripcion, precio: Number(fila.precio), imagenUrl: fila.imagen_url, activo: fila.activo
    }));
  }

  /** Conserva un pedido por compra. Un reintento recupera el pedido persistido. */
  async crearPedido(compraId: number, carrito: ItemCarritoCandy[], _total: number): Promise<number | null> {
    await this.validarCompra(compraId);
    if (!carrito.length || carrito.some(item => !Number.isInteger(item.cantidad) || item.cantidad <= 0)) return null;
    const existente = await this.obtenerPedidoPorCompra(compraId);
    if (existente && (existente.estado !== 'pendiente' || existente.detalles.length > 0)) return existente.id;
    const productos = await this.obtenerProductosActivos();
    const detalles = carrito.map(item => {
      const producto = productos.find(p => p.id === item.producto.id);
      if (!producto) throw new Error('Uno de los productos ya no está disponible.');
      return { producto_id: producto.id, cantidad: item.cantidad, precio_unitario: producto.precio,
        subtotal: Math.round(producto.precio * item.cantidad * 100) / 100 };
    });
    const total = Math.round(detalles.reduce((suma, item) => suma + item.subtotal, 0) * 100) / 100;
    let pedidoId = existente?.id;
    if (pedidoId) {
      const recuperacion = await supabase.from('pedidos_candy').update({ total })
        .eq('id', pedidoId).eq('estado', 'pendiente').select('id').maybeSingle();
      if (recuperacion.error || !recuperacion.data) throw new Error('No se pudo recuperar el pedido pendiente.');
    }
    if (!pedidoId) {
      const { data, error } = await supabase.from('pedidos_candy')
        .insert({ compra_id: compraId, estado: 'pendiente', total, entregado: false }).select().single();
      if (error || !data) throw new Error('No se pudo confirmar el pedido. Recargá antes de intentar nuevamente.');
      pedidoId = data.id as number;
    }
    // El array completo de detalles se guarda en un único INSERT.
    // Si falla, queda una cabecera pendiente que puede recuperarse, nunca entregarse.
    const resultado = await supabase.from('detalles_pedido_candy')
      .insert(detalles.map(item => ({ ...item, pedido_candy_id: pedidoId })));
    if (resultado.error) throw new Error('Faltan confirmar los productos del pedido. Recargá y revisá el pedido antes de pagar.');
    return pedidoId;
  }

  async obtenerPedidoPorCompra(compraId: number): Promise<PedidoCandy | null> {
    const { data: pedido, error } = await supabase.from('pedidos_candy').select('*').eq('compra_id', compraId).maybeSingle();
    if (error) throw new Error('No se pudo consultar el pedido Candy.');
    if (!pedido) return null;
    const detalles = await supabase.from('detalles_pedido_candy')
      .select('id,producto_id,cantidad,cantidad_combo,precio_unitario,subtotal,productos_candy(nombre)').eq('pedido_candy_id', pedido.id);
    if (detalles.error) throw new Error('No se pudieron consultar los productos del pedido.');
    return {
      id: pedido.id, compraId: pedido.compra_id, estado: pedido.estado, total: Number(pedido.total),
      entregado: pedido.entregado, entregadoAt: pedido.entregado_at,
      detalles: (detalles.data ?? []).map(detalle => {
        // La relación muchos-a-uno llega como objeto; admitimos el array del tipado genérico.
        const producto = detalle.productos_candy as unknown as { nombre: string } | { nombre: string }[];
        return { id: detalle.id, productoId: detalle.producto_id,
          nombreProducto: (Array.isArray(producto) ? producto[0]?.nombre : producto?.nombre) ?? 'Producto',
          cantidad: detalle.cantidad, cantidadCombo: detalle.cantidad_combo ?? 0,
          precioUnitario: Number(detalle.precio_unitario), subtotal: Number(detalle.subtotal) };
      })
    };
  }

  /** El TP simula el pago. Solo el importe de un pedido pagado genera puntos. */
  async confirmarPagoPedido(compraId: number): Promise<PedidoCandy> {
    await this.validarCompra(compraId);
    const pedido = await this.obtenerPedidoPorCompra(compraId);
    if (!pedido || !pedido.detalles.length || pedido.estado === 'cancelado') throw new Error('El pedido no está listo para pagar.');
    if (pedido.estado === 'pagado') return pedido;
    const total = Math.round(pedido.detalles.reduce((suma, detalle) => suma + detalle.subtotal, 0) * 100) / 100;
    const { data, error } = await supabase.from('pedidos_candy')
      .update({ estado: 'pagado', total }).eq('id', pedido.id).eq('estado', 'pendiente').select().maybeSingle();
    if (error || !data) throw new Error('No se pudo confirmar el pago Candy. Recargá para consultar su estado.');
    return { ...pedido, estado: 'pagado', total };
  }

  private async validarCompra(compraId: number, estado = 'pagada'): Promise<void> {
    const { data, error } = await supabase.from('compras').select('usuario_id,estado').eq('id', compraId).single();
    if (error || !data || data.estado !== estado) throw new Error('La compra no está disponible para esta operación.');
    if (data.usuario_id) {
      const sesion = await supabase.auth.getSession();
      if (sesion.data.session?.user.id !== data.usuario_id) throw new Error('El pedido pertenece a otra cuenta.');
    }
  }

  async entregarPedido(pedidoId: number): Promise<PedidoCandy | null> {
    const pedido = await supabase.from('pedidos_candy').select('compra_id').eq('id',pedidoId).single();
    if(pedido.error || !pedido.data) throw new Error('No se pudo comprobar el pedido.');
    const compra = await supabase.from('compras').select('estado').eq('id',pedido.data.compra_id).single();
    if(compra.error || compra.data?.estado !== 'pagada') throw new Error('La compra no está pagada o fue cancelada.');
    const { data, error } = await supabase.from('pedidos_candy')
      .update({ entregado: true, entregado_at: new Date().toISOString() })
      .eq('id', pedidoId).eq('estado', 'pagado').eq('entregado', false).select().maybeSingle();
    if (error) throw new Error('No se pudo confirmar la entrega Candy.');
    if (!data) return null;
    return this.obtenerPedidoPorCompra(data.compra_id);
  }
}
