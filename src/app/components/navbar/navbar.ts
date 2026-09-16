import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',

  /*
   * Este componente es standalone.
   *
   * Como utilizamos routerLink dentro del HTML,
   * debemos importar RouterLink directamente
   * en el componente.
   */
  imports: [
    RouterLink
  ],

  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

}