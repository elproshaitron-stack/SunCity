"""Genera casos de prueba para comparar tendencia.js contra Python.

Usa la función de referencia del proyecto (compartido/tendencia.py) para la
pendiente y el intervalo, y pymannkendall.original_test para el p de la Vía A.

Uso:  python via-a/pruebas/generar_casos.py   (escribe via-a/pruebas/casos.json)
"""
import json, pathlib, sys
import numpy as np
import pymannkendall as mk

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parents[1] / "compartido"))
from tendencia import tendencia  # noqa: E402


def caso(nombre, anios, valores):
    r = tendencia(anios, valores, min_anios=3)
    d = np.asarray(valores, float)
    p_mk = float(mk.original_test(d[~np.isnan(d)]).p)
    f = lambda v: None if (v is None or np.isnan(v)) else float(v)
    return {"nombre": nombre, "anios": [int(a) for a in anios],
            "valores": [None if np.isnan(v) else float(v) for v in d],
            "esperado": {"n_anios": int(r["n_anios"]),
                         "pendiente_c_decada": f(r["pendiente_c_decada"]),
                         "ic95_inf": f(r["ic95_inf"]), "ic95_sup": f(r["ic95_sup"]),
                         "p_mk": p_mk}}


def main():
    casos = []
    # 1. Series reales de Hermosillo descargadas de POWER
    reales = json.loads((AQUI / "hermosillo_power_1981_2025.json").read_text())
    for var in ["T2M_MIN", "T2M_MAX", "T2M", "TS", "PRECTOTCORR"]:
        for temp in ["anual", "julio", "enero"]:
            casos.append(caso(f"Hermosillo {var} {temp}", reales["anios"], reales[var][temp]))

    # 2. Series sintéticas: tamaños del proyecto, tendencias de ambos signos, ruido variado
    rng = np.random.default_rng(2026)
    for n, a0 in [(17, 2003), (19, 2001), (25, 2001), (45, 1981)]:
        for k in range(25):
            anios = np.arange(a0, a0 + n)
            pend = rng.choice([-0.08, -0.03, 0, 0.01, 0.03, 0.05, 0.08])
            ruido = rng.choice([0.15, 0.25, 0.4, 1.0])
            y = pend * (anios - a0) + rng.normal(0, ruido, n)
            casos.append(caso(f"sintetica n={n} #{k}", anios, np.round(y, 3)))

    # 3. Casos difíciles: empates, redondeo a dos decimales, años faltantes
    anios = np.arange(2001, 2020)
    casos.append(caso("empates en y", anios, np.round(rng.normal(0, 0.3, 19), 1)))
    casos.append(caso("valores repetidos", anios, [1.0] * 6 + [2.0] * 7 + [3.0] * 6))
    y = 0.03 * (anios - 2001) + rng.normal(0, 0.25, 19); y[[3, 10]] = np.nan
    casos.append(caso("con NaN", anios, y))
    casos.append(caso("serie constante salvo uno", anios, [5.0] * 18 + [5.5]))

    (AQUI / "casos.json").write_text(json.dumps(casos, indent=1))
    print(f"{len(casos)} casos escritos en {AQUI / 'casos.json'}")


if __name__ == "__main__":
    main()
