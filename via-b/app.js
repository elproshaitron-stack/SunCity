import {dibujarSerieAnual} from '../compartido/serie-anual.js';
import {ESQUEMA} from './datos/esquema.js';
import {RUTA_DATOS, datosDePrueba, pasosAqua, sectorPrioritario} from './config.js';
import {semaforo} from './semaforo.js';
import {dibujarVariantes} from './variantes.js';
import {nombreSector, guardarNombre, nombresPersonalizados} from './nombres.js';
import {dibujarCicloDiario} from './ciclo-diario.js';
import {dibujarZoom} from './zoom-ecostress.js';

const $ = id => document.getElementById(id);
const base = new URL(RUTA_DATOS, import.meta.url);

function obtenerToken(nombre, elemento = document.documentElement) {
  return getComputedStyle(elemento).getPropertyValue(nombre).trim();
}

function obtenerColoresMapa() {
  return {
    rojo: obtenerToken('--semaforo-rojo'),
    azul: obtenerToken('--semaforo-azul'),
    gris: obtenerToken('--semaforo-gris'),
    refBorde: obtenerToken('--mapa-ref-borde'),
    refFondo: obtenerToken('--mapa-ref-fondo'),
    seleccionado: obtenerToken('--mapa-seleccionado'),
    noSeleccionado: obtenerToken('--mapa-no-seleccionado')
  };
}

function normalizarVariante(variante) {
  if (typeof variante === 'string' && ESQUEMA.variantes.includes(variante.trim())) {
    return variante.trim();
  }
  return ESQUEMA.variantes[0];
}

function actualizarURL(sectorId, varianteId, reemplazar = false) {
  try {
    const url = new URL(window.location.href);
    if (sectorId) {
      url.searchParams.set('sector', sectorId);
      if (varianteId && varianteId !== 'primario') {
        url.searchParams.set('variante', varianteId);
      } else {
        url.searchParams.delete('variante');
      }
    } else {
      url.searchParams.delete('sector');
      url.searchParams.delete('variante');
    }
    const nueva = url.pathname + (url.search ? url.search : '') + url.hash;
    const actual = window.location.pathname + window.location.search + window.location.hash;
    if (reemplazar) {
      window.history.replaceState({sector: sectorId, variante: varianteId}, '', nueva);
    } else if (nueva !== actual) {
      window.history.pushState({sector: sectorId, variante: varianteId}, '', nueva);
    }
  } catch {
    // Entornos sin soporte de API History o restricciones locales
  }
}

