import {dibujarSerieAnual} from '../compartido/serie-anual.js';
import {ESQUEMA} from './datos/esquema.js';
import {RUTA_DATOS, datosDePrueba, pasosAqua, sectorPrioritario} from './config.js';
import {semaforo} from './semaforo.js';
import {dibujarVariantes} from './variantes.js';
import {nombreSector, guardarNombre, nombresPersonalizados} from './nombres.js';
import {dibujarCicloDiario} from './ciclo-diario.js';
import {dibujarZoom} from './zoom-ecostress.js';
import {crearControladorTabla} from './tabla.js';

const $ = id => document.getElementById(id);
const base = new URL(RUTA_DATOS, import.meta.url);

let mapaInstancia = null;
let ultimoDisparador = null;

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

function activarCarga() {
  $('mapa')?.setAttribute('aria-busy', 'true');
  $('contenedor-tabla')?.setAttribute('aria-busy', 'true');
  const esqMapa = $('mapa-esqueleto');
  if (esqMapa) esqMapa.hidden = false;
  const esqTabla = $('tabla-esqueleto');
  if (esqTabla) esqTabla.hidden = false;
  $('estado').textContent = 'Cargando datos de Hermosillo…';
  if ($('sector')) $('sector').disabled = true;
  if ($('exportar-nombres')) $('exportar-nombres').disabled = true;
  const alerta = $('alerta-error');
  if (alerta) alerta.hidden = true;
}

function desactivarCarga(mensajeEstado) {
  $('mapa')?.removeAttribute('aria-busy');
  $('contenedor-tabla')?.removeAttribute('aria-busy');
  const esqMapa = $('mapa-esqueleto');
  if (esqMapa) esqMapa.hidden = true;
  const esqTabla = $('tabla-esqueleto');
  if (esqTabla) esqTabla.hidden = true;
  if ($('sector')) $('sector').disabled = false;
  if ($('exportar-nombres')) $('exportar-nombres').disabled = false;
  if (mensajeEstado && $('estado')) $('estado').textContent = mensajeEstado;
}

function clasificarError(error) {
  const msg = error?.message || String(error);
  if (!navigator.onLine || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return {
      titulo: 'Sin conexión a internet',
      mensaje: 'No se pudo conectar con el servidor. Comprueba tu red y presiona Reintentar.'
    };
  }
  if (msg.includes('404')) {
    return {
      titulo: 'Archivo no disponible',
      mensaje: `No se encontró un archivo de datos necesario (${msg}). Verifica que los datos estén publicados.`
    };
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return {
      titulo: 'Fallo en el servidor de datos',
      mensaje: `El servidor no pudo entregar los datos (${msg}). Intenta nuevamente en unos instantes.`
    };
  }
  if (msg.includes('comillas sin cerrar')) {
    return {
      titulo: 'Archivo de datos dañado',
      mensaje: 'Uno de los archivos CSV contiene un error de formato (comillas sin cerrar).'
    };
  }
  if (msg.includes('Falta la columna')) {
    return {
      titulo: 'Formato incompatible',
      mensaje: `${msg} Los datos no coinciden con el esquema esperado.`
    };
  }
  if (msg.includes('Valor inválido')) {
    return {
      titulo: 'Dato no válido en tabla',
      mensaje: `${msg} Se encontró un valor no convertible a número.`
    };
  }
  if (msg.includes('Leaflet')) {
    return {
      titulo: 'Error en visualizador cartográfico',
      mensaje: 'No se pudo cargar la biblioteca cartográfica. Revisa tu conexión a internet.'
    };
  }
  return {
    titulo: 'Error al cargar los datos',
    mensaje: msg
  };
}

function mostrarError(error) {
  desactivarCarga('Error al cargar los datos.');
  const {titulo, mensaje} = clasificarError(error);
  const alerta = $('alerta-error');
  const tit = $('error-titulo');
  const msgElem = $('error-mensaje');
  const btn = $('error-reintentar');
  if (tit) tit.textContent = titulo;
  if (msgElem) msgElem.textContent = mensaje;
  if (alerta) alerta.hidden = false;
  btn?.focus();
}

