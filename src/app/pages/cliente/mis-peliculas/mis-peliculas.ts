import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../components/navbar/navbar';
import { CompraService } from '../../../services/compra';
import { PeliculaComprada } from '../../../models/pelicula-comprada';

@Component({selector:'app-mis-peliculas',imports:[Navbar,RouterLink,DatePipe],
  templateUrl:'./mis-peliculas.html',styleUrl:'../home/home.css'})
export class MisPeliculas implements OnInit {
  peliculas = signal<PeliculaComprada[]>([]);
  cargando = signal(false);
  error = signal('');
  siguiente = signal<number | null>(null);
  constructor(private compras: CompraService) {}
  async ngOnInit() { await this.cargar(); }
  async cargar(mas = false) {
    if (this.cargando() || (mas && this.siguiente() === null)) return;
    this.cargando.set(true); this.error.set('');
    if (!mas) { this.peliculas.set([]); this.siguiente.set(null); }
    try {
      const pagina = await this.compras.obtenerMisPeliculas(mas ? this.siguiente() : null);
      this.peliculas.update(actuales => mas ? [...actuales,...pagina.peliculas] : pagina.peliculas);
      this.siguiente.set(pagina.siguiente);
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); }
    finally { this.cargando.set(false); }
  }
}
