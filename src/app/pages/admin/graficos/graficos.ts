import { MatButtonModule } from '@angular/material/button';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadisticaService } from '../../../services/estadistica';
import { fechaBuenosAires } from '../../../services/reporte';
import { Estadisticas } from '../../../models/grafico';

@Component({selector: 'app-graficos', imports: [MatButtonModule, FormsModule], templateUrl: './graficos.html', styleUrl: '../recompensas/recompensas.css'})
export class Graficos {
  fecha = fechaBuenosAires();
  tipo: 'semana' | 'mes' = 'semana';
  datos = signal<Estadisticas | null>(null);
  cargando = signal(false);
  error = signal('');
  constructor(private servicio: EstadisticaService) {}
  async consultar(): Promise<void> {
    if (this.cargando()) return;
    this.cargando.set(true); this.error.set(''); this.datos.set(null);
    try { this.datos.set(await this.servicio.obtener(this.fecha, this.tipo)); }
    catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar los gráficos.'); }
    finally { this.cargando.set(false); }
  }
  ancho(cantidad: number, maximo: number): number { return maximo > 0 ? Math.round(cantidad / maximo * 240) : 0; }
}
