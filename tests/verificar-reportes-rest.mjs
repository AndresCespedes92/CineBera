import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const source=readFileSync('src/app/supabase.ts','utf8');
const client=createClient(source.match(/const supabaseUrl = '([^']+)'/)[1],source.match(/const supabaseKey = '([^']+)'/)[1],{auth:{persistSession:false}});
const compras=[];
let ultimo=0;
for(;;) {
 const r=await client.from('compras').select('id,total,pagada_at,reserva_token,funcion_id,pedidos_candy(estado,total)').eq('estado','pagada').gte('pagada_at','2026-09-01T00:00:00-03:00').lt('pagada_at','2026-10-01T00:00:00-03:00').gt('id',ultimo).order('id').limit(500);
 if(r.error) throw r.error;compras.push(...r.data);if(r.data.length<500) break;ultimo=r.data.at(-1).id;
}
let entradas=0,entradasCombos=0,candy=0,sinButacas=0;
for(const c of compras) {
 const r=await client.from('butacas_funcion').select('id',{count:'exact',head:true}).eq('funcion_id',c.funcion_id).eq('reserva_token',c.reserva_token).eq('estado','ocupada');
 if(r.error) throw r.error;entradas+=r.count;if(!r.count) sinButacas++;
 entradasCombos+=Math.round(Number(c.total)*100);
 const pedidos=Array.isArray(c.pedidos_candy)?c.pedidos_candy:c.pedidos_candy?[c.pedidos_candy]:[];
 candy+=pedidos.filter(p=>p.estado==='pagado').reduce((s,p)=>s+Math.round(Number(p.total)*100),0);
}
console.log(JSON.stringify({compras:compras.length,entradas,entradasCombos:entradasCombos/100,candy:candy/100,total:(entradasCombos+candy)/100,comprasSinButacas:sinButacas}));
