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
    # Las dos vías cargan varios recursos locales en paralelo.
    request_queue_size = 64


class Manejador(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        # Igual que en el sitio publicado: una ruta que no existe muestra 404.html
        pagina = RAIZ / '404.html'
        if code != 404 or self.command not in ('GET', 'HEAD') or not pagina.is_file():
            return super().send_error(code, message, explain)
        cuerpo = pagina.read_bytes()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        if self.command == 'GET':
            self.wfile.write(cuerpo)


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
        '.webmanifest': 'application/manifest+json',
        '.md': 'text/markdown; charset=utf-8',
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
