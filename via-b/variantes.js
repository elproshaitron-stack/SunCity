import {semaforo} from './semaforo.js';

const NS = 'http://www.w3.org/2000/svg';
const ETIQUETAS = {
  primario: 'Primario 2001-2019',
  con_deriva: 'Con deriva 2001-2025',
  aqua: 'Aqua',
  ref_b: 'Referencia B',
  mod21: 'MOD21',
  sin_2001_2002: 'Sin 2001-2002 (Terra 2003-2019)'
};
const COLORES = {rojo:'var(--estado-sube)', azul:'var(--estado-baja)', gris:'var(--estado-neutro)'};

export function dibujarVariantes(contenedor, resultados, orden) {
  contenedor.replaceChildren();
  const filas = orden.map(variante => ({variante, nombre:ETIQUETAS[variante] || variante,
    dato:resultados.find(r => r.variante === variante)}));
  const validas = filas.filter(f => f.dato &&
    ['pendiente_c_decada', 'ic95_inf', 'ic95_sup', 'p_fdr'].every(k => Number.isFinite(f.dato[k])));
  const extremos = [0, ...validas.flatMap(f => [f.dato.ic95_inf, f.dato.ic95_sup, f.dato.pendiente_c_decada])];
  const amplitud = Math.max(...extremos) - Math.min(...extremos);
  const margen = Math.max(.1, amplitud * .12);
  const minimo = Math.min(...extremos) - margen, maximo = Math.max(...extremos) + margen;
  const izquierda = 56, derecha = 305, alto = 66 * filas.length + 75;
  const x = valor => izquierda + (valor - minimo) / (maximo - minimo) * (derecha - izquierda);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 420 ${alto}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Pendientes Theil–Sen e intervalos del 95 % de seis variantes; línea vertical en cero.');
  svg.style.cssText = 'display:block;width:100%;height:auto;font:13px var(--f-texto)';
  function el(tag, attrs, contenido) {
    const nodo = document.createElementNS(NS, tag);
    for (const [clave, valor] of Object.entries(attrs)) {
      // Los colores van como estilo para poder usar los tokens (var(--…))
      if ((clave === 'fill' || clave === 'stroke') && String(valor).startsWith('var(')) nodo.style[clave] = valor; else nodo.setAttribute(clave, valor);
    }
    if (contenido !== undefined) nodo.textContent = contenido;
    svg.append(nodo); return nodo;
  }
  el('rect', {x:2,y:13,width:416,height:60,rx:6,fill:'var(--superficie-2)'});
  el('line', {x1:x(0),x2:x(0),y1:25,y2:alto-43,stroke:'var(--texto)','stroke-width':2.5});
  filas.forEach((fila, i) => {
    const y = 37 + i * 66, d = fila.dato;
    el('text', {x:10,y:y-5,fill:'var(--texto)','font-weight':i === 0 ? '700':'500'},fila.nombre);
    if (!d || !validas.includes(fila)) {
      el('text', {x:12,y:y+18,fill:'var(--texto-2)'},'Sin datos');
      return;
    }
    const color = semaforo(d), centro = y + 15;
    el('line', {x1:x(d.ic95_inf),x2:x(d.ic95_sup),y1:centro,y2:centro,stroke:COLORES[color],'stroke-width':3});
    for (const valor of [d.ic95_inf,d.ic95_sup]) el('line', {x1:x(valor),x2:x(valor),y1:centro-5,y2:centro+5,stroke:COLORES[color],'stroke-width':2});
    el('circle', {cx:x(d.pendiente_c_decada),cy:centro,r:i === 0 ? 6 : 5,fill:COLORES[color],stroke:'var(--superficie)','stroke-width':1.5});
    el('circle', {cx:330,cy:centro-4,r:5,fill:COLORES[color]});
    el('text', {x:341,y:centro,fill:'var(--texto)','font-size':12},`p FDR ${d.p_fdr.toPrecision(2)}`);
    const titulo = document.createElementNS(NS,'title');
    titulo.textContent = `${fila.nombre}: ${d.pendiente_c_decada.toFixed(2)} °C por década; IC 95 % ${d.ic95_inf.toFixed(2)} a ${d.ic95_sup.toFixed(2)}; p FDR ${d.p_fdr.toPrecision(3)}; ${color}`;
    svg.append(titulo);
  });
  const ejeY = alto - 36;
  el('line', {x1:izquierda,x2:derecha,y1:ejeY,y2:ejeY,stroke:'var(--graf-eje)'});
  for (const valor of [minimo,0,maximo]) {
    const px=x(valor); el('line',{x1:px,x2:px,y1:ejeY,y2:ejeY+5,stroke:'var(--graf-eje)'});
    el('text',{x:px,y:ejeY+19,'text-anchor':'middle',fill:'var(--texto-2)','font-size':11},valor.toFixed(1));
  }
  el('text',{x:(izquierda+derecha)/2,y:alto-1,'text-anchor':'middle',fill:'var(--texto-2)'},'°C por década');
  const nota = document.createElement('p');
  nota.textContent = 'Las variantes repiten el cálculo sobre datos que se traslapan; no son pruebas independientes.';
  contenedor.append(svg,nota);
}
