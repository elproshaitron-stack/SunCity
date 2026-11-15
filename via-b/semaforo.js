// D16: solo el resultado primario determina el color (D01).
export function semaforo(resultado) {
  if (!resultado || !Number.isFinite(resultado.p_fdr) || resultado.p_fdr >= 0.05) return 'gris';
  if (resultado.pendiente_c_decada > 0 && resultado.ic95_inf > 0 && resultado.ic95_sup > 0) return 'rojo';
  if (resultado.pendiente_c_decada < 0 && resultado.ic95_inf < 0 && resultado.ic95_sup < 0) return 'azul';
  return 'gris';
}

// Estado que ve la persona: el semáforo más el caso sin cálculo (menos años válidos que el mínimo).
// Cada estado tiene insignia, trama en el mapa y texto; el color nunca va solo.
export const ESTADOS = {
  sube: {insignia:'sc-insignia--sube', texto:'Aumenta', largo:'Aumento significativo'},
  baja: {insignia:'sc-insignia--baja', texto:'Disminuye', largo:'Descenso significativo'},
  neutro: {insignia:'sc-insignia--neutro', texto:'Sin evidencia suficiente', largo:'Evidencia insuficiente'},
  'sin-calculo': {insignia:'sc-insignia--sin-calculo', texto:'Sin cálculo', largo:'Sin cálculo de tendencia'}
};

export function estadoSector(resultado) {
  if (!resultado || !Number.isFinite(resultado.pendiente_c_decada)) return 'sin-calculo';
  return {rojo:'sube', azul:'baja', gris:'neutro'}[semaforo(resultado)];
}

export function insignia(estado) {
  const span = document.createElement('span');
  span.className = `sc-insignia ${ESTADOS[estado].insignia}`;
  span.textContent = ESTADOS[estado].texto;
  return span;
}
