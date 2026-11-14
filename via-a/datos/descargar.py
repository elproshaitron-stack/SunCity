"""Descarga una vez los JSON de POWER de las ciudades de demostración.

La Vía A los usa como respaldo si la API no responde durante la demostración.
Corre en cualquier máquina con internet; solo usa la biblioteca estándar.

Uso:  python via-a/datos/descargar.py
"""
import json, pathlib, urllib.request

CIUDADES = {
    "hermosillo": (29.07, -110.97),
    # "segunda-ciudad": (lat, lon),  # la elige Emilio (DECISIONES.md, D12)
}
PARAMS = "T2M_MIN,T2M_MAX,T2M,TS,PRECTOTCORR"
URL = ("https://power.larc.nasa.gov/api/temporal/monthly/point?parameters={p}"
       "&community=AG&longitude={lon:.2f}&latitude={lat:.2f}&format=JSON&start=1981&end=2025")

aqui = pathlib.Path(__file__).resolve().parent
for nombre, (lat, lon) in CIUDADES.items():
    with urllib.request.urlopen(URL.format(p=PARAMS, lat=lat, lon=lon), timeout=60) as r:
        datos = json.load(r)
    faltan = set(PARAMS.split(",")) - set(datos["properties"]["parameter"])
    if faltan:
        raise SystemExit(f"{nombre}: POWER no trajo {faltan}")
    (aqui / f"{nombre}.json").write_text(json.dumps(datos))
    print(f"{nombre}.json guardado")
