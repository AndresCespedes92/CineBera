export interface AlertaEstreno {
 usuario_id: string;
 pelicula_id: number;
 activa: boolean;
 notificada_at: string | null;
 leida: boolean;
}
export interface AlertaVisible extends AlertaEstreno {
 titulo: string;
 disponible: boolean;
}
