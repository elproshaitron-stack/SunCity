"""Verificación local de SunCity: python verificar.py (desde cualquier carpeta).

Requiere Python con requirements.txt y Node en PATH. No instala dependencias ni
consulta servicios. Devuelve 0 solamente si todas las comprobaciones pasan.
Los colores heredados también fallan: no hay excepciones que oculten deuda.

La revisión de textos es heurística: busca afirmaciones concretas, no demuestra
corrección científica. Las negaciones y las definiciones de POWER se conservan;
la revisión humana del texto publicado sigue siendo necesaria. Las atribuciones
causales indirectas y el efecto de medidas urbanas requieren esa revisión manual.
"""
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import sys

RAIZ = Path(__file__).resolve().parent
EXCLUIDOS = {'vendor', 'datos', 'pruebas', 'procesamiento'}
HEX = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b')
CADENAS = re.compile(r'''(["'`])((?:\\.|(?!\1)[^\\])*?)\1''', re.S)
AFIRMACIONES = re.compile(
    r'hermosillo\s+(?:es|sea|resulta)\s+(?:un\s+)?oasis'
    r'|(?:suncity|(?:el|este)\s+proyecto|(?:esta|la)\s+herramienta)\s+'
    r'(?:mide\s+(?:la\s+)?(?:salud|temperatura\s+del\s+aire)'
    r'|mejora\s+(?:la\s+)?calidad\s+de\s+vida'
    r'|(?:demuestra|identifica|explica)\s+(?:las?\s+)?causas)'
    r'|(?:vía\s+a|via\s+a|esta\s+herramienta)\s+(?:ve|distingue)\s+(?:las\s+)?ciudades'
    r'|(?:las\s+)?variantes\s+(?:son|sean)\s+pruebas\s+independientes'
    r'|yale\s+(?:es|sea)\s+(?:otro\s+sensor|(?:un\s+)?sensor\s+independiente)',
    re.I,
)


class TextoHTML(HTMLParser):
    """Une texto de énfasis y conserva scripts para revisar sus cadenas aparte."""
    def __init__(self):
        super().__init__()
        self.oculto = 0
        self.partes = []
        self.script = False
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style'}:
            self.oculto += 1
        if tag == 'script':
            self.script = True
        if not self.oculto:
            if tag in {'p', 'div', 'section', 'li', 'h1', 'h2', 'h3', 'br'}:
                self.partes.append('\u2029')
            for clave, valor in attrs:
                if clave in {'aria-label', 'title', 'alt', 'placeholder'} and valor:
                    self.partes.extend(['\u2029', valor, '\u2029'])

    def handle_endtag(self, tag):
        if tag in {'script', 'style'}:
            self.oculto = max(0, self.oculto - 1)
        if tag == 'script':
            self.script = False
        elif tag in {'p', 'div', 'section', 'li', 'h1', 'h2', 'h3'}:
            self.partes.append('\u2029')

    def handle_data(self, data):
        if self.script:
            self.scripts.append(data)
        elif not self.oculto:
            self.partes.append(data)


def fuentes(raiz):
    rutas = list(raiz.glob('*.html')) + list(raiz.glob('*.css')) + list(raiz.glob('*.js'))
    for carpeta in ('metodo', 'via-a', 'via-b', 'compartido'):
        rutas.extend((raiz / carpeta).rglob('*'))
    for ruta in sorted(set(rutas)):
        relativo = ruta.relative_to(raiz)
        if (ruta.is_file() and ruta.suffix in {'.html', '.css', '.js'}
                and not EXCLUIDOS.intersection(relativo.parts)
                and relativo.as_posix() != 'compartido/tokens.css'):
            yield ruta


def es_color(texto, hallazgo, sufijo=''):
    """Reconoce valores CSS o cadenas JS; excluye fragmentos href/url e IDs."""
    antes = texto[:hallazgo.start()]
    if sufijo == '.css':
        delimitador = re.search(r'[{};]', texto[hallazgo.end():])
        if delimitador and delimitador.group() == '{':
            return False  # Selector, incluso si contiene pseudoclases con dos puntos.
    if re.search(r'(?:href\s*=\s*[\'\"]|url\(\s*[\'\"]?)$', antes, re.I):
        return False
    if re.search(r'''(?:querySelector(?:All)?|getElementById)\(\s*["'`]$''', antes):
        return False
    return bool(re.search(r'''["'`]$|(?:[\w-]+\s*:\s*[^;{}<>]*)$''', antes))


