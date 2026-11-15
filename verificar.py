"""Verificación completa de SunCity: python verificar.py

Corre todas las pruebas del repositorio y las búsquedas de colores fuera de los
tokens y de textos prohibidos. Devuelve 0 si todo pasa y 1 si algo falla.
Se puede ejecutar desde cualquier carpeta. Necesita los paquetes de
requirements.txt y Node en el PATH; no consulta servicios externos.

Un AVISO no hace fallar la verificación: es una falla conocida y registrada
(por ejemplo, D18 en docs/DECISIONES.md) que se informa en el resumen.
"""
from html.parser import HTMLParser
import os
from pathlib import Path
import re
import subprocess
import sys

RAIZ = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Excepciones explícitas. Cada una lleva su motivo; agregar una exige decirlo
# en el PR.
# ---------------------------------------------------------------------------

# Archivos o carpetas (prefijos de ruta) donde se permiten colores escritos.
COLORES_PERMITIDOS = {
    'compartido/tokens.css': 'es la única fuente de los colores',
    'compartido/mapa-estilo.js': 'MapLibre pinta con colores literales; no lee propiedades CSS',
    'compartido/lst-noche.js': 'escala de datos de la temperatura de la superficie; el color codifica un valor',
    'compartido/marca/': 'archivos de marca generados',
    'compartido/vendor/': 'código de terceros servido desde el sitio (C3)',
    'via-a/datos/': 'datos, no interfaz',
    'via-b/datos/': 'datos, no interfaz',
    'pruebas/': 'pruebas y sus mosaicos de referencia, no interfaz',
}
# Además se permiten, en cualquier archivo:
#  - la meta theme-color: el navegador no lee propiedades CSS en una meta;
#  - el respaldo dentro de var(--x, #...): solo actúa si falta tokens.css.

# Archivos que no se revisan en busca de textos prohibidos.
TEXTOS_EXCLUIDOS = {
    'compartido/vendor/': 'código de terceros',
    'via-a/datos/': 'datos',
    'via-b/datos/': 'datos',
    'via-b/procesamiento/': 'guiones de Earth Engine, no se muestran',
    'pruebas/': 'pruebas',
}
# Frases puntuales permitidas: (archivo, frase exacta, motivo).
FRASES_PERMITIDAS = [
    ('via-a/js/power.js', 'El promedio de la temperatura del aire a 2 m sobre el suelo.',
     'definición de T2M que publica POWER; la Vía A muestra esa variable, no la mide'),
]

# Fallas conocidas de aceptacion.py sobre datos/reales/ (D18): NASA GIBS no
# publica MOD21, el signo de Yale ni ECOSTRESS. Se informan como aviso.
FALLAS_CONOCIDAS_REALES = {
    'Ciclo diario': 'sin MOD21 en GIBS',
    'Signo de Yale': 'sin Yale en GIBS',
    'Zoom ECOSTRESS': 'sin ECOSTRESS en GIBS',
}

# Las mismas palabras que via-b/pruebas/aceptacion.py.
PROHIBIDO = re.compile(r'oasis|salud|temperatura del aire|calidad de vida', re.I)
EXCLAMACION = re.compile(r'[!¡]')
HEX = re.compile(r'(?<![\w&#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])')
FUNCION_COLOR = re.compile(r'\b(?:rgba?|hsla?)\(', re.I)
RESPALDO = re.compile(r'var\(\s*--[\w-]+\s*,\s*$')
ATRIBUTOS_VISIBLES = {'title', 'aria-label', 'placeholder', 'alt'}


# ---------------------------------------------------------------------------
# Archivos
# ---------------------------------------------------------------------------

def archivos(raiz):
    """Archivos del repositorio, sin los ignorados por git."""
    try:
        salida = subprocess.run(
            ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
            cwd=raiz, capture_output=True, check=True,
        ).stdout.decode('utf-8')
        rutas = [r for r in salida.split('\0') if r]
    except (OSError, subprocess.CalledProcessError):
        rutas = []
        for carpeta, subcarpetas, nombres in os.walk(raiz):
            subcarpetas[:] = [s for s in subcarpetas if not s.startswith('.') and s != 'node_modules']
            rutas += [Path(carpeta, n).relative_to(raiz).as_posix() for n in nombres]
    return sorted(r for r in rutas if (raiz / r).is_file())


