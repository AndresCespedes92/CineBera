import { AlertaService } from '../../../services/alerta';
import { Auth } from '../../../services/auth';
import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  EnPreventa
} from '../../../directives/en-preventa';

import {
  Router
} from '@angular/router';

import {
  Navbar
} from '../../../components/navbar/navbar';

import {
  PeliculaCard
} from '../../../components/pelicula-card/pelicula-card';

import {
  Pelicula
} from '../../../models/pelicula';

import {
  PeliculaService
} from '../../../services/pelicula';


@Component({
  selector: 'app-proximamente',

  imports: [
    Navbar,
    PeliculaCard,
    EnPreventa
  ],

  templateUrl: './proximamente.html',
  styleUrl: './proximamente.css'
})
export class Proximamente implements OnInit {


  /*
 * Consulta al servicio si la película
 * se encuentra dentro de la ventana
 * de preventa.
 *
 * El componente no conoce la regla
 * de los 7 días.
 *
 * Solamente pregunta por el resultado.
 */
estaEnPreventa(
  pelicula: Pelicula
): boolean {

  return this.peliculaService
    .estaEnPreventa(
      pelicula
    );

}

/*
 * Indica si todavía estamos esperando
 * la respuesta de Supabase.
 *
 * Nos permite diferenciar:
 *
 * [] mientras carga
 *
 * de
 *
 * [] después de cargar y no encontrar películas.
 */
cargando: boolean = true;


  /*
   * Contendrá solamente películas cuya
   * fecha de estreno CineBera sea futura.
   */
  peliculas: Pelicula[] = [];
  registrado = false;
  activas:number[]=[];
  procesando:number|null=null;
  error='';
  errorAlertas='';
  async cambiarAlerta(id:number){
    if(this.procesando!==null)return;this.procesando=id;this.errorAlertas='';
    try {
      if(this.activas.includes(id))await this.alertas.desactivar(id);else await this.alertas.activar(id);
      this.activas=(await this.alertas.obtenerSuscripciones()).filter(a=>a.activa).map(a=>a.pelicula_id);
      await this.alertas.consultar();
    } catch(e){this.errorAlertas=e instanceof Error?e.message:'No se pudo guardar la alerta.';}
    finally{this.procesando=null;this.changeDetectorRef.detectChanges();}
  }


  constructor(
    private peliculaService: PeliculaService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private alertas:AlertaService, private auth:Auth
  ) {}


  /*
   * Al iniciar la pantalla consultamos
   * los próximos estrenos.
   */
  async ngOnInit(): Promise<void> {
    this.cargando=true;this.error='';this.errorAlertas='';
    try {
      this.peliculas=await this.peliculaService.obtenerProximamente();
      const sesion=await this.auth.obtenerSesion();this.registrado=!!sesion && !sesion.user.is_anonymous;
      if(this.registrado) {
        try {this.activas=(await this.alertas.obtenerSuscripciones()).filter(a=>a.activa).map(a=>a.pelicula_id);}
        catch(e){this.errorAlertas=e instanceof Error?e.message:'No se pudieron cargar las alertas.';}
      }
    } catch(e){this.error=e instanceof Error?e.message:'No se pudieron cargar los estrenos.';}
    finally{this.cargando=false;this.changeDetectorRef.detectChanges();}
  }

  seleccionarPelicula(
    pelicula: Pelicula
  ): void {

    this.router.navigate([
      '/pelicula',
      pelicula.id,
      'funciones'
    ]);

  }

}