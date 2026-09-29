import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
for(const consulta of [
 client.from('compras').select('id,funciones(fecha,hora,peliculas(id,titulo,poster_url)),entradas(codigo)').eq('usuario_id','00000000-0000-0000-0000-000000000000').eq('estado','pagada').order('id',{ascending:false}).limit(21),
 client.from('resenas').select('pelicula_id,estrellas').eq('usuario_id','00000000-0000-0000-0000-000000000000').in('pelicula_id',[0])
]) {
  const {error}=await consulta;
  if(error) throw new Error(error.message);
}
console.log('REST: relaciones y filtros del historial válidos; sin consultar datos personales.');
