"""Datos inventados. No son resultados. Ejecutar desde cualquier directorio."""
import csv
import json
from pathlib import Path
import re
import sys

import numpy as np

CARPETA = Path(__file__).resolve().parent
sys.path.insert(0, str(CARPETA.parents[2]))
from compartido.tendencia import tendencia, ajustar_fdr

# Se lee el literal JSON de esquema.js: no duplicar nombres de columnas aquí.
ESQUEMA = json.loads((CARPETA.parent / 'esquema.js').read_text(encoding='utf-8').split('export const ESQUEMA =', 1)[1].strip().removesuffix(';'))


def leer_pasos_aqua():
    config = (CARPETA.parents[1] / 'config.js').read_text(encoding='utf-8')
    hallazgo = re.search(r'^\s*export\s+const\s+pasosAqua\s*=\s*([\'\"])(.*?)\1\s*;', config, re.M)
    if not hallazgo or hallazgo.group(2) not in {'rango', 'solo_mod11'}:
        raise ValueError('config.js: pasosAqua debe ser rango o solo_mod11')
    return hallazgo.group(2)


def escribir(nombre, esquema, filas):
    with (CARPETA / nombre).open('w', encoding='utf-8', newline='') as archivo:
        salida = csv.DictWriter(archivo, fieldnames=list(esquema.values()))
        salida.writeheader()
        salida.writerows({columna: fila[clave] for clave, columna in esquema.items()} for fila in filas)


def generar():
    pasos_aqua = leer_pasos_aqua()
    rng = np.random.default_rng(2027)
    rng_aqua = np.random.default_rng(2028)
    anios = np.arange(2001, 2026)
    series, resultados, datos, ciclo, niveles = [], [], {}, [], []
    for i, (pendiente, ruido) in enumerate([(0.09, 0.12), (0, 0.55), (-0.08, 0.12), (0.035, 0.3), (0.005, 0.5), (0.065, 0.18)], 1):
        sector = f'S{i:02d}'
        valores = np.round(1 + i * 0.12 + pendiente * (anios - 2001) + rng.normal(0, ruido, len(anios)), 6)
        datos[sector] = valores
        media_mod11 = round(float(np.mean(valores[anios <= 2019])), 6)
        niveles.extend((
            dict(sector=sector, producto='MOD11', nivel_c=media_mod11),
            dict(sector=sector, producto='MOD21', nivel_c=round(media_mod11 * .95 + .1, 6)),
        ))
        series.extend(dict(sector=sector, anio=int(a), valor=float(v)) for a, v in zip(anios, valores))
        # Medias 2003-2019 inventadas; cada fila representa un producto y hora.
        centros = [-0.35 + i * 0.055, -0.18 + i * 0.04, 1.10 + i * 0.11, 0.85 + i * 0.095]
        for paso, centro in zip(('terra_1030', 'aqua_1330', 'terra_2230', 'aqua_0130'), centros):
            mod11 = round(centro + float(rng.normal(0, 0.035)), 3)
            signo = '+' if mod11 > 0 else '-' if paso in ('terra_1030', 'aqua_1330') else ''
            ciclo.append(dict(sector=sector, paso=paso, producto='MOD11', valor=mod11, yale_signo=signo if paso in ('terra_1030', 'aqua_1330') else ''))
            if paso.startswith('terra'):
                ciclo.append(dict(sector=sector, paso=paso, producto='MOD21', valor=round(mod11 + float(rng.uniform(-0.18, 0.22)), 3), yale_signo=signo if paso == 'terra_1030' else ''))
            elif pasos_aqua == 'rango':
                ciclo.append(dict(sector=sector, paso=paso, producto='MOD21', valor=round(mod11 + float(rng_aqua.uniform(-0.18, 0.22)), 3), yale_signo=signo if paso == 'aqua_1330' else ''))
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
    prioritario = max((r for r in primarios if r['p_fdr'] < .05 and r['pendiente_c_decada'] > 0), key=lambda r: r['pendiente_c_decada'])['sector']
    assert prioritario == 'S01', 'Actualizar sectorPrioritario en config.js si cambia la serie de prueba.'
    escribir('serie.csv', ESQUEMA['serie'], series)
    escribir('resultados.csv', ESQUEMA['resultados'], resultados)
    escribir('ciclo_diario.csv', ESQUEMA['ciclo_diario'], ciclo)
    escribir('nivel.csv', ESQUEMA['nivel'], niveles)
    rejilla = [[round(28 + 3 * np.sin(x / 6) + 2 * np.cos(y / 7) + float(rng.normal(0, .45)), 2)
                for x in range(40)] for y in range(40)]
    zoom = dict(sector_id=prioritario, resolucion_m=70, filas=40, columnas=40, valores_c=rejilla, n_escenas=18)
    (CARPETA / 'ecostress_zoom.json').write_text(json.dumps(zoom, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generados {len(series)} registros anuales, {len(resultados)} resultados, {len(ciclo)} filas de ciclo diario, {len(niveles)} niveles y zoom inventados.')


if __name__ == '__main__':
    generar()
