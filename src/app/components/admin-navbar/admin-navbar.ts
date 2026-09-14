import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  /*
   * RouterLink permite navegar desde el HTML
   * sin recargar toda la aplicación.
   */
  imports: [RouterLink],
  selector: 'app-admin-navbar',
  styleUrl: './admin-navbar.css',
  templateUrl: './admin-navbar.html',
})
export class AdminNavbar {}
