import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
for(const consulta of [
 client.from('compras').select('cancelada_at,credito_reintegro,cancelacion_completa').limit(0),
 client.from('entradas').select('*,compras!inner(estado)').eq('compras.estado','pagada').limit(0),
 client.from('movimientos_puntos').select('tipo').eq('tipo','cancelacion').limit(0)
]) {
  const {error}=await consulta;
  if(error) throw new Error(error.message);
}
console.log('REST: columnas de cancelación y consulta QR validadas sin recuperar datos personales.');
