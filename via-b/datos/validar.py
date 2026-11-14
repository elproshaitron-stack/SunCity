"""Valida CSV de Vía B: python via-b/datos/validar.py <carpeta>."""
import argparse
import csv
import json
import math
from pathlib import Path

ESTADISTICAS = {'pendiente_c_decada', 'ic95_inf', 'ic95_sup', 'p_mk', 'p_hamed_rao', 'p', 'p_fdr'}
TEXTOS = {'sector', 'variante', 'paso', 'producto', 'yale_signo'}
PROBABILIDADES = {'p_mk', 'p_hamed_rao', 'p', 'p_fdr'}

def validar(carpeta):
    problemas = []
    esquema_js = (Path(__file__).parent / 'esquema.js').read_text(encoding='utf-8')
    esquema = json.loads(esquema_js.split('export const ESQUEMA =', 1)[1].strip().removesuffix(';'))
    geo = carpeta / 'sectores.geojson'
    try:
        datos_geo = json.loads(geo.read_text(encoding='utf-8'))
        sectores = {f['properties']['id'] for f in datos_geo['features'] if f['properties']['tipo'] == 'sector'}
    except (OSError, ValueError, KeyError, TypeError) as error:
        problemas.append(f'{geo.name}: no se pudo leer: {error}')
        sectores = set()
    resultados = set()
    for archivo, columnas in ((k, v) for k, v in esquema.items() if k != 'variantes'):
        ruta = carpeta / f'{archivo}.csv'
        try:
            with ruta.open(encoding='utf-8-sig', newline='') as entrada:
                lector = csv.DictReader(entrada)
                cabecera = lector.fieldnames or []
                esperadas = list(columnas.values())
                faltan = sorted(set(esperadas) - set(cabecera))
                sobran = sorted(set(cabecera) - set(esperadas))
                if faltan: problemas.append(f'{ruta.name}: columnas faltantes: {", ".join(faltan)}')
                if sobran: problemas.append(f'{ruta.name}: columnas sobrantes: {", ".join(map(str, sobran))}')
                for numero, fila in enumerate(lector, 2):
                    sector = fila.get(columnas['sector'], '')
                    if sector and sector not in sectores:
                        problemas.append(f'{ruta.name}:{numero}: sector {sector} sin pareja en sectores.geojson')
                    variante = fila.get(columnas.get('variante'))
                    sin_calculo = archivo == 'resultados' and all(
                        not (fila.get(columnas[k]) or '').strip() for k in ESTADISTICAS)
                    for clave, columna in columnas.items():
                        if columna not in cabecera: continue
                        valor = fila.get(columna)
                        admite_vacio = (clave in {'yale_signo', 'p_hamed_rao'} or
                                        (sin_calculo and clave in ESTADISTICAS))
                        if valor is None or (not valor.strip() and not admite_vacio):
                            problemas.append(f'{ruta.name}:{numero}: valor vacío en {columna}')
                        elif valor.strip() and clave not in TEXTOS:
                            try:
                                numero_valor = float(valor)
                                if not math.isfinite(numero_valor) or (clave in PROBABILIDADES and not 0 <= numero_valor <= 1):
                                    raise ValueError()
                            except ValueError:
                                problemas.append(f'{ruta.name}:{numero}: valor inválido en {columna}')
                    if archivo == 'serie' and (fila.get(columnas['anio']) or '').strip():
                        try:
                            anio = int(fila[columnas['anio']])
                            if not 2001 <= anio <= 2025: raise ValueError()
                        except ValueError:
                            problemas.append(f'{ruta.name}:{numero}: año fuera de 2001-2025')
                    if archivo == 'resultados':
                        if variante not in esquema['variantes']:
                            problemas.append(f'{ruta.name}:{numero}: variante desconocida: {variante}')
                        if (sector, variante) in resultados:
                            problemas.append(f'{ruta.name}:{numero}: resultado duplicado para {sector}, {variante}')
                        resultados.add((sector, variante))
        except OSError as error:
            problemas.append(f'{ruta.name}: no se pudo leer: {error}')
    for sector in sorted(sectores):
        for variante in esquema['variantes']:
            if (sector, variante) not in resultados:
                problemas.append(f'resultados.csv: falta {sector}, {variante}')
    if problemas:
        print('\n'.join(problemas))
        return 1
    print('OK')
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('carpeta', type=Path)
    args = parser.parse_args()
    raise SystemExit(validar(args.carpeta))
