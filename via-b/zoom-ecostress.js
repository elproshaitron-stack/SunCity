const NS = 'http://www.w3.org/2000/svg';

export function dibujarZoom(contenedor, datos) {
  contenedor.replaceChildren();
  if (!datos || !Array.isArray(datos.valores_c) || datos.valores_c.length !== datos.filas ||
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
  datos.valores_c.forEach((fila, y) => fila.forEach((valor, x) => {
    const t = (valor - minimo) / (maximo - minimo || 1);
    const rect = document.createElementNS(NS, 'rect');
    for (const [k,v] of Object.entries({x:x*celdaX,y:y*celdaY,width:celdaX+.2,height:celdaY+.2,fill:`hsl(${48 - 42*t} 76% ${84 - 40*t}%)`})) rect.setAttribute(k,v);
    svg.append(rect);
  }));
  const leyenda = document.createElement('div'); leyenda.className = 'leyenda-calor';
  const barra = document.createElement('span'); barra.className = 'escala-calor';
  const bajo = document.createElement('span'), altoLabel = document.createElement('span');
  bajo.textContent = `${minimo.toFixed(1)} °C`; altoLabel.textContent = `${maximo.toFixed(1)} °C`;
  leyenda.append(bajo,barra,altoLabel);
  const nota = document.createElement('p');
  nota.textContent = `Mediana por píxel de ${datos.n_escenas} escenas nocturnas despejadas de ECOSTRESS a ${datos.resolucion_m} m. Datos de prueba.`;
  contenedor.append(svg,leyenda,nota);
}
