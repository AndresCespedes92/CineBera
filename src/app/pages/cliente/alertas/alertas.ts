import { MatButtonModule } from '@angular/material/button';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../components/navbar/navbar';
import { AlertaService } from '../../../services/alerta';
import { AlertaVisible } from '../../../models/alerta-estreno';
@Component({selector:'app-alertas',imports: [MatButtonModule, Navbar,RouterLink],templateUrl:'./alertas.html',styleUrl:'../home/home.css'})
export class Alertas implements OnInit {
  filas=signal<AlertaVisible[]>([]);cargando=signal(false);error=signal('');
  constructor(private servicio:AlertaService) {}
  async ngOnInit(){await this.cargar();}
  async cargar(){
    if(this.cargando())return;this.cargando.set(true);this.error.set('');
    try{this.filas.set(await this.servicio.consultar());}
    catch(e){this.error.set(e instanceof Error?e.message:'No se pudieron cargar las alertas.');}
    finally{this.cargando.set(false);}
  }
  async actualizar(id:number,leida:boolean){
    if(this.cargando())return;this.cargando.set(true);this.error.set('');
    try{if(leida)await this.servicio.marcarLeida(id);else await this.servicio.desactivar(id);this.filas.set(await this.servicio.consultar());}
    catch(e){this.error.set(e instanceof Error?e.message:'No se pudo actualizar.');}
    finally{this.cargando.set(false);}
  }
}
