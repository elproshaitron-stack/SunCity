"""Export de MODIS MOD11 desde NASA GIBS, con el mismo formato que el de Earth Engine.

Mientras no haya export de Earth Engine (pasos 1 a 4 de README.md), este script baja de NASA GIBS
los compuestos de 8 días de MOD11A2 (Terra) y MYD11A2 (Aqua), de día y de noche, para la temporada
de cada año, y escribe `suncity_lst.csv` y `suncity_extra.csv` en la carpeta del export. Después
`procesar.py` hace el cálculo de siempre sin cambios.

    python via-b/procesamiento/exportar_gibs.py                  # escribe en via-b/datos/reales/export/
    python via-b/procesamiento/procesar.py

Cómo se lee la temperatura: GIBS publica cada compuesto como mosaico PNG (nivel 7, píxeles de unos
1.1 km en Hermosillo) pintado con la paleta oficial `MODIS_Land_Surface_Temp.xml`. Cada color de la
paleta es un intervalo de 0.6 K, así que el color de un píxel da su temperatura con ±0.3 K. Si menos
del 99 % de los píxeles con dato coincide con la paleta, el script se detiene.

Diferencias con el export de Earth Engine (registradas en docs/DECISIONES.md, D18):
  - Sin MOD21: GIBS no lo publica. La variante mod21 y el rango MOD11-MOD21 quedan sin dato.
  - Sin filtro de bits de calidad (QC): GIBS pinta el valor de LST que trae el producto; los píxeles sin
    dato o con nubes ya vienen vacíos, pero no se aplica el filtro fino de D03 por error estimado.
  - Resolución de 0.6 K por la paleta, y píxeles reproyectados a Web Mercator.
  - Sin población ni NDVI: suncity_extra.csv lleva solo el área de cada polígono.
  - Sin Yale: no se escribe suncity_yale.csv y el ciclo diario va sin el signo de Yale.

Requiere Pillow, además de lo de requirements.txt.
"""
import argparse
import csv
import io
import json
import math
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

import numpy as np
from PIL import Image

AQUI = Path(__file__).resolve().parent
VIA_B = AQUI.parent
sys.path.insert(0, str(AQUI))
import parametros as P  # noqa: E402

GIBS = "https://gibs.earthdata.nasa.gov"
PALETA = f"{GIBS}/colormaps/v1.3/MODIS_Land_Surface_Temp.xml"
NIVEL = 7
AGENTE = "SunCity-procesamiento/1.0"

# producto del export → capa de GIBS, satélite, paso y primer año con datos
CAPAS = {
    "MOD11_Terra_noche": ("MODIS_Terra_L3_Land_Surface_Temp_8Day_Night", "Terra", "2230", 2001),
    "MOD11_Terra_dia":   ("MODIS_Terra_L3_Land_Surface_Temp_8Day_Day",   "Terra", "1030", 2001),
    "MOD11_Aqua_noche":  ("MODIS_Aqua_L3_Land_Surface_Temp_8Day_Night",  "Aqua",  "0130", 2003),
    "MOD11_Aqua_dia":    ("MODIS_Aqua_L3_Land_Surface_Temp_8Day_Day",    "Aqua",  "1330", 2003),
}


def bajar(url, intentos=4):
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if i == intentos - 1:
                raise
        except Exception:
            if i == intentos - 1:
                raise
        time.sleep(1.5 * (i + 1))


def paleta():
    """Color (r, g, b) → K, centro del intervalo de cada entrada de la paleta."""
    raiz = ET.fromstring(bajar(PALETA))
    mapa = {}
    for cm in raiz.iter("ColorMap"):
        if cm.get("title") != "Land Surface Temperature":
            continue
        for e in cm.iter("ColorMapEntry"):
            v = [float(x) for x in e.get("value").strip("[]()").split(",")]
            mapa[tuple(int(c) for c in e.get("rgb").split(","))] = (v[0] + v[1]) / 2
    if len(mapa) < 200:
        raise SystemExit(f"La paleta de GIBS trajo {len(mapa)} colores; se esperaban 252.")
    return mapa


