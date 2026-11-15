/**
 * SunCity · Vía B (Hermosillo) · Tabla accesible de sectores
 * Alternativa accesible al mapa con ordenamiento multi-columna y sincronización con expediente.
 * Sistema de diseño basado al 100 % en compartido/tokens.css.
 */

import {semaforo} from './semaforo.js';

const FORMATEADOR_POBLACION = new Intl.NumberFormat('es-MX', {maximumFractionDigits: 0});

export function formatearCambio(pendiente) {
  if (!Number.isFinite(pendiente)) return {texto: '—', aria: 'Sin cálculo de cambio'};
  const signo = pendiente > 0 ? '+' : pendiente < 0 ? '−' : '';
  const valor = Math.abs(pendiente).toFixed(2);
  return {
    texto: `${signo}${valor} °C/década`,
    aria: `${signo}${valor} grados Celsius por década`
  };
}

export function formatearIC95(inf, sup) {
  if (!Number.isFinite(inf) || !Number.isFinite(sup)) {
    return {texto: '—', aria: 'Sin intervalo de confianza disponible'};
  }
  const fmt = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(2);
  return {
    texto: `[${fmt(inf)}, ${fmt(sup)}]`,
    aria: `intervalo del noventa y cinco por ciento de ${fmt(inf)} a ${fmt(sup)}`
  };
}

export function formatearP(p) {
  if (!Number.isFinite(p)) return {texto: '—', aria: 'Sin significación disponible'};
  if (p < 0.001) return {texto: '< 0.001', aria: 'p menor que cero punto cero cero uno'};
  return {texto: p.toFixed(3), aria: `p igual a ${p.toFixed(3)}`};
}

export function formatearPoblacion(poblacion) {
  if (!Number.isFinite(poblacion) || poblacion <= 0) {
    return {texto: '—', aria: 'Sin datos de población'};
  }
  const formateado = FORMATEADOR_POBLACION.format(poblacion);
  return {
    texto: formateado,
    aria: `${formateado} habitantes`
  };
}

export function obtenerEstado(r) {
  if (!r || r.sinCalculo || !Number.isFinite(r.pendiente_c_decada) || !Number.isFinite(r.p_fdr)) {
    return {
      clave: 'sin_calculo',
      orden: 0,
      texto: '○ Sin cálculo',
      aria: 'Sin cálculo disponible',
      clase: 'sc-insignia sc-insignia--sin-calculo',
      color: 'gris'
    };
  }
  const color = semaforo(r);
  if (color === 'rojo') {
    return {
      clave: 'aumento',
      orden: 3,
      texto: '▲ Aumento significativo',
      aria: 'Aumento significativo',
      clase: 'sc-insignia sc-insignia--rojo',
      color: 'rojo'
    };
  }
  if (color === 'azul') {
    return {
      clave: 'descenso',
      orden: 1,
      texto: '▼ Descenso significativo',
      aria: 'Descenso significativo',
      clase: 'sc-insignia sc-insignia--azul',
      color: 'azul'
    };
  }
  return {
    clave: 'sin_cambio',
    orden: 2,
    texto: '● Sin cambio significativo',
    aria: 'Sin cambio significativo',
    clase: 'sc-insignia sc-insignia--gris',
    color: 'gris'
  };
}

export const COLUMNAS = [
  {id: 'nombre', titulo: 'Sector', tipo: 'texto', alineacion: 'izq', clave: d => d.nombre, defDir: 'asc'},
  {id: 'cambio', titulo: 'Cambio/década', tipo: 'num', alineacion: 'der', clave: d => d.resultado.pendiente_c_decada, defDir: 'desc'},
  {id: 'ic95', titulo: 'IC 95 %', tipo: 'num', alineacion: 'der', clave: d => d.resultado.ic95_inf, defDir: 'desc'},
  {id: 'p_fdr', titulo: 'p ajustado', tipo: 'num', alineacion: 'der', clave: d => d.resultado.p_fdr, defDir: 'asc'},
  {id: 'poblacion', titulo: 'Población', tipo: 'num', alineacion: 'der', clave: d => d.poblacion, defDir: 'desc'},
  {id: 'estado', titulo: 'Estado', tipo: 'cat', alineacion: 'cen', clave: d => d.estado.orden, defDir: 'desc'}
];