def afirmaciones(texto):
    # Se limita la negación a la misma frase para no silenciar otra afirmación.
    for frase in re.split(r'[.!?\u2029]|\n\s*\n', texto):
        normal = ' '.join(frase.split())
        for hallazgo in AFIRMACIONES.finditer(normal):
            prefijo = normal[:hallazgo.start()]
            if not re.search(
                r'\b(?:(?:no|nunca)\s+se\s+(?:afirma|afirmará|demuestra)'
                r'|sin\s+afirmar)\s+que\s*$', prefijo, re.I
            ):
                yield normal


def revisar_fuentes(raiz):
    fallos = []
    rutas = list(fuentes(raiz))
    if (raiz / 'README.md').is_file():
        rutas.append(raiz / 'README.md')
    for ruta in rutas:
        relativo = ruta.relative_to(raiz).as_posix()
        try:
            texto = ruta.read_text(encoding='utf-8-sig')
        except (OSError, UnicodeError) as error:
            fallos.append(f'{relativo}: no se pudo leer: {error}')
            continue
        if ruta.suffix != '.md':
            for hallazgo in HEX.finditer(texto):
                if es_color(texto, hallazgo, ruta.suffix):
                    linea = texto.count('\n', 0, hallazgo.start()) + 1
                    fallos.append(f'{relativo}:{linea}: color fuera de tokens: {hallazgo.group()}')
        if ruta.suffix == '.html':
            lector = TextoHTML()
            lector.feed(texto)
            candidatos = [''.join(lector.partes)]
            candidatos.extend(m.group(2) for codigo in lector.scripts for m in CADENAS.finditer(codigo))
        elif ruta.suffix == '.js':
            candidatos = [m.group(2) for m in CADENAS.finditer(texto)]
        elif ruta.suffix == '.md':
            candidatos = [texto]
        else:
            candidatos = []
        for candidato in candidatos:
            for frase in afirmaciones(candidato):
                fallos.append(f'{relativo}: afirmación para revisión científica: {frase}')
    return fallos


def ejecutar_comando(raiz, nombre, comando):
    print(f'\nComprobando {nombre}', flush=True)
    try:
        resultado = subprocess.run(comando, cwd=raiz, shell=False, check=False)
    except OSError as error:
        print(f'FALLA {nombre}: no se pudo ejecutar {comando[0]}: {error}', flush=True)
        return False
    correcto = resultado.returncode == 0
    print(f'{"PASA" if correcto else "FALLA"} {nombre} (código {resultado.returncode})', flush=True)
    return correcto


def verificar(raiz=RAIZ):
    raiz = Path(raiz).resolve()
    print(f'Verificando {raiz}', flush=True)
    resultados = []
    generar = ejecutar_comando(raiz, 'generación de casos', [sys.executable, 'via-a/pruebas/generar_casos.py'])
    resultados.append(generar)
    if generar:
        resultados.append(ejecutar_comando(raiz, 'igualdad JavaScript/Python', ['node', 'via-a/pruebas/probar_tendencia.cjs']))
    else:
        print('OMITIDA igualdad JavaScript/Python: falló la generación; no se usan casos anteriores.')
    for nombre, archivo in (
        ('procesamiento de Vía B', 'via-b/procesamiento/probar_procesamiento.py'),
        ('aceptación de Vía B', 'via-b/pruebas/aceptacion.py'),
        ('pruebas del verificador', 'via-b/pruebas/probar_verificar.py'),
    ):
        resultados.append(ejecutar_comando(raiz, nombre, [sys.executable, archivo]))
    fallos = revisar_fuentes(raiz)
    for fallo in fallos:
        print(f'FALLA {fallo}')
    resultados.append(not fallos)
    print(f'\nFuentes: {len(fallos)} hallazgos. Resumen: {sum(resultados)} PASA, '
          f'{len(resultados) - sum(resultados)} FALLA.')
    return 0 if all(resultados) else 1


if __name__ == '__main__':
    raise SystemExit(verificar())
