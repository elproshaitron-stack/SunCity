/*
 * SunCity · Temperatura de la superficie de noche (MODIS Terra, MOD11A2) desde NASA GIBS
 *
 * GIBS publica el compuesto de 8 días de MOD11A2 como mosaicos PNG abiertos, sin clave y con CORS.
 * Cada color de esos mosaicos corresponde a un intervalo de 0.6 K según la paleta oficial de GIBS,
 * así que leer el color de un píxel da la temperatura con ±0.3 K. El mosaico de nivel 7 tiene
 * píxeles de unos 1.1 km en Hermosillo: la misma escala que el producto.
 *
 * Es una lectura descriptiva de un periodo, no la serie del cálculo de tendencia (eso lo hace
 * via-b/procesamiento con Earth Engine y los filtros de calidad de docs/04-DATOS-Y-APIS.md).
 *
 *   import * as LST from '../compartido/lst-noche.js';
 *   LST.CAPA, LST.urlMosaicos(fecha), LST.periodos(anio, meses), LST.paleta()
 *   await LST.valorEn(fecha, lon, lat)        → °C o null
 *   await LST.mediaEn(fecha, geometriaGeoJSON) → {media, n} (n = píxeles con dato)
 */

export const CAPA = 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Night';
export const NIVEL = 7; // GoogleMapsCompatible_Level7
const RAIZ = 'https://gibs.earthdata.nasa.gov';
const PALETA = `${RAIZ}/colormaps/v1.3/MODIS_Land_Surface_Temp.xml`;
export const ATRIBUCION = '<a href="https://nasa-gibs.github.io/gibs-api-docs/" target="_blank" rel="noopener">NASA GIBS</a> · MODIS Terra MOD11A2';

export function urlMosaicos(fecha) {
  return `${RAIZ}/wmts/epsg3857/best/${CAPA}/default/${fecha}/GoogleMapsCompatible_Level${NIVEL}/{z}/{y}/{x}.png`;
}

const iso = d => d.toISOString().slice(0, 10);

/* Periodos de 8 días de MOD11A2: empiezan el día 1, 9, 17… de cada año (el último es más corto).
   Devuelve los que empiezan en los meses pedidos (1 a 12). */
export function periodos(anio, meses = [6, 7, 8]) {
  const lista = [];
  for (let dia = 1; dia <= 366; dia += 8) {
    const inicio = new Date(Date.UTC(anio, 0, dia));
    if (inicio.getUTCFullYear() !== anio) break;
    const fin = new Date(Math.min(Date.UTC(anio, 0, dia + 7), Date.UTC(anio, 11, 31)));
    if (meses.includes(inicio.getUTCMonth() + 1)) lista.push({inicio: iso(inicio), fin: iso(fin)});
  }
  return lista;
}

/* Paleta: color "r,g,b" → °C (centro del intervalo). También la lista ordenada, para la leyenda. */
let paletaPromesa = null;
export function paleta() {
  if (!paletaPromesa) paletaPromesa = fetch(PALETA).then(r => {
    if (!r.ok) throw new Error(`Paleta de GIBS: ${r.status}`);
    return r.text();
  }).then(texto => {
    const xml = new DOMParser().parseFromString(texto, 'text/xml');
    const porColor = new Map(), lista = [];
    xml.querySelectorAll('ColorMap[title="Land Surface Temperature"] ColorMapEntry').forEach(e => {
      const [a, b] = (e.getAttribute('value').match(/[\d.]+/g) || []).map(Number);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return;
      const c = (a + b) / 2 - 273.15;
      porColor.set(e.getAttribute('rgb'), c);
      lista.push({rgb: e.getAttribute('rgb'), c});
    });
    if (!porColor.size) throw new Error('La paleta de GIBS vino vacía.');
    return {porColor, lista};
  });
  return paletaPromesa;
}

/* Mosaicos decodificados, por fecha y posición */
const mosaicos = new Map();
function mosaico(fecha, x, y) {
  const clave = `${fecha}/${x}/${y}`;
  if (!mosaicos.has(clave)) {
    const url = urlMosaicos(fecha).replace('{z}', NIVEL).replace('{y}', y).replace('{x}', x);
    mosaicos.set(clave, Promise.all([fetch(url).then(r => {
      if (!r.ok) throw new Error(`Mosaico de GIBS: ${r.status}`);
      return r.blob();
    }).then(b => createImageBitmap(b)), paleta()]).then(([img, {porColor}]) => {
      const lienzo = document.createElement('canvas');
      lienzo.width = img.width; lienzo.height = img.height;
      const ctx = lienzo.getContext('2d', {willReadFrequently: true});
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, img.width, img.height).data;
      const valores = new Float32Array(img.width * img.height).fill(NaN);
      for (let i = 0, k = 0; i < px.length; i += 4, k++) {
        if (px[i + 3] === 0) continue;
        const c = porColor.get(`${px[i]},${px[i + 1]},${px[i + 2]}`);
        if (c !== undefined) valores[k] = c;
      }
      return {ancho: img.width, valores};
    }));
  }
  return mosaicos.get(clave);
}

// Coordenadas de mosaico (fraccionarias) en el nivel fijo
function aMosaico(lon, lat) {
  const n = 2 ** NIVEL, r = lat * Math.PI / 180;
  return [(lon + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n];
}
function aLonLat(tx, ty) {
  const n = 2 ** NIVEL;
  return [tx / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * ty / n))) * 180 / Math.PI];
}

export async function valorEn(fecha, lon, lat) {
  const [tx, ty] = aMosaico(lon, lat);
  const x = Math.floor(tx), y = Math.floor(ty);
  const m = await mosaico(fecha, x, y);
  const v = m.valores[Math.floor((ty - y) * m.ancho) * m.ancho + Math.floor((tx - x) * m.ancho)];
  return Number.isFinite(v) ? v : null;
}

