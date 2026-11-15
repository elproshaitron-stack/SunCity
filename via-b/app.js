import {dibujarSerieAnual} from '../compartido/serie-anual.js';
import {ESQUEMA} from './datos/esquema.js';
import {RUTA_DATOS, datosDePrueba, pasosAqua, sectorPrioritario} from './config.js';
import {semaforo} from './semaforo.js';
import {dibujarVariantes} from './variantes.js';
import {nombreSector, guardarNombre, nombresPersonalizados} from './nombres.js';
import {dibujarCicloDiario} from './ciclo-diario.js';
import {dibujarZoom} from './zoom-ecostress.js';
import * as LST from '../compartido/lst-noche.js';

const $ = id => document.getElementById(id);
// Los colores salen de compartido/tokens.css (MapLibre necesita el valor, no var())
const token = nombre => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
const colores = () => ({rojo:token('--estado-sube'), azul:token('--estado-baja'), gris:token('--estado-neutro')});
const base = new URL(RUTA_DATOS, import.meta.url);
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtC = v => `${v.toFixed(1)} °C`;
const fmtDif = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} °C`;
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function nombrePeriodo({inicio, fin}) {
  const [, m1, d1] = inicio.split('-').map(Number), [, m2, d2] = fin.split('-').map(Number);
  return m1 === m2 ? `${d1} al ${d2} de ${MESES[m1 - 1]}` : `${d1} de ${MESES[m1 - 1]} al ${d2} de ${MESES[m2 - 1]}`;
}

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
    if (['sector', 'variante', 'paso', 'producto', 'yale_signo'].includes(clave)) return [clave, valor];
    // Celda vacía = sin dato (sector con menos años válidos que el mínimo); texto no numérico = error
    if (valor !== undefined && valor.trim() === '') return [clave, NaN];
    if (valor === undefined || !Number.isFinite(Number(valor))) throw new Error(`Valor inválido en ${nombre}.`);
    return [clave, Number(valor)];
  })));
}

async function cargar(nombre, json = false) {
  const respuesta = await fetch(new URL(nombre, base));
  if (!respuesta.ok) throw new Error(`No se pudo leer ${nombre} (${respuesta.status}).`);
  return json ? respuesta.json() : respuesta.text();
}

async function iniciar() {
  const [geojson, csvSerie, csvResultados, csvCiclo, csvNivel, zoom, nombres] = await Promise.all([cargar('sectores.geojson', true), cargar('serie.csv'), cargar('resultados.csv'), cargar('ciclo_diario.csv'), cargar('nivel.csv'), sectorPrioritario ? cargar('ecostress_zoom.json', true).catch(() => null) : Promise.resolve(null), cargar('nombres.json', true).catch(() => null)]);
  const configNombres = nombres && Array.isArray(nombres.centro) && Number.isFinite(nombres.radio_centro_km) && typeof nombres.ciudad === 'string'
    ? nombres : {ciudad:'Hermosillo', centro:[29.0729, -110.9559], radio_centro_km:2, sectores:{}};
  const nombreDe = f => nombreSector(f, geojson.features, configNombres);
  const series = leerCSV(csvSerie, ESQUEMA.serie), resultados = leerCSV(csvResultados, ESQUEMA.resultados);
  const ciclo = leerCSV(csvCiclo, ESQUEMA.ciclo_diario);
  const niveles = leerCSV(csvNivel, ESQUEMA.nivel);
  if (ciclo.some(f => !['terra_1030','aqua_1330','terra_2230','aqua_0130'].includes(f.paso) || !['MOD11','MOD21'].includes(f.producto) || !['','+','-'].includes(f.yale_signo))) throw new Error('Hay valores desconocidos en ciclo_diario.csv.');
  if (resultados.some(r => !ESQUEMA.variantes.includes(r.variante))) throw new Error('Hay variantes desconocidas en los datos.');
  const primarios = new Map(resultados.filter(r => r.variante === ESQUEMA.variantes[0]).map(r => [r.sector, r]));
  const sectores = geojson.features.filter(f => f.properties.tipo === 'sector');
  for (const f of sectores) if (!primarios.has(f.properties.id)) throw new Error(`Falta el resultado primario del sector ${f.properties.id}.`);
  // Color del semáforo como propiedad, para que el mapa lo lea
  const paleta = colores();
  for (const f of sectores) f.properties.color = paleta[semaforo(primarios.get(f.properties.id))];
  const referencias = geojson.features.filter(f => f.properties.tipo === 'referencia');
  let seleccionado = null;

  // ── Periodo de MODIS: año y compuesto de 8 días dentro de la temporada (D14: junio a agosto) ──
  const hoy = new Date();
  const ultimoAnio = hoy.getUTCMonth() >= 8 ? hoy.getUTCFullYear() : hoy.getUTCFullYear() - 1;
  for (let a = ultimoAnio; a >= 2001; a--) { const o = document.createElement('option'); o.value = a; o.textContent = a; $('lst-anio').append(o); }
  $('lst-anio').value = '2019'; // último año del periodo primario, antes de la deriva de Terra
  let periodo = null;
  function llenarPeriodos(elegir) {
    const lista = LST.periodos(Number($('lst-anio').value));
    $('lst-periodo').replaceChildren(...lista.map(p => { const o = document.createElement('option'); o.value = p.inicio; o.textContent = nombrePeriodo(p); o.dataset.fin = p.fin; return o; }));
    const julio = lista.findIndex(p => p.inicio.slice(5, 7) === '07');
    $('lst-periodo').selectedIndex = Math.min(lista.length - 1, elegir ?? julio + 1);
    periodo = {inicio: $('lst-periodo').value, fin: $('lst-periodo').selectedOptions[0].dataset.fin};
  }
  llenarPeriodos();
  const textoPeriodo = () => `${nombrePeriodo(periodo)} de ${periodo.inicio.slice(0, 4)}`;

  // Leyenda: la escala propia de la capa, con el rango del periodo (percentiles 2 y 98 del área)
  $('lst-gradiente').style.background = `linear-gradient(to right, ${LST.ESCALA.join(', ')})`;
  function pintarLeyenda(rango) {
    $('lst-min').textContent = rango ? `${rango[0]} °C` : '';
    $('lst-max').textContent = rango ? `${rango[1]} °C` : '';
  }

  // ── Mapa (MapLibre). Sin mapa, el selector sigue abriendo cada sector ──
  let mapa = null, mapaListo = false, alCargar = null;
  const caja = geojson.features.flatMap(f => f.geometry.coordinates[0])
    .reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [180, 90, -180, -90]);
  // Área de la capa de MODIS: la ciudad, sus desiertos de referencia y unos 18 km alrededor
  const AREA = [caja[0] - .18, caja[1] - .18, caja[2] + .18, caja[3] + .18];
  const esquinasArea = [[AREA[0], AREA[3]], [AREA[2], AREA[3]], [AREA[2], AREA[1]], [AREA[0], AREA[1]]];
  const vacia = Object.assign(document.createElement('canvas'), {width:1, height:1}).toDataURL();
  try {
    if (typeof maplibregl === 'undefined' || typeof MapaEstilo === 'undefined') throw new Error('sin MapLibre');
    const estilo = MapaEstilo.base({proyeccion:'mercator'});
    estilo.sources.lst = {type:'image', url:vacia, coordinates:esquinasArea};
    estilo.sources.zonas = {type:'geojson', data:geojson, promoteId:'id'};
    const esSector = ['==', ['get', 'tipo'], 'sector'], esReferencia = ['==', ['get', 'tipo'], 'referencia'];
    const elegido = ['boolean', ['feature-state', 'elegido'], false];
    MapaEstilo.insertarAntes(estilo, MapaEstilo.PRIMERA_LINEA, [
      {id:'lst', type:'raster', source:'lst', paint:{'raster-opacity':.8, 'raster-resampling':'nearest', 'raster-fade-duration':0}}
    ]);
    MapaEstilo.insertarAntes(estilo, MapaEstilo.PRIMER_NOMBRE, [
      {id:'referencias', type:'fill', source:'zonas', filter:esReferencia, paint:{'fill-color':token('--superficie-2'), 'fill-opacity':.5}},
      {id:'referencias-borde', type:'line', source:'zonas', filter:esReferencia, paint:{'line-color':token('--texto'), 'line-width':2, 'line-dasharray':[3, 2]}},
      {id:'sectores', type:'fill', source:'zonas', filter:esSector, paint:{'fill-color':token('--superficie'), 'fill-opacity':['case', elegido, .22, 0]}},
      {id:'sectores-contorno', type:'line', source:'zonas', filter:esSector, paint:{'line-color':token('--superficie'), 'line-width':['case', elegido, 7, 5]}},
      {id:'sectores-borde', type:'line', source:'zonas', filter:esSector, paint:{'line-color':['case', elegido, token('--texto'), ['get', 'color']], 'line-width':['case', elegido, 3.5, 2.5]}}
    ]);
    const angosto = matchMedia('(max-width: 900px)').matches;
    mapa = new maplibregl.Map({
      container:'mapa', style:estilo, bounds:caja, fitBoundsOptions:{padding:32}, maxZoom:14, minZoom:8,
      maxBounds:[[AREA[0] - .25, AREA[1] - .25], [AREA[2] + .25, AREA[3] + .25]],
      attributionControl:false, cooperativeGestures:angosto, dragRotate:false,
      locale:{'Map.Title':'Mapa de sectores de Hermosillo. Con el foco aquí, las flechas lo mueven y + y − lo acercan. El selector Explorar un sector abre cada expediente', 'NavigationControl.ZoomIn':'Acercar', 'NavigationControl.ZoomOut':'Alejar', 'AttributionControl.ToggleAttribution':'Créditos del mapa',
        'CooperativeGesturesHandler.WindowsHelpText':'Usa Ctrl + rueda para acercar el mapa', 'CooperativeGesturesHandler.MacHelpText':'Usa ⌘ + rueda para acercar el mapa',
        'CooperativeGesturesHandler.MobileHelpText':'Usa dos dedos para mover el mapa'}
    });
    mapa.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-left');
    mapa.addControl(new maplibregl.AttributionControl({compact:true, customAttribution:LST.ATRIBUCION}), 'bottom-right');
    mapa.touchZoomRotate.disableRotation();
    mapa.on('error', e => { if (/openfreemap/.test(String(e?.error?.url || e?.error?.message || ''))) $('estado').textContent = 'El mapa base no está disponible; los sectores siguen siendo seleccionables.'; });
    new ResizeObserver(() => mapa.resize()).observe($('mapa'));
    window.mapaHermosillo = mapa; // para depurar desde la consola
    mapa.on('load', () => { mapaListo = true; if (alCargar) { alCargar(); alCargar = null; } });
  } catch {
    mapa = null;
    $('mapa').classList.add('sin-mapa');
    $('mapa').textContent = 'El mapa no cargó. Usa el selector "Explorar un sector" para abrir cada expediente.';
    $('capa-nasa').hidden = true;
  }

  let turnoCapa = 0;
  async function pintarCapa() {
    const turno = ++turnoCapa;
    pintarLeyenda(null);
    try {
      const img = await LST.imagen(periodo.inicio, AREA);
      if (turno !== turnoCapa) return;
      pintarLeyenda(img.rango);
      if (mapa) {
        const fuente = () => mapa.getSource('lst')?.updateImage({url:img.url || vacia, coordinates:img.coordenadas || esquinasArea});
        if (mapaListo) fuente(); else alCargar = fuente;
      }
      if (!img.n) $('lst-lectura').textContent = `El compuesto de ${textoPeriodo()} no tiene datos en esta zona (nubes). Prueba otro periodo.`;
    } catch {
      if (turno === turnoCapa) $('lst-lectura').textContent = 'No se pudo leer la capa de NASA GIBS. Revisa la conexión y vuelve a elegir el periodo.';
    }
  }
  pintarCapa();

  // Lectura del punto bajo el cursor o el dedo
  const etiqueta = mapa && new maplibregl.Popup({closeButton:false, closeOnClick:false, offset:12, className:'popup-sector'});
  const sectorDe = f => f?.properties.tipo === 'sector' ? sectores.find(s => s.properties.id === f.properties.id) : null;
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
  if (mapa) {
    let cuadro = null, ultimo = null;
    mapa.on('mousemove', e => {
      const f = mapa.queryRenderedFeatures(e.point, {layers:['sectores', 'referencias']})[0];
      mapa.getCanvas().style.cursor = f?.properties.tipo === 'sector' ? 'pointer' : '';
      if (f) etiqueta.setLngLat(e.lngLat).setText(f.properties.tipo === 'sector' ? nombreDe(sectorDe(f)).nombre : f.properties.nombre).addTo(mapa);
      else etiqueta.remove();
      ultimo = [e.lngLat, sectorDe(f)];
      if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = null; leerPunto(...ultimo); });
    });
    mapa.on('mouseout', () => etiqueta.remove());
    mapa.on('click', e => {
      const f = mapa.queryRenderedFeatures(e.point, {layers:['sectores']})[0];
      leerPunto(e.lngLat, sectorDe(f));
      if (f) abrir(f.properties.id);
    });
  }

  // El estado del mapa solo se puede tocar cuando su estilo ya cargó (p. ej., al abrir con ?sector=)
  function marcarElegido(id) {
    if (!mapa) return;
    const aplicar = () => sectores.forEach(s => mapa.setFeatureState({source:'zonas', id:s.properties.id}, {elegido:s.properties.id === id}));
    if (mapaListo) aplicar(); else mapa.once('load', aplicar);
  }

  function cambiarPeriodo() {
    periodo = {inicio: $('lst-periodo').value, fin: $('lst-periodo').selectedOptions[0].dataset.fin};
    pintarCapa();
    $('lst-lectura').textContent = `Periodo: ${textoPeriodo()}. Pasa el cursor o toca el mapa para leer la temperatura.`;
    if (seleccionado) leerSector(seleccionado);
  }
  $('lst-anio').addEventListener('change', () => { llenarPeriodos($('lst-periodo').selectedIndex); cambiarPeriodo(); });
  $('lst-periodo').addEventListener('change', cambiarPeriodo);
  $('lst-ver').addEventListener('change', e => { if (mapa?.getLayer('lst')) mapa.setLayoutProperty('lst', 'visibility', e.target.checked ? 'visible' : 'none'); });

  // Sección 00 del expediente: el sector y los desiertos en el periodo elegido, con datos reales de MODIS
  let turnoSector = 0;
  async function leerSector(id) {
    const turno = ++turnoSector, f = sectores.find(s => s.properties.id === id);
    const destino = $('modis-lectura');
    $('modis-periodo').textContent = `Temperatura de la superficie de noche medida por MODIS Terra, ${textoPeriodo()}. Media de los píxeles de 1 km cuyo centro cae dentro de cada polígono.`;
    destino.replaceChildren(Object.assign(document.createElement('p'), {textContent:'Leyendo el compuesto de NASA GIBS…'}));
    try {
      const [sector, ...refs] = await Promise.all([LST.mediaEn(periodo.inicio, f.geometry), ...referencias.map(r => LST.mediaEn(periodo.inicio, r.geometry))]);
      if (turno !== turnoSector) return;
      const dl = document.createElement('dl');
      const fila = (t, v) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = t; dd.textContent = v; dl.append(dt, dd); };
      const valor = m => m.media === null ? 'Sin dato (nubes)' : `${fmtC(m.media)} · ${m.n} de ${m.total} píxeles`;
      fila('Este sector', valor(sector));
      referencias.forEach((r, k) => fila(r.properties.nombre, valor(refs[k])));
      const p = document.createElement('p');
      const refA = refs[0];
      p.textContent = sector.media !== null && refA && refA.media !== null
        ? `Diferencia con ${referencias[0].properties.nombre}: ${fmtDif(sector.media - refA.media)} en este periodo. Es un solo compuesto de 8 días, no una tendencia.`
        : 'No hay dato suficiente en este periodo para comparar el sector con su desierto. Prueba otro periodo.';
      const partes = [dl, p];
      if (datosDePrueba) { const aviso = document.createElement('p'); aviso.className = 'nota'; aviso.textContent = 'Las temperaturas son reales; el polígono del sector todavía es de prueba (D15).'; partes.push(aviso); }
      destino.replaceChildren(...partes);
    } catch {
      if (turno === turnoSector) destino.replaceChildren(Object.assign(document.createElement('p'), {textContent:'No se pudo leer el compuesto de NASA GIBS. Revisa la conexión o prueba otro periodo.'}));
    }
  }

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
  // El expediente es una sc-hoja: panel fijo al lado del mapa en pantallas anchas (sin velo, el mapa sigue
  // activo) y hoja modal en las angostas, donde el foco queda dentro y Escape la cierra.
  const hoja = $('expediente');
  const ancha = () => matchMedia('(min-width: 900px)').matches;
  function abrirHoja() {
    if (!hoja.open) {
      document.body.classList.toggle('con-expediente', ancha());
      if (ancha()) hoja.show(); else if (window.SC) SC.abrir(hoja, $('sector')); else hoja.showModal();
    }
    hoja.querySelector('.sc-hoja__cuerpo').scrollTop = 0;
  }
  hoja.addEventListener('close', () => {
    document.body.classList.remove('con-expediente');
    editar(false); seleccionado = null; $('sector').value = ''; marcarElegido(null);
    $('sector').focus();
  });
  $('cerrar').addEventListener('click', cerrar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && hoja.open) cerrar(); });
  function cerrar() { if (hoja.open) hoja.close(); }
  function abrir(id) {
    const f = sectores.find(f => f.properties.id === id), r = primarios.get(id);
    const datos = series.filter(s => s.sector === id).sort((a,b) => a.anio - b.anio);
    const color = semaforo(r);
    seleccionado = id; $('sector').value = id; editar(false); refrescarNombres();
    abrirHoja();
    marcarElegido(id);
    leerSector(id);
    dibujarSerieAnual($('serie-anual'), {anios:datos.map(d => d.anio), valores:datos.map(d => d.valor), resultado:r, unidad:'°C', aniosPunteados:datos.filter(d => d.anio > 2019).map(d => d.anio)});
    dibujarVariantes($('curva-variantes'), resultados.filter(fila => fila.sector === id), ESQUEMA.variantes);
    dibujarCicloDiario($('ciclo-diario'), ciclo.filter(fila => fila.sector === id), pasosAqua);
    const lectura = $('lectura'); lectura.replaceChildren();
    const badge = document.createElement('span');
    badge.className = `sc-insignia ${{rojo:'sc-insignia--sube', azul:'sc-insignia--baja', gris:'sc-insignia--neutro'}[color]}`;
    badge.textContent = `Semáforo: ${color}`;
    const dl = document.createElement('dl'), nivel = niveles.filter(d => d.sector === id);
    const medias = nivel.filter(d => Number.isFinite(d.nivel_c));
    const valoresNivel = medias.map(d => d.nivel_c);
    const textoNivel = medias.length === 0 ? 'Sin datos' : medias.length === 1
      ? `${medias[0].nivel_c.toFixed(1)} °C (${medias[0].producto})`
      : `entre ${Math.min(...valoresNivel).toFixed(1)} y ${Math.max(...valoresNivel).toFixed(1)} °C`;
    for (const [titulo, texto] of [
      ['Nivel medio 2001–2019 (Modelo F)', textoNivel],
      [datosDePrueba ? 'Población inventada' : 'Población estimada (GPW 2020)',
        Number.isFinite(f.properties.poblacion) ? new Intl.NumberFormat('es-MX').format(f.properties.poblacion) : 'Sin datos'],
      ['p ajustado por FDR', Number.isFinite(r.p_fdr) ? r.p_fdr.toPrecision(3) : '—']
    ]) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = titulo; dd.textContent = texto; dl.append(dt,dd); }
    const descripcion = document.createElement('p');
    descripcion.textContent = medias.length === 2 ? 'Rango entre medias MOD11 y MOD21.' : '';
    const veredicto = document.createElement('p');
    veredicto.textContent = !Number.isFinite(r.p_fdr) ? 'No se pudo evaluar la significancia.' : color === 'gris'
      ? 'No hay evidencia suficiente de un cambio con el criterio de FDR e intervalo del 95 %.'
      : `La diferencia nocturna entre sector y desierto ${color === 'rojo' ? 'aumenta' : 'disminuye'} de forma significativa con el criterio de FDR e intervalo del 95 %.`;
    const pendiente = document.createElement('p'); pendiente.textContent = Number.isFinite(r.pendiente_c_decada)
      ? `${r.pendiente_c_decada.toFixed(2)} °C por década (IC 95 %: ${r.ic95_inf.toFixed(2)} a ${r.ic95_sup.toFixed(2)}).`
      : `Sin cálculo: solo ${r.n_anios} años válidos, menos que el mínimo.`;
    lectura.append(badge, dl, descripcion, veredicto, pendiente);
    if (Number.isFinite(r.p_mk) && !Number.isFinite(r.p_hamed_rao)) {
      const nota = document.createElement('p');
      nota.textContent = 'Hamed–Rao no se pudo calcular. Se usó Mann–Kendall para el FDR.';
      lectura.append(nota);
    }
    if (color === 'gris') { const nota = document.createElement('p'); nota.className = 'nota'; nota.textContent = 'gris no significa sin tendencia: 19 años pueden no alcanzar para pendientes chicas'; lectura.append(nota); }
    const zoomContenedor = $('zoom-ecostress'); zoomContenedor.replaceChildren();
    if (id === sectorPrioritario && zoom?.sector_id === id) dibujarZoom(zoomContenedor, zoom, datosDePrueba);
    else zoomContenedor.textContent = id === sectorPrioritario
      ? 'El sector prioritario todavía no tiene datos de ECOSTRESS.'
      : 'El zoom a 70 m solo se muestra en el sector prioritario.';
    $('titulo-sector').focus({preventScroll:true});
    if (mapa) requestAnimationFrame(() => {
      mapa.resize();
      const anillo = f.geometry.coordinates[0];
      const centro = [anillo.reduce((a, q) => a + q[0], 0) / anillo.length, anillo.reduce((a, q) => a + q[1], 0) / anillo.length];
      mapa[quieto ? 'jumpTo' : 'easeTo']({center:centro});
    });
  }
  $('estado').textContent = `${sectores.length} sectores${datosDePrueba ? ' de prueba' : ''} · Toca un polígono o usa el selector.`;
  const idEnlace = new URLSearchParams(location.search).get('sector');
  if (sectores.some(f => f.properties.id === idEnlace)) abrir(idEnlace);
}
if (!datosDePrueba) {
  $('aviso-prueba').hidden = true;
  $('serie-descripcion').textContent = 'Diferencia de temperatura superficial nocturna entre sector y desierto. MOD11 Terra.';
  $('expediente-etiqueta').textContent = 'EXPEDIENTE';
  $('mapa-descripcion').textContent = 'Color: p FDR menor que 0.05 e intervalo del 95 % del lado de la pendiente.';
}
iniciar().catch(error => { $('estado').textContent = `No se pudo abrir el explorador: ${error.message}`; });
