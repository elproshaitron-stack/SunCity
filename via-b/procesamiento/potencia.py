"""Pendiente mínima detectable de una serie, con su ruido real (C14, método de 05-MODELOS.md, 5.6).

1. Ruido: desviación estándar de los residuos de la recta de Theil-Sen de la serie (n − 2 grados de libertad).
2. Simulación: series con los mismos años válidos, tendencia b y ruido gaussiano sin autocorrelación de esa
   desviación. Semilla fija y los mismos números aleatorios para cada b, así la potencia crece con b.
3. Potencia(b): fracción de series en que Mann-Kendall (sin empates ni corrección por autocorrelación)
   da p < alfa con el signo de b. Con el umbral FDR más estricto, alfa = 0.05 / m: el valor que debe pasar
   el p más chico de m sectores para que Benjamini-Hochberg lo declare significativo.
4. Pendiente mínima detectable: la b más chica con potencia de al menos el objetivo (80 %), por bisección.

Es una cota optimista: el semáforo usa p = máx(Mann-Kendall, Hamed-Rao) y pide además que el IC 95 %
no cruce cero (D16), y el ruido real puede tener autocorrelación.

Uso:  python via-b/procesamiento/potencia.py   (tabla de comprobación contra 05-MODELOS.md)
"""
import math

import numpy as np
from scipy.stats import norm, theilslopes


def ruido_theil_sen(anios, delta):
    """Desviación estándar de los residuos de Theil-Sen, en las unidades de delta (°C)."""
    a = np.asarray(anios, float)
    d = np.asarray(delta, float)
    ok = ~np.isnan(d)
    a, d = a[ok], d[ok]
    if len(d) < 3:
        return math.nan
    pend, intercepto, _, _ = theilslopes(d, a)
    return float(np.std(d - (intercepto + pend * a), ddof=2))


class Simulador:
    """Prepara el ruido una vez para unos años y una semilla; luego evalúa la potencia de cada pendiente."""

    def __init__(self, anios, n_sim=20000, semilla=2026):
        self.t = np.asarray(sorted(anios), float)
        n = len(self.t)
        self.i, self.j = np.triu_indices(n, k=1)
        self.ruido = np.random.default_rng(semilla).standard_normal((n_sim, n)).astype(np.float32)
        self.n_pares = len(self.i)
        self.desv_s = math.sqrt(n * (n - 1) * (2 * n + 5) / 18)

    def potencia(self, pendiente_c_decada, sigma, alfa):
        x = (np.float32(pendiente_c_decada / 10) * (self.t - self.t[0]).astype(np.float32)
             + np.float32(sigma) * self.ruido)
        # Ruido continuo: sin empates, S = suben − bajan = 2 · suben − pares
        s = 2 * np.count_nonzero(x[:, self.j] > x[:, self.i], axis=1) - self.n_pares
        z = (s - np.sign(s)) / self.desv_s
        p = 2 * norm.sf(np.abs(z))
        signo = 1 if pendiente_c_decada >= 0 else -1
        return float(np.mean((p < alfa) & (np.sign(s) == signo)))


def pendiente_minima(anios, sigma, alfa, objetivo=0.8, n_sim=20000, semilla=2026, precision=0.001):
    """Pendiente más chica (°C/década, positiva) que se detecta con potencia >= objetivo."""
    if not (math.isfinite(sigma) and sigma > 0) or len(anios) < 3:
        return math.nan
    sim = Simulador(anios, n_sim, semilla)
    lo, hi = 0.0, max(0.1, sigma)
    while sim.potencia(hi, sigma, alfa) < objetivo:
        lo, hi = hi, hi * 2
        if hi > 1000 * sigma:
            return math.nan
    while hi - lo > precision:
        medio = (lo + hi) / 2
        if sim.potencia(medio, sigma, alfa) >= objetivo:
            hi = medio
        else:
            lo = medio
    return hi


if __name__ == "__main__":
    anios = range(2001, 2020)
    sim = Simulador(anios)
    print("Potencia con p < 0.05, 19 años (compárese con 05-MODELOS.md, 5.6):")
    print("ruido   " + "  ".join(f"{b:>5}" for b in (0.1, 0.2, 0.3, 0.5, 0.8)))
    for sigma in (0.15, 0.25, 0.40):
        print(f"{sigma:.2f}    " + "  ".join(f"{sim.potencia(b, sigma, 0.05):5.0%}" for b in (0.1, 0.2, 0.3, 0.5, 0.8)))
    print(f"0.3 °C/década con ruido 0.25 y FDR estricto (0.05/6): {sim.potencia(0.3, 0.25, 0.05 / 6):.0%}")
    print(f"Pendiente mínima detectable, ruido 0.25, 0.05/6, 80 %: {pendiente_minima(anios, 0.25, 0.05 / 6):.3f} °C/década")
