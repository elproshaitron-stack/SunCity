"""Pruebas de aceptación de Vía B. Ejecutar desde cualquier directorio."""

import argparse
import csv
from collections import defaultdict
from html.parser import HTMLParser
import importlib.util
import json
from pathlib import Path
import re
import sys


VIA_B = Path(__file__).resolve().parents[1]
RAIZ = VIA_B.parent
PASOS = ('terra_1030', 'aqua_1330', 'terra_2230', 'aqua_0130')
PATRON = re.compile(r'oasis|salud|temperatura del aire|calidad de vida', re.I)


def config(nombre):
    texto = (VIA_B / 'config.js').read_text(encoding='utf-8')
    hallazgo = re.search(rf'^\s*export\s+const\s+{nombre}\s*=\s*([\'\"])(.*?)\1\s*;', texto, re.M)
    if not hallazgo:
        raise ValueError(f'config.js: falta literal de {nombre}')
    return hallazgo.group(2)


def leer_csv(carpeta, nombre):
    with (carpeta / nombre).open(encoding='utf-8-sig', newline='') as archivo:
        return list(csv.DictReader(archivo))


def sectores_geo(carpeta):
    geo = json.loads((carpeta / 'sectores.geojson').read_text(encoding='utf-8'))
    sectores = [f['properties']['id'] for f in geo['features'] if f['properties']['tipo'] == 'sector']
    if not sectores or len(sectores) != len(set(sectores)):
        raise ValueError('sectores.geojson: faltan sectores o hay IDs repetidos')
    return set(sectores)


class TextosHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ocultos = []
        self.coincidencias = []

    def handle_starttag(self, tag, attrs):
        atributos = dict(attrs)
        oculto = tag in {'script', 'style', 'template'} or bool(self.ocultos and self.ocultos[-1])
        self.ocultos.append(oculto)
        if not oculto:
            for clave in ('title', 'aria-label', 'placeholder', 'alt'):
                self.buscar(atributos.get(clave, ''), f'atributo {clave}')

    def handle_endtag(self, tag):
        if self.ocultos:
            self.ocultos.pop()

    def handle_data(self, data):
        if not (self.ocultos and self.ocultos[-1]):
            self.buscar(data, 'HTML')

    def buscar(self, texto, origen):
        if PATRON.search(texto):
            self.coincidencias.append(f'index.html:{self.getpos()[0]} ({origen}): {texto.strip()}')


def textos_visibles():
    html = TextosHTML()
    html.feed((VIA_B / 'index.html').read_text(encoding='utf-8'))
    coincidencias = html.coincidencias
    # Cadenas de JS que pueden mostrarse en pantalla; se informan para revisión humana.
    for ruta in sorted(VIA_B.rglob('*.js')):
        if 'datos' in ruta.relative_to(VIA_B).parts or 'procesamiento' in ruta.relative_to(VIA_B).parts:
            continue
        for numero, linea in enumerate(ruta.read_text(encoding='utf-8').splitlines(), 1):
            if linea.lstrip().startswith('//'):
                continue
            if PATRON.search(linea):
                coincidencias.append(f'{ruta.relative_to(VIA_B)}:{numero}: {linea.strip()}')
    return coincidencias


