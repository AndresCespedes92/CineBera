import { MatButtonModule } from '@angular/material/button';
import { PasosCompra } from '../../../components/pasos-compra/pasos-compra';
import { CreditoService } from '../../../services/credito';
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
import { CandyService } from '../../../services/candy';
import { PedidoCandy } from '../../../models/pedido-candy';
import { ComboService } from '../../../services/combo';

@Component({
  selector: 'app-pago', imports: [MatButtonModule, PasosCompra, FormsModule, RouterLink],
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
  pedidoCandy = signal<PedidoCandy | null>(null);
  saldoCredito = signal(0);
  creditoReservado = signal(0);
  usarCredito = signal(false);
  creditoCargado = signal(false);
  creditoAplicado = computed(() => this.creditoReservado() || (this.usarCredito() ? Math.min(this.saldoCredito(),this.total()) : 0));
  restante = computed(() => Math.round(Math.max(0,this.total()-this.creditoAplicado())*100)/100);
  totalCandy = computed(() => this.pedidoCandy()?.estado !== 'cancelado' ? this.pedidoCandy()?.total ?? 0 : 0);
  descuento = computed(() => this.beneficioId() && !this.compra()?.combo_id && this.compra()?.estado === 'pendiente'
    ? this.fidelizacionService.calcularDescuentoEntrada(Number(this.compra()?.total), this.butacas()) : 0);
  total = computed(() => Math.round((Number(this.compra()?.total ?? 0) - this.descuento() + this.totalCandy()) * 100) / 100);

  constructor(private route: ActivatedRoute, private router: Router,
    private compraService: CompraService, private butacaService: ButacaService,
    private entradaService: EntradaService, private fidelizacionService: FidelizacionService,
    private authService: Auth, private candyService: CandyService, private comboService: ComboService, private creditoService: CreditoService = new CreditoService()) {}

  async anularReservaConCredito(): Promise<void> {
    const compra=this.compra();
    if(!compra || this.procesando()) return;
    this.procesando.set(true); this.error.set('');
    try {
      await this.creditoService.cancelar(compra.id);
      await this.cargarCompra(compra.id);
      this.aviso.set('Reserva anulada. El crédito reservado volvió a tu cuenta.');
    } catch(e) { this.error.set(e instanceof Error ? e.message : 'No se pudo anular la reserva.'); }
    finally {this.procesando.set(false);}
  }

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) { this.cargando.set(false); return; }
    await this.cargarCompra(id);
  }

  async cargarCompra(id: number): Promise<void> {
    this.creditoCargado.set(false);
    this.saldoCredito.set(0);
    this.creditoReservado.set(0);
    this.cargando.set(true);
    this.error.set('');
    try {
      const compra = await this.compraService.obtenerCompraPorId(id);
      this.compra.set(compra);
      this.beneficios.set([]);
      this.beneficioId.set(null);
      if (!compra) return;
      this.pedidoCandy.set(await this.candyService.obtenerPedidoPorCompra(compra.id));
      const sesion = await this.authService.obtenerSesion();
      if (compra.usuario_id && compra.usuario_id !== sesion?.user.id) {
        this.compra.set(null);
        throw new Error('Iniciá sesión con la cuenta de esta compra.');
      }
      if (compra.usuario_id) {
        this.saldoCredito.set(await this.creditoService.obtenerSaldo());
        this.creditoReservado.set(await this.creditoService.obtenerUso(compra.id));
      }
      this.creditoCargado.set(true);
      if (compra.estado === 'pendiente') {
        this.butacas.set(await this.butacaService.obtenerReservaPorToken(compra.reserva_token));
        if (compra.usuario_id && !compra.combo_id) {
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
      this.compra.set(compra);
      let pedido = await this.candyService.obtenerPedidoPorCompra(compra.id);
      this.comboService.validarPedido(compra, pedido);
      if (pedido && ((pedido.estado === 'cancelado' && (pedido.total > 0 || pedido.detalles.length > 0)) ||
          (pedido.estado === 'pendiente' && !pedido.detalles.length))) {
        throw new Error('Candy está incompleto. Volvé al checkout antes de pagar.');
      }
      this.pedidoCandy.set(pedido);
      if (compra.estado === 'pendiente') {
        const reserva = await this.butacaService.obtenerReservaPorToken(compra.reserva_token);
        if (!reserva.length || reserva.some(b => !b.expires_at || new Date(b.expires_at).getTime() <= Date.now())) {
          throw new Error('La reserva venció. Volvé a seleccionar tus butacas.');
        }
        this.butacas.set(reserva);
        if ((compra.combo_cantidad ?? 0) > reserva.length) throw new Error('La cantidad de combos supera tus entradas. Volvé al checkout.');
        if (compra.usuario_id) {
          const reservado = await this.creditoService.obtenerUso(compra.id);
          this.creditoReservado.set(reservado);
          if(reservado > this.total()) throw new Error('El crédito reservado supera el total. Anulá esta reserva para recuperar el saldo.');
          if(!reservado && this.usarCredito()) {
            const importe = Math.round(Math.min(await this.creditoService.obtenerSaldo(),this.total())*100)/100;
            if(importe > 0) {
              await this.creditoService.registrar(compra.id,'uso',-importe);
              this.creditoReservado.set(importe);
            }
          }
        }
        const confirmada = this.beneficioId()
          ? await this.fidelizacionService.confirmarCompraConBeneficio(compra, this.beneficioId()!, reserva)
          : await this.compraService.confirmarCompra(compra.id);
        if (!confirmada) throw new Error('No se pudo confirmar el pago. Recargá para consultar el estado.');
        compra = confirmada;
      }
      this.compra.set(compra);
      // Una única confirmación del usuario completa ambas partes del pago simulado.
      // Las escrituras son separadas; un reintento recupera el estado ya pagado.
      if (pedido && pedido.estado !== 'cancelado') {
        pedido = await this.candyService.confirmarPagoPedido(compra.id);
        this.pedidoCandy.set(pedido);
      }
      if (!await this.butacaService.confirmarButacasReserva(compra.reserva_token)) {
        throw new Error('La compra está pagada, pero falta confirmar sus butacas. Reintentá para completar la emisión.');
      }
      let entrada = await this.entradaService.obtenerEntradaPorCompra(compra.id);
      if (!entrada) entrada = await this.entradaService.crearEntrada(compra.id);
      if (!entrada) throw new Error('Falta generar la entrada. Reintentá sin volver a pagar.');
      this.codigoEntrada.set(entrada.codigo);
      this.candyService.limpiarSeleccion(compra.reserva_token);
      this.comboService.guardarSeleccion(compra.reserva_token, null);
      sessionStorage.removeItem(`cinebera-expira-funcion-${compra.funcion_id}`);
      if (compra.usuario_id && !await this.fidelizacionService.acreditarPuntosPorCompra(compra.id, compra.usuario_id)) {
        this.aviso.set('La entrada está lista. No se pudieron acreditar los puntos; podés reintentar desde esta compra.');
        return;
      }
      if (pedido?.estado === 'pagado' && !await this.fidelizacionService.acreditarPuntosPorCandy(pedido.id)) {
        this.aviso.set('La compra está completa. Falta acreditar los puntos de Candy; podés reintentar sin otro pago.');
        return;
      }
      await this.router.navigate(['/entrada', entrada.codigo]);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo completar la operación. Reintentá.'); }
    finally { this.procesando.set(false); }
  }
}
