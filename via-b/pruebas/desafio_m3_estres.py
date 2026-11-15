"""
Suite de Pruebas de Estrés Empírico - Milestone M3 (Tareas B3 y B5)
Enfoque de Adversarial Review:
1. Simulación de CSV dañado/corrupto y cabeceras inválidas
2. Simulación de fallos de red 404 / 500 / abort
3. Simulación de sector sin cálculo (mock GeoJSON)
4. Simulación de ciclo diario parcial y nulo
5. Dimensiones táctiles (>=44px), teclado y accesibilidad
"""
import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
import sys
import threading
import time

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]

for ext, tipo in {
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.geojson': 'application/json',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.svg': 'image/svg+xml',
}.items():
    mimetypes.add_type(tipo, ext)


class Manejador(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format, *args):
        # Silenciar logs normales del servidor HTTP
        pass


def iniciar_servidor():
    manejador = partial(Manejador, directory=str(RAIZ))
    servidor = ThreadingHTTPServer(('127.0.0.1', 0), manejador)
    puerto = servidor.server_port
    hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
    hilo.start()
    return servidor, puerto


def run_tests():
    servidor, puerto = iniciar_servidor()
    base_url = f"http://127.0.0.1:{puerto}/via-b/"
    print(f"[TEST RUNNER] Servidor HTTP activo en {base_url}")

    resultados = []

    def registrar(nombre, paso, detalle=""):
        simbolo = "✓ PASA" if paso else "✗ FALLA"
        print(f"[{simbolo}] {nombre}: {detalle}")
        resultados.append({"nombre": nombre, "paso": paso, "detalle": detalle})

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)

        # ======================================================================
        # TEST 1: CSV Corrupto - Comillas sin cerrar en resultados.csv
        # ======================================================================
        print("\n--- TEST 1: CSV Corrupto (Comillas sin cerrar) ---")
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda m: print("PAGE CONSOLE:", m.type, m.text))
        page.on("pageerror", lambda e: print("PAGE ERROR:", e))

        corrupto_quotes = 'sector,variante,n_anios,pendiente_c_decada,ic95_inf,ic95_sup,p_mk,p_hamed_rao,p,p_fdr\nS01,"primario,19,0.45,0.1,0.8,0.01,0.01,0.01,0.02\n'

        def handle_resultados_corrupto(route):
            url = route.request.url
            if "resultados.csv" in url:
                print(f"[ROUTE] Fulfilling corrupt CSV for {url}")
                route.fulfill(status=200, content_type="text/csv", body=corrupto_quotes)
            else:
                route.continue_()

        page.route("**/datos/**", handle_resultados_corrupto)
        page.goto(base_url)
        page.wait_for_timeout(2000)

        # Verificar visibilidad y atributos de alerta
        alerta = page.locator("#alerta-error")
        es_visible = alerta.is_visible()
        rol = alerta.get_attribute("role")
        aria_live = alerta.get_attribute("aria-live")
        titulo = page.locator("#error-titulo").text_content()
        mensaje = page.locator("#error-mensaje").text_content()

        registrar("1.1 Alerta visible con CSV corrupto", es_visible, f"Visible: {es_visible}")
        registrar("1.2 Alerta role='alert'", rol == "alert", f"role={rol}")
        registrar("1.3 Alerta aria-live='assertive'", aria_live == "assertive", f"aria-live={aria_live}")
        registrar("1.4 Clasificación error comillas", "Archivo de datos dañado" in titulo, f"Título: {titulo} | Msg: {mensaje}")

        # Dimensiones de botón #error-reintentar
        btn_reintentar = page.locator("#error-reintentar")
        box = btn_reintentar.bounding_box()
        registrar("1.5 Botón reintentar visible", box is not None and box["width"] > 0, f"Box: {box}")
        if box:
            registrar("1.6 Botón reintentar >= 44x44px", box["width"] >= 44 and box["height"] >= 44,
                      f"width={box['width']:.1f}px, height={box['height']:.1f}px")

        # 1.7 Prueba de recuperación interactiva mediante Reintentar
        corrupto_activo = [False] # deshabilitar corrupción
        page.unroute("**/datos/**")
        btn_reintentar.click()
        page.wait_for_selector("#alerta-error", state="hidden")
        registrar("1.7 Botón reintentar recupera la UI y oculta la alerta", not alerta.is_visible())

        context.close()

        # ======================================================================
        # TEST 2: CSV con Cabecera Incompatible / Columna Faltante
        # ======================================================================
        print("\n--- TEST 2: CSV con Columna Faltante ---")
        context = browser.new_context()
        page = context.new_page()

        corrupto_header = 'sector,variante,n_anios,pendiente_c_decada\nS01,primario,19,0.45\n'

        def handle_header_invalido(route):
            if "resultados.csv" in route.request.url:
                route.fulfill(status=200, content_type="text/csv", body=corrupto_header)
            else:
                route.continue_()

        page.route("**/via-b/datos/**", handle_header_invalido)
        page.goto(base_url)
        page.wait_for_selector("#alerta-error", state="attached")

        titulo = page.locator("#error-titulo").text_content()
        mensaje = page.locator("#error-mensaje").text_content()
        registrar("2.1 Detección de columna faltante", "Formato incompatible" in titulo, f"Título: {titulo} | Msg: {mensaje}")
        registrar("2.2 Mensaje menciona columna faltante", "Falta la columna" in mensaje, f"Msg: {mensaje}")
        context.close()

        # ======================================================================
        # TEST 3: Fallos de Red 404 y 500
        # ======================================================================
        print("\n--- TEST 3: Fallos de Red (404 en GeoJSON y 500 en resultados.csv) ---")
        # 3A: 404 en sectores.geojson
        context = browser.new_context()
        page = context.new_page()

        def handle_404(route):
            if "sectores.geojson" in route.request.url:
                route.fulfill(status=404, body="Not Found")
            else:
                route.continue_()

        page.route("**/via-b/datos/**", handle_404)
        page.goto(base_url)
        page.wait_for_selector("#alerta-error", state="attached")
        titulo_404 = page.locator("#error-titulo").text_content()
        registrar("3.1 Error 404 clasificado como archivo no disponible", "Archivo no disponible" in titulo_404, f"Título: {titulo_404}")
        context.close()

        # 3B: 500 en resultados.csv
        context = browser.new_context()
        page = context.new_page()

        def handle_500(route):
            if "resultados.csv" in route.request.url:
                route.fulfill(status=500, body="Internal Server Error")
            else:
                route.continue_()

        page.route("**/via-b/datos/**", handle_500)
        page.goto(base_url)
        page.wait_for_selector("#alerta-error", state="attached")
        titulo_500 = page.locator("#error-titulo").text_content()
        registrar("3.2 Error 500 clasificado como fallo de servidor", "Fallo en el servidor" in titulo_500, f"Título: {titulo_500}")
        context.close()

        # ======================================================================
        # TEST 4: Sector sin Cálculo (Mock GeoJSON con sector no calculado S99)
        # ======================================================================
        print("\n--- TEST 4: Sector sin Cálculo (Mock S99) ---")
        context = browser.new_context()
        page = context.new_page()

        with open(RAIZ / "via-b/datos/prueba/sectores.geojson", encoding="utf-8") as gf:
            geojson_data = json.load(gf)

        # Inyectar sector S99 sin cálculo
        mock_feature = {
            "type": "Feature",
            "properties": {
                "id": "S99",
                "nombre": "Sector Desértico 99",
                "tipo": "sector",
                "poblacion": 4200
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-110.99, 29.05],
                    [-110.98, 29.05],
                    [-110.98, 29.06],
                    [-110.99, 29.06],
                    [-110.99, 29.05]
                ]]
            }
        }
        geojson_data["features"].append(mock_feature)
        mock_geojson_str = json.dumps(geojson_data)

        def handle_mock_geojson(route):
            if "sectores.geojson" in route.request.url:
                route.fulfill(status=200, content_type="application/json", body=mock_geojson_str)
            else:
                route.continue_()

        page.route("**/datos/**", handle_mock_geojson)
        page.goto(base_url)

        # Conmutar a la vista de tabla
        page.wait_for_selector("#tab-tabla")
        page.click("#tab-tabla")
        page.wait_for_selector("#tabla-sectores")

        # Verificar presencia de fila S99
        fila_s99 = page.locator('tr[data-sector-id="S99"]')
        tiene_s99 = fila_s99.count() == 1
        registrar("4.1 Fila S99 existe en tabla", tiene_s99, f"Encontrada fila S99: {tiene_s99}")

        # Comprobar columnas de S99
        cambio_s99 = fila_s99.locator('td[data-etiqueta="Cambio/década"]').text_content().strip()
        ic_s99 = fila_s99.locator('td[data-etiqueta="IC 95 %"]').text_content().strip()
        p_s99 = fila_s99.locator('td[data-etiqueta="p ajustado"]').text_content().strip()
        estado_s99 = fila_s99.locator('td[data-etiqueta="Estado"]').text_content().strip()

        registrar("4.2 S99 cambio/década es '—'", cambio_s99 == "—", f"cambio={cambio_s99}")
        registrar("4.3 S99 IC 95 % es '—'", ic_s99 == "—", f"ic={ic_s99}")
        registrar("4.4 S99 p ajustado es '—'", p_s99 == "—", f"p={p_s99}")
        registrar("4.5 S99 estado es '○ Sin cálculo'", "Sin cálculo" in estado_s99, f"estado={estado_s99}")

        # Ordenar por cambio/década ASC y DESC (nulls-to-bottom test)
        btn_ord_cambio = page.locator('button[data-columna="cambio"]')
        btn_ord_cambio.click() # primer clic: desc
        filas = page.locator("#cuerpo-tabla-sectores tr.fila-sector")
        ultima_fila_id_desc = filas.last.get_attribute("data-sector-id")
        registrar("4.6 Nulls-to-bottom en orden DESC", ultima_fila_id_desc == "S99", f"Última fila DESC: {ultima_fila_id_desc}")

        btn_ord_cambio.click() # segundo clic: asc
        filas = page.locator("#cuerpo-tabla-sectores tr.fila-sector")
        ultima_fila_id_asc = filas.last.get_attribute("data-sector-id")
        registrar("4.7 Nulls-to-bottom en orden ASC", ultima_fila_id_asc == "S99", f"Última fila ASC: {ultima_fila_id_asc}")

        # Clic en fila S99 para abrir expediente
        fila_s99.click()
        page.wait_for_selector("#expediente:not([hidden])")

        exp_visible = page.locator("#expediente").is_visible()
        registrar("4.8 Expediente se abre para S99", exp_visible, f"Visible: {exp_visible}")

        # Comprobar aviso sin cálculo en serie y expediente
        aviso_serie = page.locator("#serie-anual .sc-aviso--info").text_content()
        registrar("4.9 Aviso en serie anual sin cálculo", "No hay datos suficientes" in aviso_serie, f"Serie: {aviso_serie}")

        insignia_estado = page.locator("#lectura .sc-insignia--sin-calculo").text_content()
        registrar("4.10 Insignia sin cálculo en expediente", "Sin cálculo" in insignia_estado, f"Insignia: {insignia_estado}")

        context.close()

        # ======================================================================
        # TEST 5: Ciclo Diario con Datos Parciales y Nulos
        # ======================================================================
        print("\n--- TEST 5: Ciclo Diario Parcial y Nulo ---")
        context = browser.new_context()
        page = context.new_page()

        # Inyectar ciclo diario parcial: solo terra_1030 para S01
        lineas_ciclo_parcial = [
            "sector_id,paso,producto,delta_c,yale_signo",
            "S01,terra_1030,MOD11,-1.25,+",
            "S01,terra_1030,MOD21,-0.85,+"
        ]
        ciclo_parcial_csv = "\n".join(lineas_ciclo_parcial) + "\n"

        def handle_ciclo_parcial(route):
            if "ciclo_diario.csv" in route.request.url:
                route.fulfill(status=200, content_type="text/csv", body=ciclo_parcial_csv)
            else:
                route.continue_()

        page.route("**/datos/**", handle_ciclo_parcial)
        page.goto(f"{base_url}?sector=S01")
        page.wait_for_selector("#expediente:not([hidden])")

        # Verificar aviso de advertencia en ciclo-diario
        aviso_parcial = page.locator("#ciclo-diario .sc-aviso--advertencia")
        tiene_aviso = aviso_parcial.count() > 0
        texto_parcial = aviso_parcial.text_content() if tiene_aviso else ""
        registrar("5.1 Banner de datos parciales presente", tiene_aviso, f"Texto: {texto_parcial}")
        registrar("5.2 Banner lista pasos disponibles", "10:30" in texto_parcial, f"Texto: {texto_parcial}")

        # Comprobar que el SVG se dibuja para el paso disponible
        svg_ciclo = page.locator("#ciclo-diario svg")
        tiene_svg = svg_ciclo.count() > 0
        registrar("5.3 SVG de ciclo diario dibujado", tiene_svg, f"SVG count: {svg_ciclo.count()}")

        # Comprobar que los pasos ausentes dicen 'Sin dato'
        textos_sin_dato = page.locator("#ciclo-diario svg text:has-text('Sin dato')")
        registrar("5.4 Etiquetas 'Sin dato' en pasos ausentes", textos_sin_dato.count() == 3, f"Count 'Sin dato': {textos_sin_dato.count()}")

        # 5.5 Ciclo diario sin ninguna medición (0 pasos válidos)
        page.route("**/datos/**", lambda route: route.fulfill(status=200, content_type="text/csv", body="sector_id,paso,producto,delta_c,yale_signo\n") if "ciclo_diario.csv" in route.request.url else route.continue_())
        page.goto(f"{base_url}?sector=S01")
        page.wait_for_selector("#expediente:not([hidden])")
        aviso_vacio = page.locator("#ciclo-diario .sc-aviso--info").text_content()
        registrar("5.5 Aviso informativo cuando no hay mediciones de ciclo", "No hay mediciones" in aviso_vacio, f"Aviso: {aviso_vacio}")
        registrar("5.6 No se genera SVG cuando no hay mediciones", page.locator("#ciclo-diario svg").count() == 0)

        context.close()

        # ======================================================================
        # TEST 6: Ergonomía Móvil (375 px) y Objetivos Táctiles
        # ======================================================================
        print("\n--- TEST 6: Ergonomía Móvil y Objetivos Táctiles (375 px) ---")
        context = browser.new_context(viewport={"width": 375, "height": 667})
        page = context.new_page()
        page.goto(base_url)
        page.wait_for_selector("#tab-tabla")

        # 6.1 Conmutador de vistas
        btn_mapa = page.locator("#tab-mapa")
        btn_tabla = page.locator("#tab-tabla")
        box_tab_m = btn_mapa.bounding_box()
        box_tab_t = btn_tabla.bounding_box()

        registrar("6.1 Objetivo táctil Tab Mapa >= 44x44px", box_tab_m["width"] >= 44 and box_tab_m["height"] >= 44,
                  f"Mapa tab: {box_tab_m['width']:.1f}x{box_tab_m['height']:.1f}px")
        registrar("6.2 Objetivo táctil Tab Tabla >= 44x44px", box_tab_t["width"] >= 44 and box_tab_t["height"] >= 44,
                  f"Tabla tab: {box_tab_t['width']:.1f}x{box_tab_t['height']:.1f}px")

        # Conmutar a vista de tabla a 375 px
        btn_tabla.click()
        page.wait_for_selector("#tabla-sectores")

        # Comprobar desbordamiento horizontal a 375 px
        scroll_w = page.evaluate("document.documentElement.scrollWidth")
        client_w = page.evaluate("document.documentElement.clientWidth")
        registrar("6.3 Cero desbordamiento horizontal a 375px", scroll_w <= 375, f"scrollWidth={scroll_w}, clientWidth={client_w}")

        # Comprobar altura de filas de tabla en móvil
        primera_fila = page.locator("#cuerpo-tabla-sectores tr.fila-sector").first
        box_fila = primera_fila.bounding_box()
        registrar("6.4 Fila móvil altura >= 44px", box_fila["height"] >= 44, f"Fila height: {box_fila['height']:.1f}px")

        # Comprobar botones de cabecera desplazable
        btn_col = page.locator("button.btn-ordenar").first
        box_col = btn_col.bounding_box()
        registrar("6.5 Botón orden columna táctil >= 44px", box_col["height"] >= 44 and box_col["width"] >= 44,
                  f"Col button: {box_col['width']:.1f}x{box_col['height']:.1f}px")

        context.close()

        # ======================================================================
        # TEST 7: Accesibilidad de Teclado y Restauración de Foco
        # ======================================================================
        print("\n--- TEST 7: Teclado y Restauración de Foco ---")
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        page.goto(base_url)
        page.wait_for_selector("#tab-tabla")

        # Cambiar a tabla
        page.click("#tab-tabla")
        page.wait_for_selector("#tabla-sectores")

        # Navegar y activar fila con Enter
        fila_s01 = page.locator('tr[data-sector-id="S01"]')
        fila_s01.focus()
        page.keyboard.press("Enter")

        page.wait_for_selector("#expediente:not([hidden])")
        registrar("7.1 Fila operable con Enter", page.locator("#expediente").is_visible())

        # Presionar Escape para cerrar
        page.keyboard.press("Escape")
        page.wait_for_selector("#expediente", state="hidden")
        registrar("7.2 Expediente se cierra con Escape", not page.locator("#expediente").is_visible())

        # Verificar foco retornado a la fila
        foco_tag = page.evaluate("document.activeElement.tagName")
        foco_id = page.evaluate("document.activeElement.id")
        foco_clase = page.evaluate("document.activeElement.className")
        foco_activo_id = page.evaluate("document.activeElement.getAttribute('data-sector-id')")
        registrar("7.3 Foco restaurado a la fila que abrió", foco_activo_id == "S01", f"Elemento con foco: <{foco_tag} id='{foco_id}' class='{foco_clase}'> data-sector-id='{foco_activo_id}'")

        context.close()
        browser.close()

    servidor.shutdown()

    # Resumen
    total = len(resultados)
    pasados = sum(1 for r in resultados if r["paso"])
    fallados = total - pasados
    print(f"\n==========================================")
    print(f"RESUMEN PRUEBAS DE ESTRÉS EMPÍRICO:")
    print(f"Total: {total} | Pasados: {pasados} | Fallados: {fallados}")
    print(f"==========================================\n")

    return fallados == 0


if __name__ == "__main__":
    exito = run_tests()
    sys.exit(0 if exito else 1)
