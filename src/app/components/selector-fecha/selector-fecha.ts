import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Presenta día/mes/año; los reportes siguen recibiendo fechas ISO, sin conversión de zona horaria. */
@Component({
  selector: 'app-selector-fecha',
  imports: [FormsModule],
  template: `<fieldset class="selector">
    <legend>{{ etiqueta }}</legend>
    <div class="fecha-nacimiento">
      <select
        [attr.aria-label]="etiqueta + ': día'"
        [ngModel]="dia"
        (ngModelChange)="dia = $event; actualizar()"
        [ngModelOptions]="{ standalone: true }"
      >
        <option [ngValue]="null">Día</option>
        @for (d of dias; track d) {
          <option [ngValue]="d">{{ d }}</option>
        }
      </select>
      <select
        [attr.aria-label]="etiqueta + ': mes'"
        [ngModel]="mes"
        (ngModelChange)="mes = $event; actualizar()"
        [ngModelOptions]="{ standalone: true }"
      >
        <option [ngValue]="null">Mes</option>
        @for (m of meses; track m) {
          <option [ngValue]="m">{{ m }}</option>
        }
      </select>
      <select
        [attr.aria-label]="etiqueta + ': año'"
        [ngModel]="anio"
        (ngModelChange)="anio = $event; actualizar()"
        [ngModelOptions]="{ standalone: true }"
      >
        <option [ngValue]="null">Año</option>
        @for (a of anios; track a) {
          <option [ngValue]="a">{{ a }}</option>
        }
      </select>
    </div>
    @if (invalida) {
      <small role="alert">La fecha ingresada no existe.</small>
    }
  </fieldset>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        margin-bottom: 16px;
      }
      .selector {
        border: 0;
        padding: 0;
        margin: 0;
        min-width: 0;
      }
      legend {
        margin-bottom: 8px;
      }
      .fecha-nacimiento {
        display: grid;
        grid-template-columns: 0.7fr 1.3fr 1fr;
        gap: 10px;
      }
      select {
        width: 100%;
        min-width: 0;
        padding: 12px;
        border: 1px solid var(--cine-border);
        border-radius: 4px;
        background: var(--cine-surface);
        color: var(--cine-text);
        font-size: 1rem;
      }
      small {
        color: var(--cine-danger);
      }
      @media (max-width: 600px) {
        .fecha-nacimiento {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SelectorFecha implements OnChanges {
  @Input() etiqueta = 'Fecha';
  @Input() fecha = '';
  @Output() fechaChange = new EventEmitter<string>();
  dia: number | null = null;
  mes: number | null = null;
  anio: number | null = null;
  invalida = false;
  dias = Array.from({ length: 31 }, (_, i) => i + 1);
  meses = Array.from({ length: 12 }, (_, i) => i + 1);
  anios = Array.from({ length: 102 }, (_, i) => new Date().getFullYear() + 1 - i);
  private emitida: string | undefined;
  ngOnChanges() {
    // No descarta las selecciones parciales cuando el padre recibe una fecha vacía.
    if (this.fecha === this.emitida) return;
    const partes = this.fecha.split('-').map(Number);
    this.anio = partes[0] || null;
    this.mes = partes[1] || null;
    this.dia = partes[2] || null;
    if (this.anio && !this.anios.includes(this.anio))
      this.anios = [...this.anios, this.anio].sort((a, b) => b - a);
    this.invalida = false;
  }
  actualizar() {
    let valor = '';
    this.invalida = false;
    if (this.anio && this.mes && this.dia) {
      const fecha = new Date(this.anio, this.mes - 1, this.dia);
      this.invalida =
        fecha.getFullYear() !== this.anio ||
        fecha.getMonth() !== this.mes - 1 ||
        fecha.getDate() !== this.dia;
      if (!this.invalida)
        valor =
          String(this.anio).padStart(4, '0') +
          '-' +
          String(this.mes).padStart(2, '0') +
          '-' +
          String(this.dia).padStart(2, '0');
    }
    this.emitida = valor;
    this.fechaChange.emit(valor);
  }
}
