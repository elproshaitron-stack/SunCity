"""Revisa un GeoJSON de sectores y referencias antes de procesarlo (C11).

Es lo primero que se corre cuando lleguen los polígonos reales (D15). Comprueba:
  - que sea una FeatureCollection con Polygon o MultiPolygon;
  - identificadores `id` presentes y únicos;
  - `tipo` igual a `sector` o `referencia`, con al menos un sector;
  - que existan las referencias `RA` y `RB` (con tipo `referencia`);
  - geometría válida: coordenadas finitas en rango, anillos cerrados de 4 puntos o más,
    sin autointersecciones (aristas que se cruzan o se tocan, o que regresan sobre sí);
  - área geodésica de cada sector de 9 km² o más (D15);
  - que ningún par de polígonos se traslape (compartir un borde no es traslape).

Código de salida: 0 si todo está bien; 1 con la lista de problemas.

Uso:  python via-b/procesamiento/revisar_poligonos.py [ARCHIVO.geojson]
      (sin argumento revisa via-b/datos/prueba/sectores.geojson)

Área: sobre el elipsoide WGS84, pasando cada latitud a su latitud autálica y sumando el
exceso esférico con la fórmula de Chamberlain y Duquette sobre la esfera autálica. A la escala
de un sector (unos 3 km) la diferencia con el área geodésica exacta es menor que 0.01 %.
Traslape: área planar de la intersección por franjas verticales, pasada a km² con la escala
local; se reporta si pasa de --tolerancia-km2 (0.001 km² por omisión, 1000 m²).
"""
import argparse
import json
import math
import sys
from pathlib import Path

AREA_MIN_KM2 = 9.0                       # D15: cada sector 9 km² o más
TIPOS = ("sector", "referencia")
REFERENCIAS = ("RA", "RB")              # parametros.REFERENCIA_PRINCIPAL y REFERENCIA_ALTERNA

# WGS84
A_KM = 6378.137
F = 1 / 298.257223563
E2 = F * (2 - F)
E = math.sqrt(E2)


def _q(sen):
    return (1 - E2) * (sen / (1 - E2 * sen * sen) - math.log((1 - E * sen) / (1 + E * sen)) / (2 * E))


QP = _q(1.0)
R_AUTALICO_KM = A_KM * math.sqrt(QP / 2)


def sen_autalica(lat):
    """Seno de la latitud autálica: conserva el área del elipsoide sobre una esfera."""
    return _q(math.sin(math.radians(lat))) / QP


def area_anillo_km2(anillo):
    s = 0.0
    for (l1, f1), (l2, f2) in zip(anillo, anillo[1:]):
        s += math.radians(l2 - l1) * (2 + sen_autalica(f1) + sen_autalica(f2))
    return abs(s) * R_AUTALICO_KM ** 2 / 2


def poligonos(geom):
    """Lista de polígonos; cada uno es una lista de anillos [(lon, lat), ...]."""
    partes = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [[[(float(p[0]), float(p[1])) for p in anillo] for anillo in partes_] for partes_ in partes]


def area_km2(geom):
    total = 0.0
    for anillos in poligonos(geom):
        total += area_anillo_km2(anillos[0]) - sum(area_anillo_km2(h) for h in anillos[1:])
    return total


# ---------------------------------------------------------------- geometría planar

def _orient(a, b, c):
    v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return (v > 0) - (v < 0)