export function crearControladorTabla({contenedor, anuncioContenedor, sectores, primarios, nombreDe, alSeleccionar}) {
  let columnaActiva = 'nombre';
  let direccionActiva = 'asc';
  let sectorSeleccionado = null;

  function prepararDatos() {
    return sectores.map(f => {
      const id = f.properties.id;
      const r = primarios.get(id) || {
        sector: id,
        variante: 'primario',
        n_anios: 0,
        pendiente_c_decada: NaN,
        ic95_inf: NaN,
        ic95_sup: NaN,
        p_fdr: NaN,
        sinCalculo: true
      };
      const infoNombre = nombreDe(f);
      return {
        id,
        nombre: infoNombre.nombre,
        origenNombre: infoNombre.origen,
        poblacion: f.properties.poblacion,
        resultado: r,
        estado: obtenerEstado(r),
        feature: f
      };
    });
  }

  let items = prepararDatos();

  function ordenarItems() {
    const colDef = COLUMNAS.find(c => c.id === columnaActiva) || COLUMNAS[0];
    items.sort((a, b) => {
      const valA = colDef.clave(a);
      const valB = colDef.clave(b);

      const aNulo = valA === null || valA === undefined || (typeof valA === 'number' && Number.isNaN(valA));
      const bNulo = valB === null || valB === undefined || (typeof valB === 'number' && Number.isNaN(valB));

      if (aNulo && bNulo) return a.id.localeCompare(b.id, 'es');
      if (aNulo) return 1;
      if (bNulo) return -1;

      let dif = 0;
      if (colDef.tipo === 'texto') {
        dif = String(valA).localeCompare(String(valB), 'es', {sensitivity: 'base', numeric: true});
      } else {
        dif = valA < valB ? -1 : valA > valB ? 1 : 0;
      }

      if (dif === 0) return a.id.localeCompare(b.id, 'es');
      return direccionActiva === 'asc' ? dif : -dif;
    });
  }

  const tabla = document.createElement('table');
  tabla.id = 'tabla-sectores';
  tabla.className = 'sc-tabla';
  tabla.setAttribute('aria-describedby', 'tabla-descripcion');

  const caption = document.createElement('caption');
  caption.className = 'sr-only';
  caption.textContent = 'Comparativa de sectores de Hermosillo: cambio por década, intervalo de confianza del 95 % y significancia estadística.';
  tabla.append(caption);

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  trHead.setAttribute('role', 'row');

  const cabecerasTh = new Map();

  COLUMNAS.forEach(col => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = `th-${col.alineacion}`;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'btn-ordenar';
    boton.dataset.columna = col.id;

    const textoSpan = document.createElement('span');
    textoSpan.textContent = col.titulo;

    const iconoSpan = document.createElement('span');
    iconoSpan.className = 'indicador-orden';
    iconoSpan.setAttribute('aria-hidden', 'true');

    boton.append(textoSpan, iconoSpan);

    boton.addEventListener('click', () => {
      if (columnaActiva === col.id) {
        direccionActiva = direccionActiva === 'asc' ? 'desc' : 'asc';
      } else {
        columnaActiva = col.id;
        direccionActiva = col.defDir || 'asc';
      }
      renderizarFilas();
      actualizarCabecera();
      if (anuncioContenedor) {
        anuncioContenedor.textContent = `Tabla ordenada por ${col.titulo} en orden ${direccionActiva === 'asc' ? 'ascendente' : 'descendente'}.`;
      }
    });

    th.append(boton);
    trHead.append(th);
    cabecerasTh.set(col.id, {th, boton, iconoSpan, col});
  });

  thead.append(trHead);
  tabla.append(thead);

  const tbody = document.createElement('tbody');
  tbody.id = 'cuerpo-tabla-sectores';
  tabla.append(tbody);

  function actualizarCabecera() {
    cabecerasTh.forEach(({th, boton, iconoSpan, col}) => {
      const esActiva = col.id === columnaActiva;
      th.setAttribute('aria-sort', esActiva ? (direccionActiva === 'asc' ? 'ascending' : 'descending') : 'none');
      const sigDir = esActiva && direccionActiva === 'asc' ? 'descendente' : 'ascendente';
      boton.setAttribute('aria-label', `${col.titulo}. Presiona para ordenar en sentido ${sigDir}`);
      iconoSpan.textContent = esActiva ? (direccionActiva === 'asc' ? ' ▲' : ' ▼') : ' ↕';
    });
  }

  function renderizarFilas() {
    ordenarItems();
    tbody.replaceChildren();

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'fila-sector';
      tr.dataset.sectorId = item.id;
      tr.tabIndex = 0;
      tr.setAttribute('role', 'row');
      tr.setAttribute('aria-label', `Sector ${item.nombre} (${item.id}). Abrir expediente.`);

      if (item.id === sectorSeleccionado) {
        tr.classList.add('fila-seleccionada');
        tr.setAttribute('aria-selected', 'true');
      }

      // 1. Sector (th scope="row")
      const thSector = document.createElement('th');
      thSector.scope = 'row';
      thSector.className = 'td-izq td-sector';
      thSector.dataset.etiqueta = 'Sector';

      const nombreSpan = document.createElement('span');
      nombreSpan.className = 'sector-nombre';
      nombreSpan.textContent = item.nombre;

      const idSpan = document.createElement('span');
      idSpan.className = 'sector-id';
      idSpan.textContent = item.id;

      thSector.append(nombreSpan, idSpan);

      // 2. Cambio/década
      const tdCambio = document.createElement('td');
      tdCambio.className = 'td-der td-cifra';
      tdCambio.dataset.etiqueta = 'Cambio/década';
      const fmtCambio = formatearCambio(item.resultado.pendiente_c_decada);
      tdCambio.textContent = fmtCambio.texto;
      tdCambio.setAttribute('aria-label', fmtCambio.aria);

      // 3. IC 95 %
      const tdIC = document.createElement('td');
      tdIC.className = 'td-der td-cifra';
      tdIC.dataset.etiqueta = 'IC 95 %';
      const fmtIC = formatearIC95(item.resultado.ic95_inf, item.resultado.ic95_sup);
      tdIC.textContent = fmtIC.texto;
      tdIC.setAttribute('aria-label', fmtIC.aria);

      // 4. p ajustado
      const tdP = document.createElement('td');
      tdP.className = 'td-der td-cifra';
      tdP.dataset.etiqueta = 'p ajustado';
      const fmtP = formatearP(item.resultado.p_fdr);
      tdP.textContent = fmtP.texto;
      tdP.setAttribute('aria-label', fmtP.aria);

      // 5. Población
      const tdPoblacion = document.createElement('td');
      tdPoblacion.className = 'td-der td-cifra';
      tdPoblacion.dataset.etiqueta = 'Población';
      const fmtPob = formatearPoblacion(item.poblacion);
      tdPoblacion.textContent = fmtPob.texto;
      tdPoblacion.setAttribute('aria-label', fmtPob.aria);

      // 6. Estado
      const tdEstado = document.createElement('td');
      tdEstado.className = 'td-cen td-estado';
      tdEstado.dataset.etiqueta = 'Estado';
      const insignia = document.createElement('span');
      insignia.className = item.estado.clase;
      insignia.setAttribute('role', 'status');
      insignia.setAttribute('aria-label', item.estado.aria);
      insignia.textContent = item.estado.texto;
      tdEstado.append(insignia);

      tr.append(thSector, tdCambio, tdIC, tdP, tdPoblacion, tdEstado);

      tr.addEventListener('click', () => alSeleccionar(item.id, tr));
      tr.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          alSeleccionar(item.id, tr);
        }
      });

      tbody.append(tr);
    });
  }

  function inicializar() {
    actualizarCabecera();
    renderizarFilas();
    contenedor.replaceChildren(tabla);
  }

  inicializar();

  return {
    actualizarSeleccion(id) {
      sectorSeleccionado = id;
      const filas = tbody.querySelectorAll('tr.fila-sector');
      filas.forEach(f => {
        const coincide = f.dataset.sectorId === id;
        f.classList.toggle('fila-seleccionada', coincide);
        if (coincide) {
          f.setAttribute('aria-selected', 'true');
        } else {
          f.removeAttribute('aria-selected');
        }
      });
    },
    refrescarNombres() {
      items = prepararDatos();
      renderizarFilas();
    },
    obtenerElementoFila(id) {
      return tbody.querySelector(`tr[data-sector-id="${id}"]`);
    }
  };
}
