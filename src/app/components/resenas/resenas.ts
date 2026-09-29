import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ResenaService } from '../../services/resena';
import { Auth } from '../../services/auth';
import { Resena } from '../../models/resena';

@Component({selector: 'app-resenas', imports: [FormsModule, RouterLink], templateUrl: './resenas.html'})
export class Resenas implements OnInit {
  @Input({required: true}) peliculaId!: number;
  filas = signal<Resena[]>([]);
  usuario = signal<string | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  mensaje = signal('');
  estrellas = 5;
  comentario = '';
  propia = computed(() => this.filas().find(r => r.usuario_id === this.usuario()));
  // Derivado del listado real; no se usa el rating externo de TMDB.
  promedio = computed(() => this.filas().length
    ? (this.filas().reduce((s,r) => s + r.estrellas, 0) / this.filas().length).toFixed(1) : null);
  constructor(private servicio: ResenaService, private auth: Auth) {}
  async ngOnInit() { await this.cargar(); }
  async cargar() {
    this.cargando.set(true); this.error.set('');
    try {
      const sesion = await this.auth.obtenerSesion();
      this.usuario.set(sesion && !sesion.user.is_anonymous ? sesion.user.id : null);
      this.filas.set(await this.servicio.obtener(this.peliculaId));
      this.estrellas = this.propia()?.estrellas ?? 5;
      this.comentario = this.propia()?.comentario ?? '';
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar las reseñas.'); }
    finally { this.cargando.set(false); }
  }
  async guardar() {
    if (this.guardando() || this.cargando()) return;
    this.guardando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      await this.servicio.guardar(this.peliculaId, this.estrellas, this.comentario, !!this.propia());
      await this.cargar();
      this.mensaje.set('Reseña guardada.');
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { this.guardando.set(false); }
  }
}
