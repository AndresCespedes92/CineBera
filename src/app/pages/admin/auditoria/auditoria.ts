import { MatButtonModule } from '@angular/material/button';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, JsonPipe } from '@angular/common';
import { AuditoriaService } from '../../../services/auditoria';
import { AccionAuditoria, accionesAuditoria, RegistroAuditoria } from '../../../models/auditoria';

@Component({selector: 'app-auditoria', imports: [MatButtonModule, FormsModule, DatePipe, JsonPipe], templateUrl: './auditoria.html', styleUrl: '../recompensas/recompensas.css'})
export class Auditoria implements OnInit {
  acciones = accionesAuditoria;
  accion: AccionAuditoria | '' = '';
  aplicada: AccionAuditoria | '' = '';
  registros = signal<RegistroAuditoria[]>([]);
  siguiente = signal<number | undefined>(undefined);
  cargando = signal(false);
  error = signal('');
  constructor(private servicio: AuditoriaService) {}
  async ngOnInit(): Promise<void> { await this.cargar(); }
  nombre(accion: string): string { return this.acciones.find(a => a.valor === accion)?.nombre ?? accion; }
  async cargar(mas = false): Promise<void> {
    if (this.cargando() || (mas && this.siguiente() === undefined)) return;
    this.cargando.set(true); this.error.set('');
    if (!mas) { this.registros.set([]); this.siguiente.set(undefined); this.aplicada = this.accion; }
    try {
      const pagina = await this.servicio.obtener(this.aplicada, mas ? this.siguiente() : undefined);
      this.registros.update(filas => mas ? [...filas, ...pagina.registros] : pagina.registros);
      this.siguiente.set(pagina.siguiente);
    } catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cargar la auditoría.'); }
    finally { this.cargando.set(false); }
  }
}
