import { Component } from '@angular/core';
import { AdminNavbar } from '../../../components/admin-navbar/admin-navbar';
import { DashboardChip } from '../../../components/dashboard-chip/dashboard-chip';
import { IndicadorDashboard } from '../../../models/indicador-dashboard';

@Component({
  /*
   * Importo AdminNavbar porque este componente
   * va a utilizar <app-admin-navbar> en su HTML.
   */
  imports: [AdminNavbar, DashboardChip],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
   /*
   * Estas propiedades representan información
   * que el componente necesita mostrar.
   *
   * Por ahora los valores están escritos manualmente.
   *
   * Más adelante estos valores llegarán desde Supabase.
   */
  nombreUsuario: string = 'Administrador';
  /*
 * El [] significa que no tenemos un solo IndicadorDashboard,
 * sino un ARRAY de IndicadorDashboard.
 *
 * TypeScript controlará que todos los objetos del array
 * respeten la estructura definida en la interface.
 */
indicadores: IndicadorDashboard[] = [

    {
      titulo: 'Ingresos Totales',
      valor: 125000,
      prefijo: '$',
      sufijo: ''
    },

    {
      titulo: 'Entradas',
      valor: 847,
      prefijo: '',
      sufijo: ''
    },

    {
      titulo: 'Ocupación',
      valor: 72,
      prefijo: '',
      sufijo: '%'
    },

    {
      titulo: 'Funciones Hoy',
      valor: 18,
      prefijo: '',
      sufijo: ''
    },

    {
      titulo: 'Ventas Candy',
      valor: 326000,
      prefijo: '$',
      sufijo: ''
    }

  ];
  /*
   * También podemos guardar información más compleja
   * dentro de objetos.
   */

  peliculaMasVista = {
    titulo: 'Dune: Parte Dos',
    entradasVendidas: 342
  };

  candyMasVendido = {
    nombre: 'Combo Familiar',
    cantidadVendida: 128
  };

}
