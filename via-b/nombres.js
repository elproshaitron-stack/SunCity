const CLAVE = 'suncity.via-b.nombres.v1';
const ROSA = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];

export function nombresPersonalizados() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : {};
  } catch { return {}; }
}

export function guardarNombre(id, nombre) {
  try {
    const datos = nombresPersonalizados();
    if (nombre?.trim()) datos[id] = nombre.trim(); else delete datos[id];
    localStorage.setItem(CLAVE, JSON.stringify(datos));
    return true;
  } catch { return false; }
}

function centroide(sector) {
  const anillo = sector.geometry.coordinates[0];
  let area = 0, x = 0, y = 0;
  for (let i = 0; i < anillo.length - 1; i++) {
    const [x1, y1] = anillo[i], [x2, y2] = anillo[i + 1];
    const cruz = x1 * y2 - x2 * y1;
    area += cruz; x += (x1 + x2) * cruz; y += (y1 + y2) * cruz;
  }
  if (Math.abs(area) < 1e-10) {
    const puntos = anillo.slice(0, -1);
    return [puntos.reduce((s, p) => s + p[1], 0) / puntos.length, puntos.reduce((s, p) => s + p[0], 0) / puntos.length];
  }
  return [y / (3 * area), x / (3 * area)];
}

function ubicacion(sector, config) {
  const [lat, lon] = centroide(sector), [lat0, lon0] = config.centro;
  const norte = (lat - lat0) * 111.195;
  const este = (lon - lon0) * 111.195 * Math.cos((lat + lat0) * Math.PI / 360);
  const distancia = Math.hypot(norte, este);
  if (distancia < config.radio_centro_km) return {base:`${config.ciudad} Centro`, distancia};
  const rumbo = (Math.atan2(este, norte) * 180 / Math.PI + 360) % 360;
  return {base:`${config.ciudad} ${ROSA[Math.floor((rumbo + 22.5) / 45) % 8]}`, distancia};
}

export function nombreSector(sector, todos, config) {
  const id = sector.properties.id;
  const propio = nombresPersonalizados()[id];
  if (typeof propio === 'string' && propio.trim()) return {nombre:propio.trim(), origen:'Nombre personalizado'};
  const oficial = config.sectores?.[id];
  if (typeof oficial === 'string' && oficial.trim()) return {nombre:oficial.trim(), origen:'Nombre oficial'};
  const actual = ubicacion(sector, config);
  const iguales = todos.filter(f => f.properties.tipo === 'sector')
    .map(f => ({id:f.properties.id, ...ubicacion(f, config)}))
    .filter(f => f.base === actual.base)
    .sort((a, b) => a.distancia - b.distancia || a.id.localeCompare(b.id));
  const numero = iguales.length > 1 ? ` ${iguales.findIndex(f => f.id === id) + 1}` : '';
  return {nombre:actual.base + numero, origen:'Nombre automático por ubicación'};
}
