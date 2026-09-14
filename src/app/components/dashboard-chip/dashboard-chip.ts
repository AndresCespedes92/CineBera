import { Component, Input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-dashboard-chip',
  styleUrl: './dashboard-chip.css',
  templateUrl: './dashboard-chip.html',
})
export class DashboardChip {
  /*
   * @Input permite que este componente reciba información
   * desde el componente padre.
   *
   * En nuestro caso, Home va a enviar:
   *
   * - el título del indicador
   * - el valor
   * - opcionalmente una unidad o símbolo
   */
  @Input() titulo: string = '';

  @Input() valor: string | number = '';

  @Input() prefijo: string = '';

  @Input() sufijo: string = '';

}
