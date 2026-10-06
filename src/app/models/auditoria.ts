export type AccionAuditoria = 'funcion_creada' | 'precio_modificado' | 'qr_validado';
export interface RegistroAuditoria {
  id: number;
  usuario_id: string;
  usuario_nombre?: string;
  accion: AccionAuditoria;
  entidad: string;
  entidad_id: number;
  detalles: Record<string, unknown>;
  created_at: string;
}
export const accionesAuditoria: {valor: AccionAuditoria; nombre: string}[] = [
  {valor: 'funcion_creada', nombre: 'Creación de función'},
  {valor: 'precio_modificado', nombre: 'Cambio de precio'},
  {valor: 'qr_validado', nombre: 'Validación de QR'}
];
