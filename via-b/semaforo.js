// regla provisional, la real está en v4 / DECISIONES.md
export function semaforo(resultado) {
  if (resultado.p_fdr < 0.05 && resultado.pendiente_c_decada > 0) return 'rojo';
  if (resultado.p_fdr < 0.05 && resultado.pendiente_c_decada < 0) return 'azul';
  return 'gris';
}
