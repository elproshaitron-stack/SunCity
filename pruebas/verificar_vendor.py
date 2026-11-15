"""Comprueba los recursos C3 sin red ni dependencias externas.

Uso: python pruebas/verificar_vendor.py [carpeta_vendor]
Los hashes detectan cambios accidentales; no autentican un manifiesto alterado.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

VENDOR = Path(__file__).resolve().parents[1] / 'compartido' / 'vendor'
URL_CSS = re.compile(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)''', re.I)
ESPERADAS = {
    'Fraunces': {'500', '600'},
    'Hanken Grotesk': {'400', '500', '600', '700'},
    'IBM Plex Mono': {'400', '500', '600'},
}


def verificar(carpeta=VENDOR):
    carpeta = Path(carpeta).resolve()
    errores = []
    try:
        manifiesto = json.loads((carpeta / 'manifest.json').read_text(encoding='utf-8'))
        archivos = manifiesto['archivos']
        if manifiesto.get('esquema') != 1 or not isinstance(archivos, list) or not archivos:
            raise ValueError('esquema o inventario inválido')
        inventario = set()
        for archivo in archivos:
            nombre = archivo['ruta']
            ruta = (carpeta / nombre).resolve()
            if not ruta.is_relative_to(carpeta) or nombre in inventario or nombre == 'manifest.json':
                raise ValueError(f'ruta repetida o no permitida: {nombre}')
            inventario.add(nombre)
            if not ruta.is_file():
                errores.append(f'falta {nombre}')
                continue
            datos = ruta.read_bytes()
            if len(datos) != archivo['bytes'] or hashlib.sha256(datos).hexdigest() != archivo['sha256']:
                errores.append(f'integridad incorrecta: {nombre}')
            if ruta.suffix == '.woff2' and datos[:4] != b'wOF2':
                errores.append(f'no es WOFF2: {nombre}')
        presentes = {r.relative_to(carpeta).as_posix() for r in carpeta.rglob('*') if r.is_file()}
        obligatorios = {'maplibre-gl-5.24.1/maplibre-gl.js', 'maplibre-gl-5.24.1/maplibre-gl.css',
                        'maplibre-gl-5.24.1/LICENSE.txt', 'maplibre-gl-5.24.1/LICENSE-dist.txt',
                        'fuentes.css', 'README.md'}
        for nombre in sorted(obligatorios - inventario):
            errores.append(f'recurso obligatorio sin inventariar: {nombre}')
        for nombre in sorted(presentes - inventario - {'manifest.json'}):
            errores.append(f'archivo sin inventariar: {nombre}')

        for ruta in carpeta.rglob('*.css'):
            css = ruta.read_text(encoding='utf-8')
            if re.search(r'@import\b', css, re.I):
                errores.append(f'importación CSS no permitida: {ruta.name}')
            for coincidencia in URL_CSS.finditer(css):
                url = next(g for g in coincidencia.groups() if g is not None).strip()
                if url.startswith('data:'):
                    continue
                partes = urlsplit(url)
                destino = (ruta.parent / unquote(partes.path)).resolve()
                if (partes.scheme or partes.netloc or not partes.path or partes.path.startswith('/')
                        or not destino.is_relative_to(carpeta) or not destino.is_file()):
                    errores.append(f'referencia CSS externa o ausente: {ruta.name}: {url}')

        fuentes = (carpeta / 'fuentes.css').read_text(encoding='utf-8')
        caras = set()
        for subconjunto, bloque in re.findall(r'/\*\s*([^*]+?)\s*\*/\s*(@font-face\s*\{.*?\})', fuentes, re.S):
            familia = re.search(r"font-family:\s*'([^']+)'", bloque)
            peso = re.search(r'font-weight:\s*([^;]+)', bloque)
            if familia and peso and 'font-style: normal;' in bloque and 'font-display: swap;' in bloque and 'unicode-range:' in bloque:
                caras.add((familia[1], peso[1], subconjunto))
        esperadas = {(familia, peso, subconjunto) for familia, pesos in ESPERADAS.items()
                     for peso in pesos for subconjunto in ('latin', 'latin-ext')}
        if caras != esperadas:
            errores.append(f'caras tipográficas incorrectas; faltan {sorted(esperadas - caras)}; sobran {sorted(caras - esperadas)}')
        for familia in ('fraunces', 'hankengrotesk', 'ibmplexmono'):
            licencia = (carpeta / 'licencias' / (familia + '-OFL.txt')).read_text(encoding='utf-8')
            if 'SIL OPEN FONT LICENSE Version 1.1' not in licencia or 'Copyright' not in licencia:
                errores.append(f'licencia OFL incompleta: {familia}')
        for nombre in ('LICENSE.txt', 'LICENSE-dist.txt'):
            licencia = (carpeta / 'maplibre-gl-5.24.1' / nombre).read_text(encoding='utf-8')
            if 'Redistribution and use in source and binary forms' not in licencia or 'MapLibre' not in licencia:
                errores.append(f'licencia de MapLibre incompleta: {nombre}')
    except (OSError, ValueError, KeyError, TypeError) as error:
        errores.append(f'no se pudo comprobar el paquete: {error}')
    for error in errores:
        print(f'FALLA {error}')
    print(f'Recursos locales: {"FALLA" if errores else "PASA"} ({len(errores)} errores).')
    return 1 if errores else 0


if __name__ == '__main__':
    raise SystemExit(verificar(sys.argv[1] if len(sys.argv) > 1 else VENDOR))
