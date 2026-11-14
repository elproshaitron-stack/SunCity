const NS = 'http://www.w3.org/2000/svg';
const mediana = valores => {
  const a = [...valores].sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/** Dibuja el resultado ya calculado. El llamador debe excluir los años punteados
 * de resultado; aquí se excluyen del ancla, línea e intervalo. No recalcula p. */
export function dibujarSerieAnual(contenedor, {anios, valores, resultado, unidad = '°C', aniosPunteados = [], incluirCero = true}) {
  contenedor.replaceChildren();
  const punteados = new Set(aniosPunteados);
  const datos = anios.map((anio, i) => ({anio, valor: valores[i]}))
    .filter(d => Number.isFinite(d.anio) && Number.isFinite(d.valor)).sort((a, b) => a.anio - b.anio);
  const usados = datos.filter(d => !punteados.has(d.anio));
  if (usados.length < 2 || !['pendiente_c_decada', 'ic95_inf', 'ic95_sup', 'p'].every(k => Number.isFinite(resultado?.[k]))) {
    contenedor.textContent = 'No hay datos suficientes para dibujar la tendencia.';
    return;
  }
  const resumen = document.createElement('p');
  resumen.textContent = `${resultado.pendiente_c_decada.toFixed(2)} ${unidad} por década (IC 95 %: ${resultado.ic95_inf.toFixed(2)} a ${resultado.ic95_sup.toFixed(2)})`;
  resumen.style.fontWeight = '700';
  const nota = document.createElement('p');
  nota.textContent = `p = ${resultado.p.toPrecision(3)} · ${resultado.n_anios} años de cálculo. Banda: IC del 95 % de la pendiente, anclado en la mediana.`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 420 310');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Serie anual en ${unidad}. ${resumen.textContent}. ${nota.textContent}`);
  svg.style.cssText = 'display:block;width:100%;height:auto;font:14px system-ui,sans-serif';
  const el = (tag, attrs, contenido) => {
    const nodo = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) nodo.setAttribute(k, v);
    if (contenido !== undefined) nodo.textContent = contenido;
    svg.append(nodo); return nodo;
  };
  const ax = mediana(usados.map(d => d.anio)), ay = mediana(usados.map(d => d.valor));
  const extremos = [usados[0].anio, usados.at(-1).anio];
  const estimar = (anio, pendiente) => ay + (anio - ax) * pendiente / 10;
  const limites = usados.map(d => {
    const a = estimar(d.anio, resultado.ic95_inf), b = estimar(d.anio, resultado.ic95_sup);
    return {anio: d.anio, bajo: Math.min(a, b), alto: Math.max(a, b)};
  });
  // incluirCero: true para diferencias (Vía B); false para valores absolutos (Vía A)
  const rango = [...(incluirCero ? [0] : []), ...datos.map(d => d.valor), ...limites.flatMap(d => [d.bajo, d.alto])];
  let min = Math.min(...rango), max = Math.max(...rango);
  const margen = (max - min || 1) * .12; min -= margen; max += margen;
  const x = a => 58 + (a - datos[0].anio) / (datos.at(-1).anio - datos[0].anio || 1) * 342;
  const y = v => 248 - (v - min) / (max - min) * 218;
  for (let i = 0; i <= 4; i++) {
    const v = min + (max - min) * i / 4;
    el('line', {x1:58, x2:400, y1:y(v), y2:y(v), stroke:'#e1e7e5'});
    el('text', {x:50, y:y(v) + 5, 'text-anchor':'end', fill:'#465752'}, v.toFixed(1));
  }
  el('text', {x:58, y:18, fill:'#465752'}, unidad);
  if (incluirCero) el('line', {x1:58, x2:400, y1:y(0), y2:y(0), stroke:'#667872', 'stroke-dasharray':'5 3'});
  const coords = d => `${x(d.anio)},${y(d.valor)}`;
  el('polygon', {points:[...limites.map(d => `${x(d.anio)},${y(d.alto)}`), ...[...limites].reverse().map(d => `${x(d.anio)},${y(d.bajo)}`)].join(' '), fill:'#197268', opacity:'.18'});
  for (let i = 1; i < datos.length; i++) {
    const a = datos[i - 1], b = datos[i];
    if (b.anio !== a.anio + 1) continue;
    el('line', {x1:x(a.anio), y1:y(a.valor), x2:x(b.anio), y2:y(b.valor), stroke:'#667872', 'stroke-width':1.5, 'stroke-dasharray':punteados.has(a.anio) || punteados.has(b.anio) ? '4 4' : 'none'});
  }
  el('polyline', {points:extremos.map(anio => coords({anio, valor:estimar(anio, resultado.pendiente_c_decada)})).join(' '), fill:'none', stroke:'#12665c', 'stroke-width':3});
  datos.forEach(d => {
    const c = el('circle', {cx:x(d.anio), cy:y(d.valor), r:3.5, fill:punteados.has(d.anio) ? 'white' : '#283f39', stroke:'#283f39', 'stroke-dasharray':punteados.has(d.anio) ? '2 2' : 'none'});
    const t = document.createElementNS(NS, 'title'); t.textContent = `${d.anio}: ${d.valor.toFixed(2)} ${unidad}`; c.append(t);
  });
  const ticks = [...new Set([datos[0].anio, datos[Math.floor((datos.length - 1) / 2)].anio, datos.at(-1).anio])];
  ticks.forEach(a => el('text', {x:x(a), y:272, 'text-anchor':'middle', fill:'#465752'}, a));
  el('text', {x:229, y:299, 'text-anchor':'middle', fill:'#465752'}, 'Año');
  const leyenda = document.createElement('p');
  leyenda.textContent = 'Puntos: valores anuales · Línea verde: Theil–Sen.' + (punteados.size ? ' Trazo punteado: años fuera del cálculo.' : '');
  contenedor.append(resumen, svg, nota, leyenda);
}
