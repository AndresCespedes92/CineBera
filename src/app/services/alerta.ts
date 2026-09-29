import { Injectable, signal } from '@angular/core';
import { supabase } from '../supabase';
import { AlertaEstreno, AlertaVisible } from '../models/alerta-estreno';
export interface PeliculaAlerta {id:number;titulo:string;visible:boolean;fecha_estreno_cinebera:string;}
export interface FuncionAlerta {pelicula_id:number;fecha:string;hora:string;activa:boolean;}
@Injectable({providedIn:'root'})
export class AlertaService {
  noLeidas=signal(0);
  private async usuario():Promise<string> {
    const {data:{user},error}=await supabase.auth.getUser();
    if(error || !user || user.is_anonymous) throw new Error('Iniciá sesión para administrar tus alertas.');
    return user.id;
  }
  private hoy(ahora=new Date()):string {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(ahora);}
  /** Respeta preventa de siete días y la semana que muestra FuncionesPelicula.
   * Venta habilitada no significa reserva de una butaca para el usuario. */
  disponible(p:PeliculaAlerta,funciones:FuncionAlerta[],ahora=new Date()):boolean {
    const hoy=this.hoy(ahora);
    const sumar=(fecha:string,dias:number)=>new Date(Date.parse(fecha+'T00:00:00Z')+dias*86400000).toISOString().slice(0,10);
    if(!p.visible || !p.fecha_estreno_cinebera || p.fecha_estreno_cinebera>sumar(hoy,7)) return false;
    const dia=new Date(hoy+'T00:00:00Z').getUTCDay();
    let inicio=sumar(hoy,-((dia-4+7)%7)),fin=sumar(inicio,6);
    if(p.fecha_estreno_cinebera>fin) {
      inicio=p.fecha_estreno_cinebera;
      fin=sumar(inicio,(3-new Date(inicio+'T00:00:00Z').getUTCDay()+7)%7);
    }
    return funciones.some(f=>f.pelicula_id===p.id && f.activa && f.fecha>=inicio && f.fecha<=fin &&
      f.fecha>=p.fecha_estreno_cinebera && new Date(f.fecha+'T'+f.hora+'-03:00').getTime()>ahora.getTime());
  }
  async obtenerSuscripciones():Promise<AlertaEstreno[]> {
    const usuario=await this.usuario();const filas:AlertaEstreno[]=[];
    for(let desde=0;;desde+=500) {
      const r=await supabase.from('alertas_estrenos').select('*').eq('usuario_id',usuario).order('pelicula_id').range(desde,desde+499);
      if(r.error) throw new Error('No se pudieron cargar tus alertas.');
      filas.push(...(r.data??[]));if((r.data?.length??0)<500) return filas;
    }
  }
  async activar(peliculaId:number):Promise<void> {
    const usuario=await this.usuario();
    const p=await supabase.from('peliculas').select('visible,fecha_estreno_cinebera').eq('id',peliculaId).single();
    if(p.error || !p.data?.visible || p.data.fecha_estreno_cinebera<=this.hoy()) throw new Error('Solo podés activar alertas para películas futuras visibles.');
    const r=await supabase.from('alertas_estrenos').upsert({usuario_id:usuario,pelicula_id:peliculaId,activa:true,notificada_at:null,leida:false},{onConflict:'usuario_id,pelicula_id'}).select('pelicula_id').single();
    if(r.error || !r.data) throw new Error('No se pudo activar la alerta.');
  }
  async desactivar(peliculaId:number):Promise<void> {await this.cambiar(peliculaId,{activa:false});}
  async marcarLeida(peliculaId:number):Promise<void> {await this.cambiar(peliculaId,{leida:true});}
  private async cambiar(peliculaId:number,cambios:{activa?:boolean;leida?:boolean}) {
    const r=await supabase.from('alertas_estrenos').update(cambios).eq('usuario_id',await this.usuario()).eq('pelicula_id',peliculaId).select('pelicula_id').maybeSingle();
    if(r.error || !r.data) throw new Error('No se pudo actualizar la alerta.');
  }
  async consultar():Promise<AlertaVisible[]> {
    const alertas=(await this.obtenerSuscripciones()).filter(a=>a.activa);
    const resultado:AlertaVisible[]=[];
    // Lotes acotados para no truncar por el límite REST ni construir URLs enormes.
    for(let desde=0;desde<alertas.length;desde+=100) {
      const lote=alertas.slice(desde,desde+100),ids=lote.map(a=>a.pelicula_id);
      const peliculas=await supabase.from('peliculas').select('id,titulo,visible,fecha_estreno_cinebera').in('id',ids);
      if(peliculas.error) throw new Error('No se pudo comprobar la disponibilidad de películas.');
      const funciones:FuncionAlerta[]=[];
      for(let inicio=0;;inicio+=500) {
        const r=await supabase.from('funciones').select('pelicula_id,fecha,hora,activa').in('pelicula_id',ids).eq('activa',true).gte('fecha',this.hoy()).order('id').range(inicio,inicio+499);
        if(r.error) throw new Error('No se pudieron comprobar las funciones.');
        funciones.push(...(r.data??[]));if((r.data?.length??0)<500) break;
      }
      for(const alerta of lote) {
        const p=(peliculas.data??[]).find(p=>p.id===alerta.pelicula_id);
        resultado.push({...alerta,titulo:p?.titulo??'Película no disponible',disponible:p?this.disponible(p,funciones):false});
      }
    }
    const nuevas=resultado.filter(a=>a.disponible && !a.notificada_at);
    if(nuevas.length) {
      const fecha=new Date().toISOString();
      const r=await supabase.from('alertas_estrenos').update({notificada_at:fecha,leida:false}).eq('usuario_id',await this.usuario())
        .eq('activa',true).is('notificada_at',null).in('pelicula_id',nuevas.map(a=>a.pelicula_id)).select('pelicula_id,notificada_at,leida');
      if(r.error) throw new Error('No se pudo guardar el aviso. Volvé a actualizar.');
      // Navbar y Mis alertas pueden comprobar al mismo tiempo. Releemos el estado
      // guardado para no perder el aviso ni volver a marcar como no leído un aviso leído.
      const actuales=await supabase.from('alertas_estrenos').select('pelicula_id,notificada_at,leida,activa')
        .eq('usuario_id',await this.usuario()).in('pelicula_id',nuevas.map(a=>a.pelicula_id));
      if(actuales.error) throw new Error('No se pudo actualizar el estado de los avisos.');
      for(const guardada of actuales.data??[]) {
        const a=resultado.find(a=>a.pelicula_id===guardada.pelicula_id)!;a.notificada_at=guardada.notificada_at;a.leida=guardada.leida;a.activa=guardada.activa;
      }
    }
    this.noLeidas.set(resultado.filter(a=>a.activa && a.notificada_at && !a.leida).length);
    return resultado.filter(a=>a.activa);
  }
}
