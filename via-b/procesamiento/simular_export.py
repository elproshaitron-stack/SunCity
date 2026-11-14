"""Export SIMULADO de Earth Engine, con las columnas exactas de exportar_ee.js.

Solo sirve para probar procesar.py y la interfaz sin cuenta de Earth Engine.
No son datos: nunca copiar la salida a via-b/datos/reales/.

Uso:  python via-b/procesamiento/simular_export.py SALIDA [--huecos]
  --huecos  deja a S05 sin años suficientes para probar el caso límite
"""
import csv
import json
import sys
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import parametros as P  # noqa: E402

PRODUCTOS = [("MOD11_Terra_dia", "MOD11", "Terra", "10:30"), ("MOD11_Terra_noche", "MOD11", "Terra", "22:30"),
             ("MOD11_Aqua_dia", "MOD11", "Aqua", "13:30"), ("MOD11_Aqua_noche", "MOD11", "Aqua", "01:30"),
             ("MOD21_Terra_dia", "MOD21", "Terra", "10:30"), ("MOD21_Terra_noche", "MOD21", "Terra", "22:30"),
             ("MOD21_Aqua_dia", "MOD21", "Aqua", "13:30"), ("MOD21_Aqua_noche", "MOD21", "Aqua", "01:30")]


def main():
    salida = Path(sys.argv[1]); salida.mkdir(parents=True, exist_ok=True)
    huecos = "--huecos" in sys.argv
    geo = json.loads((AQUI.parent / "datos" / "prueba" / "sectores.geojson").read_text(encoding="utf-8"))
    pols = [(f["properties"]["id"], f["properties"]["tipo"]) for f in geo["features"]]
    rng = np.random.default_rng(14)
    tendencia = {"S01": .06, "S02": 0, "S03": -.03, "S04": .02, "S05": .01, "S06": .045}
    filas = []
    for prod, alg, sat, paso in PRODUCTOS:
        noche = paso in ("22:30", "01:30")
        base = 300.5 if noche else 323.0
        for pid, tipo in pols:
            for anio in range(P.ANIO_INICIO, P.ANIO_FIN + 1):
                sin_dato = sat == "Aqua" and anio < 2002
                k = base + 0.02 * (anio - 2001) + rng.normal(0, .35)
                if tipo == "sector":
                    # de noche la ciudad es más caliente; de día, más fresca (oasis)
                    k += (1.4 + tendencia[pid] * (anio - 2001)) if noche else -0.8
                if pid == "RB":
                    k += 0.3
                if alg == "MOD21":
                    k = k - 0.6  # MOD21 algo más frío que MOD11
                    k = k / 0.02  # llega sin escalar para probar la detección
                validos = 9
                if rng.random() < .06 or (huecos and pid == "S05" and anio % 3):
                    validos = 3  # monzón: poca cobertura
                obs = 0 if sin_dato else (6.5 if alg == "MOD11" else 31.0)
                filas.append({"poligono": pid, "tipo": tipo, "producto": prod, "algoritmo": alg, "satelite": sat,
                              "paso": paso, "anio": anio, "lst_k": "" if sin_dato else round(k, 4),
                              "pix_validos": 0 if sin_dato else validos, "pix_total": 9,
                              "obs_media": obs, "n_imagenes": 0 if sin_dato else (12 if alg == "MOD11" else 92)})
    with open(salida / "suncity_lst.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0])); w.writeheader(); w.writerows(filas)

    with open(salida / "suncity_yale.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["poligono", "tipo", "anio", "yale_dia_c", "yale_noche_c"])
        for pid, tipo in pols:
            for anio in range(2003, 2019):
                w.writerow([pid, tipo, anio, round(-0.7 + rng.normal(0, .3), 3) if tipo == "sector" else "",
                            round(1.2 + rng.normal(0, .3), 3) if tipo == "sector" else ""])

    with open(salida / "suncity_extra.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["poligono", "tipo", "poblacion_2020", "ndvi_temporada", "area_km2"])
        for pid, tipo in pols:
            w.writerow([pid, tipo, 0 if tipo == "referencia" else round(rng.uniform(15000, 40000), 1),
                        round(rng.uniform(.08, .14) if tipo == "referencia" else rng.uniform(.15, .3), 4), 9.61])
    print(f"Export simulado en {salida}")


if __name__ == "__main__":
    main()
