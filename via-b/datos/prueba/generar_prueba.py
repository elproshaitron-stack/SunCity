"""Datos inventados. No son resultados. Ejecutar desde cualquier directorio."""
import csv
import json
from pathlib import Path
import sys

import numpy as np

CARPETA = Path(__file__).resolve().parent
sys.path.insert(0, str(CARPETA.parents[2]))
from compartido.tendencia import tendencia, ajustar_fdr

# Se lee el literal JSON de esquema.js: no duplicar nombres de columnas aquí.
ESQUEMA = json.loads((CARPETA.parent / 'esquema.js').read_text(encoding='utf-8').split('export const ESQUEMA =', 1)[1].strip().removesuffix(';'))


def escribir(nombre, esquema, filas):
    with (CARPETA / nombre).open('w', encoding='utf-8', newline='') as archivo:
        salida = csv.DictWriter(archivo, fieldnames=list(esquema.values()))
        salida.writeheader()
        salida.writerows({columna: fila[clave] for clave, columna in esquema.items()} for fila in filas)


def generar():
    rng = np.random.default_rng(2027)
    anios = np.arange(2001, 2026)
    series, resultados, datos = [], [], {}
    for i, (pendiente, ruido) in enumerate([(0.09, 0.12), (0, 0.55), (-0.08, 0.12), (0.035, 0.3), (0.005, 0.5), (0.065, 0.18)], 1):
        sector = f'S{i:02d}'
        valores = np.round(1 + i * 0.12 + pendiente * (anios - 2001) + rng.normal(0, ruido, len(anios)), 6)
        datos[sector] = valores
        series.extend(dict(sector=sector, anio=int(a), valor=float(v)) for a, v in zip(anios, valores))
    for variante in ESQUEMA['variantes']:
        grupo = []
        for sector, valores in datos.items():
            mascara = anios <= 2019
            ajustados = valores.copy()
            if variante == 'con_deriva':
                mascara = anios <= 2025
            elif variante == 'aqua':
                ajustados += 0.15 + 0.08 * np.sin(anios - 2001)
            elif variante == 'ref_b':
                ajustados -= 0.2 + 0.01 * (anios - 2001)
            elif variante == 'mod21':
                ajustados = 0.95 * valores + 0.1
            elif variante == 'sin_2001_2002':
                mascara &= anios >= 2003
            r = tendencia(anios[mascara], ajustados[mascara])
            grupo.append(dict(sector=sector, variante=variante, **r))
        for fila, p_fdr in zip(grupo, ajustar_fdr([r['p'] for r in grupo])):
            fila['p_fdr'] = float(p_fdr)
        resultados.extend(grupo)
    primarios = [r for r in resultados if r['variante'] == 'primario']
    assert all(np.isfinite(r[k]) for r in resultados for k in ('p', 'p_mk', 'p_hamed_rao', 'p_fdr', 'ic95_inf', 'ic95_sup'))
    assert any(r['p_fdr'] < .05 for r in primarios)
    assert any(r['p_fdr'] >= .05 for r in primarios)
    escribir('serie.csv', ESQUEMA['serie'], series)
    escribir('resultados.csv', ESQUEMA['resultados'], resultados)
    print(f'Generados {len(series)} registros anuales y {len(resultados)} resultados inventados.')


if __name__ == '__main__':
    generar()