function sincronizarAvisoPrueba() {
  const aviso = $('aviso-prueba');
  if (!aviso) return;
  if (datosDePrueba) {
    aviso.hidden = false;
    document.body.classList.add('con-aviso');
  } else {
    aviso.hidden = true;
    document.body.classList.remove('con-aviso');
    const serieDesc = $('serie-descripcion');
    if (serieDesc) serieDesc.textContent = 'Diferencia de temperatura superficial nocturna entre sector y desierto. MOD11 Terra.';
    const expEtiq = $('expediente-etiqueta');
    if (expEtiq) expEtiq.textContent = 'EXPEDIENTE';
    const mapaDesc = $('mapa-descripcion');
    if (mapaDesc) mapaDesc.textContent = 'Color: p FDR menor que 0.05 e intervalo del 95 % del lado de la pendiente.';
  }
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
  if (!window.L) throw new Error('No se pudo cargar Leaflet. Revisa la conexión y vuelve a cargar.');
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
  const mapa = L.map('mapa', {zoomControl:false});
  L.control.zoom({position:'topleft', zoomInTitle:'Acercar', zoomOutTitle:'Alejar'}).addTo(mapa);
  const mosaicos = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(mapa);
  mosaicos.on('tileerror', () => { $('estado').textContent = 'El mapa base no está disponible; los sectores siguen siendo seleccionables.'; });
  let seleccionado = null;
  let varianteSeleccionada = 'primario';

  function resolverSector(idOParam) {
    if (!idOParam || typeof idOParam !== 'string') return null;
    const param = idOParam.trim();
    if (!param) return null;

    // 1. Coincidencia exacta por ID (ej. S01, S04)
    const porId = sectores.find(f => f.properties.id === param);
    if (porId) return porId;

    // 2. Coincidencia insensible a mayúsculas y con o sin cero inicial (ej. s01 -> S01, s1 -> S01)
    const paramMin = param.toLowerCase();
    const porIdMin = sectores.find(f => f.properties.id.toLowerCase() === paramMin);
    if (porIdMin) return porIdMin;
    const normalizarId = id => id.toLowerCase().replace(/^s0?(\d+)$/, 's$1');
    const porIdNorm = sectores.find(f => normalizarId(f.properties.id) === normalizarId(paramMin));
    if (porIdNorm) return porIdNorm;

    // Normalizador de texto para slug
    const limpiar = s => (s || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    const slugParam = limpiar(param);
    if (!slugParam) return null;

    // 3. Coincidencia por nombre completo normalizado
    for (const f of sectores) {
      const nom = limpiar(nombreDe(f).nombre);
      if (nom === slugParam) return f;
      if (f.properties.nombre && limpiar(f.properties.nombre) === slugParam) return f;
    }

    // 4. Coincidencia por palabra exacta dentro del nombre (ej. "centro" -> Hermosillo Centro, "norte" -> Hermosillo Norte)
    for (const f of sectores) {
      const nom = limpiar(nombreDe(f).nombre);
      const palabras = nom.split(' ');
      if (palabras.includes(slugParam)) return f;
    }

    // 5. Coincidencia si el nombre termina con el término buscado
    for (const f of sectores) {
      const nom = limpiar(nombreDe(f).nombre);
      if (nom.endsWith(' ' + slugParam)) return f;
    }

    return null;
  }
  const estilo = f => {
    const paleta = obtenerColoresMapa();
    return f.properties.tipo === 'referencia'
      ? {color: paleta.refBorde, fillColor: paleta.refFondo, fillOpacity: .15, weight: 2, dashArray: '6 5'}
      : {
          color: f.properties.id === seleccionado ? paleta.seleccionado : paleta.noSeleccionado,
          weight: f.properties.id === seleccionado ? 4 : 2,
          fillColor: paleta[semaforo(primarios.get(f.properties.id))],
          fillOpacity: .45
        };
  };
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
      const etiqueta = document.createElement('span'); etiqueta.textContent = nombre;
      capas.get(f.properties.id).setTooltipContent(etiqueta);
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
  $('cerrar').addEventListener('click', () => cerrar(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('expediente').hidden) cerrar(true); });
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const secParam = params.get('sector');
    const varParam = params.get('variante');
    const encontrado = resolverSector(secParam);
    if (encontrado) {
      abrir(encontrado.properties.id, normalizarVariante(varParam), false);
    } else {
      cerrar(false);
    }
  });
  function cerrar(actualizarHistorial = true) {
    $('expediente').hidden = true;
    editar(false);
    seleccionado = null;
    varianteSeleccionada = 'primario';
    $('sector').value = '';
    geometria.setStyle(estilo);
    $('sector').focus();
    if (actualizarHistorial) {
      actualizarURL(null, null, false);
    }
  }
  function abrir(id, variante = 'primario', actualizarHistorial = true, reemplazar = false) {
    const f = sectores.find(f => f.properties.id === id);
    if (!f) return;
    const r = primarios.get(id);
    const varNorm = normalizarVariante(variante);
    const datos = series.filter(s => s.sector === id).sort((a,b) => a.anio - b.anio);
    const color = semaforo(r);
    seleccionado = id;
    varianteSeleccionada = varNorm;
    if (actualizarHistorial) {
      actualizarURL(id, varNorm, reemplazar);
    }
    $('sector').value = id;
    editar(false);
    refrescarNombres();
    $('expediente').hidden = false;
    $('expediente').scrollTop = 0;
    geometria.setStyle(estilo);
    dibujarSerieAnual($('serie-anual'), {anios:datos.map(d => d.anio), valores:datos.map(d => d.valor), resultado:r, unidad:'°C', aniosPunteados:datos.filter(d => d.anio > 2019).map(d => d.anio)});
    dibujarVariantes(
      $('curva-variantes'),
      resultados.filter(fila => fila.sector === id),
      ESQUEMA.variantes,
      varianteSeleccionada,
      nuevaVar => {
        if (nuevaVar !== varianteSeleccionada) {
          abrir(id, nuevaVar, true, false);
        }
      }
    );
    dibujarCicloDiario($('ciclo-diario'), ciclo.filter(fila => fila.sector === id), pasosAqua);
    const lectura = $('lectura'); lectura.replaceChildren();
    const badge = document.createElement('span'); badge.className = `estado-sector ${color} sc-insignia sc-insignia--${color}`; badge.textContent = `Semáforo: ${color}`;
    const dl = document.createElement('dl'); dl.className = 'sc-cifra'; const nivel = niveles.filter(d => d.sector === id);
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
    requestAnimationFrame(() => { mapa.invalidateSize(); mapa.panTo(capas.get(id).getBounds().getCenter()); });
  }
  $('estado').textContent = `${sectores.length} sectores${datosDePrueba ? ' de prueba' : ''} · Toca un polígono o usa el selector.`;
  const paramsIniciales = new URLSearchParams(window.location.search);
  const secInicial = paramsIniciales.get('sector');
  const varInicial = paramsIniciales.get('variante');
  const inicialEncontrado = resolverSector(secInicial);
  if (inicialEncontrado) {
    abrir(inicialEncontrado.properties.id, normalizarVariante(varInicial), true, true);
  }
}
sincronizarAvisoPrueba();
iniciar().catch(error => { $('estado').textContent = `No se pudo abrir el explorador: ${error.message}`; });
