import {ESCALA, colorPara} from '../compartido/lst-noche.js';

import {tablaAlternativa, cifra, vacio} from './tabla-datos.js';

const NS = 'http://www.w3.org/2000/svg';

export function dibujarZoom(contenedor, datos, datosDePrueba) {
  contenedor.replaceChildren();
  if (!datos || !Number.isInteger(datos.filas) || datos.filas < 1 ||
      !Number.isInteger(datos.columnas) || datos.columnas < 1 ||
      !Array.isArray(datos.valores_c) || datos.valores_c.length !== datos.filas ||
      !datos.valores_c.every(f => Array.isArray(f) && f.length === datos.columnas && f.every(Number.isFinite))) {
    contenedor.append(vacio('El zoom no tiene datos válidos', 'ecostress_zoom.json no trae una rejilla completa de números. Vuelve a exportarlo desde AppEEARS (D10).'));
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
    for (const [k,v] of Object.entries({x:x*celdaX,y:y*celdaY,width:celdaX+.2,height:celdaY+.2,fill:`rgb(${colorPara(t).join(',')})`})) rect.setAttribute(k,v);
    svg.append(rect);
  }));
  const leyenda = document.createElement('div'); leyenda.className = 'leyenda-calor';
  const barra = document.createElement('span'); barra.className = 'escala-calor';
  barra.style.background = `linear-gradient(to right, ${ESCALA.join(', ')})`;
  const bajo = document.createElement('span'), altoLabel = document.createElement('span');
  bajo.textContent = `${minimo.toFixed(1)} °C`; altoLabel.textContent = `${maximo.toFixed(1)} °C`;
  leyenda.append(bajo,barra,altoLabel);
  const nota = document.createElement('p');
  nota.textContent = `Mediana por píxel de ${datos.n_escenas} escenas nocturnas despejadas de ECOSTRESS a ${datos.resolucion_m} m.${datosDePrueba ? ' Datos de prueba.' : ''}`;
  // Tabla alternativa: el resumen de la rejilla (la rejilla completa tiene demasiadas celdas para leerla)
  const orden = [...valores].sort((a, b) => a - b);
  const cuantil = q => { const i = (orden.length - 1) * q, b = Math.floor(i); return orden[b] + (orden[Math.min(b + 1, orden.length - 1)] - orden[b]) * (i - b); };
  const [boton, marco] = tablaAlternativa({
    titulo: `Resumen de los ${valores.length} píxeles de la rejilla, en °C`,
    columnas: [{texto:'Medida'}, {texto:'Valor (°C)', num:true}],
    filas: [['Mínimo', cifra(minimo, 1)], ['Cuartil inferior', cifra(cuantil(.25), 1)], ['Mediana', cifra(cuantil(.5), 1)],
      ['Cuartil superior', cifra(cuantil(.75), 1)], ['Máximo', cifra(maximo, 1)]]
  });
  contenedor.append(svg,leyenda,nota,boton,marco);
}
