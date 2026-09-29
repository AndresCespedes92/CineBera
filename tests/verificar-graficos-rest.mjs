import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
const leer=async(consulta)=>{const filas=[];let ultimo=0;for(;;){const r=await consulta().gt('id',ultimo).order('id').limit(500);if(r.error)throw r.error;filas.push(...r.data);if(r.data.length<500)return filas;ultimo=r.data.at(-1).id;}};
const butacas=await leer(()=>client.from('butacas_funcion').select('id,funcion_id,reserva_token,funciones!inner(fecha,pelicula_id,peliculas(titulo))').eq('estado','ocupada').gte('funciones.fecha','2026-09-01').lte('funciones.fecha','2026-09-30'));
const tokens=[...new Set(butacas.map(b=>b.reserva_token).filter(Boolean))];const pagadas=new Set();
for(let i=0;i<tokens.length;i+=100){const compras=await leer(()=>client.from('compras').select('id,reserva_token,funcion_id').eq('estado','pagada').in('reserva_token',tokens.slice(i,i+100)));for(const c of compras)pagadas.add(c.funcion_id+':'+c.reserva_token);}
const peliculas=new Map();for(const b of butacas){if(!pagadas.has(b.funcion_id+':'+b.reserva_token))continue;const id=b.funciones.pelicula_id;peliculas.set(id,(peliculas.get(id)||0)+1);}
const detalles=await leer(()=>client.from('detalles_pedido_candy').select('id,producto_id,cantidad,productos_candy(nombre),pedidos_candy!inner(estado,compras!inner(estado,pagada_at))').eq('pedidos_candy.estado','pagado').eq('pedidos_candy.compras.estado','pagada').gte('pedidos_candy.compras.pagada_at','2026-09-01T00:00:00-03:00').lt('pedidos_candy.compras.pagada_at','2026-10-01T00:00:00-03:00'));
const candy=new Map();for(const d of detalles)candy.set(d.producto_id,(candy.get(d.producto_id)||0)+d.cantidad);
console.log(JSON.stringify({peliculas:[...peliculas].sort((a,b)=>a[0]-b[0]),candy:[...candy].sort((a,b)=>a[0]-b[0])}));
