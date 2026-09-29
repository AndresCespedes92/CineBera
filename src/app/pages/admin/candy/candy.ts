import { MatButtonModule } from '@angular/material/button';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandyService } from '../../../services/candy';
import { ProductoCandy } from '../../../models/producto-candy';
import { CategoriaCandy } from '../../../models/categoria-candy';

@Component({ selector: 'app-admin-candy', imports: [MatButtonModule, FormsModule, RouterLink],
  templateUrl: './candy.html', styleUrl: '../recompensas/recompensas.css' })
export class AdminCandy implements OnInit {
  productos = signal<ProductoCandy[]>([]);
  categorias = signal<CategoriaCandy[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  mensaje = signal('');
  productoId?: number;
  categoriaId?: number;
  producto = this.nuevoProducto();
  categoria = { nombre: '', activo: true };
  constructor(private candy: CandyService) {}

  private nuevoProducto(): Omit<ProductoCandy, 'id'> {
    return { nombre: '', categoriaId: 0, descripcion: '', precio: 0, imagenUrl: '', activo: true };
  }
  async ngOnInit(): Promise<void> { await this.cargar(); }
  async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    try {
      const [productos, categorias] = await Promise.all([this.candy.obtenerProductosAdmin(), this.candy.obtenerCategorias()]);
      this.productos.set(productos); this.categorias.set(categorias);
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cargar Candy.'); }
    finally { this.cargando.set(false); }
  }
  nombreCategoria(id: number): string {
    const categoria = this.categorias().find(c => c.id === id);
    return categoria ? categoria.nombre + (categoria.activo ? '' : ' (inactiva)') : 'Categoría no disponible';
  }
  categoriaProtegida(): boolean {
    return this.categorias().some(c => c.id === this.categoriaId && ['Pochoclos', 'Bebidas'].includes(c.nombre));
  }
  editarProducto(p: ProductoCandy): void { this.productoId = p.id; this.producto = { ...p }; this.mensaje.set(''); }
  editarCategoria(c: CategoriaCandy): void { this.categoriaId = c.id; this.categoria = { ...c }; this.mensaje.set(''); }
  cancelarProducto(): void { this.productoId = undefined; this.producto = this.nuevoProducto(); }
  cancelarCategoria(): void { this.categoriaId = undefined; this.categoria = { nombre: '', activo: true }; }

  private async ejecutar(accion: () => Promise<void>, mensaje: string): Promise<void> {
    if (this.guardando() || this.cargando()) return;
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try { await accion(); this.mensaje.set(mensaje); await this.cargar(); }
    catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo guardar el cambio.'); }
    finally { this.guardando.set(false); }
  }
  async guardarProducto(): Promise<void> {
    await this.ejecutar(async () => {
      await this.candy.guardarProducto(this.producto, this.productoId); this.cancelarProducto();
    }, 'Producto guardado.');
  }
  async guardarCategoria(): Promise<void> {
    await this.ejecutar(async () => {
      await this.candy.guardarCategoria(this.categoria, this.categoriaId); this.cancelarCategoria();
    }, 'Categoría guardada.');
  }
  async cambiarProducto(p: ProductoCandy): Promise<void> {
    await this.ejecutar(async () => {
      await this.candy.cambiarEstadoProducto(p.id, !p.activo);
      if (this.productoId === p.id) this.producto.activo = !p.activo;
    }, 'Estado del producto actualizado.');
  }
  async cambiarCategoria(c: CategoriaCandy): Promise<void> {
    await this.ejecutar(async () => {
      await this.candy.cambiarEstadoCategoria(c.id, !c.activo);
      if (this.categoriaId === c.id) this.categoria.activo = !c.activo;
    }, 'Estado de la categoría actualizado.');
  }
}
