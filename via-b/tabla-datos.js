// Botón "Ver datos en tabla" y su tabla, como en compartido/serie-anual.js:
// los mismos números de una gráfica, para leerlos o copiarlos.
export function tablaAlternativa({titulo, columnas, filas}) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'sc-boton sc-boton--texto sc-boton--compacto grafica-ver-tabla';
  boton.setAttribute('aria-expanded', 'false');
  boton.textContent = 'Ver datos en tabla';
  const marco = document.createElement('div');
  marco.className = 'sc-tabla-marco';
  marco.hidden = true;
  const tabla = document.createElement('table');
  tabla.className = 'sc-tabla';
  const caption = document.createElement('caption');
  caption.textContent = titulo;
  const cabeza = document.createElement('thead'), filaCabeza = document.createElement('tr');
  for (const c of columnas) {
    const th = document.createElement('th');
    th.scope = 'col'; th.textContent = c.texto;
    if (c.num) th.className = 'sc-num';
    filaCabeza.append(th);
  }
  cabeza.append(filaCabeza);
  const cuerpo = document.createElement('tbody');
  for (const valores of filas) {
    const tr = document.createElement('tr');
    valores.forEach((v, i) => {
      const celda = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) celda.scope = 'row';
      if (columnas[i].num) celda.className = 'sc-num';
      celda.textContent = v;
      tr.append(celda);
    });
    cuerpo.append(tr);
  }
  tabla.append(caption, cabeza, cuerpo);
  marco.append(tabla);
  boton.addEventListener('click', () => {
    const abrir = marco.hidden;
    marco.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
    boton.textContent = abrir ? 'Ocultar tabla' : 'Ver datos en tabla';
  });
  return [boton, marco];
}

// Cifra con signo menos tipográfico y decimales fijos; sin dato, una raya
export const cifra = (v, decimales = 2) => Number.isFinite(v) ? (v < 0 ? '−' : '') + Math.abs(v).toFixed(decimales) : '—';
export const cifraSigno = (v, decimales = 2) => Number.isFinite(v) ? (v > 0 ? '+' : '') + cifra(v, decimales) : '—';

// Mensaje de sección vacía (sc-vacio): qué falta y qué hacer
export function vacio(titulo, texto) {
  const caja = document.createElement('div');
  caja.className = 'sc-vacio';
  const t = document.createElement('p'); t.className = 'sc-vacio__titulo'; t.textContent = titulo;
  const x = document.createElement('p'); x.className = 'sc-vacio__texto'; x.textContent = texto;
  caja.append(t, x);
  return caja;
}
