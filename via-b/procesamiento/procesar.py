"""Procesa el export de Earth Engine y escribe los datos reales de la Vía B.

Entrada (carpeta --export, por defecto via-b/datos/reales/export/):
  suncity_lst.csv, suncity_yale.csv, suncity_extra.csv   (de exportar_ee.js)
Salida (carpeta --salida, por defecto via-b/datos/reales/):
  sectores.geojson   polígonos con población 2020, NDVI y nivel (Modelo F)
  nivel.csv          medias nocturnas por sector y producto (Modelo F)
  serie.csv          diferencia nocturna sector − referencia A, 2001-2025 (esquema de esquema.js)
  resultados.csv     tendencia por sector y variante, con FDR por variante (Modelos B-E)
  ciclo_diario.csv   ciclo diario 2003-2019, cuatro pasos y dos algoritmos, signo de Yale (Modelo J)
  yale.csv           cotejo con Yale por año (Modelo H)
  aire.csv           LST nocturna de la ciudad contra T2M_MIN de POWER (Modelo G)
  resumen.json       parámetros, validez y avisos
  nombres.json       copia de datos/prueba/nombres.json si no existe

Uso:  python via-b/procesamiento/procesar.py [--export CARPETA] [--salida CARPETA] [--geojson ARCHIVO]
Para la interfaz: cambiar RUTA_DATOS en via-b/config.js a 'datos/reales/'.
"""
import argparse
import csv
import json
import math
import shutil
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
VIA_B = AQUI.parent
RAIZ = VIA_B.parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(AQUI))
from compartido.tendencia import tendencia, ajustar_fdr  # noqa: E402
import parametros as P  # noqa: E402

ESQUEMA = json.loads((VIA_B / "datos" / "esquema.js").read_text(encoding="utf-8")
                     .split("export const ESQUEMA =", 1)[1].strip().removesuffix(";"))
K0 = 273.15


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else math.nan
    except (TypeError, ValueError):
        return math.nan


