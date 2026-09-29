import { MatButtonModule } from '@angular/material/button';
import { Component, OnInit, signal } from '@angular/core';
import { Navbar } from '../../../components/navbar/navbar';
import { Auth } from '../../../services/auth';
import { Usuario } from '../../../services/usuario';

@Component({selector: 'app-perfil', imports: [MatButtonModule, Navbar], templateUrl: './perfil.html', styleUrl: '../home/home.css'})
export class Perfil implements OnInit {
  datos = signal<{nombre: string; apellido: string; email: string; rol: string} | null>(null);
  cargando = signal(false);
  error = signal('');
  constructor(private auth: Auth, private usuarios: Usuario) {}
  async ngOnInit(): Promise<void> { await this.cargar(); }
  async cargar(): Promise<void> {
    if (this.cargando()) return;
    this.cargando.set(true); this.error.set(''); this.datos.set(null);
    try {
      const sesion = await this.auth.obtenerSesion();
      if (!sesion || sesion.user.is_anonymous) throw new Error('Iniciá sesión para consultar tu perfil.');
      const {data, error} = await this.usuarios.obtenerPerfil(sesion.user.id);
      if (error || !data) throw new Error('No se pudo cargar tu perfil.');
      this.datos.set({nombre: data.nombre ?? '', apellido: data.apellido ?? '', email: sesion.user.email ?? '', rol: data.rol ?? ''});
    } catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudo consultar tu perfil.'); }
    finally { this.cargando.set(false); }
  }
}
