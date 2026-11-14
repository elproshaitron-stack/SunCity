"""Servidor estático del repositorio: python servir.py [puerto]."""
import argparse
import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
from pathlib import Path
import sys


RAIZ = Path(__file__).resolve().parent


class Servidor(ThreadingHTTPServer):
    # En Windows, SO_REUSEADDR puede permitir dos servidores en el mismo puerto.
    allow_reuse_address = False


class Manejador(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    argumentos = argparse.ArgumentParser(description=__doc__)
    argumentos.add_argument('puerto', nargs='?', type=int, default=8000)
    puerto = argumentos.parse_args().puerto
    if not 1 <= puerto <= 65535:
        argumentos.error('El puerto debe estar entre 1 y 65535.')

    for extension, tipo in {
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.geojson': 'application/json',
        '.json': 'application/json',
        '.csv': 'text/csv',
        '.svg': 'image/svg+xml',
    }.items():
        mimetypes.add_type(tipo, extension)

    manejador = partial(Manejador, directory=str(RAIZ))
    try:
        servidor = Servidor(('127.0.0.1', puerto), manejador)
    except OSError as error:
        if error.errno == errno.EADDRINUSE or getattr(error, 'winerror', None) == 10048:
            print(f'El puerto {puerto} está ocupado. Usa otro puerto: python servir.py {puerto + 1 if puerto < 65535 else 8000}', file=sys.stderr)
        else:
            print(f'No se pudo iniciar el servidor en el puerto {puerto}: {error}', file=sys.stderr)
        return 1

    with servidor:
        print(f'http://localhost:{puerto}/via-b/', flush=True)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            print('\nServidor detenido.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
