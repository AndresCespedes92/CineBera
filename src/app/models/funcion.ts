/*
 * Representa una función de CineBera
 * dentro de nuestra aplicación Angular.
 */
export interface Funcion {
  id: number;
  peliculaId: number;
  salaId: number;
  fecha: string;
  hora: string;
  formato: string;
  idioma: string;
  activa: boolean;
}


/*
 * Representa los datos que necesitamos
 * enviar a Supabase para crear una función.
 *
 * No incluimos "id" porque Supabase
 * lo genera automáticamente.
 */
export interface NuevaFuncionSupabase {
  pelicula_id: number;
  sala_id: number;
  fecha: string;
  hora: string;
  formato: string;
  idioma: string;
  activa: boolean;
}

/* El administrador elige estos datos; el servicio completa sala_id. */
export interface SolicitudFuncion {
  pelicula_id: number;
  fecha: string;
  hora: string;
  formato: string;
  idioma: string;
}

export interface FuncionGuardada extends NuevaFuncionSupabase {
  id: number;
}
