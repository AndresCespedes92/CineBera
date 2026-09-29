import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
for(const consulta of [
  client.from('resenas').select('*').limit(1),
  client.from('resenas_resumen').select('*').limit(1),
  client.from('ranking_peliculas').select('*').order('entradas_vendidas',{ascending:false}).limit(3)
]) {
  const {error}=await consulta;
  if(error) throw new Error(error.message);
}
console.log('REST: reseñas públicas, promedios y ranking disponibles.');
