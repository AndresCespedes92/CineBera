import { MatButtonModule } from '@angular/material/button';
import { AlertaService } from '../../services/alerta';
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth';
import { Usuario } from '../../services/usuario';

@Component({selector: 'app-navbar', imports: [RouterLink, RouterLinkActive, MatButtonModule], templateUrl: './navbar.html', styleUrl: './navbar.css'})
export class Navbar implements OnInit {
  menuAbierto = signal(false);
  errorAlertas = signal(false);
  errorSesion = signal('');
  cerrando = signal(false);
  usuarioAutenticado = signal(false);
  nombreUsuario = signal('');
  rol = signal('');
  constructor(private authService: Auth, private usuarioService: Usuario, private router: Router, public alertas: AlertaService) {}
  async ngOnInit(): Promise<void> {
    try {
      const sesion = await this.authService.obtenerSesion();
      if (!sesion?.user?.id || sesion.user.is_anonymous) return;
      this.usuarioAutenticado.set(true);
      const {data: perfil, error} = await this.usuarioService.obtenerPerfil(sesion.user.id);
      if (error || !perfil) this.errorSesion.set('No se pudo cargar tu perfil. Recargá la página para actualizar los accesos.');
      else { this.nombreUsuario.set(perfil.nombre ?? ''); this.rol.set(perfil.rol ?? ''); }
    } catch { this.errorSesion.set('No se pudo consultar tu sesión. Recargá la página.'); }
    if (this.usuarioAutenticado()) {
      try { await this.alertas.consultar(); }
      catch { this.errorAlertas.set(true); this.alertas.noLeidas.set(0); }
    }
  }
  async cerrarSesion(): Promise<void> {
    if (this.cerrando()) return;
    this.cerrando.set(true); this.errorSesion.set('');
    try {
      const resultado = await this.authService.logout();
      if (resultado.error) throw new Error();
      this.usuarioAutenticado.set(false); this.nombreUsuario.set(''); this.rol.set('');
      this.alertas.noLeidas.set(0); this.errorAlertas.set(false);
      await this.router.navigate(['/']);
    } catch { this.errorSesion.set('No se pudo cerrar sesión. Reintentá.'); }
    finally { this.cerrando.set(false); }
  }
}
