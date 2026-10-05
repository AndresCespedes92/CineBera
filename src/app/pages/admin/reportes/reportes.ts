import { SelectorFecha } from '../../../components/selector-fecha/selector-fecha';
import { MatButtonModule } from '@angular/material/button';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ReporteService, fechaBuenosAires } from '../../../services/reporte';
import { ReporteVentas } from '../../../models/reporte';
import { criterioReporte, descargarExcel, generarPdf } from '../../../services/exportar-reporte';

@Component({selector: 'app-reportes', imports: [SelectorFecha, MatButtonModule, FormsModule, DecimalPipe], templateUrl: './reportes.html', styleUrl: '../recompensas/recompensas.css'})
export class Reportes {
  hasta = fechaBuenosAires();
  desde = this.hasta.slice(0, 8) + '01';
  reporte = signal<ReporteVentas | null>(null);
  cargando = signal(false);
  exportando = signal(false);
  error = signal('');
  criterio = criterioReporte;
  constructor(private servicio: ReporteService) {}
  async consultar(): Promise<void> {
    if (this.cargando() || this.exportando()) return;
    this.cargando.set(true); this.error.set(''); this.reporte.set(null);
    try { this.reporte.set(await this.servicio.obtener(this.desde, this.hasta)); }
    catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el reporte.'); }
    finally { this.cargando.set(false); }
  }
  async exportar(tipo: 'pdf' | 'excel'): Promise<void> {
    const reporte = this.reporte();
    if (!reporte || this.cargando() || this.exportando()) return;
    this.exportando.set(true); this.error.set('');
    try {
      if (tipo === 'excel') descargarExcel(reporte);
      else (await generarPdf(reporte)).save('cinebera-ventas-' + reporte.desde + '-' + reporte.hasta + '.pdf');
    } catch { this.error.set('No se pudo exportar el reporte. Reintentá la descarga.'); }
    finally { this.exportando.set(false); }
  }
}
