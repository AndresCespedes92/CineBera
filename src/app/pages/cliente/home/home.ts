import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from '../../../components/navbar/navbar';
import { PeliculaCard } from '../../../components/pelicula-card/pelicula-card';
import { Pelicula } from '../../../models/pelicula';
import { ResumenResenas, VentaPelicula } from '../../../models/resena';
import { PeliculaService } from '../../../services/pelicula';
import { FuncionService } from '../../../services/funcion';
import { ResenaService } from '../../../services/resena';

@Component({selector: 'app-home', imports: [Navbar, PeliculaCard, FormsModule], templateUrl: './home.html', styleUrl: './home.css'})
export class Home implements OnInit {
  peliculas: Pelicula[] = [];
  cargando = true;
  error = '';
  errorRanking = '';
  errorResenas = '';
  busqueda = '';
  genero = '';
  ventas: VentaPelicula[] = [];
  resumen: ResumenResenas[] = [];
  constructor(private router: Router, private peliculaService: PeliculaService,
    private funcionService: FuncionService, private changeDetectorRef: ChangeDetectorRef,
    private resenaService: ResenaService) {}

  get generos(): string[] { return [...new Set(this.peliculas.flatMap(p => p.generos))].sort(); }
  get peliculasFiltradas(): Pelicula[] { return this.resenaService.filtrar(this.peliculas, this.busqueda, this.genero); }
  puesto(id: number): number { return this.ventas.findIndex(v => v.pelicula_id === id) + 1; }
  valoracion(id: number): ResumenResenas | undefined { return this.resumen.find(r => r.pelicula_id === id); }

  async ngOnInit(): Promise<void> {
    this.cargando = true; this.error = '';
    try {
      const disponibles = await this.peliculaService.obtenerCartelera();
      // Conservamos la semana cinematográfica jueves → miércoles y las fechas locales.
      const hoy = new Date();
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - (hoy.getDay() - 4 + 7) % 7);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      const fechaLocal = (f: Date) => [f.getFullYear(), String(f.getMonth()+1).padStart(2,'0'), String(f.getDate()).padStart(2,'0')].join('-');
      const {data, error} = await this.funcionService.obtenerFuncionesSemana(fechaLocal(inicio), fechaLocal(fin));
      if (error) throw new Error('No se pudieron cargar las funciones.');
      const ids = new Set((data ?? []).map(f => f.pelicula_id));
      this.peliculas = disponibles.filter(p => ids.has(p.id));
      await this.cargarIndicadores();
    } catch (e) { this.error = e instanceof Error ? e.message : 'No se pudo cargar la cartelera.'; }
    finally { this.cargando = false; this.changeDetectorRef.detectChanges(); }
  }

  async cargarIndicadores(): Promise<void> {
    const ids = this.peliculas.map(p => p.id);
    this.errorRanking = ''; this.errorResenas = '';
    // Un error en los indicadores no bloquea el acceso a funciones.
    const [ventas, resenas] = await Promise.allSettled([
      this.resenaService.obtenerVentas(ids), this.resenaService.obtenerResumen(ids)
    ]);
    if (ventas.status === 'fulfilled') {
      this.ventas = ventas.value;
      this.peliculas = this.resenaService.ordenar(this.peliculas, this.ventas);
    } else { this.ventas = []; this.errorRanking = 'No se pudo cargar el Top 3.'; }
    if (resenas.status === 'fulfilled') this.resumen = resenas.value;
    else { this.resumen = []; this.errorResenas = 'No se pudieron cargar las valoraciones CineBera.'; }
    this.changeDetectorRef.detectChanges();
  }

  // Conservamos el @Output de PeliculaCard y la navegación existente.
  seleccionarPelicula(pelicula: Pelicula): void {
    this.router.navigate(['/pelicula', pelicula.id, 'funciones']);
  }
}
