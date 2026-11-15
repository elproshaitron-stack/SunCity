"""Genera los PNG de la marca a partir de las mismas formas que icono.svg.

    python compartido/marca/generar.py

Sin dependencias: dibuja con supermuestreo y escribe PNG con zlib. Los colores son los
primitivos de compartido/tokens.css (noche-900, arena del globo, brasa-500, luz-50).
"""
from pathlib import Path
import math
import struct
import zlib

AQUI = Path(__file__).resolve().parent

NOCHE = (10, 16, 36)        # --noche-900
NOCHE_700 = (28, 42, 85)    # --noche-700
ARENA = (220, 193, 149)     # tierra del globo (#dcc195)
BRASA = (255, 90, 31)       # --brasa-500
HORIZONTE = (242, 178, 122)  # horizonte del globo (#f2b27a)


def png(ruta, ancho, alto, pixeles):
    filas = b''.join(b'\x00' + bytes(pixeles[y * ancho * 4:(y + 1) * ancho * 4]) for y in range(alto))
    def bloque(tipo, datos):
        return struct.pack('>I', len(datos)) + tipo + datos + struct.pack('>I', zlib.crc32(tipo + datos) & 0xffffffff)
    contenido = (b'\x89PNG\r\n\x1a\n' + bloque(b'IHDR', struct.pack('>IIBBBBB', ancho, alto, 8, 6, 0, 0, 0))
                 + bloque(b'IDAT', zlib.compress(filas, 9)) + bloque(b'IEND', b''))
    Path(ruta).write_bytes(contenido)


def dibujar(ancho, alto, color_en, muestras=3):
    """color_en(x, y) -> (r, g, b, a) en coordenadas de píxel; promedia muestras² por píxel."""
    pix = bytearray(ancho * alto * 4)
    paso = 1 / muestras
    for y in range(alto):
        for x in range(ancho):
            r = g = b = a = 0.0
            for j in range(muestras):
                for i in range(muestras):
                    cr, cg, cb, ca = color_en(x + (i + .5) * paso, y + (j + .5) * paso)
                    r += cr * ca; g += cg * ca; b += cb * ca; a += ca
            n = muestras * muestras
            k = (y * ancho + x) * 4
            if a:
                pix[k:k + 4] = bytes((round(r / a), round(g / a), round(b / a), round(255 * a / n)))
    return pix


def dentro_redondeado(x, y, w, h, radio):
    cx = min(max(x, radio), w - radio)
    cy = min(max(y, radio), h - radio)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radio ** 2


def icono(lado, redondo=True):
    """La marca en una rejilla de 32: fondo noche, globo de arena (r 9) y punto brasa (r 3 en 19,13).
    Con redondo=False el fondo llena el cuadro y la figura se encoge a la zona segura de un ícono adaptable."""
    escala = lado / 32
    figura = 1.0 if redondo else 0.78
    def color(x, y):
        u, v = x / escala, y / escala
        if redondo and not dentro_redondeado(u, v, 32, 32, 8):
            return (0, 0, 0, 0)
        u = 16 + (u - 16) / figura; v = 16 + (v - 16) / figura
        if (u - 19) ** 2 + (v - 13) ** 2 <= 9:
            return BRASA + (1,)
        if (u - 16) ** 2 + (v - 16) ** 2 <= 81:
            return ARENA + (1,)
        return NOCHE + (1,)
    return dibujar(lado, lado, color)


def compartir(ancho=1200, alto=630):
    """Imagen para enlaces compartidos: el globo de la marca sobre el cielo nocturno, con halo de horizonte."""
    cx, cy, r = 860, 315, 230
    estrellas = [(120, 90), (260, 470), (430, 140), (90, 330), (560, 560), (640, 70), (1130, 120), (1110, 540), (330, 300), (520, 380)]
    def color(x, y):
        d = math.hypot(x - cx, y - cy)
        if (x - (cx + 75)) ** 2 + (y - (cy - 75)) ** 2 <= 46 ** 2:
            return BRASA + (1,)
        if d <= r:
            return ARENA + (1,)
        if d <= r + 10:
            t = (d - r) / 10
            return tuple(round(h * (1 - t) + n * t) for h, n in zip(HORIZONTE, NOCHE_700)) + (1,)
        for ex, ey in estrellas:
            if (x - ex) ** 2 + (y - ey) ** 2 <= 4:
                return (245, 236, 217, 1)
        t = min(1, d / 900)
        return tuple(round(a * (1 - t) + b * t) for a, b in zip(NOCHE_700, NOCHE)) + (1,)
    return dibujar(ancho, alto, color, muestras=2)


if __name__ == '__main__':
    for lado in (180, 192, 512):
        png(AQUI / f'icono-{lado}.png', lado, lado, icono(lado))
    png(AQUI / 'icono-adaptable-512.png', 512, 512, icono(512, redondo=False))
    png(AQUI / 'compartir.png', 1200, 630, compartir())
    print('Listo:', ', '.join(sorted(p.name for p in AQUI.glob('*.png'))))
