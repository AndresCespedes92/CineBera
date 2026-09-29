import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source = readFileSync('src/app/supabase.ts', 'utf8');
const url = source.match(/const supabaseUrl = '([^']+)'/)[1];
const key = source.match(/const supabaseKey = '([^']+)'/)[1];
const client = createClient(url, key, { auth: { persistSession: false } });
const result = await client.from('movimientos_puntos')
  .select('beneficio_tipo,codigo_beneficio,compras!compras_beneficio_id_fkey(id)')
  .eq('tipo','canje').limit(1);
if (result.error) throw new Error(result.error.message);
console.log('Consulta REST y relación inversa de beneficio: OK. Canje con código:', Boolean(result.data[0]?.codigo_beneficio));