def en(ruta, prefijos):
    return any(ruta == p or (p.endswith('/') and (ruta.startswith(p) or f'/{p}' in f'/{ruta}'))
               for p in prefijos)


def linea_de(texto, posicion):
    return texto.count('\n', 0, posicion) + 1


# ---------------------------------------------------------------------------
# Lectores mínimos de JavaScript, CSS y HTML
# ---------------------------------------------------------------------------

def piezas_js(texto):
    """Devuelve (tipo, inicio, fin) de cadenas, comentarios y expresiones regulares."""
    i, n, previo = 0, len(texto), ''
    while i < n:
        c = texto[i]
        if c in '"\'`':
            j = i + 1
            while j < n and texto[j] != c:
                if texto[j] == '\\':
                    j += 1
                elif c != '`' and texto[j] == '\n':
                    break
                j += 1
            yield 'cadena', i + 1, j
            i, previo = j + 1, c
        elif texto.startswith('//', i):
            j = texto.find('\n', i)
            j = n if j < 0 else j
            yield 'comentario', i, j
            i = j
        elif texto.startswith('/*', i):
            j = texto.find('*/', i + 2)
            j = n if j < 0 else j + 2
            yield 'comentario', i, j
            i = j
        elif c == '/' and (previo == '' or previo in '(,=:[!&|?{};+-*%<>~^'):
            j, clase = i + 1, False
            while j < n and texto[j] != '\n':
                if texto[j] == '\\':
                    j += 2
                    continue
                if texto[j] == '[':
                    clase = True
                elif texto[j] == ']':
                    clase = False
                elif texto[j] == '/' and not clase:
                    break
                j += 1
            yield 'regex', i, j + 1
            i, previo = j + 1, '/'
        else:
            if not c.isspace():
                previo = c
            i += 1


def sin_comentarios_js(texto):
    """Cambia los comentarios por espacios y conserva los saltos de línea."""
    partes = list(texto)
    for tipo, inicio, fin in piezas_js(texto):
        if tipo == 'comentario':
            for k in range(inicio, min(fin, len(partes))):
                if partes[k] != '\n':
                    partes[k] = ' '
    return ''.join(partes)


def cadenas_js(texto):
    for tipo, inicio, fin in piezas_js(texto):
        if tipo == 'cadena':
            yield inicio, texto[inicio:fin]


def sin_comentarios(texto, patron):
    return patron.sub(lambda m: re.sub(r'[^\n]', ' ', m.group()), texto)


COMENTARIO_CSS = re.compile(r'/\*.*?\*/', re.S)
COMENTARIO_HTML = re.compile(r'<!--.*?-->', re.S)


