import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
const {data,error}=await client.from('productos_candy').select('id,activo,categorias_candy!inner(activo)').eq('activo',true).eq('categorias_candy.activo',true);
if(error) throw error;
if(data.some(p=>!p.activo || !p.categorias_candy.activo)) throw new Error('Catálogo no filtrado');
console.log('REST: relación y filtro por producto/categoría activos verificados.');