def a_mosaico(lon, lat):
    n = 2 ** NIVEL
    r = math.radians(lat)
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n


def a_lonlat(tx, ty):
    n = 2 ** NIVEL
    return tx / n * 360 - 180, math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ty / n))))


def dentro(x, y, anillo):
    si = False
    j = len(anillo) - 1
    for i in range(len(anillo)):
        xi, yi = anillo[i]
        xj, yj = anillo[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            si = not si
        j = i
    return si


def pixeles_de(geom):
    """Lista de (mosaico_x, mosaico_y, i, j) cuyo centro cae dentro del polígono."""
    poligonos = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    salida = []
    for anillos in poligonos:
        xs = [p[0] for p in anillos[0]]
        ys = [p[1] for p in anillos[0]]
        x0, y0 = a_mosaico(min(xs), max(ys))
        x1, y1 = a_mosaico(max(xs), min(ys))
        for gx in range(math.floor(x0 * 256), math.floor(x1 * 256) + 1):
            for gy in range(math.floor(y0 * 256), math.floor(y1 * 256) + 1):
                lon, lat = a_lonlat((gx + .5) / 256, (gy + .5) / 256)
                if dentro(lon, lat, anillos[0]) and not any(dentro(lon, lat, h) for h in anillos[1:]):
                    salida.append((gx // 256, gy // 256, gx % 256, gy % 256))
    return salida


def area_km2(geom):
    """Área geodésica aproximada (fórmula esférica), en km²."""
    R = 6371.0088
    poligonos = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    total = 0.0
    for anillos in poligonos:
        for k, anillo in enumerate(anillos):
            s = 0.0
            for (l1, f1), (l2, f2) in zip(anillo, anillo[1:]):
                s += math.radians(l2 - l1) * (2 + math.sin(math.radians(f1)) + math.sin(math.radians(f2)))
            total += abs(s) * R * R / 2 * (1 if k == 0 else -1)
    return total


def compuestos(anio):
    """Inicio de cada compuesto de 8 días que empieza dentro de la temporada (D14)."""
    fechas = []
    for dia in range(1, 367, 8):
        f = date(anio, 1, 1) + timedelta(days=dia - 1)
        if f.year == anio and P.MES_INICIO <= f.month <= P.MES_FIN:
            fechas.append(f.isoformat())
    return fechas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--geojson", type=Path, default=VIA_B / "datos" / "prueba" / "sectores.geojson")
    ap.add_argument("--salida", type=Path, default=VIA_B / "datos" / "reales" / "export")
    ap.add_argument("--hilos", type=int, default=8)
    a = ap.parse_args()
    a.salida.mkdir(parents=True, exist_ok=True)

    geo = json.loads(a.geojson.read_text(encoding="utf-8"))
    poligonos = [(f["properties"]["id"], f["properties"]["tipo"], f["geometry"]) for f in geo["features"]]
    pix = {pid: pixeles_de(g) for pid, _, g in poligonos}
    mosaicos = sorted({(mx, my) for lista in pix.values() for mx, my, _, _ in lista})
    colores = paleta()
    por_clave = {(r << 16) | (g << 8) | b: v for (r, g, b), v in colores.items()}
    print(f"Paleta: {len(colores)} colores. Polígonos: {len(poligonos)}. Mosaicos de nivel {NIVEL}: {mosaicos}")

    trabajos = []
    for prod, (capa, _, _, desde) in CAPAS.items():
        for anio in range(max(P.ANIO_INICIO, desde), P.ANIO_FIN + 1):
            for f in compuestos(anio):
                for mx, my in mosaicos:
                    trabajos.append((prod, capa, anio, f, mx, my))

    coincidencia = [0, 0]

    def leer(t):
        prod, capa, anio, f, mx, my = t
        url = f"{GIBS}/wmts/epsg3857/best/{capa}/default/{f}/GoogleMapsCompatible_Level{NIVEL}/{NIVEL}/{my}/{mx}.png"
        datos = bajar(url)
        if datos is None:
            return t, None
        img = np.asarray(Image.open(io.BytesIO(datos)).convert("RGBA")).astype(np.int64)
        k = np.full(img.shape[:2], np.nan)
        opaco = img[..., 3] > 0
        claves = (img[..., 0] << 16) | (img[..., 1] << 8) | img[..., 2]
        unicas, inversa = np.unique(claves[opaco], return_inverse=True)
        valores = np.array([por_clave.get(int(u), np.nan) for u in unicas])
        k[opaco] = valores[inversa]
        return t, (k, int(opaco.sum()), int(np.isfinite(k).sum()))

    t0 = time.time()
    rejillas = {}
    with ThreadPoolExecutor(a.hilos) as ex:
        for n, (t, r) in enumerate(ex.map(leer, trabajos), 1):
            if r is not None:
                k, opacos, ok = r
                coincidencia[0] += ok
                coincidencia[1] += opacos
                rejillas[t] = k
            if n % 100 == 0 or n == len(trabajos):
                print(f"  {n}/{len(trabajos)} mosaicos ({time.time() - t0:.0f} s)")
    if coincidencia[1] == 0 or coincidencia[0] / coincidencia[1] < .99:
        raise SystemExit(f"Solo {coincidencia[0]} de {coincidencia[1]} píxeles coinciden con la paleta: se detiene.")
    print(f"Píxeles con dato que coinciden con la paleta: {coincidencia[0] / coincidencia[1]:.4%}")

    filas = []
    for prod, (capa, sat, paso, desde) in CAPAS.items():
        for anio in range(P.ANIO_INICIO, P.ANIO_FIN + 1):
            fechas = compuestos(anio) if anio >= desde else []
            for pid, tipo, _ in poligonos:
                # Por píxel: media de los compuestos válidos de la temporada (D02); luego media del polígono
                medias, obs = [], []
                for mx, my, i, j in pix[pid]:
                    vals = [rejillas[(prod, capa, anio, f, mx, my)][j, i] for f in fechas
                            if (prod, capa, anio, f, mx, my) in rejillas]
                    vals = [v for v in vals if np.isfinite(v)]
                    obs.append(len(vals))
                    if vals:
                        medias.append(float(np.mean(vals)))
                filas.append({
                    "poligono": pid, "tipo": tipo, "producto": prod, "algoritmo": "MOD11", "satelite": sat,
                    "paso": paso, "anio": anio,
                    "lst_k": round(float(np.mean(medias)), 4) if medias else "",
                    "pix_validos": len(medias), "pix_total": len(pix[pid]),
                    "obs_media": round(float(np.mean([o for o in obs if o])), 3) if medias else 0,
                    "n_imagenes": len([f for f in fechas if any((prod, capa, anio, f, mx, my) in rejillas for mx, my in mosaicos)]),
                })
    with open(a.salida / "suncity_lst.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    with open(a.salida / "suncity_extra.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["poligono", "tipo", "poblacion_2020", "ndvi_temporada", "area_km2"])
        for pid, tipo, g in poligonos:
            w.writerow([pid, tipo, "", "", round(area_km2(g), 3)])
    (a.salida / "origen.json").write_text(json.dumps({
        "fuente": "NASA GIBS, capas MODIS L3 Land Surface Temperature 8-Day (MOD11A2 y MYD11A2 v6.1)",
        "paleta": PALETA, "nivel_mosaico": NIVEL, "temporada_meses": [P.MES_INICIO, P.MES_FIN],
        "anios": [P.ANIO_INICIO, P.ANIO_FIN], "geojson": str(a.geojson.relative_to(VIA_B.parent)).replace("\\", "/"),
        "mosaicos_leidos": len(rejillas), "mosaicos_pedidos": len(trabajos),
        "coincidencia_paleta": round(coincidencia[0] / coincidencia[1], 6),
        "generado": date.today().isoformat(),
        "limites": ["sin MOD21", "sin filtro de bits QC (D03 solo por cobertura y observaciones)",
                    "resolución de 0.6 K por la paleta", "sin población, NDVI ni Yale"],
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Listo: {len(filas)} filas en {a.salida / 'suncity_lst.csv'}")


if __name__ == "__main__":
    main()
