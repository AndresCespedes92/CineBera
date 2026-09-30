import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vrytxwyxmjjzetiwtoii.supabase.co';

const supabaseKey = 'sb_publishable_4Vu4fkMxsnHc1V9IsGeVlQ_YurQICmX';

export const supabase = createClient(supabaseUrl, supabaseKey);
/** La sesión del alta vive en memoria y no se comparte con la del administrador. */
export function crearClienteAltaPersonal() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'cinebera-alta-' + crypto.randomUUID(),
    },
  });
}
