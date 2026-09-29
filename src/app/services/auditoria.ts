import { Injectable } from '@angular/core';
import { supabase } from '../supabase';
import { AccionAuditoria, accionesAuditoria, RegistroAuditoria } from '../models/auditoria';

@Injectable({providedIn: 'root'})
export class AuditoriaService {
  // Los eventos se escriben desde triggers; el cliente solamente consulta.
  async obtener(accion: AccionAuditoria | '', antesDe?: number): Promise<{registros: RegistroAuditoria[]; siguiente?: number}> {
    if (accion && !accionesAuditoria.some(a => a.valor === accion)) throw new Error('Acción de auditoría inválida.');
    if (antesDe !== undefined && (!Number.isSafeInteger(antesDe) || antesDe <= 0)) throw new Error('Página inválida.');
    const usuario = await supabase.auth.getUser();
    if (usuario.error || !usuario.data.user || usuario.data.user.is_anonymous) throw new Error('Iniciá sesión como administrador.');
    const perfil = await supabase.from('perfiles').select('rol').eq('id', usuario.data.user.id).single();
    if (perfil.error || perfil.data?.rol !== 'admin') throw new Error('Se requiere rol administrador.');
    let consulta = supabase.from('auditoria').select('id,usuario_id,accion,entidad,entidad_id,detalles,created_at').order('id', {ascending: false}).limit(51);
    if (accion) consulta = consulta.eq('accion', accion);
    if (antesDe !== undefined) consulta = consulta.lt('id', antesDe);
    const {data, error} = await consulta;
    if (error) throw new Error('No se pudo consultar la auditoría.');
    const filas = (data ?? []) as RegistroAuditoria[];
    return {registros: filas.slice(0, 50), siguiente: filas.length > 50 ? filas[49].id : undefined};
  }
}
