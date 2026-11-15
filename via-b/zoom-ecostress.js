const NS = 'http://www.w3.org/2000/svg';

export function dibujarZoom(contenedor, datos, datosDePrueba) {
  contenedor.replaceChildren();
  if (!datos || !Number.isInteger(datos.filas) || datos.filas < 1 ||
      !Number.isInteger(datos.columnas) || datos.columnas < 1 ||
      !Array.isArray(datos.valores_c) || datos.valores_c.length !== datos.filas ||
      !datos.valores_c.every(f => Array.isArray(f) && f.length === datos.columnas && f.every(Number.isFinite))) {
    contenedor.textContent = 'No hay datos válidos para el zoom.';
    return;
  }
  const valores = datos.valores_c.flat(), minimo = Math.min(...valores), maximo = Math.max(...valores);
  const ancho = 360, alto = 360, celdaX = ancho / datos.columnas, celdaY = alto / datos.filas;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Rejilla de temperatura superficial nocturna de ${datos.filas} por ${datos.columnas} píxeles, entre ${minimo.toFixed(1)} y ${maximo.toFixed(1)} °C.`);
  svg.style.cssText = 'display:block;width:100%;height:auto;max-width:420px';

  const estilo = getComputedStyle(document.documentElement);
  const h0 = parseFloat(estilo.getPropertyValue('--calor-h0')) || 48;
  const dh = parseFloat(estilo.getPropertyValue('--calor-dh')) || 42;
  const s = estilo.getPropertyValue('--calor-s').trim() || '76%';
  const l0 = parseFloat(estilo.getPropertyValue('--calor-l0')) || 84;
  const dl = parseFloat(estilo.getPropertyValue('--calor-dl')) || 40;

  datos.valores_c.forEach((fila, y) => fila.forEach((valor, x) => {
    const t = (valor - minimo) / (maximo - minimo || 1);
    const rect = document.createElementNS(NS, 'rect');
    const h = h0 - dh * t;
    const l = l0 - dl * t;
    for (const [k, v] of Object.entries({
      x: x * celdaX,
      y: y * celdaY,
      width: celdaX + .2,
      height: celdaY + .2,
      fill: `hsl(${h} ${s} ${l}%)`
    })) rect.setAttribute(k, v);
    svg.append(rect);
  }));
  const leyenda = document.createElement('div'); leyenda.className = 'leyenda-calor';
  const barra = document.createElement('span'); barra.className = 'escala-calor';
  const bajo = document.createElement('span'), altoLabel = document.createElement('span');
  bajo.textContent = `${minimo.toFixed(1)} °C`; altoLabel.textContent = `${maximo.toFixed(1)} °C`;
  leyenda.append(bajo,barra,altoLabel);
  const nota = document.createElement('p');
  nota.textContent = `Mediana por píxel de ${datos.n_escenas} escenas nocturnas despejadas de ECOSTRESS a ${datos.resolucion_m} m.${datosDePrueba ? ' Datos de prueba.' : ''}`;
  contenedor.append(svg,leyenda,nota);
}
