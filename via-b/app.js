import {dibujarSerieAnual} from '../compartido/serie-anual.js';
import {ESQUEMA} from './datos/esquema.js';
import {RUTA_DATOS, datosDePrueba, poligonosEsquematicos, pasosAqua, sectorPrioritario} from './config.js';
import {estadoSector, ESTADOS, insignia} from './semaforo.js';
import {dibujarVariantes, ETIQUETAS} from './variantes.js';
import {nombreSector, guardarNombre, nombresPersonalizados, centroide} from './nombres.js';
import {dibujarCicloDiario} from './ciclo-diario.js';
import {dibujarZoom} from './zoom-ecostress.js';
import {cifra, cifraSigno, vacio} from './tabla-datos.js';
import * as LST from '../compartido/lst-noche.js';

const $ = id => document.getElementById(id);
// Los colores salen de compartido/tokens.css (MapLibre y el lienzo necesitan el valor, no var())
const token = nombre => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
const base = new URL(RUTA_DATOS, import.meta.url);
document.querySelector('sc-pie')?.setAttribute('metadatos', new URL('metadatos.json', base).href);
if (datosDePrueba) {
  const pie = document.querySelector('sc-pie');
  pie.setAttribute('datos', 'Datos inventados de prueba');
  pie.querySelector('p').textContent = 'Datos inventados de prueba. Las series de los sectores son sintéticas.';
}
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtC = v => `${v.toFixed(1)} °C`;
const fmtDif = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} °C`;
const fmtP = p => Number.isFinite(p) ? (p < 0.001 ? 'menor que 0.001' : p.toPrecision(2)) : '—';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function nombrePeriodo({inicio, fin}) {
  const [, m1, d1] = inicio.split('-').map(Number), [, m2, d2] = fin.split('-').map(Number);
  return m1 === m2 ? `${d1} al ${d2} de ${MESES[m1 - 1]}` : `${d1} de ${MESES[m1 - 1]} al ${d2} de ${MESES[m2 - 1]}`;
}
const crear = (etiqueta, clase, texto) => {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto != null) el.textContent = texto;
  return el;
};
// Esqueleto con la forma de lo que viene (sc-esqueleto); el contenedor lleva aria-busy mientras espera
function esqueleto(contenedor, lineas = 3) {
  contenedor.setAttribute('aria-busy', 'true');
  contenedor.replaceChildren(...Array.from({length:lineas}, () => {
    const s = crear('span', 'sc-esqueleto sc-esqueleto--linea'); s.setAttribute('aria-hidden', 'true'); return s;
  }), crear('span', 'sc-solo-lector', 'Cargando…'));
}

function leerCSV(texto, esquema) {
  const filas = []; let fila = [], campo = '', comillas = false;
  texto = texto.replace(/^﻿/, '').replace(/\r\n/g, '\n');
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
  if (comillas) throw new Error('tiene comillas sin cerrar');
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const cabecera = filas.shift() || [];
  for (const nombre of Object.values(esquema)) if (!cabecera.includes(nombre)) throw new Error(`falta la columna ${nombre}`);
  return filas.map((f, n) => Object.fromEntries(Object.entries(esquema).map(([clave, nombre]) => {
    const valor = f[cabecera.indexOf(nombre)];
    if (['sector', 'variante', 'paso', 'producto', 'yale_signo'].includes(clave)) return [clave, valor];
    // Celda vacía = sin dato (sector con menos años válidos que el mínimo); texto no numérico = error
    if (valor !== undefined && valor.trim() === '') return [clave, NaN];
    if (valor === undefined || !Number.isFinite(Number(valor))) throw new Error(`la fila ${n + 2} tiene un valor inválido en ${nombre}`);
    return [clave, Number(valor)];
  })));
}

// Cada error dice qué archivo falló y por qué
async function cargar(nombre, tipo = 'texto') {
  let respuesta;
  try { respuesta = await fetch(new URL(nombre, base)); }
  catch { throw new Error(`${nombre}: no se pudo descargar; revisa la conexión`); }
  if (!respuesta.ok) throw new Error(`${nombre}: el servidor respondió ${respuesta.status}`);
  try { return tipo === 'json' ? await respuesta.json() : await respuesta.text(); }
  catch { throw new Error(`${nombre}: no es un JSON válido`); }
}
async function cargarCSV(nombre, esquema) {
  const texto = await cargar(nombre);
  try { return leerCSV(texto, esquema); } catch (e) { throw new Error(`${nombre}: ${e.message}`); }
}

// ── Etapa 1: datos. Todo lo que puede fallar falla aquí, antes de tocar la página ──
async function cargarDatos() {
  const [geojson, series, resultados] = await Promise.all([
    cargar('sectores.geojson', 'json'), cargarCSV('serie.csv', ESQUEMA.serie), cargarCSV('resultados.csv', ESQUEMA.resultados)]);
  if (!Array.isArray(geojson?.features)) throw new Error('sectores.geojson: no trae una lista de polígonos');
  const sectores = geojson.features.filter(f => f.properties?.tipo === 'sector');
  if (!sectores.length) throw new Error('sectores.geojson: no trae ningún sector');
  if (resultados.some(r => !ESQUEMA.variantes.includes(r.variante))) throw new Error('resultados.csv: hay variantes desconocidas');

  // Opcionales: si faltan, la página abre igual y lo dice (datos parciales)
  const faltantes = [];
  const [ciclo, niveles, zoom, nombres] = await Promise.all([
    cargarCSV('ciclo_diario.csv', ESQUEMA.ciclo_diario).then(c => {
      if (c.some(f => !['terra_1030','aqua_1330','terra_2230','aqua_0130'].includes(f.paso) || !['MOD11','MOD21'].includes(f.producto) || !['','+','-'].includes(f.yale_signo)))
        throw new Error('ciclo_diario.csv: hay pasos o productos desconocidos');
      return c;
    }).catch(e => { faltantes.push(e.message); return []; }),
    cargarCSV('nivel.csv', ESQUEMA.nivel).catch(e => { faltantes.push(e.message); return []; }),
    sectorPrioritario ? cargar('ecostress_zoom.json', 'json').catch(() => null) : null,
    cargar('nombres.json', 'json').catch(() => null)
  ]);
  const primarios = new Map(resultados.filter(r => r.variante === ESQUEMA.variantes[0]).map(r => [r.sector, r]));
  const sinPrimario = sectores.filter(f => !primarios.has(f.properties.id)).map(f => f.properties.id);
  if (sinPrimario.length) faltantes.push(`resultados.csv no trae el resultado primario de ${sinPrimario.join(', ')}; esos sectores se muestran sin cálculo`);
  const sinSerie = sectores.filter(f => !series.some(s => s.sector === f.properties.id)).map(f => f.properties.id);
  if (sinSerie.length) faltantes.push(`serie.csv no trae la serie de ${sinSerie.join(', ')}`);
  return {geojson, sectores, series, resultados, primarios, ciclo, niveles, zoom, nombres, faltantes};
}

// ── Etapa 2: la página. Se monta una sola vez ──
function montar(datos) {
  const {geojson, sectores, series, resultados, primarios, ciclo, niveles, zoom, nombres} = datos;
  const configNombres = nombres && Array.isArray(nombres.centro) && Number.isFinite(nombres.radio_centro_km) && typeof nombres.ciudad === 'string'
    ? nombres : {ciudad:'Hermosillo', centro:[29.0729, -110.9559], radio_centro_km:2, sectores:{}};
  const nombreDe = f => nombreSector(f, geojson.features, configNombres);
  const porId = id => sectores.find(s => s.properties.id === id);
  const estadoDe = id => estadoSector(primarios.get(id));
  const referencias = geojson.features.filter(f => f.properties.tipo === 'referencia');
  let seleccionado = null;
  const inicial = new URLSearchParams(location.search);

  if (datos.faltantes.length) {
    $('parcial-texto').textContent = `La página abre con lo que hay. Falta: ${datos.faltantes.join('; ')}. Las secciones afectadas lo indican.`;
    $('aviso-parcial').hidden = false;
  }

  // ── Periodo de MODIS: año y compuesto de 8 días dentro de la temporada (D14: junio a agosto) ──
  const hoy = new Date();
  const ultimoAnio = hoy.getUTCMonth() >= 8 ? hoy.getUTCFullYear() : hoy.getUTCFullYear() - 1;
  for (let a = ultimoAnio; a >= 2001; a--) $('lst-anio').append(new Option(a, a));
  // Último año del periodo primario, antes de la deriva de Terra, salvo que la dirección diga otro
  const anioDir = Number(inicial.get('anio'));
  $('lst-anio').value = anioDir >= 2001 && anioDir <= ultimoAnio ? String(anioDir) : '2019';
  let periodo = null;
  function llenarPeriodos(elegir) {
    const lista = LST.periodos(Number($('lst-anio').value));
    $('lst-periodo').replaceChildren(...lista.map(p => { const o = new Option(nombrePeriodo(p), p.inicio); o.dataset.fin = p.fin; return o; }));
    const julio = lista.findIndex(p => p.inicio.slice(5, 7) === '07');
    $('lst-periodo').selectedIndex = Math.min(lista.length - 1, elegir ?? julio + 1);
    periodo = {inicio: $('lst-periodo').value, fin: $('lst-periodo').selectedOptions[0].dataset.fin};
  }
  const periodoDir = inicial.get('periodo');
  llenarPeriodos();
  if (periodoDir && [...$('lst-periodo').options].some(o => o.value === periodoDir)) {
    $('lst-periodo').value = periodoDir;
    periodo = {inicio: periodoDir, fin: $('lst-periodo').selectedOptions[0].dataset.fin};
  }
  const textoPeriodo = () => `${nombrePeriodo(periodo)} de ${periodo.inicio.slice(0, 4)}`;

  // Leyenda: la escala propia de la capa, con el rango del periodo (percentiles 2 y 98 del área)
  $('lst-gradiente').style.background = `linear-gradient(to right, ${LST.ESCALA.join(', ')})`;
  function pintarLeyenda(rango) {
    $('lst-min').textContent = rango ? `${rango[0]} °C` : '';
    $('lst-max').textContent = rango ? `${rango[1]} °C` : '';
  }

  // Etiqueta fija de cada sector en el mapa: nombre y lectura corta (con guion ASCII: las fuentes del mapa no traen el signo menos)
  function corto(id) {
    const r = primarios.get(id), e = estadoDe(id);
    if (e === 'sin-calculo') return 'Sin cálculo';
    if (e === 'neutro') return 'Sin evidencia';
    return `${r.pendiente_c_decada > 0 ? '+' : '-'}${Math.abs(r.pendiente_c_decada).toFixed(2)} °C/década`;
  }
  const puntosEtiqueta = () => ({type:'FeatureCollection', features:sectores.map(f => {
    const [lat, lon] = centroide(f);
    return {type:'Feature', id:f.properties.id, geometry:{type:'Point', coordinates:[lon, lat]},
      properties:{id:f.properties.id, nombre:nombreDe(f).nombre, corto:corto(f.properties.id)}};
  })});
  const paleta = {sube:token('--estado-sube'), baja:token('--estado-baja'), neutro:token('--estado-neutro'), 'sin-calculo':token('--estado-neutro')};
  for (const f of sectores) {
    f.properties.estado = estadoDe(f.properties.id);
    f.properties.color = paleta[f.properties.estado];
  }

  // Trama de cada estado, dibujada en un lienzo con el color del token: rayas para el aumento, puntos para el descenso
  function trama(estado) {
    const pr = 2, lado = 10 * pr, lienzo = Object.assign(document.createElement('canvas'), {width:lado, height:lado});
    const c = lienzo.getContext('2d');
    c.strokeStyle = c.fillStyle = paleta[estado];
    if (estado === 'sube') {
      c.lineWidth = 2 * pr; c.lineCap = 'square';
      for (const d of [-lado, 0, lado]) { c.beginPath(); c.moveTo(d, lado); c.lineTo(d + lado, 0); c.stroke(); }
    } else {
      c.beginPath(); c.arc(lado / 2, lado / 2, 1.8 * pr, 0, 2 * Math.PI); c.fill();
    }
    return {imagen:c.getImageData(0, 0, lado, lado), pixelRatio:pr};
  }

  // ── Mapa (MapLibre). Sin mapa, el selector y la tabla siguen abriendo cada sector ──
  let mapa = null, mapaListo = false;
  const enCuantoCargue = fn => { if (!mapa) return; if (mapaListo) fn(); else mapa.once('load', fn); };
  const caja = geojson.features.flatMap(f => f.geometry.coordinates[0])
    .reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [180, 90, -180, -90]);
  // Área de la capa de MODIS: la ciudad, sus desiertos de referencia y unos 18 km alrededor
  const AREA = [caja[0] - .18, caja[1] - .18, caja[2] + .18, caja[3] + .18];
  const esquinasArea = [[AREA[0], AREA[3]], [AREA[2], AREA[3]], [AREA[2], AREA[1]], [AREA[0], AREA[1]]];
  const vacia = Object.assign(document.createElement('canvas'), {width:1, height:1}).toDataURL();
  function crearMapa() {
    if (typeof maplibregl === 'undefined' || typeof MapaEstilo === 'undefined') throw new Error('sin MapLibre');
    const estilo = MapaEstilo.base({proyeccion:'mercator'});
    estilo.sources.lst = {type:'image', url:vacia, coordinates:esquinasArea};
    estilo.sources.zonas = {type:'geojson', data:geojson, promoteId:'id'};
    estilo.sources.etiquetas = {type:'geojson', data:puntosEtiqueta()};
    const esSector = ['==', ['get', 'tipo'], 'sector'], esReferencia = ['==', ['get', 'tipo'], 'referencia'];
    const elegido = ['boolean', ['feature-state', 'elegido'], false], encima = ['boolean', ['feature-state', 'encima'], false];
    const sinCalculo = ['==', ['get', 'estado'], 'sin-calculo'];
    MapaEstilo.insertarAntes(estilo, MapaEstilo.PRIMERA_LINEA, [
      {id:'lst', type:'raster', source:'lst', paint:{'raster-opacity':.8, 'raster-resampling':'nearest', 'raster-fade-duration':0}}
    ]);
    MapaEstilo.insertarAntes(estilo, MapaEstilo.PRIMER_NOMBRE, [
      {id:'referencias', type:'fill', source:'zonas', filter:esReferencia, paint:{'fill-color':token('--superficie-2'), 'fill-opacity':.5}},
      {id:'referencias-borde', type:'line', source:'zonas', filter:esReferencia, paint:{'line-color':token('--texto'), 'line-width':2, 'line-dasharray':[3, 2]}},
      {id:'sectores', type:'fill', source:'zonas', filter:esSector, paint:{'fill-color':token('--superficie'), 'fill-opacity':['case', elegido, .5, encima, .4, .3]}},
      // Selección y foco: un anillo oscuro por fuera del borde de color, que no se pierde sobre la capa de temperatura
      {id:'sectores-seleccion', type:'line', source:'zonas', filter:esSector, paint:{'line-color':token('--texto'), 'line-width':['case', elegido, 10, encima, 8, 0]}},
      {id:'sectores-contorno', type:'line', source:'zonas', filter:esSector, paint:{'line-color':token('--superficie'), 'line-width':['case', elegido, 6, 5]}},
      {id:'sectores-borde', type:'line', source:'zonas', filter:['all', esSector, ['!', sinCalculo]], paint:{'line-color':['get', 'color'], 'line-width':['case', elegido, 3.5, 2.5]}},
      {id:'sectores-borde-punteado', type:'line', source:'zonas', filter:['all', esSector, sinCalculo], paint:{'line-color':['get', 'color'], 'line-width':['case', elegido, 3.5, 2.5], 'line-dasharray':[1, 1.5]}}
    ]);
    estilo.layers.push({id:'sectores-etiqueta', type:'symbol', source:'etiquetas', layout:{
      'text-field':['format', ['get', 'nombre'], {'text-font':['literal', ['Noto Sans Bold']]}, '\n', {}, ['get', 'corto'], {'text-font':['literal', ['Noto Sans Regular']], 'font-scale':.92}],
      'text-font':['Noto Sans Regular'], 'text-size':12, 'text-max-width':7, 'text-line-height':1.25, 'text-padding':1},
      paint:{'text-color':token('--texto'), 'text-halo-color':token('--superficie'), 'text-halo-width':1.8}});
    const angosto = matchMedia('(max-width: 900px)').matches;
    mapa = new maplibregl.Map({
      container:'mapa', style:estilo, bounds:caja, fitBoundsOptions:{padding:32}, maxZoom:14, minZoom:8,
      maxBounds:[[AREA[0] - .25, AREA[1] - .25], [AREA[2] + .25, AREA[3] + .25]],
      attributionControl:false, cooperativeGestures:angosto, dragRotate:false,
      locale:{'Map.Title':'Mapa de sectores de Hermosillo. Con el foco aquí, las flechas lo mueven y + y − lo acercan. La tabla Todos los sectores y el selector Explorar un sector abren cada expediente', 'NavigationControl.ZoomIn':'Acercar', 'NavigationControl.ZoomOut':'Alejar', 'AttributionControl.ToggleAttribution':'Créditos del mapa',
        'CooperativeGesturesHandler.WindowsHelpText':'Usa Ctrl + rueda para acercar el mapa', 'CooperativeGesturesHandler.MacHelpText':'Usa ⌘ + rueda para acercar el mapa',
        'CooperativeGesturesHandler.MobileHelpText':'Usa dos dedos para mover el mapa'}
    });
    mapa.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-left');
    mapa.addControl(new maplibregl.AttributionControl({compact:true, customAttribution:LST.ATRIBUCION}), 'bottom-right');
    mapa.touchZoomRotate.disableRotation();
    mapa.on('error', e => { if (/openfreemap/.test(String(e?.error?.url || e?.error?.message || ''))) $('estado').textContent = 'El mapa base no está disponible; los sectores siguen en el selector y en la tabla.'; });
    new ResizeObserver(() => mapa.resize()).observe($('mapa'));
    window.mapaHermosillo = mapa; // para depurar desde la consola
    mapa.on('load', () => {
      mapaListo = true;
      for (const e of ['sube', 'baja']) { const t = trama(e); mapa.addImage(`trama-${e}`, t.imagen, {pixelRatio:t.pixelRatio}); }
      mapa.addLayer({id:'sectores-trama', type:'fill', source:'zonas', filter:['all', esSector, ['in', ['get', 'estado'], ['literal', ['sube', 'baja']]]],
        paint:{'fill-pattern':['concat', 'trama-', ['get', 'estado']], 'fill-opacity':.75}}, 'sectores-seleccion');
    });
  }

  let turnoCapa = 0;
  async function pintarCapa() {
    if (!mapa) return;
    const turno = ++turnoCapa;
    pintarLeyenda(null);
    try {
      const img = await LST.imagen(periodo.inicio, AREA);
      if (turno !== turnoCapa) return;
      pintarLeyenda(img.rango);
      enCuantoCargue(() => mapa.getSource('lst')?.updateImage({url:img.url || vacia, coordinates:img.coordenadas || esquinasArea}));
      if (!img.n) $('lst-lectura').textContent = `El compuesto de ${textoPeriodo()} no tiene datos en esta zona (nubes). Prueba otro periodo.`;
    } catch {
      if (turno === turnoCapa) $('lst-lectura').textContent = 'No se pudo leer la capa de NASA GIBS. Revisa la conexión y vuelve a elegir el periodo.';
    }
  }

  // Lectura del punto bajo el cursor o el dedo
  const sectorDe = f => f?.properties.tipo === 'sector' ? porId(f.properties.id) : null;
  let turnoLectura = 0;
  async function leerPunto(lngLat, sector) {
    const turno = ++turnoLectura;
    const donde = sector ? `${nombreDe(sector).nombre}: ` : '';
    try {
      const v = await LST.valorEn(periodo.inicio, lngLat.lng, lngLat.lat);
      if (turno !== turnoLectura) return;
      $('lst-lectura').textContent = v === null
        ? `${donde}sin dato en este punto en ${textoPeriodo()} (nubes o hueco del compuesto).`
        : `${donde}${fmtC(v)} de noche en este punto, ${textoPeriodo()}.`;
    } catch { if (turno === turnoLectura) $('lst-lectura').textContent = 'No se pudo leer el valor de NASA GIBS en este punto.'; }
  }
  // Resalte de un sector (cursor encima en el mapa, o foco en su fila de la tabla)
  let resaltado = null;
  function resaltar(id) {
    if (!mapa || id === resaltado) return;
    const previo = resaltado; resaltado = id;
    enCuantoCargue(() => {
      if (previo) mapa.setFeatureState({source:'zonas', id:previo}, {encima:false});
      if (id) mapa.setFeatureState({source:'zonas', id}, {encima:true});
    });
  }
  function enlazarMapa() {
    let cuadro = null, ultimo = null;
    mapa.on('mousemove', e => {
      const f = mapa.queryRenderedFeatures(e.point, {layers:['sectores', 'referencias']})[0];
      mapa.getCanvas().style.cursor = f?.properties.tipo === 'sector' ? 'pointer' : '';
      resaltar(f?.properties.tipo === 'sector' ? f.properties.id : null);
      ultimo = [e.lngLat, sectorDe(f)];
      if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = null; leerPunto(...ultimo); });
    });
    mapa.on('mouseout', () => resaltar(null));
    mapa.on('click', e => {
      const f = mapa.queryRenderedFeatures(e.point, {layers:['sectores']})[0];
      leerPunto(e.lngLat, sectorDe(f));
      if (f) abrir(f.properties.id);
    });
  }

  const botonMapa = $('abrir-mapa');
  botonMapa.disabled = false;
  botonMapa.onclick = async () => {
    botonMapa.disabled = true;
    SC.cargando(botonMapa, true);
    const contenedor = $('mapa');
    try {
      await MapaEstilo.cargarBiblioteca();
      contenedor.hidden = false;
      crearMapa();
      enlazarMapa();
      marcarElegido(seleccionado);
      $('capa-nasa').hidden = false;
      pintarCapa();
      mapa.getCanvas().focus({ preventScroll: true });
      botonMapa.parentElement.hidden = true;
    } catch {
      mapa?.remove();
      mapa = null;
      mapaListo = false;
      contenedor.replaceChildren();
      contenedor.hidden = true;
      $('capa-nasa').hidden = true;
      $('estado').textContent = 'El mapa no cargó. Reintenta o abre un expediente con el selector o la tabla.';
    } finally {
      SC.cargando(botonMapa, false);
      botonMapa.disabled = false;
    }
  };

  function marcarElegido(id) {
    enCuantoCargue(() => sectores.forEach(s => mapa.setFeatureState({source:'zonas', id:s.properties.id}, {elegido:s.properties.id === id})));
    for (const tr of $('cuerpo-tabla').rows) tr.dataset.id === id ? tr.setAttribute('aria-current', 'true') : tr.removeAttribute('aria-current');
  }

  function cambiarPeriodo() {
    periodo = {inicio: $('lst-periodo').value, fin: $('lst-periodo').selectedOptions[0].dataset.fin};
    pintarCapa();
    $('lst-lectura').textContent = `Periodo: ${textoPeriodo()}. Pasa el cursor o toca el mapa para leer la temperatura.`;
    escribirDireccion('replace');
    if (seleccionado) leerSector(seleccionado);
  }
  $('lst-anio').addEventListener('change', () => { llenarPeriodos($('lst-periodo').selectedIndex); cambiarPeriodo(); });
  $('lst-periodo').addEventListener('change', cambiarPeriodo);
  $('lst-ver').addEventListener('change', e => enCuantoCargue(() => mapa.setLayoutProperty('lst', 'visibility', e.target.checked ? 'visible' : 'none')));

  // ── Tabla de sectores (B3): la alternativa al mapa ──
  function llenarTabla() {
    const fmtPob = new Intl.NumberFormat('es-MX');
    const filas = sectores.map(f => {
      const id = f.properties.id, r = primarios.get(id), e = estadoDe(id), calc = e !== 'sin-calculo';
      const tr = crear('tr'); tr.dataset.id = id;
      const th = crear('th'); th.scope = 'row'; th.dataset.orden = nombreDe(f).nombre;
      const a = crear('a', 'enlace-sector', nombreDe(f).nombre); a.href = `?sector=${encodeURIComponent(id)}`; a.dataset.id = id;
      th.append(a);
      const celda = (etiqueta, texto, orden, num = true) => {
        const td = crear('td', num ? 'sc-num' : null, texto); td.dataset.etiqueta = etiqueta;
        if (orden !== undefined) td.dataset.orden = Number.isFinite(orden) ? orden : '';
        return td;
      };
      const estado = celda('Estado', null, undefined, false);
      estado.dataset.orden = ['sube', 'neutro', 'baja', 'sin-calculo'].indexOf(e);
      estado.append(insignia(e));
      tr.append(th,
        celda('Cambio por década', calc ? `${cifraSigno(r.pendiente_c_decada)} °C` : 'Sin cálculo', calc ? r.pendiente_c_decada : NaN),
        celda('Intervalo del 95 %', calc ? `${cifra(r.ic95_inf)} a ${cifra(r.ic95_sup)}` : '—', calc ? r.ic95_inf : NaN),
        celda('p ajustado', calc ? fmtP(r.p_fdr) : '—', calc ? r.p_fdr : NaN),
        celda(datosDePrueba ? 'Población inventada' : 'Población', Number.isFinite(f.properties.poblacion) ? fmtPob.format(f.properties.poblacion) : 'Sin datos', f.properties.poblacion ?? NaN),
        estado);
      return tr;
    });
    $('cuerpo-tabla').replaceChildren(...filas);
    $('marco-tabla').removeAttribute('aria-busy');
    if (window.SC) SC.ordenarTabla($('tabla-sectores'));
  }
  llenarTabla();
  $('cuerpo-tabla').addEventListener('click', e => {
    const a = e.target.closest('a.enlace-sector');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault(); abrir(a.dataset.id, {disparador:a});
  });
  $('cuerpo-tabla').addEventListener('focusin', e => resaltar(e.target.closest('tr')?.dataset.id || null));
  $('cuerpo-tabla').addEventListener('focusout', () => resaltar(null));
  $('cuerpo-tabla').addEventListener('mouseover', e => resaltar(e.target.closest('tr')?.dataset.id || null));
  $('cuerpo-tabla').addEventListener('mouseleave', () => resaltar(null));

  // Sección 00 del expediente: el sector y los desiertos en el periodo elegido, con datos reales de MODIS
  let turnoSector = 0;
  async function leerSector(id) {
    const turno = ++turnoSector, f = porId(id);
    const destino = $('modis-lectura');
    $('modis-periodo').textContent = `Temperatura de la superficie de noche medida por MODIS Terra, ${textoPeriodo()}. Media de los píxeles de 1 km cuyo centro cae dentro de cada polígono.`;
    esqueleto(destino, 3);
    try {
      const [sector, ...refs] = await Promise.all([LST.mediaEn(periodo.inicio, f.geometry), ...referencias.map(r => LST.mediaEn(periodo.inicio, r.geometry))]);
      if (turno !== turnoSector) return;
      const dl = crear('dl');
      const fila = (t, v) => dl.append(crear('dt', null, t), crear('dd', null, v));
      const valor = m => m.media === null ? 'Sin dato (nubes)' : `${fmtC(m.media)} · ${m.n} de ${m.total} píxeles`;
      fila('Este sector', valor(sector));
      referencias.forEach((r, k) => fila(r.properties.nombre, valor(refs[k])));
      const refA = refs[0];
      const p = crear('p', null, sector.media !== null && refA && refA.media !== null
        ? `Diferencia con ${referencias[0].properties.nombre}: ${fmtDif(sector.media - refA.media)} en este periodo. Es un solo compuesto de 8 días, no una tendencia.`
        : 'No hay dato suficiente en este periodo para comparar el sector con su desierto. Prueba otro periodo.');
      const partes = [dl, p];
      if (datosDePrueba || poligonosEsquematicos) partes.push(crear('p', 'nota', 'Las temperaturas son reales; el polígono del sector todavía es esquemático (D15).'));
      destino.removeAttribute('aria-busy');
      destino.replaceChildren(...partes);
    } catch {
      if (turno !== turnoSector) return;
      destino.removeAttribute('aria-busy');
      destino.replaceChildren(vacio('No se pudo leer el compuesto de NASA GIBS', 'Revisa la conexión o elige otro periodo en el panel del mapa.'));
    }
  }

  // ── Selector, exportar nombres ──
  sectores.forEach(f => $('sector').append(new Option(nombreDe(f).nombre, f.properties.id)));
  for (const b of ['sector', 'exportar-nombres', 'ubicar']) $(b).disabled = false;
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
      const tr = [...$('cuerpo-tabla').rows].find(t => t.dataset.id === f.properties.id);
      if (tr) { tr.cells[0].dataset.orden = nombre; tr.querySelector('a').textContent = nombre; }
    });
    enCuantoCargue(() => mapa.getSource('etiquetas')?.setData(puntosEtiqueta()));
    if (seleccionado) {
      const {nombre, origen} = nombreDe(porId(seleccionado));
      $('titulo-sector').textContent = nombre; $('origen-nombre').textContent = origen;
      $('restaurar-nombre').hidden = origen !== 'Nombre personalizado';
    }
  }

  // ── Nombres (B7): diálogo, validación en línea y Deshacer ──
  const dialogoNombre = $('dialogo-nombre'), entrada = $('entrada-nombre');
  const avisar = (texto, op) => { if (window.SC) SC.toast(texto, op); else $('estado').textContent = texto; };
  function cambiarNombre(id, nuevo, mensaje) {
    const previo = nombresPersonalizados()[id] || '';
    if (!guardarNombre(id, nuevo)) return false;
    refrescarNombres();
    avisar(mensaje, {tipo:'deshacer', accion:{texto:'Deshacer', alHacer:() => {
      if (guardarNombre(id, previo)) { refrescarNombres(); avisar('Volvió el nombre anterior.'); }
      else avisar('No se pudo deshacer: este navegador no deja guardar datos.', {tipo:'error'});
    }}});
    return true;
  }
  const errorNombre = m => window.SC ? SC.errorCampo(entrada, m) : entrada.setCustomValidity(m || '');
  $('editar-nombre').addEventListener('click', () => {
    if (!seleccionado) return;
    entrada.value = $('titulo-sector').textContent;
    errorNombre(null);
    if (window.SC) SC.abrir(dialogoNombre, $('editar-nombre')); else dialogoNombre.showModal();
    entrada.select();
  });
  entrada.addEventListener('input', () => errorNombre(null));
  $('form-nombre').addEventListener('submit', e => {
    e.preventDefault();
    const nuevo = entrada.value.trim().replace(/\s+/g, ' ');
    if (!nuevo) { errorNombre('Escribe un nombre. Para volver al nombre automático usa "Restaurar el automático".'); entrada.focus(); return; }
    if (nuevo.length > 80) { errorNombre('Usa 80 caracteres o menos.'); entrada.focus(); return; }
    const otro = sectores.find(f => f.properties.id !== seleccionado && nombreDe(f).nombre.toLocaleLowerCase('es') === nuevo.toLocaleLowerCase('es'));
    if (otro) { errorNombre(`Ya hay un sector llamado "${nombreDe(otro).nombre}". Elige otro nombre.`); entrada.focus(); return; }
    if (nuevo === $('titulo-sector').textContent) { dialogoNombre.close(); return; }
    if (!cambiarNombre(seleccionado, nuevo, `Nombre guardado: ${nuevo}.`)) { errorNombre('No se pudo guardar: este navegador no deja guardar datos. Prueba fuera del modo privado.'); return; }
    dialogoNombre.close();
  });
  $('restaurar-nombre').addEventListener('click', () => {
    if (!seleccionado) return;
    if (!cambiarNombre(seleccionado, '', 'Se restauró el nombre automático.')) { errorNombre('No se pudo restaurar: este navegador no deja guardar datos.'); return; }
    dialogoNombre.close();
  });

  // ── Ubicación (B6): abre el sector que contiene el punto o dice que queda fuera ──
  // Dentro de un polígono: rayo hacia el este, contando cruces con el primer anillo
  function contiene(f, lon, lat) {
    const anillo = f.geometry.coordinates[0]; let dentro = false;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  const km = (lat1, lon1, lat2, lon2) => Math.hypot((lat2 - lat1) * 111.195, (lon2 - lon1) * 111.195 * Math.cos((lat1 + lat2) * Math.PI / 360));
  $('ubicar').addEventListener('click', () => {
    const boton = $('ubicar'), nota = $('ubicar-nota');
    const ocupado = si => { if (window.SC) SC.cargando(boton, si); else boton.disabled = si; };
    const decir = (texto, error) => { nota.textContent = texto; nota.classList.toggle('ubicar-nota--error', !!error); };
    if (!navigator.geolocation) { decir('Este navegador no puede dar tu ubicación. Elige tu sector en el mapa, en la tabla o en el selector.', true); return; }
    ocupado(true);
    decir('Esperando tu permiso y la posición…');
    navigator.geolocation.getCurrentPosition(p => {
      ocupado(false);
      // Redondeo a 0.01° (alrededor de 1 km, el tamaño del píxel de MODIS): basta para elegir un sector de 3 km
      const lat = Math.round(p.coords.latitude * 100) / 100, lon = Math.round(p.coords.longitude * 100) / 100;
      const coords = `${cifra(lat)}, ${cifra(lon)}`;
      const dentro = sectores.find(f => contiene(f, lon, lat));
      if (dentro) {
        decir(`Tu punto aproximado (${coords}) cae en ${nombreDe(dentro).nombre}. Se abrió su expediente.`);
        abrir(dentro.properties.id, {disparador:boton});
        return;
      }
      const cercano = sectores.map(f => { const [la, lo] = centroide(f); return {f, d:km(lat, lon, la, lo)}; }).sort((a, b) => a.d - b.d)[0];
      decir(`Tu punto aproximado (${coords}) queda fuera de los ${sectores.length} sectores analizados. El más cercano es ${nombreDe(cercano.f).nombre}, a unos ${Math.round(cercano.d)} km.`, true);
    }, err => {
      ocupado(false);
      decir(err?.code === 1 ? 'No diste permiso para usar tu ubicación. Elige tu sector en el mapa, en la tabla o en el selector.'
        : err?.code === 3 ? 'La ubicación tardó demasiado. Inténtalo de nuevo o elige tu sector en el mapa.'
        : 'No se pudo determinar tu ubicación. Elige tu sector en el mapa, en la tabla o en el selector.', true);
    }, {enableHighAccuracy:false, timeout:12000, maximumAge:600000});
  });

  // ── Variante destacada (B8) ──
  ESQUEMA.variantes.forEach(v => $('variante').append(new Option(ETIQUETAS[v] || v, v)));
  const varDir = inicial.get('variante');
  $('variante').value = ESQUEMA.variantes.includes(varDir) ? varDir : ESQUEMA.variantes[0];
  function pintarVariantes() {
    if (!seleccionado) return;
    const v = $('variante').value, filas = resultados.filter(fila => fila.sector === seleccionado);
    dibujarVariantes($('curva-variantes'), filas, ESQUEMA.variantes, v);
    const d = filas.find(f => f.variante === v), nombre = ETIQUETAS[v] || v;
    $('variante-lectura').textContent = !d || !Number.isFinite(d.pendiente_c_decada)
      ? `${nombre}: sin cálculo para este sector.`
      : `${nombre}: ${cifraSigno(d.pendiente_c_decada)} °C por década (IC 95 %: ${cifra(d.ic95_inf)} a ${cifra(d.ic95_sup)}), p FDR ${fmtP(d.p_fdr)}, ${d.n_anios} años.` +
        (v === ESQUEMA.variantes[0] ? ' Es la variante que decide el semáforo.' : ' Solo la primaria decide el semáforo; esta sirve para ver si el resultado se sostiene.');
  }
  $('variante').addEventListener('change', () => { pintarVariantes(); escribirDireccion('replace'); });

  // ── Dirección (B8): sector, variante y periodo de MODIS. Abrir un expediente agrega una entrada; Atrás lo cierra ──
  function escribirDireccion(modo, conSector = seleccionado) {
    const q = new URLSearchParams(location.search);
    for (const [clave, valor] of [['sector', conSector], ['variante', $('variante').value !== ESQUEMA.variantes[0] ? $('variante').value : null],
      ['anio', $('lst-anio').value], ['periodo', periodo.inicio]]) valor ? q.set(clave, valor) : q.delete(clave);
    const consulta = q.toString(), url = `${location.pathname}${consulta ? `?${consulta}` : ''}`;
    if (url === location.pathname + location.search && modo === 'replace') return;
    history[`${modo}State`](modo === 'push' ? {suncity:'expediente'} : history.state, '', url);
  }
  let cerrandoDesdeHistorial = false;
  window.addEventListener('popstate', () => {
    const q = new URLSearchParams(location.search), id = q.get('sector');
    const v = q.get('variante');
    $('variante').value = ESQUEMA.variantes.includes(v) ? v : ESQUEMA.variantes[0];
    if (id && porId(id)) abrir(id, {desdeHistorial:true});
    else if (hoja.open) { cerrandoDesdeHistorial = true; hoja.close(); }
  });

  // ── Expediente (sc-hoja) ──
  // Panel fijo al lado del mapa en pantallas anchas (sin velo, el mapa sigue activo) y hoja modal en las
  // angostas, donde el foco queda dentro y Escape la cierra.
  const hoja = $('expediente');
  const ancha = () => matchMedia('(min-width: 900px)').matches;
  let disparadorHoja = null;
  function abrirHoja(disparador) {
    if (!hoja.open) {
      disparadorHoja = disparador || document.activeElement;
      document.body.classList.toggle('con-expediente', ancha());
      document.body.classList.add('ficha-abierta');
      if (ancha()) hoja.show(); else if (window.SC) SC.abrir(hoja, disparadorHoja); else hoja.showModal();
    }
    hoja.querySelector('.sc-hoja__cuerpo').scrollTop = 0;
  }
  hoja.addEventListener('close', () => {
    document.body.classList.remove('con-expediente', 'ficha-abierta');
    if (dialogoNombre.open) dialogoNombre.close();
    const id = seleccionado;
    seleccionado = null; $('sector').value = ''; marcarElegido(null);
    // Atrás ya movió la dirección; si el expediente se abrió aquí, se regresa a la entrada anterior
    if (cerrandoDesdeHistorial) cerrandoDesdeHistorial = false;
    else if (history.state?.suncity === 'expediente') history.back();
    else if (id) escribirDireccion('replace', null);
    // En la hoja modal SC.abrir devuelve el foco; en el panel fijo se devuelve aquí
    if (ancha() && disparadorHoja?.isConnected) disparadorHoja.focus();
    disparadorHoja = null;
  });
  $('cerrar').addEventListener('click', cerrar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && hoja.open && !dialogoNombre.open && !e.defaultPrevented) cerrar(); });
  function cerrar() { if (hoja.open) hoja.close(); }
  $('sector').addEventListener('change', e => e.target.value ? abrir(e.target.value, {disparador:e.target}) : cerrar());

  // Índice del expediente: salta a la sección dentro de la hoja sin tocar el historial
  hoja.querySelector('.indice').addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const seccion = $(a.getAttribute('href').slice(1)), titulo = seccion.querySelector('h3');
    seccion.scrollIntoView({behavior:quieto ? 'auto' : 'smooth', block:'start'});
    titulo.tabIndex = -1; titulo.focus({preventScroll:true});
  });
  $('imprimir').addEventListener('click', () => window.print());

  // Lectura en lenguaje llano, arriba del expediente
  function resumen(id) {
    const r = primarios.get(id), e = estadoDe(id);
    $('resumen-insignia').replaceChildren(insignia(e));
    const cifras = $('resumen-cifras'); cifras.replaceChildren();
    const cifraDl = (t, v) => { const d = crear('div', 'sc-cifra'); d.append(crear('dt', null, t), crear('dd', null, v)); cifras.append(d); };
    if (e === 'sin-calculo') {
      $('resumen-texto').textContent = r
        ? `Este sector no tiene tendencia calculada: solo hay ${r.n_anios} años válidos y no alcanzan el mínimo. Abajo están los datos que sí hay.`
        : 'Este sector no tiene tendencia calculada: los datos no traen su resultado primario. Abajo están los datos que sí hay.';
      cifraDl('Años válidos', r ? String(r.n_anios) : '—');
      return;
    }
    const pend = `${cifraSigno(r.pendiente_c_decada)} °C`, ic = `${cifra(r.ic95_inf)} a ${cifra(r.ic95_sup)} °C`;
    $('resumen-texto').textContent = e === 'sube'
      ? `De noche, este sector se calienta más rápido que su desierto de referencia: la diferencia crece unos ${cifra(r.pendiente_c_decada)} °C por década (entre ${cifra(r.ic95_inf)} y ${cifra(r.ic95_sup)} °C con 95 % de confianza).`
      : e === 'baja'
        ? `De noche, la diferencia entre este sector y su desierto de referencia se reduce unos ${cifra(Math.abs(r.pendiente_c_decada))} °C por década (intervalo del 95 %: ${ic}).`
        : `Con ${r.n_anios} años de datos no hay evidencia suficiente de que la diferencia nocturna con el desierto cambie: ${r.p_fdr >= 0.05 ? `el p ajustado (${fmtP(r.p_fdr)}) no baja de 0.05` : 'el intervalo del 95 % incluye el cero'}. Gris no significa sin tendencia: 19 años pueden no alcanzar para pendientes chicas.`;
    cifraDl('Cambio por década', pend);
    cifraDl('Intervalo del 95 %', ic);
    cifraDl('p ajustado (FDR)', fmtP(r.p_fdr));
    cifraDl('Años', `${r.n_anios} · 2001–2019`);
  }

  function abrir(id, {desdeHistorial = false, disparador = null} = {}) {
    const f = porId(id); if (!f) return;
    const r = primarios.get(id);
    const yaAbierto = hoja.open;
    const datosSerie = series.filter(s => s.sector === id).sort((a,b) => a.anio - b.anio);
    seleccionado = id; $('sector').value = id; refrescarNombres();
    if (!desdeHistorial) escribirDireccion(yaAbierto ? 'replace' : 'push');
    abrirHoja(disparador);
    marcarElegido(id);
    $('impresion-origen').textContent = location.href;
    resumen(id);
    leerSector(id);
    if (datosSerie.length && r) dibujarSerieAnual($('serie-anual'), {anios:datosSerie.map(d => d.anio), valores:datosSerie.map(d => d.valor), resultado:r, unidad:'°C', aniosPunteados:datosSerie.filter(d => d.anio > 2019).map(d => d.anio)});
    else $('serie-anual').replaceChildren(vacio('Sin serie anual para este sector', 'serie.csv o resultados.csv no traen sus datos. Vuelve a generarlos con via-b/procesamiento.'));
    pintarVariantes();
    const filasCiclo = ciclo.filter(fila => fila.sector === id);
    if (filasCiclo.length) dibujarCicloDiario($('ciclo-diario'), filasCiclo, pasosAqua);
    else $('ciclo-diario').replaceChildren(vacio('Sin ciclo diario', ciclo.length ? 'ciclo_diario.csv no trae este sector.' : 'No se pudo leer ciclo_diario.csv. Recarga la página; si se repite, vuelve a generar los datos con via-b/procesamiento.'));

    // Sección 04: nivel y población
    const lectura = $('lectura'); lectura.replaceChildren();
    const dl = crear('dl'), medias = niveles.filter(d => d.sector === id && Number.isFinite(d.nivel_c));
    const valoresNivel = medias.map(d => d.nivel_c);
    const textoNivel = medias.length === 0 ? 'Sin datos' : medias.length === 1
      ? `${fmtDif(medias[0].nivel_c)} (${medias[0].producto})`
      : `entre ${fmtDif(Math.min(...valoresNivel))} y ${fmtDif(Math.max(...valoresNivel))}`;
    for (const [titulo, texto] of [
      ['Nivel medio 2001–2019 (Modelo F)', textoNivel],
      [datosDePrueba ? 'Población inventada' : 'Población (GPW 2020)',
        Number.isFinite(f.properties.poblacion) ? new Intl.NumberFormat('es-MX').format(f.properties.poblacion) : 'Sin datos']
    ]) dl.append(crear('dt', null, titulo), crear('dd', null, texto));
    lectura.append(dl);
    if (medias.length === 2) lectura.append(crear('p', null, 'Rango entre medias MOD11 y MOD21.'));
    if (r && Number.isFinite(r.p_mk) && !Number.isFinite(r.p_hamed_rao)) lectura.append(crear('p', null, 'Hamed–Rao no se pudo calcular. Se usó Mann–Kendall para el FDR.'));

    const zoomContenedor = $('zoom-ecostress'); zoomContenedor.replaceChildren();
    if (id === sectorPrioritario && zoom?.sector_id === id) dibujarZoom(zoomContenedor, zoom, datosDePrueba);
    else zoomContenedor.append(crear('p', null, id === sectorPrioritario
      ? 'El sector prioritario todavía no tiene datos de ECOSTRESS.'
      : 'El zoom a 70 m solo se muestra en el sector prioritario.'));
    if (!yaAbierto || !desdeHistorial) $('titulo-sector').focus({preventScroll:true});
    if (mapa) requestAnimationFrame(() => {
      mapa.resize();
      const [lat, lon] = centroide(f);
      mapa[quieto ? 'jumpTo' : 'easeTo']({center:[lon, lat]});
    });
  }

  $('estado').textContent = `${sectores.length} sectores${datosDePrueba ? ' de prueba' : poligonosEsquematicos ? ' esquemáticos con datos reales de MODIS' : ''} · Toca un polígono, usa la tabla o el selector.`;
  const idEnlace = inicial.get('sector');
  if (porId(idEnlace)) abrir(idEnlace, {desdeHistorial:true});
  // Ancla a una sección (por ejemplo ?sector=S01#exp-serie)
  if (seleccionado && /^#exp-/.test(location.hash)) $(location.hash.slice(1))?.scrollIntoView();
}

// ── Aviso de datos (B11): el de prueba sale solo con datos/prueba/; con datos reales sobre polígonos
// esquemáticos queda la advertencia del HTML; con datos y polígonos definitivos no hay aviso ──
if (datosDePrueba) {
  const aviso = $('aviso-prueba');
  aviso.className = 'sc-aviso sc-aviso--prueba';
  aviso.querySelector('.sc-aviso__titulo').textContent = 'Sectores y tendencias de prueba';
  aviso.querySelector('.sc-aviso__texto').textContent = 'El mapa de temperatura es real (NASA MODIS). Los polígonos de los sectores, su población y sus resultados son datos sintéticos de prueba.';
  $('serie-descripcion').textContent = 'Diferencia de temperatura superficial nocturna entre sector y desierto. MOD11 Terra · Serie sintética.';
  $('expediente-etiqueta').textContent = 'Expediente de prueba';
  $('mapa-descripcion').textContent = 'Color y trama: p FDR menor que 0.05 e intervalo del 95 % del lado de la pendiente. Polígonos esquemáticos y población inventada.';
} else if (!poligonosEsquematicos) {
  $('aviso-prueba').hidden = true;
  $('mapa-descripcion').textContent = 'Color y trama: p FDR menor que 0.05 e intervalo del 95 % del lado de la pendiente.';
}

// ── Arranque con estados de carga y error (B5) ──
async function iniciar() {
  $('aviso-error').hidden = true;
  document.querySelector('.espacio').hidden = false;
  $('estado').textContent = 'Cargando los datos de los sectores…';
  let datos;
  try { datos = await cargarDatos(); }
  catch (error) {
    $('error-texto').textContent = `${error.message}. Revisa la conexión y vuelve a intentarlo; si se repite, los archivos de ${RUTA_DATOS} están incompletos o dañados y hay que generarlos de nuevo con via-b/procesamiento.`;
    $('aviso-error').hidden = false;
    document.querySelector('.espacio').hidden = true;
    $('estado').textContent = 'No se pudieron abrir los datos de los sectores.';
    return;
  }
  montar(datos);
}
$('reintentar').addEventListener('click', async () => {
  const b = $('reintentar');
  if (window.SC) SC.cargando(b, true);
  await iniciar();
  if (window.SC) SC.cargando(b, false);
  if ($('aviso-error').hidden) $('contenido').focus(); else b.focus();
});
iniciar();
