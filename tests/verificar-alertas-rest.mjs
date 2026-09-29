import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
const {error}=await client.from('alertas_estrenos').select('pelicula_id,activa,notificada_at,leida').limit(0);
if(error?.code!=='42501') throw new Error('Se esperaba denegación de lectura para visitantes: '+(error?.message??'lectura permitida'));
console.log('REST: tabla de alertas disponible y lectura anónima denegada.');
