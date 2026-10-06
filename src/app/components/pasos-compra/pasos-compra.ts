import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-pasos-compra',
  standalone:true,
  template: `<nav aria-label="Progreso de compra">
    <ol>
      @for (nombre of pasos; track nombre; let i = $index) {
        <li
          [class.actual]="i === paso"
          [class.completo]="i < paso"
          [attr.aria-current]="i === paso ? 'step' : null"
        >
          <span>{{ i + 1 }}</span
          >{{ nombre }}
        </li>
      }
    </ol>
    @if (candy) {
      <p>Candy opcional · Volvé al resumen para ir al pago.</p>
    }
  </nav>`,
  styles: [
    `
      :host(.compacto) nav { margin-block: 4px 8px; }
      :host(.compacto) ol { margin-block: 4px; }
      nav {
        margin-block: 1.5rem 2rem;
      }
      ol {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem 1.5rem;
        padding: 0;
        list-style: none;
      }
      li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--cine-muted);
        font-size: 0.85rem;
      }
      span {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border: 1px solid var(--cine-border);
        border-radius: 50%;
      }
      .actual {
        color: var(--cine-text);
        font-weight: 600;
      }
      .actual span {
        background: var(--cine-accent);
        color: var(--cine-bg);
      }
      .completo span {
        border-color: var(--cine-success);
      }
      p {
        font-size: 0.875rem;
        color: var(--cine-muted);
      }
    `,
  ],
})
export class PasosCompra {
  @Input() paso = 0;
  @Input() candy = false;
  pasos = ['Función', 'Butacas', 'Resumen', 'Pago', 'Entrada'];
}
