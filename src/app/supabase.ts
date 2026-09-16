import {
  createClient
} from '@supabase/supabase-js';


const supabaseUrl = 'https://vrytxwyxmjjzetiwtoii.supabase.co';


const supabaseKey = 'sb_publishable_4Vu4fkMxsnHc1V9IsGeVlQ_YurQICmX';


export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);