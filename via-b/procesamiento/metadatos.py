"""metadatos.json de cada conjunto de datos (C12): fuente, producto, fechas ISO 8601, versión y completitud.

- via-b/datos/reales/metadatos.json lo escribe procesar.py en cada corrida (función `de_reales`).
- via-b/datos/prueba/metadatos.json y via-a/datos/metadatos.json salen de leer los archivos de esas
  carpetas; se rehacen con:

      python via-b/procesamiento/metadatos.py

Fechas: si el archivo no dice cuándo se bajó o generó, se usa la fecha del último commit que lo tocó
(o la de modificación del archivo si no está en git) y se dice de dónde salió.
"""
import csv
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
VIA_B = AQUI.parent
RAIZ = VIA_B.parent
ESQUEMA_VERSION = "1"

COLECCIONES_EE = {
    "MOD11_Terra": "MODIS/061/MOD11A2", "MOD11_Aqua": "MODIS/061/MYD11A2",
    "MOD21_Terra": "MODIS/061/MOD21A1D y MOD21A1N", "MOD21_Aqua": "MODIS/061/MYD21A1D y MYD21A1N",
}
CAPAS_GIBS = {"MOD11_Terra": "MOD11A2", "MOD11_Aqua": "MYD11A2"}


def fecha_archivo(ruta):
    """(fecha ISO 8601, de dónde salió) para un archivo sin fecha propia."""
    ruta = Path(ruta)
    try:
        r = subprocess.run(["git", "log", "-1", "--format=%cI", "--", ruta.name], cwd=ruta.parent,
                           capture_output=True, text=True, timeout=20)
        sucio = subprocess.run(["git", "status", "--porcelain", "--", ruta.name], cwd=ruta.parent,
                               capture_output=True, text=True, timeout=20)
        if r.returncode == 0 and r.stdout.strip() and not sucio.stdout.strip():
            return r.stdout.strip(), "fecha del último commit que cambió el archivo"
    except (OSError, subprocess.SubprocessError):
        pass
    mtime = datetime.fromtimestamp(ruta.stat().st_mtime, timezone.utc).astimezone()
    return mtime.isoformat(timespec="seconds"), "fecha de modificación del archivo"


