// ESQUEMA PROVISIONAL: reemplazar con las columnas de v4
// JSON dentro del módulo para que Python y el navegador lean la misma definición.
export const ESQUEMA = {
  "serie": {"sector": "sector_id", "anio": "anio", "valor": "delta_c"},
  "resultados": {"sector": "sector_id", "variante": "variante", "n_anios": "n_anios", "pendiente_c_decada": "pendiente_c_decada", "ic95_inf": "ic95_inf", "ic95_sup": "ic95_sup", "p_mk": "p_mk", "p_hamed_rao": "p_hamed_rao", "p": "p", "p_fdr": "p_fdr"},
  "ciclo_diario": {"sector": "sector_id", "paso": "paso", "producto": "producto", "valor": "delta_c", "yale_signo": "yale_signo"},
  "nivel": {"sector": "sector_id", "producto": "producto", "nivel_c": "nivel_c"},
  "variantes": ["primario", "con_deriva", "aqua", "ref_b", "mod21", "sin_2001_2002"]
};
