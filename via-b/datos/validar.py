"""Valida CSV de Vía B: python via-b/datos/validar.py <carpeta>."""
import argparse
import csv
import json
from pathlib import Path


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
    vistos = {}
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
                vistos[archivo] = set()
                for numero, fila in enumerate(lector, 2):
                    sector = fila.get(columnas['sector'], '')
                    if sector:
                        vistos[archivo].add(sector)
                        if sectores and sector not in sectores:
                            problemas.append(f'{ruta.name}:{numero}: sector {sector} sin pareja en sectores.geojson')
                    for columna in esperadas:
                        if columna not in cabecera: continue
                        valor = fila.get(columna)
                        if (valor is None or not valor.strip()) and not (archivo == 'ciclo_diario' and columna == columnas['yale_signo']):
                            problemas.append(f'{ruta.name}:{numero}: valor vacío en {columna}')
                    if archivo == 'serie' and fila.get(columnas['anio'], '').strip():
                        try:
                            anio = int(fila[columnas['anio']])
                            if not 2001 <= anio <= 2025: raise ValueError()
                        except ValueError:
                            problemas.append(f'{ruta.name}:{numero}: año fuera de 2001-2025')
                    if archivo == 'resultados' and fila.get(columnas['variante'], '') not in esquema['variantes']:
                        problemas.append(f'{ruta.name}:{numero}: variante desconocida: {fila.get(columnas["variante"])}')
        except OSError as error:
            problemas.append(f'{ruta.name}: no se pudo leer: {error}')
    for archivo, ids in vistos.items():
        for sector in sorted(sectores - ids):
            problemas.append(f'{archivo}.csv: falta el sector {sector} de sectores.geojson')
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
