import {dibujarSerieAnual} from '../compartido/serie-anual.js';
import {ESQUEMA} from './datos/esquema.js';
import {RUTA_DATOS} from './config.js';
import {semaforo} from './semaforo.js';
import {nombreSector, guardarNombre, nombresPersonalizados} from './nombres.js';

const $ = id => document.getElementById(id);
const colores = {rojo:'#bd4b3e', azul:'#347baf', gris:'#8b9697'};
const base = new URL(RUTA_DATOS, import.meta.url);

function leerCSV(texto, esquema) {
  const filas = []; let fila = [], campo = '', comillas = false;
  texto = texto.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') {
      if (comillas && texto[i + 1] === '"') { campo += '"'; i++; }
      else comillas = !comillas;
    } else if (!comillas && (c === ',' || c === '\n')) {
      fila.push(campo); campo = '';
      if (c === '\n') { if (fila.some(Boolean)) filas.push(fila); fila = []; }
    } else campo += c;
  }
  if (comillas) throw new Error('CSV con comillas sin cerrar.');
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const cabecera = filas.shift() || [];
  for (const nombre of Object.values(esquema)) if (!cabecera.includes(nombre)) throw new Error(`Falta la columna ${nombre}.`);
  return filas.map(f => Object.fromEntries(Object.entries(esquema).map(([clave, nombre]) => {
    const valor = f[cabecera.indexOf(nombre)];
    if (clave === 'sector' || clave === 'variante') return [clave, valor];
    if (valor === undefined || valor.trim() === '' || !Number.isFinite(Number(valor))) throw new Error(`Valor inválido en ${nombre}.`);
    return [clave, Number(valor)];
  })));
}

async function cargar(nombre, json = false) {
  const respuesta = await fetch(new URL(nombre, base));
  if (!respuesta.ok) throw new Error(`No se pudo leer ${nombre} (${respuesta.status}).`);
  return json ? respuesta.json() : respuesta.text();
}