def _sobre(a, b, c):
    """c está en el segmento ab, sabiendo que los tres son colineales."""
    return min(a[0], b[0]) <= c[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= c[1] <= max(a[1], b[1])


def se_tocan(p1, p2, q1, q2):
    o1, o2, o3, o4 = _orient(p1, p2, q1), _orient(p1, p2, q2), _orient(q1, q2, p1), _orient(q1, q2, p2)
    if o1 != o2 and o3 != o4 and 0 not in (o1, o2, o3, o4):
        return True
    return ((o1 == 0 and _sobre(p1, p2, q1)) or (o2 == 0 and _sobre(p1, p2, q2))
            or (o3 == 0 and _sobre(q1, q2, p1)) or (o4 == 0 and _sobre(q1, q2, p2)))


def sin_repetidos(anillo):
    salida = [anillo[0]]
    for p in anillo[1:]:
        if p != salida[-1]:
            salida.append(p)
    return salida


def autointersecciones(anillo):
    """Pares de aristas de un anillo cerrado que se cruzan o tocan fuera del vértice que comparten."""
    pts = sin_repetidos(anillo)
    aristas = list(zip(pts, pts[1:]))
    n = len(aristas)
    hallazgos = []
    for i in range(n):
        for j in range(i + 1, n):
            vecinas = j == i + 1 or (i == 0 and j == n - 1)
            (a, b), (c, d) = aristas[i], aristas[j]
            if vecinas:
                # Comparten un vértice; solo es error si una regresa sobre la otra.
                comun = b if j == i + 1 else a
                otra_i = a if comun == b else b
                otra_j = d if comun == c else c
                if (_orient(otra_i, comun, otra_j) == 0
                        and (otra_i[0] - comun[0]) * (otra_j[0] - comun[0])
                        + (otra_i[1] - comun[1]) * (otra_j[1] - comun[1]) > 0):
                    hallazgos.append((i, j))
            elif se_tocan(a, b, c, d):
                hallazgos.append((i, j))
    return hallazgos


def _cruce(p1, p2, q1, q2):
    """Abscisa del cruce propio de dos segmentos, o None."""
    d = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0])
    if d == 0:
        return None
    t = ((q1[0] - p1[0]) * (q2[1] - q1[1]) - (q1[1] - p1[1]) * (q2[0] - q1[0])) / d
    u = ((q1[0] - p1[0]) * (p2[1] - p1[1]) - (q1[1] - p1[1]) * (p2[0] - p1[0])) / d
    if 0 < t < 1 and 0 < u < 1:
        return p1[0] + t * (p2[0] - p1[0])
    return None


def _aristas(geom):
    return [(a, b) for anillos in poligonos(geom) for anillo in anillos for a, b in zip(anillo, anillo[1:])]


def _intervalos(aristas, x):
    """Tramos de la recta vertical x que quedan dentro (regla par-impar)."""
    ys = sorted(a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0])
                for a, b in aristas if min(a[0], b[0]) < x < max(a[0], b[0]))
    return list(zip(ys[0::2], ys[1::2]))


def _largo_comun(ia, ib):
    total, i, j = 0.0, 0, 0
    while i < len(ia) and j < len(ib):
        lo, hi = max(ia[i][0], ib[j][0]), min(ia[i][1], ib[j][1])
        if hi > lo:
            total += hi - lo
        if ia[i][1] < ib[j][1]:
            i += 1
        else:
            j += 1
    return total


def caja(geom):
    pts = [p for anillos in poligonos(geom) for anillo in anillos for p in anillo]
    return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))


def traslape_km2(ga, gb):
    """Área de la intersección de dos polígonos, en km² (escala local)."""
    ca, cb = caja(ga), caja(gb)
    x0, x1 = max(ca[0], cb[0]), min(ca[2], cb[2])
    y0, y1 = max(ca[1], cb[1]), min(ca[3], cb[3])
    if x1 <= x0 or y1 <= y0:
        return 0.0
    ea, eb = _aristas(ga), _aristas(gb)
    xs = {p[0] for a, b in ea + eb for p in (a, b)}
    for p1, p2 in ea:
        for q1, q2 in eb:
            x = _cruce(p1, p2, q1, q2)
            if x is not None:
                xs.add(x)
    xs = sorted(x for x in xs | {x0, x1} if x0 <= x <= x1)
    grados2 = 0.0
    for xa, xb in zip(xs, xs[1:]):
        if xb > xa:
            xm = (xa + xb) / 2
            # Dentro de una franja sin vértices ni cruces el largo común es lineal en x:
            # el punto medio da el área exacta del trapecio.
            grados2 += _largo_comun(_intervalos(ea, xm), _intervalos(eb, xm)) * (xb - xa)
    lat = math.radians((y0 + y1) / 2)
    km_por_grado = math.pi / 180 * R_AUTALICO_KM
    return grados2 * km_por_grado ** 2 * math.cos(lat)


# ---------------------------------------------------------------- revisión

