"""Pruebas del verificador; no requieren servicios ni paquetes externos."""
import contextlib
import importlib.util
import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

RAIZ = Path(__file__).resolve().parents[2]


class Verificador(unittest.TestCase):
    def setUp(self):
        self.assertTrue((RAIZ / 'verificar.py').exists(), 'Falta el verificador C1')
        spec = importlib.util.spec_from_file_location('verificar', RAIZ / 'verificar.py')
        self.modulo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.modulo)
        self.temporal = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporal.cleanup)
        self.raiz = Path(self.temporal.name)

    def escribir(self, ruta, texto):
        archivo = self.raiz / ruta
        archivo.parent.mkdir(parents=True, exist_ok=True)
        archivo.write_text(texto, encoding='utf-8')

    def test_colores_y_exclusiones(self):
        for ruta in ('compartido/tokens.css', 'compartido/vendor/mapa.js',
                     'via-b/datos/esquema.js', 'via-b/pruebas/ejemplo.js'):
            self.escribir(ruta, 'const color = "#abcdef";')
        self.escribir('via-a/estilos.css', '#abc { color: var(--texto); }')
        self.escribir('via-a/index.html', '<a href="#abc">Ir</a>')
        self.escribir('via-a/app.js', 'document.querySelector("#abc"); document.querySelectorAll("#abcd");')
        self.assertEqual([], self.modulo.revisar_fuentes(self.raiz))
        self.escribir('via-b/app.js', 'const colores = ["#abc", "#abcd", "#abcdef", "#abcdef12"];')
        fallos = self.modulo.revisar_fuentes(self.raiz)
        self.assertEqual(4, len(fallos))
        self.assertTrue(all('via-b/app.js:1' in f for f in fallos))

    def test_textos_riesgosos_y_limites_legitimos(self):
        self.escribir('README.md', 'No se afirma que Hermosillo sea un oasis de día frente al desierto.')
        self.escribir('via-a/app.js', 'const definicion = "Temperatura del aire a 2 m";')
        self.escribir('via-b/index.html', '<p>No mide salud ni temperatura del aire.</p>')
        self.assertEqual([], self.modulo.revisar_fuentes(self.raiz))
        self.escribir('via-b/index.html', '<p>Hermosillo es un <b>oasis</b> de día.</p>')
        self.escribir('via-a/app.js', 'const mensaje = "SunCity mejora la calidad de vida";')
        self.assertEqual(2, len(self.modulo.revisar_fuentes(self.raiz)))

    def test_negaciones_acotadas_y_sensores(self):
        texto = ('Sin duda, Hermosillo es un oasis. '
                 'No es solo un mapa, SunCity mejora la calidad de vida. '
                 'Las variantes son pruebas independientes. Yale es otro sensor.')
        self.assertEqual(4, len(list(self.modulo.afirmaciones(texto))))
        limites = ('No se afirma que Hermosillo sea un oasis. '
                   'Las variantes no son pruebas independientes. '
                   'No se afirma que Yale sea otro sensor.')
        self.assertEqual([], list(self.modulo.afirmaciones(limites)))

    def test_colores_en_gradiente(self):
        self.escribir('via-a/estilo.css', 'p { background: linear-gradient(#fff, #aaa); }')
        self.assertEqual(2, len(self.modulo.revisar_fuentes(self.raiz)))

    def test_afirmacion_en_script_inline(self):
        self.escribir('index.html', '<script>document.body.textContent = "Hermosillo es un oasis";</script>')
        self.assertEqual(1, len(self.modulo.revisar_fuentes(self.raiz)))

    def test_salto_de_linea_dentro_de_parrafo(self):
        self.escribir('index.html', '<p>Hermosillo es un\n oasis de día.</p>')
        self.assertEqual(1, len(self.modulo.revisar_fuentes(self.raiz)))
        self.escribir('index.html', '<p>No se afirma que</p><p>Hermosillo es un oasis.</p>')
        self.assertEqual(1, len(self.modulo.revisar_fuentes(self.raiz)))

    def test_pseudoclase_css_no_es_color(self):
        self.escribir('via-a/estilo.css', '.boton:not(#abc) { color:var(--texto); }')
        self.assertEqual([], self.modulo.revisar_fuentes(self.raiz))

    def test_fallo_de_generador_no_usa_casos_viejos_y_continua(self):
        with patch.object(self.modulo.subprocess, 'run', side_effect=[
            subprocess.CompletedProcess([], 1), subprocess.CompletedProcess([], 0),
            subprocess.CompletedProcess([], 0), subprocess.CompletedProcess([], 0),
        ]) as correr, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(1, self.modulo.verificar(self.raiz))
        self.assertEqual(4, correr.call_count)
        self.assertFalse(any('probar_tendencia.cjs' in str(c) for c in correr.call_args_list))
        self.assertTrue(all(c.kwargs['cwd'] == self.raiz for c in correr.call_args_list))
        self.assertTrue(all(c.kwargs['shell'] is False for c in correr.call_args_list))

    def test_dependencia_ausente_no_aborta_el_resto(self):
        with patch.object(self.modulo.subprocess, 'run', side_effect=[
            subprocess.CompletedProcess([], 0), FileNotFoundError('node'),
            subprocess.CompletedProcess([], 0), subprocess.CompletedProcess([], 0),
            subprocess.CompletedProcess([], 0),
        ]) as correr, contextlib.redirect_stdout(io.StringIO()) as salida:
            self.assertEqual(1, self.modulo.verificar(self.raiz))
        self.assertEqual(5, correr.call_count)
        self.assertIn('node', salida.getvalue())

    def test_cero_solo_si_todo_pasa(self):
        with patch.object(self.modulo.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(0, self.modulo.verificar(self.raiz))
            self.escribir('metodo/estilo.css', 'p { color: #123456; }')
            self.assertEqual(1, self.modulo.verificar(self.raiz))


if __name__ == '__main__':
    unittest.main()
