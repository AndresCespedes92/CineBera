import { Navbar } from '../../../components/navbar/navbar';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QRCodeComponent } from 'angularx-qrcode';
import { DatePipe } from '@angular/common';
import { FidelizacionService } from '../../../services/fidelizacion';
import { Auth } from '../../../services/auth';
import { Recompensa } from '../../../models/recompensa';
import { Beneficio } from '../../../models/beneficio';

@Component({
  selector: 'app-fidelizacion',
  imports: [Navbar,RouterLink, QRCodeComponent, DatePipe],
  templateUrl: './fidelizacion.html',
  styleUrl: './fidelizacion.css'
})
export class Fidelizacion implements OnInit {
  saldo = signal(0);
  recompensas = signal<Recompensa[]>([]);
  historialCanjes = signal<Beneficio[]>([]);
  cargando = signal(true);
  recompensaCanjeandoId = signal<number | null>(null);
  error = signal('');
  mensaje = signal('');
  requiereSesion = signal(false);

  constructor(private authService: Auth, private fidelizacionService: FidelizacionService) {}

  async ngOnInit(): Promise<void> { await this.cargarDatos(); }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const sesion = await this.authService.obtenerSesion();
      this.requiereSesion.set(!sesion?.user?.id);
      if (!sesion?.user?.id) {
        this.saldo.set(0);
        this.recompensas.set([]);
        this.historialCanjes.set([]);
        return;
      }
      const saldo = await this.fidelizacionService.obtenerSaldoPuntos(sesion.user.id);
      const recompensas = await this.fidelizacionService.obtenerRecompensasActivas();
      const beneficios = await this.fidelizacionService.obtenerBeneficios(sesion.user.id);
      this.saldo.set(saldo);
      this.recompensas.set(recompensas);
      this.historialCanjes.set(beneficios);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar tus beneficios.');
    } finally { this.cargando.set(false); }
  }

  puedeCanjear(recompensa: Recompensa): boolean {
    return recompensa.activo && this.saldo() >= recompensa.puntos_necesarios &&
      (recompensa.tipo !== 'candy' || !!recompensa.producto_candy_id);
  }

  async canjear(recompensa: Recompensa): Promise<void> {
    if (this.recompensaCanjeandoId() !== null || !this.puedeCanjear(recompensa)) return;
    this.recompensaCanjeandoId.set(recompensa.id);
    this.mensaje.set('');
    try {
      const sesion = await this.authService.obtenerSesion();
      if (!sesion?.user?.id) throw new Error('Iniciá sesión para canjear.');
      const resultado = await this.fidelizacionService.canjearRecompensa(sesion.user.id, recompensa);
      if (!resultado) throw new Error('No se pudo canjear. Revisá el saldo y la disponibilidad de la recompensa.');
      this.mensaje.set('Canje realizado. Tu beneficio está disponible más abajo.');
      await this.cargarDatos();
    } catch (error) {
      this.mensaje.set(error instanceof Error ? error.message : 'No se pudo confirmar el canje. Recargá antes de reintentar.');
      await this.cargarDatos();
    } finally { this.recompensaCanjeandoId.set(null); }
  }
}
