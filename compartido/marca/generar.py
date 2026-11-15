"""Genera los archivos de la marca a partir de logo-original.webp.

    python compartido/marca/generar.py

Necesita Pillow (solo para generar; el sitio no lo usa). El original trae fondo
transparente: el pin (sol, saguaro y ciudad) arriba y la palabra SunCity en blanco abajo.

Salidas:
  logo-96.png, logo-512.png   el pin solo, transparente: barra y portada
  icono-48.png                ícono de pestaña
  icono-180.png               ícono de Apple, con fondo de papel
  icono-192.png, icono-512.png   íconos del manifest, transparentes
  icono-adaptable-512.png     ícono adaptable: el pin dentro de la zona segura, fondo de papel
  compartir.png               1200 × 630 para enlaces compartidos: logo completo sobre la noche
"""
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).resolve().parent
PAPEL = (251, 246, 236, 255)    # --arena-50
NOCHE = (10, 16, 36)            # --noche-900
NOCHE_700 = (28, 42, 85)        # --noche-700


def recortar(img, umbral=40):
    """Recorta a los píxeles con alfa mayor que el umbral (el original tiene polvo casi transparente)."""
    caja = img.getchannel('A').point(lambda a: 255 if a > umbral else 0).getbbox()
    return img.crop(caja)


def en_cuadro(img, lado, relleno=0.0, fondo=(0, 0, 0, 0)):
    """Centra la imagen en un cuadro de lado × lado, dejando `relleno` (fracción) de margen."""
    util = round(lado * (1 - 2 * relleno))
    escala = min(util / img.width, util / img.height)
    chica = img.resize((max(1, round(img.width * escala)), max(1, round(img.height * escala))), Image.LANCZOS)
    lienzo = Image.new('RGBA', (lado, lado), fondo)
    lienzo.alpha_composite(chica, ((lado - chica.width) // 2, (lado - chica.height) // 2))
    return lienzo


def fondo_noche(ancho, alto):
    """Degradado radial de la noche, como el escenario del sitio."""
    chico = Image.new('RGB', (ancho // 8, alto // 8))
    px = chico.load()
    cx, cy = chico.width * .5, chico.height * .46
    radio = max(chico.width, chico.height) * .75
    for y in range(chico.height):
        for x in range(chico.width):
            t = min(1, ((x - cx) ** 2 + (y - cy) ** 2) ** .5 / radio)
            px[x, y] = tuple(round(a * (1 - t) + b * t) for a, b in zip(NOCHE_700, NOCHE))
    return chico.resize((ancho, alto), Image.BICUBIC).convert('RGBA')


def main():
    original = Image.open(AQUI / 'logo-original.webp').convert('RGBA')
    # El pin es la parte con color; la palabra es blanca y queda debajo
    alto_pin = next(y for y in range(original.height - 1, 0, -1)
                    if any(a > 128 and max(r, g, b) - min(r, g, b) > 60
                           for r, g, b, a in (original.getpixel((x, y)) for x in range(0, original.width, 4))))
    pin = recortar(original.crop((0, 0, original.width, alto_pin + 12)))
    completo = recortar(original)

    en_cuadro(pin, 96).save(AQUI / 'logo-96.png')
    en_cuadro(pin, 512).save(AQUI / 'logo-512.png')
    en_cuadro(pin, 48).save(AQUI / 'icono-48.png')
    en_cuadro(pin, 192, relleno=.04).save(AQUI / 'icono-192.png')
    en_cuadro(pin, 512, relleno=.04).save(AQUI / 'icono-512.png')
    en_cuadro(pin, 180, relleno=.12, fondo=PAPEL).convert('RGB').save(AQUI / 'icono-180.png')
    en_cuadro(pin, 512, relleno=.2, fondo=PAPEL).convert('RGB').save(AQUI / 'icono-adaptable-512.png')

    tarjeta = fondo_noche(1200, 630)
    escala = 540 / completo.height
    logo = completo.resize((round(completo.width * escala), 540), Image.LANCZOS)
    tarjeta.alpha_composite(logo, ((1200 - logo.width) // 2, (630 - logo.height) // 2))
    tarjeta.convert('RGB').save(AQUI / 'compartir.png', optimize=True)

    print('Listo:', ', '.join(sorted(p.name for p in AQUI.glob('*.png'))))


if __name__ == '__main__':
    main()
