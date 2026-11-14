"""Prueba de punta a punta con un export simulado: simular_export.py -> procesar.py.

Uso:  python via-b/procesamiento/probar_procesamiento.py
"""
import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent


def correr(*args):
    r = subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout


def main():
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        correr(AQUI / "simular_export.py", tmp / "export", "--huecos")
        correr(AQUI / "procesar.py", "--export", tmp / "export", "--salida", tmp / "salida")
        s = tmp / "salida"
        for nombre in ("serie.csv", "resultados.csv", "ciclo_diario.csv", "sectores.geojson", "yale.csv", "aire.csv",
                       "resumen.json", "nombres.json"):
            assert (s / nombre).exists(), f"falta {nombre}"
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
    print("Procesamiento de la Vía B: todas las comprobaciones pasaron.")


if __name__ == "__main__":
    main()
