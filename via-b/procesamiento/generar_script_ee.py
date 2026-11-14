"""Genera exportar_ee.js (para el Code Editor de Earth Engine) con los polígonos insertados.

Uso:  python via-b/procesamiento/generar_script_ee.py [ruta/a/sectores.geojson]
Por defecto usa via-b/datos/prueba/sectores.geojson (polígonos esquemáticos de Mario).
Cada polígono necesita las propiedades "id" y "tipo" ("sector" o "referencia"),
y las referencias deben llamarse RA y RB.
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import parametros as P  # noqa: E402


def main():
    origen = Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI.parent / "datos" / "prueba" / "sectores.geojson"
    geo = json.loads(origen.read_text(encoding="utf-8"))
    feats = []
    for f in geo["features"]:
        pr = f["properties"]
        if "id" not in pr or pr.get("tipo") not in ("sector", "referencia"):
            raise SystemExit(f"Polígono sin id o tipo válido: {pr}")
        feats.append({"type": "Feature", "geometry": f["geometry"], "properties": {"id": pr["id"], "tipo": pr["tipo"]}})
    ids = {f["properties"]["id"] for f in feats}
    for ref in (P.REFERENCIA_PRINCIPAL, P.REFERENCIA_ALTERNA):
        if ref not in ids:
            raise SystemExit(f"Falta la referencia {ref} en {origen}")
    plantilla = (AQUI / "plantilla_ee.js").read_text(encoding="utf-8")
    js = (plantilla
          .replace("__POLIGONOS__", json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
          .replace("__ANIO_INICIO__", str(P.ANIO_INICIO)).replace("__ANIO_FIN__", str(P.ANIO_FIN))
          .replace("__MES_INICIO__", str(P.MES_INICIO)).replace("__MES_FIN__", str(P.MES_FIN)))
    assert "__" not in js.split("*/", 1)[1].replace("__agentproxy", ""), "Quedó un marcador sin reemplazar"
    salida = AQUI / "exportar_ee.js"
    salida.write_text(js, encoding="utf-8")
    print(f"{salida} listo: {len(feats)} polígonos de {origen.name}")


if __name__ == "__main__":
    main()
