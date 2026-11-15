// D16: solo el resultado primario determina el color (D01).
export function semaforo(resultado) {
  if (!resultado || !Number.isFinite(resultado.p_fdr) || resultado.p_fdr >= 0.05) return 'gris';
  if (resultado.pendiente_c_decada > 0 && resultado.ic95_inf > 0 && resultado.ic95_sup > 0) return 'rojo';
  if (resultado.pendiente_c_decada < 0 && resultado.ic95_inf < 0 && resultado.ic95_sup < 0) return 'azul';
  return 'gris';
}
