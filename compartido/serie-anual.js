const NS = 'http://www.w3.org/2000/svg';
const mediana = valores => {
  const a = [...valores].sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/* Colores de tokens.css, con el mismo valor de respaldo para páginas que aún no cargan los tokens */
const C = {
  rejilla: 'var(--graf-rejilla, #e1e7e5)',
  eje: 'var(--graf-eje, #465752)',
  serie: 'var(--graf-serie, #667872)',
  punto: 'var(--graf-punto, #283f39)',
  tendencia: 'var(--graf-tendencia, #12665c)',
  banda: 'var(--graf-banda, #197268)',
  fondo: 'var(--superficie, #ffffff)',
  foco: 'var(--foco, #b23a0a)',
  accion: 'var(--accion, #1b1710)',
  sobreAccion: 'var(--sobre-accion, #fbf6ec)'
};
const fmt = (v, d = 2) => v.toFixed(d).replace('-', '−');

/** Dibuja el resultado ya calculado. El llamador debe excluir los años punteados
 * de resultado; aquí se excluyen del ancla, línea e intervalo. No recalcula p.
 *
 * Accesible: la gráfica se enfoca con Tab; las flechas, Inicio y Fin recorren los años y
 * se anuncia cada valor. Con el ratón, el valor aparece al pasar. "Ver datos en tabla"
 * muestra los mismos números como tabla. El ancho se adapta al contenedor. */
export function dibujarSerieAnual(contenedor, opciones) {
  const {anios, valores, resultado, unidad = '°C', aniosPunteados = [], incluirCero = true} = opciones;
  contenedor.replaceChildren();
  const punteados = new Set(aniosPunteados);
  const datos = anios.map((anio, i) => ({anio, valor: valores[i]}))
    .filter(d => Number.isFinite(d.anio) && Number.isFinite(d.valor)).sort((a, b) => a.anio - b.anio);
  const usados = datos.filter(d => !punteados.has(d.anio));
  if (usados.length < 2 || !['pendiente_c_decada', 'ic95_inf', 'ic95_sup', 'p'].every(k => Number.isFinite(resultado?.[k]))) {
    contenedor.textContent = 'No hay datos suficientes para dibujar la tendencia.';
    return;
  }

  // Se vuelve a dibujar si el contenedor cambia de ancho
  vigilarAncho(contenedor, opciones);
  const ancho = Math.max(300, Math.round(contenedor.clientWidth || 420));
  const alto = Math.round(Math.min(340, Math.max(230, ancho * .62)));
  const I = 58, D = ancho - 16, A = 30, B = alto - 62; // márgenes del área de dibujo

  const resumen = document.createElement('p');
  resumen.textContent = `${fmt(resultado.pendiente_c_decada)} ${unidad} por década (IC 95 %: ${fmt(resultado.ic95_inf)} a ${fmt(resultado.ic95_sup)})`;
  resumen.style.fontWeight = '700';
  const nota = document.createElement('p');
  nota.textContent = `p = ${resultado.p.toPrecision(3)} · ${resultado.n_anios} años de cálculo. Banda: IC del 95 % de la pendiente, anclado en la mediana.`;

  const marco = document.createElement('div');
  marco.className = 'sc-grafica';
  marco.style.position = 'relative';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-label', `Serie anual en ${unidad}. ${resumen.textContent}. ${nota.textContent} Usa las flechas para recorrer los años.`);
  svg.style.cssText = 'display:block;width:100%;height:auto;font:12px var(--f-dato, ui-monospace, monospace);font-variant-numeric:tabular-nums;overflow:visible';
  const el = (tag, attrs, contenido, padre = svg) => {
    const nodo = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style') nodo.style.cssText = v; else nodo.setAttribute(k, v);
    }
    if (contenido !== undefined) nodo.textContent = contenido;
    padre.append(nodo); return nodo;
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
  const x = a => I + (a - datos[0].anio) / (datos.at(-1).anio - datos[0].anio || 1) * (D - I);
  const y = v => B - (v - min) / (max - min) * (B - A);

  for (let i = 0; i <= 4; i++) {
    const v = min + (max - min) * i / 4;
    el('line', {x1:I, x2:D, y1:y(v), y2:y(v), style:`stroke:${C.rejilla}`});
    el('text', {x:I - 8, y:y(v) + 4, 'text-anchor':'end', style:`fill:${C.eje}`}, fmt(v, 1));
  }
  el('text', {x:I, y:16, style:`fill:${C.eje}`}, unidad);
  if (incluirCero) el('line', {x1:I, x2:D, y1:y(0), y2:y(0), 'stroke-dasharray':'5 3', style:`stroke:${C.serie}`});
  el('polygon', {points:[...limites.map(d => `${x(d.anio)},${y(d.alto)}`), ...[...limites].reverse().map(d => `${x(d.anio)},${y(d.bajo)}`)].join(' '),
    style:`fill:${C.banda};opacity:.18`});
  for (let i = 1; i < datos.length; i++) {
    const a = datos[i - 1], b = datos[i];
    if (b.anio !== a.anio + 1) continue;
    el('line', {x1:x(a.anio), y1:y(a.valor), x2:x(b.anio), y2:y(b.valor), 'stroke-width':1.5,
      'stroke-dasharray':punteados.has(a.anio) || punteados.has(b.anio) ? '4 4' : 'none', style:`stroke:${C.serie}`});
  }
  el('polyline', {points:extremos.map(anio => `${x(anio)},${y(estimar(anio, resultado.pendiente_c_decada))}`).join(' '),
    fill:'none', 'stroke-width':3, style:`stroke:${C.tendencia}`});
  datos.forEach(d => {
    el('circle', {cx:x(d.anio), cy:y(d.valor), r:3.5, 'stroke-dasharray':punteados.has(d.anio) ? '2 2' : 'none',
      style:`fill:${punteados.has(d.anio) ? C.fondo : C.punto};stroke:${C.punto}`});
  });
  const pasos = ancho < 420 ? 2 : 4;
  const ticks = [...new Set(Array.from({length: pasos + 1}, (_, k) => datos[Math.round((datos.length - 1) * k / pasos)].anio))];
  ticks.forEach(a => el('text', {x:x(a), y:B + 22, 'text-anchor':'middle', style:`fill:${C.eje}`}, a));
  el('text', {x:(I + D) / 2, y:B + 46, 'text-anchor':'middle', style:`fill:${C.eje}`}, 'Año');

  // Punto señalado: anillo, guía vertical y valor
  const guia = el('line', {y1:A, y2:B, visibility:'hidden', 'stroke-dasharray':'2 3', style:`stroke:${C.eje}`});
  const anillo = el('circle', {r:7, fill:'none', 'stroke-width':2.5, visibility:'hidden', style:`stroke:${C.foco}`});
  const globo = document.createElement('div');
  globo.setAttribute('aria-hidden', 'true');
  globo.style.cssText = `position:absolute;z-index:3;display:none;pointer-events:none;white-space:nowrap;transform:translate(-50%,calc(-100% - 10px));
    padding:4px 8px;border-radius:6px;font:12px var(--f-dato, ui-monospace, monospace);background:${C.accion};color:${C.sobreAccion}`;
  const lectura = document.createElement('p');
  lectura.className = 'sc-grafica__lectura sc-solo-lector';
  lectura.setAttribute('aria-live', 'polite');
  lectura.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
  const textoDe = d => `${d.anio}: ${fmt(d.valor)} ${unidad}${punteados.has(d.anio) ? ', fuera del cálculo' : ''}`;
  let actual = -1;
  function senalar(i, anunciar) {
    actual = i;
    if (i < 0) { [guia, anillo].forEach(n => n.setAttribute('visibility', 'hidden')); globo.style.display = 'none'; return; }
    const d = datos[i], cx = x(d.anio), cy = y(d.valor);
    guia.setAttribute('x1', cx); guia.setAttribute('x2', cx); guia.setAttribute('visibility', 'visible');
    anillo.setAttribute('cx', cx); anillo.setAttribute('cy', cy); anillo.setAttribute('visibility', 'visible');
    const escala = svg.getBoundingClientRect().width / ancho || 1;
    globo.textContent = textoDe(d);
    globo.style.left = `${cx * escala}px`; globo.style.top = `${cy * escala}px`; globo.style.display = 'block';
    if (anunciar) lectura.textContent = textoDe(d);
  }
  const masCercano = clientX => {
    const r = svg.getBoundingClientRect(), u = (clientX - r.left) / (r.width / ancho);
    let mejor = 0;
    datos.forEach((d, i) => { if (Math.abs(x(d.anio) - u) < Math.abs(x(datos[mejor].anio) - u)) mejor = i; });
    return mejor;
  };
  svg.addEventListener('pointermove', e => senalar(masCercano(e.clientX), false));
  svg.addEventListener('pointerleave', () => { if (document.activeElement !== svg) senalar(-1); });
  svg.addEventListener('focus', () => senalar(actual < 0 ? datos.length - 1 : actual, true));
  svg.addEventListener('blur', () => senalar(-1));
  svg.addEventListener('keydown', e => {
    const mover = {ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1}[e.key];
    let i = actual;
    if (mover) i = Math.min(datos.length - 1, Math.max(0, (actual < 0 ? datos.length - 1 : actual) + mover));
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = datos.length - 1;
    else return;
    e.preventDefault();
    senalar(i, true);
  });
  marco.append(svg, globo, lectura);

  const leyenda = document.createElement('p');
  leyenda.textContent = 'Puntos: valores anuales · Línea verde: Theil–Sen.' + (punteados.size ? ' Trazo punteado: años fuera del cálculo.' : '');

  // Los mismos números como tabla, para leer o copiar
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'sc-boton sc-boton--texto sc-boton--compacto grafica-ver-tabla';
  boton.setAttribute('aria-expanded', 'false');
  boton.textContent = 'Ver datos en tabla';
  const marcoTabla = document.createElement('div');
  marcoTabla.className = 'sc-tabla-marco';
  marcoTabla.hidden = true;
  const tabla = document.createElement('table');
  tabla.className = 'sc-tabla';
  const titulo = document.createElement('caption');
  titulo.textContent = `Valor de cada año, en ${unidad}`;
  const cabeza = document.createElement('thead');
  cabeza.innerHTML = '<tr><th scope="col">Año</th><th scope="col" class="sc-num"></th><th scope="col">En el cálculo</th></tr>';
  cabeza.querySelector('.sc-num').textContent = `Valor (${unidad})`;
  const cuerpo = document.createElement('tbody');
  datos.forEach(d => {
    const fila = document.createElement('tr');
    const th = document.createElement('th'); th.scope = 'row'; th.textContent = d.anio;
    const v = document.createElement('td'); v.className = 'sc-num'; v.textContent = fmt(d.valor);
    const usado = document.createElement('td'); usado.textContent = punteados.has(d.anio) ? 'No, punteado' : 'Sí';
    fila.append(th, v, usado); cuerpo.append(fila);
  });
  tabla.append(titulo, cabeza, cuerpo);
  marcoTabla.append(tabla);
  boton.addEventListener('click', () => {
    const abrir = marcoTabla.hidden;
    marcoTabla.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
    boton.textContent = abrir ? 'Ocultar tabla' : 'Ver datos en tabla';
  });

  contenedor.append(resumen, marco, nota, leyenda, boton, marcoTabla);
}

const vigilados = new WeakMap();
function vigilarAncho(contenedor, opciones) {
  if (typeof ResizeObserver === 'undefined') return;
  let estado = vigilados.get(contenedor);
  if (!estado) {
    estado = {opciones, ancho: contenedor.clientWidth, cuadro: 0};
    estado.obs = new ResizeObserver(() => {
      const w = contenedor.clientWidth;
      if (!w || Math.abs(w - estado.ancho) < 24) return;
      estado.ancho = w;
      cancelAnimationFrame(estado.cuadro);
      estado.cuadro = requestAnimationFrame(() => {
        // Conserva la tabla abierta si lo estaba
        const abierta = contenedor.querySelector('.grafica-ver-tabla')?.getAttribute('aria-expanded') === 'true';
        dibujarSerieAnual(contenedor, estado.opciones);
        if (abierta) contenedor.querySelector('.grafica-ver-tabla')?.click();
      });
    });
    estado.obs.observe(contenedor);
    vigilados.set(contenedor, estado);
  }
  estado.opciones = opciones;
  estado.ancho = contenedor.clientWidth;
}