def ejecutar(nombre, prueba):
    try:
        detalle = prueba()
        print(f'PASA {nombre}: {detalle}')
        return True
    except (AssertionError, OSError, ValueError, KeyError, ImportError) as error:
        print(f'FALLA {nombre}: {error or "condición incumplida"}')
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('carpeta', nargs='?', type=Path, help='carpeta de datos; por defecto, RUTA_DATOS de config.js')
    args = parser.parse_args()
    carpeta = args.carpeta.resolve() if args.carpeta else (VIA_B / config('RUTA_DATOS')).resolve()
    print(f'Datos: {carpeta}')
    resultados = {}
    ciclo = {}
    sectores = set()

    def preparar():
        nonlocal resultados, ciclo, sectores
        sectores = sectores_geo(carpeta)
        resultados = leer_csv(carpeta, 'resultados.csv')
        ciclo = leer_csv(carpeta, 'ciclo_diario.csv')

    try:
        preparar()
    except (OSError, ValueError, KeyError) as error:
        print(f'FALLA Lectura de datos: {error}')
        print('Resumen: 0 PASA, 1 FALLA; no se pudieron ejecutar las demás pruebas.')
        return 1
    aprobadas = []

    def variante():
        presentes = {f['sector_id'] for f in resultados if f['variante'] == 'sin_2001_2002'}
        faltan = sectores - presentes
        extras = presentes - sectores
        assert not faltan and not extras, f'faltan {sorted(faltan)}; sectores desconocidos {sorted(extras)}'
        return f'{len(sectores)} sectores incluyen sin_2001_2002'

    aprobadas.append(ejecutar('Variante sin_2001_2002', variante))

    def pasos():
        aqua = config('pasosAqua')
        assert aqua in {'rango', 'solo_mod11'}, f'pasosAqua desconocido: {aqua}'
        grupos = defaultdict(list)
        for fila in ciclo:
            grupos[(fila['sector_id'], fila['paso'])].append(fila['producto'])
        problemas = []
        for sector in sorted(sectores):
            for paso in PASOS:
                esperados = {'MOD11', 'MOD21'} if paso.startswith('terra') or aqua == 'rango' else {'MOD11'}
                encontrados = grupos.get((sector, paso), [])
                if len(encontrados) != len(esperados) or set(encontrados) != esperados:
                    problemas.append(f'{sector}/{paso}: {encontrados}, esperado {sorted(esperados)}')
        extras = sorted(set(grupos) - {(s, p) for s in sectores for p in PASOS})
        if extras:
            problemas.append(f'pasos/sectores extra: {extras}')
        assert not problemas, '; '.join(problemas[:4]) + (f'; y {len(problemas) - 4} más' if len(problemas) > 4 else '')
        return f'cuatro pasos y productos correctos en {len(sectores)} sectores (Aqua: {aqua})'

    aprobadas.append(ejecutar('Ciclo diario', pasos))

    def yale():
        diurnos = {'terra_1030', 'aqua_1330'}
        problemas = []
        for fila in ciclo:
            signo = fila['yale_signo'].strip()
            if fila['paso'] in diurnos and signo not in {'+', '-'}:
                problemas.append(f"{fila['sector_id']}/{fila['paso']}/{fila['producto']}: falta signo válido")
            if fila['paso'] not in diurnos and signo:
                problemas.append(f"{fila['sector_id']}/{fila['paso']}/{fila['producto']}: signo nocturno")
        assert not problemas, '; '.join(problemas)
        return 'signo presente solo en los dos pasos diurnos'

    aprobadas.append(ejecutar('Signo de Yale', yale))

    def ecostress():
        prioritario = config('sectorPrioritario')
        assert prioritario in sectores, f'sector prioritario desconocido: {prioritario}'
        ruta = carpeta / 'ecostress_zoom.json'
        assert ruta.is_file(), f'falta {ruta.name}'
        zoom = json.loads(ruta.read_text(encoding='utf-8'))
        assert zoom['sector_id'] == prioritario, f"zoom asignado a {zoom['sector_id']}, esperado {prioritario}"
        return f'archivo único asignado a {prioritario}'

    aprobadas.append(ejecutar('Zoom ECOSTRESS', ecostress))

    def validar():
        spec = importlib.util.spec_from_file_location('validar_via_b', VIA_B / 'datos' / 'validar.py')
        modulo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modulo)
        assert modulo.validar(carpeta) == 0, 'validar.py reportó errores'
        return 'validar.py dio OK'

    aprobadas.append(ejecutar('Validador', validar))

    def tendencia():
        sys.path.insert(0, str(RAIZ))
        from compartido.tendencia import tendencia as recalcular, ajustar_fdr
        series = defaultdict(list)
        for fila in leer_csv(carpeta, 'serie.csv'):
            anio = int(fila['anio'])
            if 2001 <= anio <= 2019:
                series[fila['sector_id']].append((anio, float(fila['delta_c'])))
        filas_primarias = [f for f in resultados if f['variante'] == 'primario']
        primarios = {f['sector_id']: f for f in filas_primarias}
        problemas = []
        columnas = ('pendiente_c_decada', 'ic95_inf', 'ic95_sup', 'p_mk', 'p_hamed_rao', 'p')
        assert len(filas_primarias) == len(primarios), 'resultados primarios duplicados'
        recalculados = {}
        for sector in sorted(sectores):
            if sector not in primarios or sector not in series:
                problemas.append(f'{sector}: falta resultado primario o serie')
                continue
            pares = sorted(series[sector])
            calculado = recalcular([a for a, _ in pares], [v for _, v in pares])
            recalculados[sector] = calculado
            guardado = primarios[sector]
            if int(guardado['n_anios']) != calculado['n_anios']:
                problemas.append(f'{sector}: n_anios distinto')
            for columna in columnas:
                actual = guardado[columna].strip()
                esperado = calculado[columna]
                if actual or str(esperado) != 'nan':
                    if not actual or round(float(actual), 3) != round(float(esperado), 3):
                        problemas.append(f'{sector}/{columna}: CSV {actual}, recalculado {esperado}')
        if len(recalculados) == len(sectores) and all(str(r['p']) != 'nan' for r in recalculados.values()):
            orden = sorted(sectores)
            for sector, esperado in zip(orden, ajustar_fdr([recalculados[s]['p'] for s in orden])):
                actual = primarios[sector]['p_fdr'].strip()
                if not actual or round(float(actual), 3) != round(float(esperado), 3):
                    problemas.append(f'{sector}/p_fdr: CSV {actual}, recalculado {esperado}')
        assert not problemas, '; '.join(problemas)
        return f'{len(sectores)} resultados primarios coinciden a tres decimales'

    aprobadas.append(ejecutar('Tendencia compartida', tendencia))

    def afirmaciones():
        coincidencias = textos_visibles()
        assert not coincidencias, 'coincidencias para revisión manual: ' + '; '.join(coincidencias)
        return 'sin coincidencias de oasis, salud, temperatura del aire o calidad de vida'

    aprobadas.append(ejecutar('Textos visibles', afirmaciones))
    print(f'Resumen: {sum(aprobadas)} PASA, {len(aprobadas) - sum(aprobadas)} FALLA.')
    return 0 if all(aprobadas) else 1


if __name__ == '__main__':
    raise SystemExit(main())
