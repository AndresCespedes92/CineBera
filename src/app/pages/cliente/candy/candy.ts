import { MatButtonModule } from '@angular/material/button';
import { PasosCompra } from '../../../components/pasos-compra/pasos-compra';
import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Navbar } from '../../../components/navbar/navbar';
import { CandyService } from '../../../services/candy';
import { ButacaService } from '../../../services/butaca';
import { ItemCarritoCandy } from '../../../models/item-carrito-candy';
import { ProductoCandy } from '../../../models/producto-candy';

@Component({ selector: 'app-candy', imports: [MatButtonModule, PasosCompra, Navbar, RouterLink], templateUrl: './candy.html', styleUrl: './candy.css' })
export class Candy implements OnInit {
  reservaToken = '';
  productos: ProductoCandy[] = [];
  carrito = signal<ItemCarritoCandy[]>([]);
  cargando = signal(true);
  error = signal('');
  aviso = signal('');
  totalCarrito = computed(() => Math.round(this.carrito().reduce((s,i) => s+i.producto.precio*i.cantidad,0)*100)/100);
  constructor(private candyService: CandyService, private butacaService: ButacaService,
    private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    this.reservaToken = this.route.snapshot.queryParamMap.get('reserva') ?? '';
    try {
      this.productos = await this.candyService.obtenerProductosActivos();
      if (this.reservaToken) {
        await this.validarReserva();
        const anterior = this.candyService.obtenerSeleccion(this.reservaToken);
        const actual: ItemCarritoCandy[] = [];
        for (const item of anterior) {
          const producto = this.productos.find(p => p.id === item.producto.id);
          if (producto) actual.push({ producto, cantidad: item.cantidad });
          if (!producto || producto.precio !== item.producto.precio) this.aviso.set('Actualizamos la selección con los productos y precios disponibles. Revisá el resumen.');
        }
        this.carrito.set(actual);
        this.persistir();
      }
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cargar Candy.'); }
    finally { this.cargando.set(false); }
  }
  private async validarReserva(): Promise<void> {
    const butacas = await this.butacaService.obtenerReservaPorToken(this.reservaToken);
    if (!butacas.length || butacas.some(b => !b.expires_at || new Date(b.expires_at).getTime() <= Date.now())) {
      throw new Error('La reserva venció. Volvé a seleccionar tus butacas.');
    }
  }
  agregarProducto(producto: ProductoCandy): void {
    if (!this.reservaToken || this.error()) return;
    const existe = this.carrito().some(i => i.producto.id === producto.id);
    this.carrito.update(items => existe ? items.map(i => i.producto.id === producto.id ? {...i,cantidad:i.cantidad+1}:i) : [...items,{producto,cantidad:1}]);
    this.persistir();
  }
  aumentarCantidad(id: number): void { const p=this.productos.find(p=>p.id===id); if(p) this.agregarProducto(p); }
  disminuirCantidad(id: number): void {
    this.carrito.update(items=>items.map(i=>i.producto.id===id ? {...i,cantidad:Math.max(1,i.cantidad-1)}:i)); this.persistir();
  }
  eliminarProducto(id: number): void { this.carrito.update(items=>items.filter(i=>i.producto.id!==id)); this.persistir(); }
  private persistir(): void {
    try { this.candyService.guardarSeleccion(this.reservaToken,this.carrito()); }
    catch { this.error.set('No se pudo conservar el carrito en esta pestaña.'); }
  }
  async volverCheckout(): Promise<void> {
    try { await this.validarReserva(); await this.router.navigate(['/checkout',this.reservaToken]); }
    catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudo volver al checkout.'); }
  }
}
