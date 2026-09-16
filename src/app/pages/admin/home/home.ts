import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardChip } from '../../../components/dashboard-chip/dashboard-chip';
import { IndicadorDashboard } from '../../../models/indicador-dashboard';

@Component({
  selector: 'app-home',

  /*
   * Home es un componente standalone.
   *
   * RouterLink:
   * permite que los botones del dashboard
   * naveguen hacia las distintas funcionalidades.
   *
   * DashboardChip:
   * es nuestro componente reutilizable para
   * mostrar los indicadores.
   */
  imports: [
    RouterLink,
    DashboardChip
  ],

  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {

  /*
   * Por ahora simulamos el usuario.
   *
   * Cuando implementemos autenticación con Supabase,
   * este dato vendrá del usuario autenticado.
   */
  nombreUsuario: string = 'Administrador';


  /*
   * Indicadores principales del cine.
   *
   * Por ahora son datos simulados.
   * Más adelante vendrán de nuestra capa de datos.
   */
  indicadores: IndicadorDashboard[] = [

    {
      titulo: 'Ingresos Totales',
      valor: 1250000,
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
      titulo: 'Ventas Candy',
      valor: 326000,
      prefijo: '$',
      sufijo: ''
    },

    {
      titulo: 'Funciones Hoy',
      valor: 18,
      prefijo: '',
      sufijo: ''
    }

  ];


  /*
   * Información resumida utilizada
   * por el dashboard administrativo.
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