class LectorHTML(HTMLParser):
    """Texto visible, atributos visibles y scripts en línea, con su línea."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pila = []
        self.textos = []
        self.scripts = []
        self.en_script = None

    def oculto(self):
        return any(t in {'script', 'style', 'template'} for t in self.pila)

    def handle_starttag(self, tag, attrs):
        if tag not in {'br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'col'}:
            self.pila.append(tag)
        if tag == 'script':
            self.en_script = self.getpos()[0]
        if not self.oculto():
            for clave, valor in attrs:
                if clave in ATRIBUTOS_VISIBLES and valor:
                    self.textos.append((self.getpos()[0], valor))

    def handle_startendtag(self, tag, attrs):
        if not self.oculto():
            for clave, valor in attrs:
                if clave in ATRIBUTOS_VISIBLES and valor:
                    self.textos.append((self.getpos()[0], valor))

    def handle_endtag(self, tag):
        if tag in self.pila:
            while self.pila and self.pila.pop() != tag:
                pass
        if tag == 'script':
            self.en_script = None

    def handle_data(self, data):
        if self.en_script is not None:
            self.scripts.append((self.getpos()[0], data))
        elif not self.oculto() and data.strip():
            self.textos.append((self.getpos()[0], data))


# ---------------------------------------------------------------------------
# Búsquedas
# ---------------------------------------------------------------------------

def colores_en(texto, tipo):
    """Colores escritos en texto ya sin comentarios. Devuelve (posición, valor)."""
    for m in HEX.finditer(texto):
        antes = texto[max(0, m.start() - 60):m.start()]
        despues = texto[m.end():m.end() + 200]
        if RESPALDO.search(antes):
            continue
        if re.search(r'''(?:href\s*=\s*["']?|url\(\s*["']?|(?:querySelector(?:All)?|getElementById|closest|matches)\(\s*["'`])$''', antes, re.I):
            continue
        if tipo == 'css':
            delimitador = re.search(r'[{};]', despues)
            if delimitador and delimitador.group() == '{':
                continue  # selector de identificador
        yield m.start(), m.group()
    for m in FUNCION_COLOR.finditer(texto):
        antes = texto[max(0, m.start() - 60):m.start()]
        if RESPALDO.search(antes):
            continue
        yield m.start(), m.group()


def revisar_colores(raiz, rutas):
    hallazgos = []
    for ruta in rutas:
        sufijo = Path(ruta).suffix
        if sufijo not in {'.css', '.html', '.js'} or en(ruta, COLORES_PERMITIDOS):
            continue
        texto = (raiz / ruta).read_text(encoding='utf-8-sig')
        if sufijo == '.css':
            limpio, tipo = sin_comentarios(texto, COMENTARIO_CSS), 'css'
        elif sufijo == '.js':
            limpio, tipo = sin_comentarios_js(texto), 'js'
        else:
            limpio, tipo = sin_comentarios(texto, COMENTARIO_HTML), 'html'
        lineas = limpio.split('\n')
        for posicion, valor in colores_en(limpio, tipo):
            numero = linea_de(limpio, posicion)
            linea = lineas[numero - 1]
            if tipo == 'html' and re.search(r'''name\s*=\s*["']theme-color["']''', linea, re.I):
                continue
            hallazgos.append(f'{ruta}:{numero}: {valor}')
    return hallazgos


def frase_permitida(ruta, texto):
    return any(ruta == archivo and frase in texto for archivo, frase, _ in FRASES_PERMITIDAS)


def revisar_texto(ruta, numero, texto, hallazgos, cadena_js=False):
    unido = ' '.join(texto.split())
    if PROHIBIDO.search(unido) and not frase_permitida(ruta, unido):
        hallazgos['prohibido'].append(f'{ruta}:{numero}: {unido[:120]}')
    if EXCLAMACION.search(unido):
        # En cadenas de JavaScript solo cuenta si parece texto: una letra antes del signo
        # o el signo de apertura. Así no cuentan selectores como ":not(...)" ni "!important".
        if not cadena_js or re.search(r'¡|[A-Za-zÁÉÍÓÚáéíóúñÑ]\s*!(?!=|important)', unido):
            hallazgos['exclamacion'].append(f'{ruta}:{numero}: {unido[:120]}')


def revisar_textos(raiz, rutas):
    hallazgos = {'prohibido': [], 'exclamacion': []}
    for ruta in rutas:
        sufijo = Path(ruta).suffix
        if sufijo not in {'.html', '.js'} or en(ruta, TEXTOS_EXCLUIDOS):
            continue
        texto = (raiz / ruta).read_text(encoding='utf-8-sig')
        if sufijo == '.html':
            lector = LectorHTML()
            lector.feed(texto)
            lector.close()
            for numero, contenido in lector.textos:
                revisar_texto(ruta, numero, contenido, hallazgos)
            bloques = lector.scripts
        else:
            bloques = [(1, texto)]
        for inicio, codigo in bloques:
            for posicion, cadena in cadenas_js(codigo):
                revisar_texto(ruta, inicio + linea_de(codigo, posicion) - 1, cadena, hallazgos, cadena_js=True)
    return hallazgos


def autoprueba():
    """Comprueba los detectores con ejemplos conocidos antes de usarlos."""
    errores = []

    def esperar(nombre, obtenido, esperado):
        if obtenido != esperado:
            errores.append(f'{nombre}: dio {obtenido}, se esperaba {esperado}')

    css = '#abc { color: var(--texto, #fff); }\n.a { color: #12ab34; background: rgb(1, 2, 3); }\n/* #ffffff */'
    esperar('CSS', [v for _, v in colores_en(sin_comentarios(css, COMENTARIO_CSS), 'css')], ['#12ab34', 'rgb('])
    js = 'const a = "#ff0000"; // #00ff00\nel.querySelector("#abc"); const b = `rgb(${x})`; const r = /["#]/;'
    esperar('JS', [v for _, v in colores_en(sin_comentarios_js(js), 'js')], ['#ff0000', 'rgb('])
    html = '<a href="#abc">Ir</a><!-- #ffffff --><p style="color:#abcdef">x</p>'
    esperar('HTML', [v for _, v in colores_en(sin_comentarios(html, COMENTARIO_HTML), 'html')], ['#abcdef'])
    hallazgos = {'prohibido': [], 'exclamacion': []}
    revisar_texto('x.js', 1, 'if (!a) return', hallazgos, cadena_js=True)
    revisar_texto('x.js', 1, ':not(.a)', hallazgos, cadena_js=True)
    revisar_texto('x.js', 1, 'Listo!', hallazgos, cadena_js=True)
    revisar_texto('x.html', 1, 'Hermosillo es un oasis', hallazgos)
    esperar('textos', (len(hallazgos['prohibido']), len(hallazgos['exclamacion'])), (1, 1))
    lector = LectorHTML()
    lector.feed('<p title="¡Hola">a</p><script>var s = "salud";</script><style>p{}</style>')
    esperar('HTML visible', [t for _, t in lector.textos], ['¡Hola', 'a'])
    esperar('scripts en línea', [list(cadenas_js(c)) for _, c in lector.scripts], [[(9, 'salud')]])
    return errores


# ---------------------------------------------------------------------------
# Ejecución
# ---------------------------------------------------------------------------

class Resultado:
    def __init__(self, nombre, estado, detalle='', lineas=()):
        self.nombre, self.estado, self.detalle, self.lineas = nombre, estado, detalle, list(lineas)


def correr(raiz, comando):
    entorno = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONUTF8='1')
    try:
        proceso = subprocess.run(comando, cwd=raiz, capture_output=True, env=entorno)
    except OSError as error:
        return None, f'no se pudo ejecutar {comando[0]}: {error}'
    salida = (proceso.stdout + proceso.stderr).decode('utf-8', errors='replace')
    return proceso.returncode, salida.strip()


def prueba(raiz, nombre, comando):
    codigo, salida = correr(raiz, comando)
    lineas = salida.splitlines()
    if codigo == 0:
        return Resultado(nombre, 'PASA', lineas[-1] if lineas else '')
    detalle = salida if codigo is None else f'código {codigo}'
    return Resultado(nombre, 'FALLA', detalle, lineas[-15:] if codigo is not None else [])


def aceptacion_reales(raiz):
    nombre = 'Aceptación Vía B, datos reales'
    codigo, salida = correr(raiz, [sys.executable, 'via-b/pruebas/aceptacion.py', 'via-b/datos/reales/'])
    if codigo is None:
        return Resultado(nombre, 'FALLA', salida)
    pasan = re.findall(r'^PASA (.+?):', salida, re.M)
    fallan = re.findall(r'^FALLA (.+?):', salida, re.M)
    inesperadas = [f for f in fallan if f not in FALLAS_CONOCIDAS_REALES]
    resumen = f'{len(pasan)} PASA, {len(fallan)} FALLA'
    if inesperadas or (codigo != 0 and not fallan):
        return Resultado(nombre, 'FALLA', f'{resumen}; fallas no esperadas: {", ".join(inesperadas) or "sin detalle"}',
                         [l for l in salida.splitlines() if l.startswith('FALLA')])
    if not fallan:
        return Resultado(nombre, 'PASA', f'{resumen}. Quita FALLAS_CONOCIDAS_REALES de verificar.py')
    lineas = [f'{f}: {FALLAS_CONOCIDAS_REALES[f]}' for f in fallan]
    ya_pasan = [f for f in FALLAS_CONOCIDAS_REALES if f in pasan]
    if ya_pasan:
        lineas.append(f'Ya pasan y se pueden quitar de la lista: {", ".join(ya_pasan)}')
    return Resultado(nombre, 'AVISO', f'{resumen}; fallas conocidas por D18 (NASA GIBS)', lineas)


def verificar(raiz=RAIZ):
    raiz = Path(raiz).resolve()
    py = sys.executable
    resultados = []

    casos = prueba(raiz, 'Casos de tendencia (Python)', [py, 'via-a/pruebas/generar_casos.py'])
    resultados.append(casos)
    if casos.estado == 'PASA':
        resultados.append(prueba(raiz, 'Tendencia JavaScript igual a Python', ['node', 'via-a/pruebas/probar_tendencia.cjs']))
    else:
        resultados.append(Resultado('Tendencia JavaScript igual a Python', 'FALLA', 'no corrió: fallaron los casos'))
    resultados.append(prueba(raiz, 'Procesamiento Vía B', [py, 'via-b/procesamiento/probar_procesamiento.py']))
    resultados.append(prueba(raiz, 'Esquema, datos de prueba', [py, 'via-b/datos/validar.py', 'via-b/datos/prueba/']))
    resultados.append(prueba(raiz, 'Esquema, datos reales', [py, 'via-b/datos/validar.py', 'via-b/datos/reales/']))
    resultados.append(prueba(raiz, 'Aceptación Vía B, datos de prueba', [py, 'via-b/pruebas/aceptacion.py', 'via-b/datos/prueba/']))
    resultados.append(aceptacion_reales(raiz))

    errores = autoprueba()
    if errores:
        resultados.append(Resultado('Detectores de verificar.py', 'FALLA', f'{len(errores)} errores', errores))
    else:
        rutas = archivos(raiz)
        colores = revisar_colores(raiz, rutas)
        resultados.append(Resultado('Colores fuera de tokens',
                                    'FALLA' if colores else 'PASA',
                                    f'{len(colores)} hallazgos' if colores else 'ninguno fuera de las excepciones',
                                    colores))
        textos = revisar_textos(raiz, rutas)
        for clave, nombre, ok in (
            ('prohibido', 'Textos prohibidos', 'sin oasis, salud, temperatura del aire ni calidad de vida'),
            ('exclamacion', 'Signos de exclamación', 'ninguno en texto visible'),
        ):
            lista = textos[clave]
            resultados.append(Resultado(nombre, 'FALLA' if lista else 'PASA',
                                        f'{len(lista)} hallazgos' if lista else ok, lista))

    ancho = max(len(r.nombre) for r in resultados)
    print('SunCity: verificación\n')
    for r in resultados:
        print(f'{r.estado:<6} {r.nombre:<{ancho}}  {r.detalle}')
        for linea in r.lineas:
            print(f'         {linea}')
    cuenta = {e: sum(r.estado == e for r in resultados) for e in ('PASA', 'AVISO', 'FALLA')}
    codigo = 1 if cuenta['FALLA'] else 0
    print(f'\nResumen: {cuenta["PASA"]} PASA, {cuenta["AVISO"]} AVISO, {cuenta["FALLA"]} FALLA. Código {codigo}.')
    if cuenta['AVISO']:
        print('Los avisos son fallas conocidas y registradas; no cambian el código de salida.')
    return codigo


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(verificar())
