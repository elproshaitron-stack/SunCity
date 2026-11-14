import {semaforo} from './semaforo.js';

const NS = 'http://www.w3.org/2000/svg';
const NOMBRES = {
  primario:'Primario 2001-2019', con_deriva:'Con deriva 2001-2025',
  aqua:'Aqua', ref_b:'Referencia B', mod21:'MOD21',
  sin_2001_2002:'Sin 2001-2002 (Terra 2003-2019)'
};
const COLORES = {rojo:'#bd4b3e', azul:'#347baf', gris:'#8b9697'};

export function dibujarVariantes(contenedor, resultados, orden) {
  contenedor.replaceChildren();
  const filas = orden.map(clave => ({clave, dato:resultados.find(r => r.variante === clave)}));
  const validas = filas.filter(f => f.dato && ['pendiente_c_decada','ic95_inf','ic95_sup','p_fdr'].every(k => Number.isFinite(f.dato[k])));
  const valores = [0,...validas.flatMap(f => [f.dato.ic95_inf,f.dato.ic95_sup,f.dato.pendiente_c_decada])];
  const margen = Math.max(.1,(Math.max(...valores)-Math.min(...valores))*.12);
  const min = Math.min(...valores)-margen, max = Math.max(...valores)+margen;
  const x = v => 52+(v-min)/(max-min)*245, alto = 66*filas.length+72;
  const svg = document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox',`0 0 420 ${alto}`);
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Pendientes por variante, intervalos del 95 %, p ajustado y línea vertical en cero.');
  svg.style.cssText='display:block;width:100%;height:auto;font:13px system-ui,sans-serif';
  const el=(tag,attrs,contenido)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(contenido!==undefined)n.textContent=contenido;svg.append(n);return n};
  el('rect',{x:2,y:12,width:416,height:59,rx:6,fill:'#e9f1e8'});
  el('line',{x1:x(0),x2:x(0),y1:22,y2:alto-39,stroke:'#243d36','stroke-width':2.5});
  filas.forEach((f,i)=>{
    const y=38+i*66,d=f.dato;
    el('text',{x:10,y:y-7,fill:'#243d36','font-weight':i===0?'700':'500'},NOMBRES[f.clave]||f.clave);
    if(!validas.includes(f)){el('text',{x:12,y:y+18,fill:'#607063'},'Sin datos');return}
    const color=COLORES[semaforo(d)], cy=y+16;
    el('line',{x1:x(d.ic95_inf),x2:x(d.ic95_sup),y1:cy,y2:cy,stroke:color,'stroke-width':3});
    for(const v of [d.ic95_inf,d.ic95_sup])el('line',{x1:x(v),x2:x(v),y1:cy-5,y2:cy+5,stroke:color,'stroke-width':2});
    el('circle',{cx:x(d.pendiente_c_decada),cy,r:i===0?6:5,fill:color});
    el('circle',{cx:316,cy:cy-4,r:5,fill:color});
    el('text',{x:328,y:cy,fill:'#243d36','font-size':12},`p FDR ${d.p_fdr.toPrecision(2)}`);
  });
  const eje=alto-34;el('line',{x1:52,x2:297,y1:eje,y2:eje,stroke:'#52665c'});
  for(const v of [min,0,max])el('text',{x:x(v),y:eje+19,'text-anchor':'middle',fill:'#52665c','font-size':11},v.toFixed(1));
  el('text',{x:174,y:alto-1,'text-anchor':'middle',fill:'#52665c'},'°C por década');
  const nota=document.createElement('p');nota.textContent='Las variantes repiten el cálculo sobre datos que se traslapan; no son pruebas independientes.';
  contenedor.append(svg,nota);
}