def revisar_geometria(nombre, geom):
    problemas = []
    if not isinstance(geom, dict) or geom.get("type") not in ("Polygon", "MultiPolygon"):
        tipo = geom.get("type") if isinstance(geom, dict) else geom
        return [f"{nombre}: la geometría debe ser Polygon o MultiPolygon, no {tipo}"]
    try:
        partes = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        if not partes:
            return [f"{nombre}: geometría sin coordenadas"]
        for k, anillos in enumerate(partes):
            if not anillos:
                problemas.append(f"{nombre}: parte {k + 1} sin anillos")
            for h, anillo in enumerate(anillos):
                cual = f"{nombre}: {'anillo exterior' if h == 0 else f'hueco {h}'}" + (
                    f" de la parte {k + 1}" if len(partes) > 1 else "")
                pts = [(float(p[0]), float(p[1])) for p in anillo]
                if any(not (math.isfinite(x) and math.isfinite(y)) for x, y in pts):
                    problemas.append(f"{cual}: coordenadas no numéricas o infinitas")
                    continue
                if any(not (-180 <= x <= 180 and -90 <= y <= 90) for x, y in pts):
                    problemas.append(f"{cual}: coordenadas fuera de rango (¿latitud y longitud invertidas?)")
                    continue
                if len(pts) < 4:
                    problemas.append(f"{cual}: tiene {len(pts)} puntos; un anillo necesita 4 o más")
                    continue
                if pts[0] != pts[-1]:
                    problemas.append(f"{cual}: no está cerrado (el primer punto no es igual al último)")
                    continue
                if len(set(pts[:-1])) < 3:
                    problemas.append(f"{cual}: área nula")
                    continue
                cruces = autointersecciones(pts)
                if cruces:
                    i, j = cruces[0]
                    problemas.append(f"{cual}: se autointersecta ({len(cruces)} par(es) de aristas; "
                                     f"primero, aristas {i + 1} y {j + 1})")
                elif area_anillo_km2(pts) == 0:
                    problemas.append(f"{cual}: área nula")
    except (TypeError, ValueError, IndexError, KeyError) as error:
        problemas.append(f"{nombre}: coordenadas mal formadas ({error})")
    return problemas


def revisar(geo, tolerancia_km2=0.001):
    """Devuelve (problemas, filas) con filas = [(id, tipo, área km² o None)]."""
    if not isinstance(geo, dict) or geo.get("type") != "FeatureCollection" or not isinstance(geo.get("features"), list):
        return ["El archivo no es una FeatureCollection de GeoJSON"], []
    problemas, filas, validos, vistos = [], [], [], {}
    for n, f in enumerate(geo["features"], 1):
        props = (f or {}).get("properties") or {}
        pid, tipo = props.get("id"), props.get("tipo")
        nombre = f"{pid}" if isinstance(pid, str) and pid.strip() else f"polígono {n}"
        if not (isinstance(pid, str) and pid.strip()):
            problemas.append(f"polígono {n}: sin `id` (texto)")
        elif pid in vistos:
            problemas.append(f"{pid}: `id` repetido (polígonos {vistos[pid]} y {n})")
        else:
            vistos[pid] = n
        if tipo not in TIPOS:
            problemas.append(f"{nombre}: `tipo` es {tipo!r}; debe ser 'sector' o 'referencia'")
        errores = revisar_geometria(nombre, (f or {}).get("geometry"))
        problemas += errores
        area = None
        if not errores:
            area = area_km2(f["geometry"])
            validos.append((nombre, f["geometry"]))
            if tipo == "sector" and area < AREA_MIN_KM2:
                problemas.append(f"{nombre}: área {area:.2f} km², menor que {AREA_MIN_KM2:g} km² (D15)")
        filas.append((nombre, tipo, area))
    tipos = {(f.get("properties") or {}).get("id"): (f.get("properties") or {}).get("tipo")
             for f in geo["features"] if isinstance(f, dict)}
    if not any(t == "sector" for t in tipos.values()):
        problemas.append("No hay ningún polígono con tipo 'sector'")
    for ref in REFERENCIAS:
        if ref not in tipos:
            problemas.append(f"Falta la referencia {ref}")
        elif tipos[ref] != "referencia":
            problemas.append(f"{ref}: debe tener tipo 'referencia', no {tipos[ref]!r}")
    for i in range(len(validos)):
        for j in range(i + 1, len(validos)):
            km2 = traslape_km2(validos[i][1], validos[j][1])
            if km2 > tolerancia_km2:
                problemas.append(f"{validos[i][0]} y {validos[j][0]} se traslapan en {km2:.3f} km²")
    return problemas, filas


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("geojson", type=Path, nargs="?",
                    default=Path(__file__).resolve().parents[1] / "datos" / "prueba" / "sectores.geojson")
    ap.add_argument("--tolerancia-km2", type=float, default=0.001,
                    help="traslape máximo que se ignora, en km² (por omisión 0.001)")
    a = ap.parse_args(argv)
    try:
        geo = json.loads(a.geojson.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as error:
        print(f"No se pudo leer {a.geojson}: {error}")
        return 1
    problemas, filas = revisar(geo, a.tolerancia_km2)
    print(f"{a.geojson}: {len(filas)} polígonos")
    for pid, tipo, area in filas:
        print(f"  {pid:<12} {str(tipo):<11} {'—' if area is None else f'{area:8.2f} km²'}")
    if problemas:
        print(f"{len(problemas)} problema(s):")
        for p in problemas:
            print("  -", p)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
