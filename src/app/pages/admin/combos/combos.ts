import { Component, HostListener, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComboService, ProductoCombo } from '../../../services/combo';
import { FormularioConCambios } from '../../../guards/cambios-pendientes-guard';
import { Combo } from '../../../models/combo';

@Component({ selector: 'app-combos', imports: [FormsModule, RouterLink],
  templateUrl: './combos.html', styleUrl: '../recompensas/recompensas.css' })
export class Combos implements OnInit, FormularioConCambios {
  combos = signal<Combo[]>([]);
  productos = signal<ProductoCombo[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  mensaje = signal('');
  editandoId: number | undefined;
  formulario = this.nuevoFormulario();
  private formularioInicial = { ...this.formulario };
  hayCambios(): boolean {
    return (Object.keys(this.formularioInicial) as (keyof Omit<Combo, 'id'>)[])
      .some(campo => this.formulario[campo] !== this.formularioInicial[campo]);
  }
  puedeSalir(): boolean {
    if (this.guardando()) return false;
    return !this.hayCambios() || window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos y continuar?');
  }
  @HostListener('window:beforeunload', ['$event'])
  antesDeCerrar(event: BeforeUnloadEvent): void {
    if (this.guardando() || this.hayCambios()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  private reiniciarFormulario(): void {
    this.editandoId = undefined;
    this.formulario = this.nuevoFormulario();
    this.formularioInicial = { ...this.formulario };
  }
  constructor(private comboService: ComboService) {}
  private nuevoFormulario(): Omit<Combo, 'id'> { return { nombre: '', precio: 0, pochoclo_id: 0, bebida_id: 0, activo: true }; }
  async ngOnInit(): Promise<void> { await this.cargar(); }
  async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    try {
      this.combos.set(await this.comboService.obtenerTodos());
      this.productos.set(await this.comboService.obtenerProductos());
    } catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar los combos.'); }
    finally { this.cargando.set(false); }
  }
  editar(combo: Combo): void {
    if (!this.puedeSalir()) return;
    this.editandoId = combo.id;
    const { id, ...campos } = combo;
    this.formulario = { ...campos };
    this.formularioInicial = { ...campos };
    this.mensaje.set('');
  }
  cancelar(): void { if (this.puedeSalir()) this.reiniciarFormulario(); }
  nombreProducto(id: number): string { return this.productos().find(p => p.id === id)?.nombre ?? 'Producto inactivo #' + id; }
  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true); this.error.set('');
    try {
      await this.comboService.guardar(this.formulario, this.editandoId);
      this.reiniciarFormulario(); this.mensaje.set('Combo guardado.'); await this.cargar();
    } catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudo guardar el combo.'); }
    finally { this.guardando.set(false); }
  }
  async cambiarEstado(combo: Combo): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true); this.error.set('');
    try { await this.comboService.cambiarEstado(combo.id, !combo.activo); await this.cargar(); }
    catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cambiar el estado.'); }
    finally { this.guardando.set(false); }
  }
}
