import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
for(const consulta of [
  client.from('combos').select('*').order('id'),
  client.from('productos_candy').select('id,nombre,categorias_candy!inner(nombre,activo)').eq('activo',true).eq('categorias_candy.activo',true),
  client.from('detalles_pedido_candy').select('cantidad_combo').limit(0)
]) {
  const {error}=await consulta;
  if(error) throw new Error(error.message);
}
console.log('REST: catálogo público, categorías y detalle de combo disponibles.');