/* Escala propia para ver diferencias de pocos grados: de noche fresca (azul) a noche caliente (rojo).
   Colores de dato, no de interfaz; legibles para daltonismo rojo-verde porque varían también en luz. */
export const ESCALA = ['#253a7a', '#4a6fb0', '#9bbad1', '#f1e6c2', '#f3b166', '#de6a35', '#a5261b'];
const rgbDe = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const PARADAS = ESCALA.map(rgbDe);
// El mismo color como texto CSS, para quien pinta con atributos (SVG del zoom de ECOSTRESS)
export const colorCss = t => `rgb(${colorPara(t).join(',')})`;
export function colorPara(t) {
  const x = Math.min(1, Math.max(0, t)) * (PARADAS.length - 1), i = Math.min(PARADAS.length - 2, Math.floor(x)), f = x - i;
  return PARADAS[i].map((v, k) => Math.round(v + (PARADAS[i + 1][k] - v) * f));
}

/* Imagen del área [oeste, sur, este, norte] recoloreada con ESCALA entre los percentiles 2 y 98 del periodo.
   Devuelve {url, coordenadas (esquinas para una fuente image de MapLibre), rango: [min, max], n} */
export async function imagen(fecha, [oeste, sur, este, norte]) {
  const [x0, y0] = aMosaico(oeste, norte), [x1, y1] = aMosaico(este, sur);
  const tx0 = Math.floor(x0), ty0 = Math.floor(y0), tx1 = Math.floor(x1), ty1 = Math.floor(y1);
  const lado = 256;
  const i0 = Math.floor((x0 - tx0) * lado), j0 = Math.floor((y0 - ty0) * lado);
  const i1 = Math.floor((x1 - tx0) * lado), j1 = Math.floor((y1 - ty0) * lado);
  const ancho = i1 - i0 + 1, alto = j1 - j0 + 1;
  const valores = new Float32Array(ancho * alto).fill(NaN);
  for (let mx = tx0; mx <= tx1; mx++) for (let my = ty0; my <= ty1; my++) {
    const m = await mosaico(fecha, mx, my);
    for (let j = 0; j < alto; j++) for (let i = 0; i < ancho; i++) {
      const gi = i0 + i - (mx - tx0) * lado, gj = j0 + j - (my - ty0) * lado;
      if (gi < 0 || gj < 0 || gi >= m.ancho || gj >= m.ancho) continue;
      valores[j * ancho + i] = m.valores[gj * m.ancho + gi];
    }
  }
  const validos = Array.from(valores).filter(Number.isFinite).sort((a, b) => a - b);
  if (!validos.length) return {url: null, coordenadas: null, rango: null, n: 0};
  const pct = q => validos[Math.min(validos.length - 1, Math.floor(q * validos.length))];
  let min = Math.floor(pct(.02)), max = Math.ceil(pct(.98));
  if (max - min < 2) { min -= 1; max += 1; }
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho; lienzo.height = alto;
  const ctx = lienzo.getContext('2d'), datos = ctx.createImageData(ancho, alto);
  valores.forEach((v, k) => {
    if (!Number.isFinite(v)) return;
    const [r, g, b] = colorPara((v - min) / (max - min));
    datos.data.set([r, g, b, 255], k * 4);
  });
  ctx.putImageData(datos, 0, 0);
  const esquina = (i, j) => aLonLat(tx0 + (i0 + i) / lado, ty0 + (j0 + j) / lado);
  return {
    url: lienzo.toDataURL('image/png'),
    coordenadas: [esquina(0, 0), esquina(ancho, 0), esquina(ancho, alto), esquina(0, alto)],
    rango: [min, max],
    n: validos.length
  };
}

function dentro(punto, anillo) {
  let si = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > punto[1]) !== (yj > punto[1]) && punto[0] < (xj - xi) * (punto[1] - yi) / (yj - yi) + xi) si = !si;
  }
  return si;
}
function dentroPoligono(punto, anillos) {
  return dentro(punto, anillos[0]) && !anillos.slice(1).some(h => dentro(punto, h));
}

/* Media de los píxeles cuyo centro cae dentro del polígono (Polygon o MultiPolygon) */
export async function mediaEn(fecha, geometria) {
  const poligonos = geometria.type === 'MultiPolygon' ? geometria.coordinates : [geometria.coordinates];
  let suma = 0, n = 0, total = 0;
  for (const anillos of poligonos) {
    const xs = anillos[0].map(p => p[0]), ys = anillos[0].map(p => p[1]);
    const [x0, y0] = aMosaico(Math.min(...xs), Math.max(...ys));
    const [x1, y1] = aMosaico(Math.max(...xs), Math.min(...ys));
    for (let mx = Math.floor(x0); mx <= Math.floor(x1); mx++) for (let my = Math.floor(y0); my <= Math.floor(y1); my++) {
      const m = await mosaico(fecha, mx, my);
      const a = m.ancho;
      const i0 = Math.max(0, Math.floor((x0 - mx) * a)), i1 = Math.min(a - 1, Math.floor((x1 - mx) * a));
      const j0 = Math.max(0, Math.floor((y0 - my) * a)), j1 = Math.min(a - 1, Math.floor((y1 - my) * a));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const centro = aLonLat(mx + (i + .5) / a, my + (j + .5) / a);
        if (!dentroPoligono(centro, anillos)) continue;
        total++;
        const v = m.valores[j * a + i];
        if (Number.isFinite(v)) { suma += v; n++; }
      }
    }
  }
  return {media: n ? suma / n : null, n, total};
}