$('error-reintentar')?.addEventListener('click', () => {
  const alerta = $('alerta-error');
  if (alerta) alerta.hidden = true;
  iniciar().catch(mostrarError);
});

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
  activarCarga();

  if (!window.L) throw new Error('No se pudo cargar Leaflet. Revisa la conexión y vuelve a cargar.');
  const [geojson, csvSerie, csvResultados, csvCiclo, csvNivel, zoom, nombres] = await Promise.all([
    cargar('sectores.geojson', true),
    cargar('serie.csv'),
    cargar('resultados.csv'),
    cargar('ciclo_diario.csv'),
    cargar('nivel.csv'),
    sectorPrioritario ? cargar('ecostress_zoom.json', true).catch(() => null) : Promise.resolve(null),
    cargar('nombres.json', true).catch(() => null)
  ]);

  const configNombres = nombres && Array.isArray(nombres.centro) && Number.isFinite(nombres.radio_centro_km) && typeof nombres.ciudad === 'string'
    ? nombres : {ciudad: 'Hermosillo', centro: [29.0729, -110.9559], radio_centro_km: 2, sectores: {}};
  const nombreDe = f => nombreSector(f, geojson.features, configNombres);
  const series = leerCSV(csvSerie, ESQUEMA.serie);
  const resultados = leerCSV(csvResultados, ESQUEMA.resultados);
  const ciclo = leerCSV(csvCiclo, ESQUEMA.ciclo_diario);
  const niveles = leerCSV(csvNivel, ESQUEMA.nivel);

  if (ciclo.some(f => !['terra_1030', 'aqua_1330', 'terra_2230', 'aqua_0130'].includes(f.paso) || !['MOD11', 'MOD21'].includes(f.producto) || !['', '+', '-'].includes(f.yale_signo))) {
    throw new Error('Hay valores desconocidos en ciclo_diario.csv.');
  }
  if (resultados.some(r => !ESQUEMA.variantes.includes(r.variante))) {
    throw new Error('Hay variantes desconocidas en los datos.');
  }

  const primarios = new Map(resultados.filter(r => r.variante === ESQUEMA.variantes[0]).map(r => [r.sector, r]));
  const sectores = geojson.features.filter(f => f.properties.tipo === 'sector');

  // Conciliación resiliente de sectores sin cálculo
  for (const f of sectores) {
    const id = f.properties.id;
    if (!primarios.has(id)) {
      primarios.set(id, {
        sector: id,
        variante: 'primario',
        n_anios: 0,
        pendiente_c_decada: NaN,
        ic95_inf: NaN,
        ic95_sup: NaN,
        p_mk: NaN,
        p_hamed_rao: NaN,
        p: NaN,
        p_fdr: NaN,
        sinCalculo: true
      });
    }
  }

  // Inicialización o recreación limpia del mapa
  if (mapaInstancia) {
    mapaInstancia.remove();
    mapaInstancia = null;
  }
  const mapa = L.map('mapa', {zoomControl: false});
  mapaInstancia = mapa;
  L.control.zoom({position: 'topleft', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar'}).addTo(mapa);
  const mosaicos = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapa);
  mosaicos.on('tileerror', () => {
    $('estado').textContent = 'El mapa base no está disponible; los sectores siguen siendo seleccionables.';
  });

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

    // 4. Coincidencia por palabra exacta dentro del nombre
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
    if (f.properties.tipo === 'referencia') {
      return {color: paleta.refBorde, fillColor: paleta.refFondo, fillOpacity: .15, weight: 2, dashArray: '6 5'};
    }
    const r = primarios.get(f.properties.id);
    const sinCalculo = !r || r.sinCalculo || !Number.isFinite(r.pendiente_c_decada);
    return {
      color: f.properties.id === seleccionado ? paleta.seleccionado : paleta.noSeleccionado,
      weight: f.properties.id === seleccionado ? 4 : 2,
      dashArray: sinCalculo ? '4 4' : null,
      fillColor: sinCalculo ? paleta.gris : paleta[semaforo(r)],
      fillOpacity: sinCalculo ? .25 : .45
    };
  };

  const capas = new Map();
  const geometria = L.geoJSON(geojson, {
    style: estilo,
    onEachFeature(f, capa) {
      const etiqueta = document.createElement('span');
      etiqueta.textContent = f.properties.tipo === 'sector' ? nombreDe(f).nombre : f.properties.nombre;
      capa.bindTooltip(etiqueta);
      if (f.properties.tipo === 'sector') {
        capas.set(f.properties.id, capa);
        capa.on('click', () => abrir(f.properties.id));
      }
    }
  }).addTo(mapa);
  mapa.fitBounds(geometria.getBounds(), {padding: [24, 24]});
  new ResizeObserver(() => mapa.invalidateSize()).observe($('mapa'));

  // Inicialización de la Tabla Accesible de Sectores (Tarea B3)
  const controladorTabla = crearControladorTabla({
    contenedor: $('contenedor-tabla'),
    anuncioContenedor: $('tabla-anuncio'),
    sectores,
    primarios,
    nombreDe,
    alSeleccionar: (id, elementoFila) => {
      ultimoDisparador = elementoFila;
      abrir(id);
    }
  });

  // Conmutador de Vistas Mapa / Tabla
  let modoVistaActivo = 'mapa';
  const tabMapa = $('tab-mapa');
  const tabTabla = $('tab-tabla');
  const panelMapa = $('panel-mapa');
  const panelTabla = $('panel-tabla');

  function cambiarVista(modo) {
    if (modo === modoVistaActivo) return;
    modoVistaActivo = modo;
    const esMapa = modo === 'mapa';

    tabMapa.setAttribute('aria-selected', String(esMapa));
    tabMapa.classList.toggle('activa', esMapa);

    tabTabla.setAttribute('aria-selected', String(!esMapa));
    tabTabla.classList.toggle('activa', !esMapa);

    panelMapa.hidden = !esMapa;
    panelTabla.hidden = esMapa;

    if (esMapa) {
      requestAnimationFrame(() => {
        mapa.invalidateSize();
        if (seleccionado && capas.has(seleccionado)) {
          mapa.panTo(capas.get(seleccionado).getBounds().getCenter());
        }
      });
    } else {
      if (seleccionado) {
        const fila = controladorTabla.obtenerElementoFila(seleccionado);
        if (fila) fila.scrollIntoView({block: 'nearest'});
      }
    }
  }

  tabMapa.onclick = () => cambiarVista('mapa');
  tabTabla.onclick = () => cambiarVista('tabla');

  const tabs = [tabMapa, tabTabla];
  tabs.forEach((tab, index) => {
    tab.onkeydown = e => {
      let siguienteIndex = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        siguienteIndex = (index + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        siguienteIndex = (index - 1 + tabs.length) % tabs.length;
      }
      if (siguienteIndex !== null) {
        e.preventDefault();
        tabs[siguienteIndex].focus();
        cambiarVista(siguienteIndex === 0 ? 'mapa' : 'tabla');
      }
    };
  });

  // Poblado del selector de sectores
  const selectSector = $('sector');
  selectSector.replaceChildren();
  const optDefault = document.createElement('option');
  optDefault.value = '';
  optDefault.textContent = 'Selecciona un sector';
  selectSector.append(optDefault);

  sectores.forEach(f => {
    const o = document.createElement('option');
    o.value = f.properties.id;
    o.textContent = nombreDe(f).nombre;
    selectSector.append(o);
  });

  $('sector').disabled = false;
  $('exportar-nombres').disabled = false;
  $('exportar-nombres').addEventListener('click', () => {
    const actuales = nombresPersonalizados();
    const personalizados = Object.fromEntries(
      sectores
        .filter(f => typeof actuales[f.properties.id] === 'string' && actuales[f.properties.id].trim())
        .map(f => [f.properties.id, actuales[f.properties.id].trim()])
    );
    const contenido = JSON.stringify({...configNombres, sectores: personalizados}, null, 2) + '\n';
    const url = URL.createObjectURL(new Blob([contenido], {type: 'application/json'}));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'nombres.json';
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  function refrescarNombres() {
    sectores.forEach(f => {
      const nombre = nombreDe(f).nombre;
      const opt = $('sector').querySelector(`option[value="${f.properties.id}"]`);
      if (opt) opt.textContent = nombre;
      const etiqueta = document.createElement('span');
      etiqueta.textContent = nombre;
      if (capas.has(f.properties.id)) {
        capas.get(f.properties.id).setTooltipContent(etiqueta);
      }
    });
    controladorTabla.refrescarNombres();
    if (seleccionado) {
      const {nombre, origen} = nombreDe(sectores.find(f => f.properties.id === seleccionado));
      $('titulo-sector').textContent = nombre;
      $('origen-nombre').textContent = origen;
    }
  }

  function editar(activo) {
    $('form-nombre').hidden = !activo;
    $('editar-nombre').hidden = activo;
    if (activo) {
      $('entrada-nombre').value = $('titulo-sector').textContent;
      $('entrada-nombre').focus();
      $('entrada-nombre').select();
    }
  }

  $('editar-nombre').addEventListener('click', () => editar(true));
  $('cancelar-nombre').addEventListener('click', () => editar(false));
  $('form-nombre').addEventListener('submit', e => {
    e.preventDefault();
    if (!seleccionado || !$('entrada-nombre').value.trim()) return;
    if (!guardarNombre(seleccionado, $('entrada-nombre').value)) {
      $('estado').textContent = 'No se pudo guardar el nombre en este navegador.';
      return;
    }
    editar(false);
    refrescarNombres();
    $('titulo-sector').focus({preventScroll: true});
  });
  $('entrada-nombre').addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      editar(false);
      $('editar-nombre').focus();
    }
  });
  $('restaurar-nombre').addEventListener('click', () => {
    if (!seleccionado) return;
    if (!guardarNombre(seleccionado, '')) {
      $('estado').textContent = 'No se pudo restaurar el nombre en este navegador.';
      return;
    }
    editar(false);
    refrescarNombres();
  });

  $('sector').addEventListener('change', e => e.target.value ? abrir(e.target.value) : cerrar());
  $('cerrar').addEventListener('click', () => cerrar(true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('expediente').hidden) cerrar(true);
  });

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
    const sectorPrevio = seleccionado;
    seleccionado = null;
    varianteSeleccionada = 'primario';
    $('sector').value = '';
    geometria.setStyle(estilo);
    controladorTabla.actualizarSeleccion(null);

    const idSector = ultimoDisparador?.dataset?.sectorId || sectorPrevio;
    const filaViva = (idSector && modoVistaActivo === 'tabla')
      ? controladorTabla.obtenerElementoFila(idSector)
      : null;

    if (filaViva) {
      filaViva.focus();
    } else if (ultimoDisparador && document.contains(ultimoDisparador)) {
      ultimoDisparador.focus();
    } else {
      $('sector').focus();
    }
    if (actualizarHistorial) {
      actualizarURL(null, null, false);
    }
  }

  function abrir(id, variante = 'primario', actualizarHistorial = true, reemplazar = false) {
    const f = sectores.find(f => f.properties.id === id);
    if (!f) return;
    const r = primarios.get(id);
    const tieneCalculo = Boolean(r && !r.sinCalculo && Number.isFinite(r.pendiente_c_decada));
    const varNorm = normalizarVariante(variante);
    const datos = series.filter(s => s.sector === id).sort((a, b) => a.anio - b.anio);
    const color = tieneCalculo ? semaforo(r) : 'gris';

    seleccionado = id;
    varianteSeleccionada = varNorm;
    if (actualizarHistorial) {
      actualizarURL(id, varNorm, reemplazar);
    }
    $('sector').value = id;
    editar(false);
    controladorTabla.actualizarSeleccion(id);
    $('expediente').hidden = false;
    $('expediente').scrollTop = 0;
    geometria.setStyle(estilo);

    // Serie anual protegida
    if (tieneCalculo) {
      dibujarSerieAnual($('serie-anual'), {
        anios: datos.map(d => d.anio),
        valores: datos.map(d => d.valor),
        resultado: r,
        unidad: '°C',
        aniosPunteados: datos.filter(d => d.anio > 2019).map(d => d.anio)
      });
    } else {
      const contSerie = $('serie-anual');
      contSerie.replaceChildren();
      const pSerie = document.createElement('p');
      pSerie.className = 'sc-aviso sc-aviso--info';
      pSerie.textContent = 'No hay datos suficientes para calcular la tendencia de este sector (mínimo 10 años requeridos).';
      contSerie.append(pSerie);
    }

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

    const lectura = $('lectura');
    lectura.replaceChildren();
    const badge = document.createElement('span');
    badge.className = `estado-sector ${color} sc-insignia sc-insignia--${tieneCalculo ? color : 'sin-calculo'}`;
    badge.textContent = tieneCalculo ? `Semáforo: ${color}` : 'Sin cálculo disponible';

    const dl = document.createElement('dl');
    dl.className = 'sc-cifra';
    const nivel = niveles.filter(d => d.sector === id);
    const medias = nivel.filter(d => Number.isFinite(d.nivel_c));
    const valoresNivel = medias.map(d => d.nivel_c);
    const textoNivel = medias.length === 0 ? 'Sin datos' : medias.length === 1
      ? `${medias[0].nivel_c.toFixed(1)} °C (${medias[0].producto})`
      : `entre ${Math.min(...valoresNivel).toFixed(1)} y ${Math.max(...valoresNivel).toFixed(1)} °C`;

    for (const [titulo, texto] of [
      ['Nivel medio 2001–2019 (Modelo F)', textoNivel],
      [datosDePrueba ? 'Población inventada' : 'Población estimada (GPW 2020)',
        Number.isFinite(f.properties.poblacion) ? new Intl.NumberFormat('es-MX').format(f.properties.poblacion) : 'Sin datos'],
      ['p ajustado por FDR', (r && Number.isFinite(r.p_fdr)) ? r.p_fdr.toPrecision(3) : '—']
    ]) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = titulo;
      dd.textContent = texto;
      dl.append(dt, dd);
    }

    if (tieneCalculo) {
      const descripcion = document.createElement('p');
      descripcion.textContent = medias.length === 2 ? 'Rango entre medias MOD11 y MOD21.' : '';
      const veredicto = document.createElement('p');
      veredicto.textContent = !Number.isFinite(r.p_fdr) ? 'No se pudo evaluar la significancia.' : color === 'gris'
        ? 'No hay evidencia suficiente de un cambio con el criterio de FDR e intervalo del 95 %.'
        : `La diferencia nocturna entre sector y desierto ${color === 'rojo' ? 'aumenta' : 'disminuye'} de forma significativa con el criterio de FDR e intervalo del 95 %.`;
      const pendiente = document.createElement('p');
      pendiente.textContent = `${r.pendiente_c_decada.toFixed(2)} °C por década (IC 95 %: ${r.ic95_inf.toFixed(2)} a ${r.ic95_sup.toFixed(2)}).`;
      lectura.append(badge, dl, descripcion, veredicto, pendiente);
      if (Number.isFinite(r.p_mk) && !Number.isFinite(r.p_hamed_rao)) {
        const nota = document.createElement('p');
        nota.textContent = 'Hamed–Rao no se pudo calcular. Se usó Mann–Kendall para el FDR.';
        lectura.append(nota);
      }
      if (color === 'gris') {
        const nota = document.createElement('p');
        nota.className = 'nota';
        nota.textContent = 'gris no significa sin tendencia: 19 años pueden no alcanzar para pendientes chicas';
        lectura.append(nota);
      }
    } else {
      const avisoSinCalc = document.createElement('div');
      avisoSinCalc.className = 'sc-aviso sc-aviso--info';
      avisoSinCalc.textContent = 'Este sector no cuenta con cálculo de tendencia debido a que no reúne el mínimo de observaciones válidas requeridas por el método.';
      const pendiente = document.createElement('p');
      pendiente.textContent = r && Number.isFinite(r.n_anios) && r.n_anios > 0
        ? `Sin cálculo: solo ${r.n_anios} años válidos, menos que el mínimo.`
        : 'Sin cálculo: no hay observaciones suficientes registradas para este sector.';
      lectura.append(badge, dl, avisoSinCalc, pendiente);
    }

    const zoomContenedor = $('zoom-ecostress');
    zoomContenedor.replaceChildren();
    if (id === sectorPrioritario && zoom?.sector_id === id) {
      dibujarZoom(zoomContenedor, zoom, datosDePrueba);
    } else {
      zoomContenedor.textContent = id === sectorPrioritario
        ? 'El sector prioritario todavía no tiene datos de ECOSTRESS.'
        : 'El zoom a 70 m solo se muestra en el sector prioritario.';
    }

    $('titulo-sector').focus({preventScroll: true});
    requestAnimationFrame(() => {
      mapa.invalidateSize();
      if (capas.has(id)) {
        mapa.panTo(capas.get(id).getBounds().getCenter());
      }
    });
  }

  desactivarCarga(`${sectores.length} sectores${datosDePrueba ? ' de prueba' : ''} · Toca un polígono o usa el selector.`);

  const paramsIniciales = new URLSearchParams(window.location.search);
  const secInicial = paramsIniciales.get('sector');
  const varInicial = paramsIniciales.get('variante');
  const inicialEncontrado = resolverSector(secInicial);
  if (inicialEncontrado) {
    abrir(inicialEncontrado.properties.id, normalizarVariante(varInicial), true, true);
  }
}

sincronizarAvisoPrueba();
iniciar().catch(mostrarError);
