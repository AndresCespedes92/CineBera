import { Component, Input } from '@angular/core';
/** Iconos decorativos locales: acompañan al texto sin repetirlo al lector de pantalla. */
@Component({
  selector: 'app-icono-cine',
  template: `<svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    @switch (tipo) {
      @case ('pochoclos') {
        <path d="M7 13h18l-3 16H10zM12 16l1 10m7-10-1 10m-3-10v10" />
        <path d="M8 13a4 4 0 0 1-1-7 4 4 0 0 1 7-2 4 4 0 0 1 7 1 4 4 0 0 1 4 7" />
      }
      @case ('entrada') {
        <path d="M3 8h26v5a3 3 0 0 0 0 6v5H3v-5a3 3 0 0 0 0-6zM22 9v3m0 3v3m0 3v2" />
        <path d="m13 11 1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L8 14.5l3.5-.5z" />
      }
      @default {
        <path d="M4 12h24v16H4zM4 12 2 6l23-4 2 6zM8 5l4 5m4-6 4 5M4 18h24" />
      }
    }
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1em;
        height: 1em;
        vertical-align: -0.12em;
        margin-right: 0.28em;
        color: var(--cine-accent);
      }
      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class IconoCine {
  @Input() tipo: 'pochoclos' | 'entrada' | 'claqueta' = 'claqueta';
}
