const NS = 'http://www.w3.org/2000/svg';
const PASOS = [
  ['terra_1030', '10:30', 'Terra'], ['aqua_1330', '13:30', 'Aqua'],
  ['terra_2230', '22:30', 'Terra'], ['aqua_0130', '1:30', 'Aqua']
];

export function dibujarCicloDiario(contenedor, filas, pasosAqua = 'solo_mod11') {
  contenedor.replaceChildren();
  const datos = PASOS.map(([paso, hora, satelite]) => {
    const lista = filas.filter(f => f.paso === paso);
    const mod11 = lista.find(f => f.producto === 'MOD11');
    const mod21 = lista.find(f => f.producto === 'MOD21');
    const rango = satelite === 'Terra' || pasosAqua === 'rango';
    return {hora, satelite, mod11, mod21:rango ? mod21 : undefined, yale:lista.find(f => f.yale_signo)?.yale_signo || ''};
  });
  if (datos.some(d => !d.mod11)) {
    contenedor.textContent = 'Faltan datos del ciclo diario para este sector.';
    return;
  }
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 420 320');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Ciclo diario: cuatro diferencias de temperatura superficial en grados Celsius, con la línea de cero.');
  svg.style.cssText = 'display:block;width:100%;height:auto;font:14px system-ui,sans-serif';
  const el = (tag, attrs, contenido) => {
    const nodo = document.createElementNS(NS, tag);
    for (const [k,v] of Object.entries(attrs)) nodo.setAttribute(k,v);
    if (contenido !== undefined) nodo.textContent = contenido;
    svg.append(nodo); return nodo;
  };
  const valores = datos.flatMap(d => [d.mod11.valor, ...(d.mod21 ? [d.mod21.valor] : [])]);
  const minimo = Math.min(0, ...valores), maximo = Math.max(0, ...valores);
  const holgura = Math.max(.2, (maximo - minimo) * .12);
  const inferior = minimo - holgura, superior = maximo + holgura;
  const y = v => 225 - (v - inferior) / (superior - inferior) * 190;
  const y0 = y(0);
  el('text', {x:44,y:20,fill:'#465752'}, '°C');
  for (const v of [inferior, 0, superior]) {
    el('line', {x1:46,x2:408,y1:y(v),y2:y(v),stroke:v === 0 ? '#243d36' : '#dde5df','stroke-width':v === 0 ? 2.5 : 1});
    el('text', {x:40,y:y(v)+5,'text-anchor':'end',fill:'#465752'},v.toFixed(1));
  }
  datos.forEach((d,i) => {
    const x = 78 + i * 96;
    const a = d.mod11.valor, b = d.mod21?.valor;
    const alto = Math.max(a,b ?? a), bajo = Math.min(a,b ?? a);
    if (b === undefined) {
      el('rect',{x:x-17,y:Math.min(y(a),y0),width:34,height:Math.max(2,Math.abs(y(a)-y0)),fill:i<2?'#c57d4f':'#28746d'});
    } else {
      // El cuerpo alcanza el extremo más lejano de cero; la banda oscura marca
      // ambos valores de producto, incluso cuando caen a lados opuestos de cero.
      const extremo = Math.abs(alto) > Math.abs(bajo) ? alto : bajo;
      el('rect',{x:x-17,y:Math.min(y(extremo),y0),width:34,height:Math.max(2,Math.abs(y(extremo)-y0)),fill:i<2?'#dba983':'#81ada7'});
      el('rect',{x:x-17,y:y(alto),width:34,height:Math.max(3,y(bajo)-y(alto)),fill:i<2?'#ad633a':'#1d665f'});
      for (const v of [a,b]) el('line',{x1:x-19,x2:x+19,y1:y(v),y2:y(v),stroke:'#183d36','stroke-width':2});
    }
    const titulo = el('title',{},`${d.hora} ${d.satelite}: MOD11 ${a.toFixed(2)} °C${b === undefined ? '' : `; MOD21 ${b.toFixed(2)} °C`}`);
    el('text',{x,y:257,'text-anchor':'middle',fill:'#243d36','font-weight':'700'},d.hora);
    el('text',{x,y:276,'text-anchor':'middle',fill:'#52665c'},d.satelite);
    if (i < 2 && (d.yale === '+' || d.yale === '-')) {
      el('circle',{cx:x+27,cy:38,r:10,fill:'#f4e7ce',stroke:'#8c6b39'});
      el('text',{x:x+27,y:43,'text-anchor':'middle',fill:'#65491d','font-weight':'700'},d.yale);
    }
  });
  contenedor.append(svg);
  const leyenda = document.createElement('p'); leyenda.className = 'nota-ciclo';
  leyenda.textContent = 'Banda oscura: rango MOD11–MOD21 cuando hay ambos productos. Signo diurno de Yale (cotejo, no sensor independiente).';
  const lectura = document.createElement('p'); lectura.className = 'nota-ciclo';
  lectura.textContent = 'Bajo cero: el sector está más fresco que el desierto a esa hora. Sobre cero: más caliente.';
  contenedor.append(leyenda, lectura);
}