def ahora():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def escribir(ruta, datos):
    Path(ruta).write_text(json.dumps(datos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def _rango(anios):
    return [min(anios), max(anios)] if anios else []


# ------------------------------------------------------------------ datos reales (desde procesar.py)

def de_reales(*, export, geojson, validez, poligonos, anios, temporada, primario, parametros, avisos_productos):
    """Arma el metadatos de via-b/datos/reales/.

    validez: salida de procesar.cargar_lst; poligonos: ids del GeoJSON; anios: (inicio, fin) exportados;
    primario: lista de {sector, n_anios, ...} de la variante primaria; avisos_productos: productos que
    el cálculo usa y no llegaron en el export.
    """
    origen_ruta = Path(export) / "origen.json"
    origen = json.loads(origen_ruta.read_text(encoding="utf-8")) if origen_ruta.exists() else None
    familias = sorted({"_".join(p.split("_")[:2]) for p in validez})
    if origen:
        fuente = origen.get("fuente", "NASA GIBS")
        productos = [{"producto": CAPAS_GIBS.get(f, f), "uso": f} for f in familias]
        descarga, descarga_origen = origen.get("generado"), "export/origen.json"
        via = "NASA GIBS, leído por la paleta oficial con exportar_gibs.py (D18)"
        limites = origen.get("limites", [])
    else:
        fuente = "Google Earth Engine, export de exportar_ee.js"
        productos = [{"producto": COLECCIONES_EE.get(f, f), "uso": f} for f in familias]
        descarga, descarga_origen = fecha_archivo(Path(export) / "suncity_lst.csv")
        via = "Google Earth Engine con exportar_ee.js"
        limites = []
    total_anios = list(range(anios[0], anios[1] + 1))
    completitud = {}
    for prod, v in sorted(validez.items()):
        desc = {int(a): ps for a, ps in v["anios_descartados"].items()}
        sin_nada = [a for a in total_anios if len(desc.get(a, [])) >= len(poligonos)]
        parciales = [a for a in total_anios if 0 < len(desc.get(a, [])) < len(poligonos)]
        completitud[prod] = {
            "anios": {"pedidos": len(total_anios),
                      "completos": len(total_anios) - len(sin_nada) - len(parciales),
                      "sin_ningun_poligono_valido": sin_nada, "con_poligonos_descartados": parciales},
            "poligono_anios": {"validos": v["validos"], "descartados": v["descartados"],
                               "motivos_de_descarte": v["motivos"]},
        }
    return {
        "esquema_metadatos": ESQUEMA_VERSION,
        "conjunto": "via-b/datos/reales",
        "naturaleza": "observado",
        "descripcion": "Temperatura de superficie nocturna de MODIS por sector de Hermosillo y referencias de desierto",
        "fuente": fuente,
        "via": via,
        "productos": productos,
        "version": {"coleccion_modis": "6.1 (061)", "procesamiento": "via-b/procesamiento/procesar.py"},
        "poligonos": {"archivo": _relativa(geojson),
                      "esquematicos": "prueba" in Path(geojson).parts,
                      "nota": "Polígonos esquemáticos mientras D15 siga abierta" if "prueba" in Path(geojson).parts else ""},
        "fechas": {
            "generado": ahora(),
            "descarga": descarga,
            "descarga_origen": descarga_origen,
            "periodo_desde": f"{anios[0]}-{temporada[0]:02d}-01",
            "periodo_hasta": f"{anios[1]}-{temporada[1]:02d}-{31 if temporada[1] in (1, 3, 5, 7, 8, 10, 12) else 30}",
            "temporada": "junio a agosto de cada año (D14)" if tuple(temporada) == (6, 8) else f"meses {temporada}",
        },
        "completitud": {
            "regla": (f"D03: polígono-año válido si al menos {parametros['cobertura_min']:.0%} de los píxeles tienen "
                      f"dato y cada píxel tiene en promedio {parametros['obs_min']['MOD11']} compuestos (MOD11) "
                      f"o {parametros['obs_min']['MOD21']} noches (MOD21)"),
            "por_producto": completitud,
            "productos_ausentes": avisos_productos,
            "anios_validos_por_sector_primario": {r["sector"]: r["n_anios"] for r in primario},
            "minimo_anios": parametros["min_anios"],
        },
        "limites": limites,
    }


def _relativa(ruta):
    ruta = Path(ruta).resolve()
    try:
        return ruta.relative_to(RAIZ).as_posix()
    except ValueError:
        return ruta.as_posix()


# ------------------------------------------------------------------ datos de prueba

def de_prueba(carpeta=VIA_B / "datos" / "prueba"):
    carpeta = Path(carpeta)
    esquema = json.loads((VIA_B / "datos" / "esquema.js").read_text(encoding="utf-8")
                         .split("export const ESQUEMA =", 1)[1].strip().removesuffix(";"))
    geo = json.loads((carpeta / "sectores.geojson").read_text(encoding="utf-8"))
    sectores = [f["properties"]["id"] for f in geo["features"] if f["properties"]["tipo"] == "sector"]
    E = esquema["serie"]
    with (carpeta / "serie.csv").open(encoding="utf-8-sig", newline="") as f:
        serie = list(csv.DictReader(f))
    anios = sorted({int(r[E["anio"]]) for r in serie})
    pedidos = list(range(2001, 2026))
    presentes = {(r[E["sector"]], int(r[E["anio"]])) for r in serie if (r[E["valor"]] or "").strip()}
    faltan = sorted(f"{s} {a}" for s in sectores for a in pedidos if (s, a) not in presentes)
    R = esquema["resultados"]
    with (carpeta / "resultados.csv").open(encoding="utf-8-sig", newline="") as f:
        res = list(csv.DictReader(f))
    sin_calculo = sorted(f"{r[R['sector']]} {r[R['variante']]}" for r in res if not (r[R["pendiente_c_decada"]] or "").strip())
    generado, origen = fecha_archivo(carpeta / "serie.csv")
    return {
        "esquema_metadatos": ESQUEMA_VERSION,
        "conjunto": "via-b/datos/prueba",
        "naturaleza": "inventado",
        "descripcion": "Datos inventados para probar la interfaz. No son resultados ni observaciones satelitales.",
        "fuente": "generar_prueba.py (semillas fijas 2027 y 2028); polígonos esquemáticos",
        "productos": [{"producto": "ninguno", "uso": "la serie lleva la etiqueta MOD11 Terra solo para probar la interfaz"}],
        "version": {"coleccion_modis": "no aplica", "procesamiento": "via-b/datos/prueba/generar_prueba.py"},
        "poligonos": {"archivo": _relativa(carpeta / "sectores.geojson"), "esquematicos": True,
                      "nota": "No son límites oficiales (README.md de esta carpeta)"},
        "fechas": {"generado": generado, "generado_origen": origen,
                   "periodo_desde": f"{anios[0]}-06-01", "periodo_hasta": f"{anios[-1]}-08-31",
                   "temporada": "junio a agosto, solo como etiqueta"},
        "completitud": {
            "regla": "No aplica D03: no hay píxeles ni observaciones",
            "anios": {"pedidos": len(pedidos), "con_dato": len(anios), "rango": _rango(anios)},
            "poligono_anios": {"validos": len(presentes), "descartados": len(faltan),
                               "motivos_de_descarte": {"hueco_inventado": len(faltan)} if faltan else {},
                               "faltantes": faltan},
            "resultados_sin_calculo": sin_calculo,
        },
        "limites": ["Datos inventados: nunca se presentan como resultados ni se copian a datos/reales/"],
    }


# ------------------------------------------------------------------ respaldos de POWER (Vía A)

def de_power(carpeta=RAIZ / "via-a" / "datos"):
    carpeta = Path(carpeta)
    archivos = []
    for ruta in sorted(carpeta.glob("*.json")):
        if ruta.name == "metadatos.json":
            continue
        d = json.loads(ruta.read_text(encoding="utf-8"))
        h, params = d["header"], d["properties"]["parameter"]
        fill = h.get("fill_value", -999)
        por_param = {}
        for nombre, valores in sorted(params.items()):
            mensuales = {k: v for k, v in valores.items() if not k.endswith("13")}
            anuales = {k: v for k, v in valores.items() if k.endswith("13")}
            faltan = sorted(k for k, v in mensuales.items() if v is None or v == fill)
            anios = sorted({int(k[:4]) for k in mensuales})
            anios_completos = [a for a in anios
                               if all(mensuales.get(f"{a}{m:02d}") not in (None, fill) for m in range(1, 13))]
            por_param[nombre] = {
                "unidad": d["parameters"][nombre]["units"], "nombre": d["parameters"][nombre]["longname"],
                "anios": {"pedidos": len(anios), "completos": len(anios_completos), "rango": _rango(anios),
                          "incompletos": [a for a in anios if a not in anios_completos]},
                "meses": {"validos": len(mensuales) - len(faltan), "faltantes": len(faltan),
                          "motivo": f"valor de relleno {fill}" if faltan else "", "lista_faltantes": faltan},
                "promedios_anuales": len(anuales),
            }
        bajado, origen = fecha_archivo(ruta)
        lon, lat = d["geometry"]["coordinates"][:2]
        archivos.append({
            "archivo": ruta.name,
            "punto": {"lat": lat, "lon": lon, "elevacion_m": d["geometry"]["coordinates"][2]
                      if len(d["geometry"]["coordinates"]) > 2 else None},
            "fechas": {"descarga": bajado, "descarga_origen": origen + "; el JSON de POWER no trae fecha de descarga",
                       "periodo_desde": f"{h['start'][:4]}-{h['start'][4:6]}-{h['start'][6:]}",
                       "periodo_hasta": f"{h['end'][:4]}-{h['end'][4:6]}-{h['end'][6:]}"},
            "fuentes_power": h.get("sources", []),
            "parametros": por_param,
        })
    version = sorted({json.loads((carpeta / a["archivo"]).read_text(encoding="utf-8"))["header"]["api"]["version"]
                      for a in archivos})
    return {
        "esquema_metadatos": ESQUEMA_VERSION,
        "conjunto": "via-a/datos",
        "naturaleza": "reanálisis y productos satelitales servidos por POWER (respaldo local de la API)",
        "descripcion": "Copias de NASA POWER que la Vía A usa si la API no responde",
        "fuente": "NASA POWER, API mensual por punto (power.larc.nasa.gov), comunidad AG",
        "productos": [{"producto": "POWER Monthly and Annual", "uso": "T2M_MIN, T2M_MAX, T2M, TS, PRECTOTCORR"}],
        "version": {"api_power": ", ".join(version), "procesamiento": "via-a/datos/descargar.py"},
        "fechas": {"descarga_mas_reciente": max(a["fechas"]["descarga"] for a in archivos)},
        "completitud": {"regla": "Un mes falta si POWER devuelve el valor de relleno; un año está completo con sus 12 meses",
                        "por_archivo": {a["archivo"]: a["parametros"] for a in archivos}},
        "archivos": [{k: v for k, v in a.items() if k != "parametros"} for a in archivos],
        "limites": ["Respaldo fijo: no se actualiza solo; se rehace con descargar.py y luego este script"],
    }


if __name__ == "__main__":
    for ruta, datos in ((VIA_B / "datos" / "prueba" / "metadatos.json", de_prueba()),
                        (RAIZ / "via-a" / "datos" / "metadatos.json", de_power())):
        escribir(ruta, datos)
        print(f"Escrito {_relativa(ruta)}")
