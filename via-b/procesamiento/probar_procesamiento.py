"""Prueba de punta a punta con un export simulado: simular_export.py -> procesar.py.

También corre la prueba de revisar_poligonos.py (C11), la de la pendiente mínima detectable con una
serie sintética de ruido conocido (C14) y revisa metadatos.json (C12).

Uso:  python via-b/procesamiento/probar_procesamiento.py
"""
import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from potencia import Simulador, pendiente_minima, ruido_theil_sen  # noqa: E402


def correr(*args):
    r = subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout


def probar_potencia():
    import numpy as np
    # Ruido conocido: la desviación de los residuos de Theil-Sen recupera la del ruido gaussiano.
    rng = np.random.default_rng(7)
    anios = np.arange(1, 2001)
    serie = 0.004 * anios + rng.normal(0, 0.25, len(anios))
    assert abs(ruido_theil_sen(anios, serie) - 0.25) < 0.01
    # Una recta exacta no tiene ruido y un hueco (NaN) no cuenta.
    assert ruido_theil_sen([1, 2, 3, 4], [0.0, 0.1, float("nan"), 0.3]) < 1e-9
    # Tabla de 05-MODELOS.md (5.6), ruido 0.25, 19 años: 70 % con p < 0.05 y 39 % con el FDR estricto.
    sim = Simulador(range(2001, 2020))
    assert abs(sim.potencia(0.3, 0.25, 0.05) - 0.70) < 0.02
    assert abs(sim.potencia(0.3, 0.25, 0.05 / 6) - 0.39) < 0.02
    # La pendiente mínima detectable da 80 % de potencia, crece con el ruido y es reproducible.
    mde = pendiente_minima(range(2001, 2020), 0.25, 0.05 / 6)
    assert 0.40 < mde < 0.48, mde
    assert abs(sim.potencia(mde, 0.25, 0.05 / 6) - 0.8) < 0.01
    assert pendiente_minima(range(2001, 2020), 0.25, 0.05 / 6) == mde
    assert pendiente_minima(range(2001, 2020), 0.40, 0.05 / 6) > mde
    assert pendiente_minima(range(2003, 2020), 0.25, 0.05 / 6) > mde  # menos años, más difícil


def main():
    probar_potencia()
    correr(AQUI / "probar_poligonos.py")
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        correr(AQUI / "simular_export.py", tmp / "export", "--huecos")
        correr(AQUI / "procesar.py", "--export", tmp / "export", "--salida", tmp / "salida")
        s = tmp / "salida"
        for nombre in ("serie.csv", "resultados.csv", "ciclo_diario.csv", "nivel.csv", "sectores.geojson", "yale.csv", "aire.csv",
                       "resumen.json", "nombres.json", "metadatos.json"):
            assert (s / nombre).exists(), f"falta {nombre}"
        correr(AQUI.parent / "datos" / "validar.py", s)
        res = list(csv.DictReader(open(s / "resultados.csv", encoding="utf-8")))
        assert len(res) == 6 * 6, len(res)
        assert {r["variante"] for r in res} == {"primario", "con_deriva", "aqua", "ref_b", "mod21", "sin_2001_2002"}
        s05 = [r for r in res if r["sector_id"] == "S05" and r["variante"] == "primario"][0]
        assert s05["pendiente_c_decada"] == "" and s05["p_fdr"] == "", "S05 con huecos debe quedar sin cálculo"
        ciclo = list(csv.DictReader(open(s / "ciclo_diario.csv", encoding="utf-8")))
        assert list(ciclo[0]) == ["sector_id", "paso", "producto", "delta_c", "yale_signo"], list(ciclo[0])
        assert {c["paso"] for c in ciclo} == {"terra_1030", "aqua_1330", "terra_2230", "aqua_0130"}
        dia = [float(c["delta_c"]) for c in ciclo if c["paso"] in ("terra_1030", "aqua_1330")]
        noche = [float(c["delta_c"]) for c in ciclo if c["paso"] in ("terra_2230", "aqua_0130")]
        assert max(dia) < 0 < min(noche), "la simulación tiene oasis de día e isla de noche"
        assert all(c["yale_signo"] in ("+", "-") for c in ciclo if c["paso"] in ("terra_1030", "aqua_1330"))
        assert all(c["yale_signo"] == "" for c in ciclo if c["paso"] in ("terra_2230", "aqua_0130"))
        geo = json.load(open(s / "sectores.geojson", encoding="utf-8"))
        s01 = [f["properties"] for f in geo["features"] if f["properties"]["id"] == "S01"][0]
        # MOD21 llega sin escalar en la simulación: si la detección falla, el nivel sale en cientos de grados
        assert 0 < s01["nivel_mod21_c"] < 5 and 0 < s01["nivel_mod11_c"] < 5, s01
        resumen = json.load(open(s / "resumen.json", encoding="utf-8"))
        assert resumen["aire"]["n_anios"] == 19
        # C14: pendiente mínima detectable en cada sector con cálculo; S05 (con huecos) queda sin ella.
        prim = {r["sector"]: r for r in resumen["primario"]}
        assert prim["S05"]["pendiente_min_detectable_c_decada"] is None
        con_calculo = [r for r in prim.values() if r["pendiente_c_decada"] != ""]
        assert len(con_calculo) >= 3, prim
        for r in prim.values():
            if r["pendiente_c_decada"] == "":
                assert r["pendiente_min_detectable_c_decada"] is None, r
            else:
                assert r["ruido_c"] > 0 and r["pendiente_min_detectable_c_decada"] > 0, r
        m = resumen["potencia"]["sectores_en_fdr"]
        assert m == len(con_calculo) and abs(resumen["potencia"]["alfa_fdr_mas_estricto"] - 0.05 / m) < 1e-12
        # C12: metadatos con fechas ISO 8601 y completitud por producto
        from datetime import datetime
        meta = json.load(open(s / "metadatos.json", encoding="utf-8"))
        for clave in ("fuente", "productos", "version", "fechas", "completitud"):
            assert meta[clave], clave
        datetime.fromisoformat(meta["fechas"]["generado"])
        datetime.fromisoformat(meta["fechas"]["periodo_desde"])
        terra = meta["completitud"]["por_producto"]["MOD11_Terra_noche"]["poligono_anios"]
        assert terra["validos"] + terra["descartados"] == 8 * 25 and terra["descartados"] > 0, terra
        assert sum(terra["motivos_de_descarte"].values()) == terra["descartados"]
    print("Procesamiento de la Vía B: todas las comprobaciones pasaron.")


if __name__ == "__main__":
    main()
