"""Función de referencia de tendencia (Plan v5, sección 3).

Recibe una serie anual y devuelve pendiente Theil-Sen por década,
intervalo del 95 % y valor p de Mann-Kendall. No contiene resultados reales.

Uso rápido:  python compartido/tendencia.py
"""
import numpy as np
from scipy.stats import theilslopes
import pymannkendall as mk
from statsmodels.stats.multitest import multipletests


def tendencia(anios, delta, min_anios=15):
    """min_anios=15 es un marcador: el mínimo real se fija en docs/DECISIONES.md."""
    a = np.asarray(anios, float); d = np.asarray(delta, float)
    ok = ~np.isnan(d); a, d = a[ok], d[ok]
    n = len(d)
    if n < min_anios:
        return dict(n_anios=n, pendiente_c_decada=np.nan, ic95_inf=np.nan,
                    ic95_sup=np.nan, p_mk=np.nan, p_hamed_rao=np.nan, p=np.nan,
                    hamed_rao_valido=False)
    pend, _, lo, hi = theilslopes(d, a, alpha=0.95)
    p_mk = mk.original_test(d).p
    with np.errstate(invalid="ignore"):
        p_hr = mk.hamed_rao_modification_test(d).p
    # D13: Hamed-Rao puede dar varianza negativa y p = NaN; max(p_mk, nan) lo ocultaría
    hr_ok = bool(np.isfinite(p_hr))
    return dict(n_anios=n, pendiente_c_decada=pend*10, ic95_inf=lo*10,
                ic95_sup=hi*10, p_mk=p_mk, p_hamed_rao=p_hr,
                p=max(p_mk, p_hr) if hr_ok else p_mk, hamed_rao_valido=hr_ok)


def ajustar_fdr(ps):
    return multipletests(ps, alpha=0.05, method="fdr_bh")[1]


if __name__ == "__main__":
    # Serie INVENTADA: 0.3 °C por década más ruido de 0.25 °C. No es un resultado.
    rng = np.random.default_rng(0)
    anios = np.arange(2001, 2020)
    delta = 0.03 * (anios - 2001) + rng.normal(0, 0.25, len(anios))
    r = tendencia(anios, delta)
    for k, v in r.items():
        print(f"{k:20s} {v:.4f}" if isinstance(v, float) else f"{k:20s} {v}")
    print("FDR de ejemplo:", ajustar_fdr([r["p"], 0.20, 0.50]).round(4))
