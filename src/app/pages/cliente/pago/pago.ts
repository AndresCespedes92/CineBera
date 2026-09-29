import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FidelizacionService } from '../../../services/fidelizacion';
import { CompraService } from '../../../services/compra';
import { ButacaService } from '../../../services/butaca';
import { EntradaService } from '../../../services/entrada';
import { Auth } from '../../../services/auth';
import { Compra } from '../../../models/compra';
import { Beneficio } from '../../../models/beneficio';
import { ButacaFuncion } from '../../../models/butaca-funcion';

@Component({
  selector: 'app-pago', imports: [FormsModule, RouterLink],
  templateUrl: './pago.html', styleUrl: './pago.css'
})
export class Pago implements OnInit {
  compra = signal<Compra | null>(null);
  cargando = signal(true);
  procesando = signal(false);
  error = signal('');
  aviso = signal('');
  codigoEntrada = signal<string | null>(null);
  beneficios = signal<Beneficio[]>([]);
  butacas = signal<ButacaFuncion[]>([]);
  beneficioId = signal<number | null>(null);
  descuento = computed(() => this.beneficioId() && this.compra()?.estado === 'pendiente'
    ? this.fidelizacionService.calcularDescuentoEntrada(Number(this.compra()?.total), this.butacas()) : 0);
  total = computed(() => Math.round((Number(this.compra()?.total ?? 0) - this.descuento()) * 100) / 100);

  constructor(private route: ActivatedRoute, private router: Router,
    private compraService: CompraService, private butacaService: ButacaService,
    private entradaService: EntradaService, private fidelizacionService: FidelizacionService,
    private authService: Auth) {}

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) { this.cargando.set(false); return; }
    await this.cargarCompra(id);
  }

  async cargarCompra(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const compra = await this.compraService.obtenerCompraPorId(id);
      this.compra.set(compra);
      this.beneficios.set([]);
      this.beneficioId.set(null);
      if (!compra) return;
      const sesion = await this.authService.obtenerSesion();
      if (compra.usuario_id && compra.usuario_id !== sesion?.user.id) {
        this.compra.set(null);
        throw new Error('Iniciá sesión con la cuenta de esta compra.');
      }
      if (compra.estado === 'pendiente') {
        this.butacas.set(await this.butacaService.obtenerReservaPorToken(compra.reserva_token));
        if (compra.usuario_id) {
          const beneficios = await this.fidelizacionService.obtenerBeneficios(compra.usuario_id);
          this.beneficios.set(beneficios.filter(b => b.beneficio_tipo === 'entrada' && !b.compra_utilizada_id));
        }
      }
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo cargar la compra.'); }
    finally { this.cargando.set(false); }
  }

  /** El pago del TP es simulado. Reintentar una compra pagada completa la emisión
   * pendiente sin volver a cobrar ni consumir otra recompensa. */
  async confirmarPago(): Promise<void> {
    if (this.procesando()) return;
    let compra = this.compra();
    if (!compra || compra.estado === 'cancelada') return;
    this.procesando.set(true);
    this.error.set('');
    try {
      // Releer permite recuperarse también de una respuesta perdida después del UPDATE.
      compra = await this.compraService.obtenerCompraPorId(compra.id);
      if (!compra) throw new Error('No se pudo consultar la compra.');
      const sesion = await this.authService.obtenerSesion();
      if (compra.usuario_id && compra.usuario_id !== sesion?.user.id) throw new Error('La compra pertenece a otra cuenta.');
      if (compra.estado === 'cancelada') throw new Error('La compra está cancelada.');
      if (compra.estado === 'pendiente') {
        const reserva = await this.butacaService.obtenerReservaPorToken(compra.reserva_token);
        if (!reserva.length || reserva.some(b => !b.expires_at || new Date(b.expires_at).getTime() <= Date.now())) {
          throw new Error('La reserva venció. Volvé a seleccionar tus butacas.');
        }
        const confirmada = this.beneficioId()
          ? await this.fidelizacionService.confirmarCompraConBeneficio(compra, this.beneficioId()!, reserva)
          : await this.compraService.confirmarCompra(compra.id);
        if (!confirmada) throw new Error('No se pudo confirmar el pago. Recargá para consultar el estado.');
        compra = confirmada;
      }
      this.compra.set(compra);
      if (!await this.butacaService.confirmarButacasReserva(compra.reserva_token)) {
        throw new Error('La compra está pagada, pero falta confirmar sus butacas. Reintentá para completar la emisión.');
      }
      let entrada = await this.entradaService.obtenerEntradaPorCompra(compra.id);
      if (!entrada) entrada = await this.entradaService.crearEntrada(compra.id);
      if (!entrada) throw new Error('Falta generar la entrada. Reintentá sin volver a pagar.');
      this.codigoEntrada.set(entrada.codigo);
      sessionStorage.removeItem(`cinebera-expira-funcion-${compra.funcion_id}`);
      if (compra.usuario_id && !await this.fidelizacionService.acreditarPuntosPorCompra(compra.id, compra.usuario_id)) {
        this.aviso.set('La entrada está lista. No se pudieron acreditar los puntos; podés reintentar desde esta compra.');
        return;
      }
      await this.router.navigate(['/entrada', entrada.codigo]);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo completar la operación. Reintentá.'); }
    finally { this.procesando.set(false); }
  }
}
