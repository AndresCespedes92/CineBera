import { MatButtonModule } from '@angular/material/button';
import { CreditoService } from '../../../services/credito';
import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../components/navbar/navbar';
import { CompraService } from '../../../services/compra';
import { PeliculaComprada } from '../../../models/pelicula-comprada';

@Component({selector:'app-mis-peliculas',imports: [MatButtonModule, Navbar,RouterLink,DatePipe],
  templateUrl:'./mis-peliculas.html',styleUrl:'../home/home.css'})
export class MisPeliculas implements OnInit {
  peliculas = signal<PeliculaComprada[]>([]);
  cargando = signal(false);
  error = signal('');
  siguiente = signal<number | null>(null);
  saldo = signal(0);
  procesando = signal(false);
  confirmarCancelacion = signal<number | null>(null);
  mensaje = signal('');
  constructor(private compras: CompraService, private credito: CreditoService = new CreditoService()) {}
  async cancelar(id:number) {
    if(this.procesando()) return;
    this.procesando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      await this.credito.cancelar(id);
      this.confirmarCancelacion.set(null);
      await this.cargar();
      this.mensaje.set('Compra cancelada. El importe reintegrado está disponible como crédito.');
    } catch(e) {this.error.set(e instanceof Error ? e.message : 'No se pudo cancelar. Reintentá.');}
    finally {this.procesando.set(false);}
  }
  async ngOnInit() { await this.cargar(); }
  async cargar(mas = false) {
    if (this.cargando() || (mas && this.siguiente() === null)) return;
    this.cargando.set(true); this.error.set('');
    if (!mas) { this.peliculas.set([]); this.siguiente.set(null); }
    try {
      this.saldo.set(await this.credito.obtenerSaldo());
      const pagina = await this.compras.obtenerMisPeliculas(mas ? this.siguiente() : null);
      this.peliculas.update(actuales => mas ? [...actuales,...pagina.peliculas] : pagina.peliculas);
      this.siguiente.set(pagina.siguiente);
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); }
    finally { this.cargando.set(false); }
  }
}