def leer_csv(ruta):
    with open(ruta, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def escribir_csv(ruta, columnas, filas):
    with open(ruta, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columnas)
        w.writeheader()
        w.writerows(filas)


def a_celsius(k):
    """MOD11 llega en K. MOD21 puede llegar en K o sin escalar (enteros > 400): se detecta."""
    if math.isnan(k):
        return math.nan
    if k > 400:
        k *= 0.02
    return k - K0


def cargar_lst(ruta, avisos):
    """Devuelve lst[(poligono, producto, anio)] = °C, o NaN si no cumple cobertura."""
    lst, conteo = {}, defaultdict(lambda: [0, 0])
    for r in leer_csv(ruta):
        clave = (r["poligono"], r["producto"], int(float(r["anio"])))
        c = a_celsius(num(r["lst_k"]))
        validos, total, obs = num(r["pix_validos"]), num(r["pix_total"]), num(r["obs_media"])
        cobertura = validos / total if total and total > 0 else 0.0
        ok = (not math.isnan(c) and cobertura >= P.COBERTURA_MIN
              and not math.isnan(obs) and obs >= P.OBS_MIN[r["algoritmo"]])
        lst[clave] = c if ok else math.nan
        conteo[r["producto"]][0 if ok else 1] += 1
    for prod, (ok, no) in sorted(conteo.items()):
        if no:
            avisos.append(f"{prod}: {no} de {ok + no} polígono-años sin cobertura suficiente")
    return lst, {p: {"validos": v[0], "descartados": v[1]} for p, v in conteo.items()}


def delta(lst, sector, ref, producto, anios):
    return np.array([lst.get((sector, producto, a), math.nan) - lst.get((ref, producto, a), math.nan)
                     for a in anios], float)


def limpio(v):
    if isinstance(v, (bool, np.bool_)):
        return bool(v)
    if isinstance(v, (int, np.integer)):
        return int(v)
    v = float(v)
    return "" if math.isnan(v) else v


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--export", type=Path, default=VIA_B / "datos" / "reales" / "export")
    ap.add_argument("--salida", type=Path, default=VIA_B / "datos" / "reales")
    ap.add_argument("--geojson", type=Path, default=VIA_B / "datos" / "prueba" / "sectores.geojson")
    ap.add_argument("--power", type=Path, default=RAIZ / "via-a" / "datos" / "hermosillo.json")
    a = ap.parse_args()
    a.salida.mkdir(parents=True, exist_ok=True)
    avisos = []

    geo = json.loads(a.geojson.read_text(encoding="utf-8"))
    sectores = [f["properties"]["id"] for f in geo["features"] if f["properties"]["tipo"] == "sector"]
    lst, validez = cargar_lst(a.export / "suncity_lst.csv", avisos)
    todos = list(range(P.ANIO_INICIO, P.ANIO_FIN + 1))

    # ---- serie.csv: primaria con 2001-2025 (la interfaz punteará 2020-2025) ----
    prim = P.VARIANTES["primario"]
    E = ESQUEMA["serie"]
    serie = []
    for s in sectores:
        for anio, d in zip(todos, delta(lst, s, prim["ref"], prim["producto"], todos)):
            if not math.isnan(d):
                serie.append({E["sector"]: s, E["anio"]: anio, E["valor"]: round(float(d), 6)})
    escribir_csv(a.salida / "serie.csv", list(E.values()), serie)

    # ---- resultados.csv: cada variante, FDR entre sectores de esa variante ----
    E = ESQUEMA["resultados"]
    resultados = []
    for var in ESQUEMA["variantes"]:
        if var not in P.VARIANTES:
            avisos.append(f"La variante {var} de esquema.js no está en parametros.py")
            continue
        cfg = P.VARIANTES[var]
        anios = list(range(cfg["anios"][0], cfg["anios"][1] + 1))
        grupo = []
        for s in sectores:
            r = tendencia(anios, delta(lst, s, cfg["ref"], cfg["producto"], anios), min_anios=P.MIN_ANIOS)
            grupo.append({"sector": s, "variante": var, **r})
        validos = [i for i, r in enumerate(grupo) if math.isfinite(r["p"])]
        for r in grupo:
            r["p_fdr"] = math.nan
        if validos:
            for i, q in zip(validos, ajustar_fdr([grupo[i]["p"] for i in validos])):
                grupo[i]["p_fdr"] = float(q)
        for r in grupo:
            if not r.get("hamed_rao_valido", True) and math.isfinite(r["p"]):
                avisos.append(f"{r['sector']} {var}: Hamed-Rao no calculable, se usa p de Mann-Kendall (D13)")
            if not math.isfinite(r["pendiente_c_decada"]):
                avisos.append(f"{r['sector']} {var}: solo {r['n_anios']} años válidos (mínimo {P.MIN_ANIOS})")
        resultados.extend(grupo)
    escribir_csv(a.salida / "resultados.csv", list(E.values()),
                 [{col: limpio(r[clave]) if clave not in ("sector", "variante") else r[clave]
                   for clave, col in E.items()} for r in resultados])

    # ---- ciclo_diario.csv: Modelo J, con el esquema de esquema.js ----
    yale = defaultdict(dict)
    ruta_yale = a.export / "suncity_yale.csv"
    if ruta_yale.exists():
        for r in leer_csv(ruta_yale):
            yale[r["poligono"]][int(float(r["anio"]))] = (num(r["yale_dia_c"]), num(r["yale_noche_c"]))
    else:
        avisos.append("Falta suncity_yale.csv: sin signo de Yale ni yale.csv")
    E = ESQUEMA["ciclo_diario"]
    ciclo_anios = list(range(P.CICLO_ANIOS[0], P.CICLO_ANIOS[1] + 1))
    ciclo = []
    for s in sectores:
        dias_yale = [v[0] for v in yale[s].values() if math.isfinite(v[0])]
        signo = ("+" if np.mean(dias_yale) > 0 else "-") if dias_yale else ""
        for paso, sat, momento in P.CICLO_PASOS:
            for alg in ("MOD11", "MOD21"):
                d = delta(lst, s, P.REFERENCIA_PRINCIPAL, f"{alg}_{sat}_{momento}", ciclo_anios)
                d = d[~np.isnan(d)]
                if not len(d):  # la interfaz avisa "Faltan datos" si falta MOD11 de un paso
                    avisos.append(f"{s} {paso} {alg}: sin años válidos para el ciclo diario")
                    continue
                ciclo.append({E["sector"]: s, E["paso"]: paso, E["producto"]: alg,
                              E["valor"]: round(float(d.mean()), 4),
                              E["yale_signo"]: signo if momento == "dia" else ""})
    escribir_csv(a.salida / "ciclo_diario.csv", list(E.values()), ciclo)

    # ---- sectores.geojson con población, NDVI y nivel (Modelo F) ----
    extra = {r["poligono"]: r for r in leer_csv(a.export / "suncity_extra.csv")}
    a0, a1 = prim["anios"]
    anios_prim = list(range(a0, a1 + 1))
    esquema_nivel = ESQUEMA["nivel"]
    filas_nivel = []
    for f in geo["features"]:
        pr = f["properties"]
        e = extra.get(pr["id"], {})
        pob, nd, area = num(e.get("poblacion_2020")), num(e.get("ndvi_temporada")), num(e.get("area_km2"))
        pr["poblacion"] = int(round(pob)) if math.isfinite(pob) else None
        pr["poblacion_fuente"] = "GPW v4.11, 2020"
        pr["ndvi_temporada"] = round(nd, 3) if math.isfinite(nd) else None
        pr["area_km2"] = round(area, 2) if math.isfinite(area) else None
        if pr["tipo"] == "sector":
            niveles = {}
            for alg, prod in (("MOD11", "MOD11_Terra_noche"), ("MOD21", "MOD21_Terra_noche")):
                d = delta(lst, pr["id"], P.REFERENCIA_PRINCIPAL, prod, anios_prim)
                d = d[~np.isnan(d)]
                niveles[alg] = round(float(d.mean()), 3) if len(d) else None
                if niveles[alg] is not None:
                    filas_nivel.append({esquema_nivel["sector"]: pr["id"],
                                        esquema_nivel["producto"]: alg,
                                        esquema_nivel["nivel_c"]: niveles[alg]})
            vals = [v for v in niveles.values() if v is not None]
            pr["nivel_mod11_c"], pr["nivel_mod21_c"] = niveles["MOD11"], niveles["MOD21"]
            pr["nivel_min_c"], pr["nivel_max_c"] = (min(vals), max(vals)) if vals else (None, None)
            if math.isfinite(area) and area < 9:
                avisos.append(f"{pr['id']}: área {area:.1f} km², menor que los 9 km² del plan")
        elif math.isfinite(nd) and nd > 0.2:
            avisos.append(f"{pr['id']}: NDVI {nd:.2f}; una referencia de desierto debería estar por debajo de 0.2")
    (a.salida / "sectores.geojson").write_text(json.dumps(geo, ensure_ascii=False), encoding="utf-8")
    escribir_csv(a.salida / "nivel.csv", list(esquema_nivel.values()), filas_nivel)

    # ---- yale.csv: Modelo H (sector − nada: Yale ya es intensidad de isla de calor) ----
    filas_yale = []
    if yale:
        for s in sectores:
            for anio in range(2003, 2019):
                dia, noche = yale[s].get(anio, (math.nan, math.nan))
                propia = delta(lst, s, P.REFERENCIA_PRINCIPAL, "MOD11_Terra_noche", [anio])[0]
                filas_yale.append({"sector_id": s, "anio": anio, "suncity_noche_c": limpio(propia),
                                   "yale_noche_c": limpio(noche), "yale_dia_c": limpio(dia)})
        escribir_csv(a.salida / "yale.csv", list(filas_yale[0].keys()), filas_yale)

    # ---- aire.csv: Modelo G con T2M_MIN de POWER (D11) ----
    aire = {}
    if a.power.exists():
        t2m = json.loads(a.power.read_text(encoding="utf-8"))["properties"]["parameter"]["T2M_MIN"]
        filas_aire = []
        for anio in anios_prim:
            meses = [t2m.get(f"{anio}{m:02d}") for m in range(P.MES_INICIO, P.MES_FIN + 1)]
            meses = [m for m in meses if m is not None and m != -999]
            lst_ciudad = np.nanmean([lst.get((s, "MOD11_Terra_noche", anio), math.nan) for s in sectores])
            filas_aire.append({"anio": anio, "lst_noche_ciudad_c": limpio(lst_ciudad),
                               "t2m_min_power_c": round(float(np.mean(meses)), 3) if meses else ""})
        escribir_csv(a.salida / "aire.csv", list(filas_aire[0].keys()), filas_aire)
        x = np.array([num(f["lst_noche_ciudad_c"]) for f in filas_aire])
        y = np.array([num(f["t2m_min_power_c"]) for f in filas_aire])
        ok = ~(np.isnan(x) | np.isnan(y))
        if ok.sum() >= 3:
            aire = {"r_pearson": round(float(np.corrcoef(x[ok], y[ok])[0, 1]), 3), "n_anios": int(ok.sum()),
                    "nota": "T2M_MIN de POWER es el extremo mensual; se promedian los meses de la temporada"}
    else:
        avisos.append(f"No se encontró {a.power}: no se generó aire.csv")

    nombres = a.salida / "nombres.json"
    if not nombres.exists():
        shutil.copy(VIA_B / "datos" / "prueba" / "nombres.json", nombres)

    prim_res = [r for r in resultados if r["variante"] == "primario"]
    resumen = {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "parametros": {"temporada_meses": [P.MES_INICIO, P.MES_FIN], "cobertura_min": P.COBERTURA_MIN,
                       "obs_min": P.OBS_MIN, "min_anios": P.MIN_ANIOS, "variantes": P.VARIANTES},
        "validez_por_producto": validez,
        "primario": [{"sector": r["sector"], "pendiente_c_decada": limpio(r["pendiente_c_decada"]),
                      "p_fdr": limpio(r["p_fdr"]), "n_anios": r["n_anios"]} for r in prim_res],
        "aire": aire,
        "avisos": avisos,
    }
    (a.salida / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"Listo en {a.salida}: {len(serie)} filas de serie, {len(resultados)} resultados, {len(ciclo)} de ciclo diario.")
    for r in prim_res:
        print(f"  {r['sector']} primario: {limpio(r['pendiente_c_decada'])} °C/década, p_fdr {limpio(r['p_fdr'])}, n {r['n_anios']}")
    for av in avisos:
        print("  AVISO:", av)


if __name__ == "__main__":
    main()
