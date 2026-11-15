"""Prueba de revisar_poligonos.py con el GeoJSON de prueba y con casos rotos armados aquí.

Uso:  python via-b/procesamiento/probar_poligonos.py
"""
import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from revisar_poligonos import area_km2, revisar, traslape_km2  # noqa: E402

PRUEBA = AQUI.parent / "datos" / "prueba" / "sectores.geojson"


def cuadro(lon, lat, lado_lon=0.032, lado_lat=0.028):
    return {"type": "Polygon", "coordinates": [[[lon, lat], [lon + lado_lon, lat], [lon + lado_lon, lat + lado_lat],
                                                [lon, lat + lado_lat], [lon, lat]]]}


def rasgo(pid, tipo, geom):
    return {"type": "Feature", "properties": {"id": pid, "tipo": tipo}, "geometry": geom}


def base():
    return {"type": "FeatureCollection", "features": [
        rasgo("S01", "sector", cuadro(-111.015, 29.028)),
        rasgo("S02", "sector", cuadro(-110.983, 29.028)),        # comparte borde con S01
        rasgo("RA", "referencia", cuadro(-111.17, 29.01, 0.035, 0.03)),
        rasgo("RB", "referencia", cuadro(-111.17, 29.10, 0.035, 0.03)),
    ]}


def con(cambio):
    geo = base()
    cambio(geo["features"])
    return geo


def espera(geo, *fragmentos):
    problemas, _ = revisar(geo)
    for frag in fragmentos:
        assert any(frag in p for p in problemas), f"se esperaba {frag!r} en {problemas}"
    return problemas


def main():
    # El archivo de prueba y la base armada pasan sin problemas, aunque haya bordes compartidos.
    problemas, filas = revisar(json.loads(PRUEBA.read_text(encoding="utf-8")))
    assert problemas == [], problemas
    assert len(filas) == 8 and all(9 <= a < 12 for _, _, a in filas), filas
    assert revisar(base())[0] == []

    # Área geodésica: un cuadro de 0.1° en el ecuador mide 11.132 × 11.057 = 123.09 km² en WGS84.
    a = area_km2(cuadro(0, 0, 0.1, 0.1))
    assert abs(a - 123.09) < 0.05, a
    # Un hueco resta área.
    con_hueco = cuadro(0, 0, 0.1, 0.1)
    con_hueco["coordinates"].append([[0.02, 0.02], [0.02, 0.04], [0.04, 0.04], [0.04, 0.02], [0.02, 0.02]])
    assert abs(area_km2(con_hueco) - a * 0.96) < 0.05

    # Identificadores
    espera(con(lambda f: f[1]["properties"].update(id="S01")), "`id` repetido")
    espera(con(lambda f: f[1]["properties"].pop("id")), "sin `id`")
    # Tipos y referencias
    espera(con(lambda f: f[0]["properties"].update(tipo="ciudad")), "`tipo` es 'ciudad'")
    espera(con(lambda f: f.pop(3)), "Falta la referencia RB")
    espera(con(lambda f: f[2]["properties"].update(tipo="sector")), "RA: debe tener tipo 'referencia'")
    espera(con(lambda f: [x["properties"].update(tipo="referencia") for x in f[:2]]), "ningún polígono con tipo 'sector'")
    # Área mínima: 2 × 2 km aprox.
    espera(con(lambda f: f[1].update(geometry=cuadro(-110.983, 29.028, 0.02, 0.018))), "S02: área", "menor que 9 km²")
    # Las referencias no tienen mínimo.
    assert revisar(con(lambda f: f[2].update(geometry=cuadro(-111.17, 29.01, 0.01, 0.01))))[0] == []

    # Traslapes: parcial, idéntico y con bordes colineales corridos.
    espera(con(lambda f: f[1].update(geometry=cuadro(-110.990, 29.028))), "S01 y S02 se traslapan")
    espera(con(lambda f: f[1].update(geometry=cuadro(-111.015, 29.028))), "S01 y S02 se traslapan en 9.6")
    p = espera(con(lambda f: f[1].update(geometry=cuadro(-111.015, 29.042))), "S01 y S02 se traslapan")
    # Mitad de 9.67 km²
    assert any("4.8" in x for x in p), p
    # Uno dentro de otro, sin bordes que se crucen.
    espera(con(lambda f: f[2].update(geometry=cuadro(-111.010, 29.032, 0.01, 0.01))), "S01 y RA se traslapan")
    assert traslape_km2(cuadro(0, 0, 1, 1), cuadro(1, 0, 1, 1)) == 0

    # Geometría
    abierto = cuadro(-111.015, 29.028)
    abierto["coordinates"][0].pop()
    espera(con(lambda f: f[0].update(geometry=abierto)), "S01: anillo exterior: no está cerrado")
    corto = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [0, 0]]]}
    espera(con(lambda f: f[0].update(geometry=corto)), "necesita 4 o más")
    corbata = {"type": "Polygon", "coordinates": [[[-111.015, 29.028], [-110.983, 29.056], [-110.983, 29.028],
                                                  [-111.015, 29.056], [-111.015, 29.028]]]}
    espera(con(lambda f: f[0].update(geometry=corbata)), "S01: anillo exterior: se autointersecta")
    pico = {"type": "Polygon", "coordinates": [[[-111.015, 29.028], [-110.983, 29.028], [-110.983, 29.056],
                                               [-110.983, 29.040], [-111.015, 29.056], [-111.015, 29.028]]]}
    espera(con(lambda f: f[0].update(geometry=pico)), "se autointersecta")
    espera(con(lambda f: f[0].update(geometry={"type": "Point", "coordinates": [0, 0]})), "Polygon o MultiPolygon")
    invertido = copy.deepcopy(cuadro(29.028, -111.015))
    espera(con(lambda f: f[0].update(geometry=invertido)), "fuera de rango")
    assert revisar({"type": "Feature"})[0] == ["El archivo no es una FeatureCollection de GeoJSON"]

    # Línea de comandos: código 0 con el archivo de prueba y 1 con uno roto.
    r = subprocess.run([sys.executable, str(AQUI / "revisar_poligonos.py"), str(PRUEBA)], capture_output=True)
    assert r.returncode == 0, r.stdout
    with tempfile.TemporaryDirectory() as tmp:
        roto = Path(tmp) / "roto.geojson"
        roto.write_text(json.dumps(con(lambda f: f.pop(3))), encoding="utf-8")
        r = subprocess.run([sys.executable, str(AQUI / "revisar_poligonos.py"), str(roto)], capture_output=True)
        assert r.returncode == 1 and b"RB" in r.stdout, r.stdout
    print("Revisión de polígonos: todas las comprobaciones pasaron.")


if __name__ == "__main__":
    main()