async function iniciar() {
  if (!window.L) throw new Error('No se pudo cargar Leaflet. Revisa la conexión y vuelve a cargar.');
  const [geojson, csvSerie, csvResultados, nombres] = await Promise.all([cargar('sectores.geojson', true), cargar('serie.csv'), cargar('resultados.csv'), cargar('nombres.json', true).catch(() => null)]);
  const configNombres = nombres && Array.isArray(nombres.centro) && Number.isFinite(nombres.radio_centro_km) && typeof nombres.ciudad === 'string'
    ? nombres : {ciudad:'Hermosillo', centro:[29.0729, -110.9559], radio_centro_km:2, sectores:{}};
  const nombreDe = f => nombreSector(f, geojson.features, configNombres);
  const series = leerCSV(csvSerie, ESQUEMA.serie), resultados = leerCSV(csvResultados, ESQUEMA.resultados);
  if (resultados.some(r => !ESQUEMA.variantes.includes(r.variante))) throw new Error('Hay variantes desconocidas en los datos.');
  const primarios = new Map(resultados.filter(r => r.variante === ESQUEMA.variantes[0]).map(r => [r.sector, r]));
  const sectores = geojson.features.filter(f => f.properties.tipo === 'sector');
  for (const f of sectores) if (!primarios.has(f.properties.id) || !series.some(s => s.sector === f.properties.id)) throw new Error(`Faltan datos del sector ${f.properties.id}.`);
  const mapa = L.map('mapa', {zoomControl:false});
  L.control.zoom({position:'topleft', zoomInTitle:'Acercar', zoomOutTitle:'Alejar'}).addTo(mapa);
  const mosaicos = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(mapa);
  mosaicos.on('tileerror', () => { $('estado').textContent = 'El mapa base no está disponible; los sectores siguen siendo seleccionables.'; });
  let seleccionado = null;
  const estilo = f => f.properties.tipo === 'referencia'
    ? {color:'#7a693c', fillColor:'#e2c987', fillOpacity:.15, weight:2, dashArray:'6 5'}
    : {color:f.properties.id === seleccionado ? '#183f31' : '#fffef9', weight:f.properties.id === seleccionado ? 4 : 2, fillColor:colores[semaforo(primarios.get(f.properties.id))], fillOpacity:.45};
  const capas = new Map();
  const geometria = L.geoJSON(geojson, {style:estilo, onEachFeature(f, capa) {
    const etiqueta = document.createElement('span'); etiqueta.textContent = f.properties.tipo === 'sector' ? nombreDe(f).nombre : f.properties.nombre; capa.bindTooltip(etiqueta);
    if (f.properties.tipo === 'sector') { capas.set(f.properties.id, capa); capa.on('click', () => abrir(f.properties.id)); }
  }}).addTo(mapa);
  mapa.fitBounds(geometria.getBounds(), {padding:[24,24]});
  new ResizeObserver(() => mapa.invalidateSize()).observe($('mapa'));
  sectores.forEach(f => { const o = document.createElement('option'); o.value = f.properties.id; o.textContent = nombreDe(f).nombre; $('sector').append(o); });
  $('sector').disabled = false;
  $('exportar-nombres').disabled = false;
  $('exportar-nombres').addEventListener('click', () => {
    const actuales = nombresPersonalizados();
    const personalizados = Object.fromEntries(sectores.filter(f => typeof actuales[f.properties.id] === 'string' && actuales[f.properties.id].trim()).map(f => [f.properties.id, actuales[f.properties.id].trim()]));
    const contenido = JSON.stringify({...configNombres, sectores:personalizados}, null, 2) + '\n';
    const url = URL.createObjectURL(new Blob([contenido], {type:'application/json'}));
    const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'nombres.json'; enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  function refrescarNombres() {
    sectores.forEach(f => {
      const nombre = nombreDe(f).nombre;
      $('sector').querySelector(`option[value="${f.properties.id}"]`).textContent = nombre;
      capas.get(f.properties.id).setTooltipContent(nombre);
    });
    if (seleccionado) {
      const {nombre, origen} = nombreDe(sectores.find(f => f.properties.id === seleccionado));
      $('titulo-sector').textContent = nombre; $('origen-nombre').textContent = origen;
    }
  }
  function editar(activo) {
    $('form-nombre').hidden = !activo;
    $('editar-nombre').hidden = activo;
    if (activo) { $('entrada-nombre').value = $('titulo-sector').textContent; $('entrada-nombre').focus(); $('entrada-nombre').select(); }
  }
  $('editar-nombre').addEventListener('click', () => editar(true));
  $('cancelar-nombre').addEventListener('click', () => editar(false));
  $('form-nombre').addEventListener('submit', e => {
    e.preventDefault();
    if (!seleccionado || !$('entrada-nombre').value.trim()) return;
    if (!guardarNombre(seleccionado, $('entrada-nombre').value)) { $('estado').textContent = 'No se pudo guardar el nombre en este navegador.'; return; }
    editar(false); refrescarNombres(); $('titulo-sector').focus({preventScroll:true});
  });
  $('entrada-nombre').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); editar(false); $('editar-nombre').focus(); } });
  $('restaurar-nombre').addEventListener('click', () => {
    if (!seleccionado) return;
    if (!guardarNombre(seleccionado, '')) { $('estado').textContent = 'No se pudo restaurar el nombre en este navegador.'; return; }
    editar(false); refrescarNombres();
  });
  $('sector').addEventListener('change', e => e.target.value ? abrir(e.target.value) : cerrar());
  $('cerrar').addEventListener('click', cerrar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('expediente').hidden) cerrar(); });
  function cerrar() {
    $('expediente').hidden = true; editar(false); seleccionado = null; $('sector').value = '';
    geometria.setStyle(estilo); $('sector').focus();
  }
  function abrir(id) {
    const f = sectores.find(f => f.properties.id === id), r = primarios.get(id);
    const datos = series.filter(s => s.sector === id).sort((a,b) => a.anio - b.anio);
    const principales = datos.filter(s => s.anio <= 2019), color = semaforo(r);
    seleccionado = id; $('sector').value = id; editar(false); refrescarNombres();
    $('expediente').hidden = false; $('expediente').scrollTop = 0; geometria.setStyle(estilo);
    dibujarSerieAnual($('serie-anual'), {anios:datos.map(d => d.anio), valores:datos.map(d => d.valor), resultado:r, unidad:'°C', aniosPunteados:datos.filter(d => d.anio > 2019).map(d => d.anio)});
    const lectura = $('lectura'); lectura.replaceChildren();
    const badge = document.createElement('span'); badge.className = `estado-sector ${color}`; badge.textContent = `Semáforo provisional: ${color}`;
    const dl = document.createElement('dl'), nivel = principales.map(d => d.valor);
    for (const [titulo, texto] of [
      ['Nivel de prueba', `${Math.min(...nivel).toFixed(2)} a ${Math.max(...nivel).toFixed(2)} °C`],
      ['Población inventada', new Intl.NumberFormat('es-MX').format(f.properties.poblacion)],
      ['p ajustado por FDR', r.p_fdr.toPrecision(3)]
    ]) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = titulo; dd.textContent = texto; dl.append(dt,dd); }
    const descripcion = document.createElement('p'); descripcion.textContent = 'Nivel provisional: mínimo y máximo anual de la diferencia en 2001–2019; no es un intervalo de confianza.';
    const veredicto = document.createElement('p');
    veredicto.textContent = color === 'gris' ? 'En estos datos inventados no hay evidencia suficiente de un cambio con el criterio provisional.' : `En estos datos inventados, la diferencia nocturna entre sector y desierto ${color === 'rojo' ? 'aumenta' : 'disminuye'} de forma significativa con el criterio provisional.`;
    const pendiente = document.createElement('p'); pendiente.textContent = `${r.pendiente_c_decada.toFixed(2)} °C por década (IC 95 %: ${r.ic95_inf.toFixed(2)} a ${r.ic95_sup.toFixed(2)}).`;
    lectura.append(badge, dl, descripcion, veredicto, pendiente);
    if (color === 'gris') { const nota = document.createElement('p'); nota.className = 'nota'; nota.textContent = 'gris no significa sin tendencia: 19 años pueden no alcanzar para pendientes chicas'; lectura.append(nota); }
    $('titulo-sector').focus({preventScroll:true});
    requestAnimationFrame(() => { mapa.invalidateSize(); mapa.panTo(capas.get(id).getBounds().getCenter()); });
  }
  $('estado').textContent = `${sectores.length} sectores de prueba · Toca un polígono o usa el selector.`;
}
iniciar().catch(error => { $('estado').textContent = `No se pudo abrir el explorador: ${error.message}`; });
