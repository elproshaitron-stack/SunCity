# Vía B · Explorador de Hermosillo

Datos inventados. No son resultados. HTML, CSS y módulos ES sin build.

Desde la raíz del repositorio:

```sh
python -m pip install -r requirements.txt
python via-b/datos/prueba/generar_prueba.py
python servir.py
```

Abrir <http://localhost:8000/via-b/>. Si el puerto está ocupado, usar
`python servir.py 8001` y abrir <http://localhost:8001/via-b/>.
El servidor fija los tipos MIME para Windows y desactiva la caché.
Sirve siempre la raíz del repositorio, incluso al ejecutarlo desde otra carpeta
con la ruta al script (por ejemplo, `python C:\dev\suncity\servir.py 8001`).
Detenerlo con `Ctrl+C`.

Se necesita conexión para Leaflet
1.9.4 por CDN y OpenStreetMap. No abrir como `file://`.
Tocar un sector o elegirlo en el selector abre el expediente; Cerrar o Escape
lo cierra. En celular aparece como hoja inferior y en escritorio como panel lateral.

## Archivos

- `index.html`, `estilos.css`, `app.js`: interfaz, mapa, lectura CSV y expediente.
- `config.js`: único lugar donde cambiar `RUTA_DATOS` (por defecto `datos/prueba/`).
- `datos/esquema.js`: único lugar donde se definen las columnas de los CSV
  y variantes admitidas. Cambiar los valores del mapa al recibir v4; conservar
  las claves internas. Mantener el objeto como JSON válido: también lo lee Python.
- `semaforo.js`: regla provisional de color con p ajustado por FDR.
- `variantes.js`: curva SVG de pendientes, intervalos y p FDR por variante.
- `datos/prueba/sectores.geojson`: seis polígonos urbanos y dos referencias esquemáticas.
- `datos/prueba/generar_prueba.py`: semilla fija, cálculo compartido y FDR entre
  sectores para cada variante; genera `serie.csv`, `resultados.csv`,
  `ciclo_diario.csv`, `nivel.csv` y `ecostress_zoom.json`.
- `datos/validar.py`: valida los CSV contra `datos/esquema.js`:
  `python via-b/datos/validar.py via-b/datos/prueba/`.
- `zoom-ecostress.js`: rejilla SVG del sector definido en `config.js`.
- `ciclo-diario.js`: cuatro barras SVG y cotejo del signo diurno de Yale.
- `config.js`: el ciclo usa MOD21 de Aqua cuando está disponible (D04).
- `datos/prueba/README.md`: recetas exactas de las variantes inventadas.
- `nombres.js`: nombre único para mapa, selector y expediente. Prioridad:
  personalizado en `localStorage`, oficial en `datos/prueba/nombres.json`,
  automático por rumbo del centroide. El botón del lápiz permite editar;
  Restaurar quita el nombre personal. Exportar nombres descarga un JSON para el equipo.
- `../compartido/serie-anual.js`: componente SVG independiente de Vía B.

## Componente compartido

```js
import {dibujarSerieAnual} from '../compartido/serie-anual.js';
dibujarSerieAnual(contenedor, {anios, valores, resultado, unidad: '°C', aniosPunteados});
```

El resultado sigue el contrato compartido. Debe calcularse antes de dibujar,
excluyendo los años punteados. La gráfica excluye esos años del ancla mediana y
del dominio de la tendencia; no calcula estadística. La banda usa las pendientes
inferior y superior del IC 95 %, ambas ancladas en (mediana de años, mediana de
valores). No es una banda de predicción. Incluye línea horizontal en cero.

## Provisional

El expediente incluye el nivel medio MOD11–MOD21, el ciclo diario, la curva de
variantes y el zoom de prueba para S01. La demostración usa datos inventados.
D15 (polígonos y referencias) y D16 (semáforo) siguen abiertas. Para usar datos
procesados, sigue [la guía de procesamiento](procesamiento/README.md).
El umbral de 15 años y la regla de Aqua están registrados en D08 y D04.
Solo `con_deriva` incorpora 2020–2025; esos años quedan fuera del cálculo primario.
Las recetas sintéticas no establecen decisiones para los datos reales.

## Enlace directo a un sector

`/via-b/index.html?sector=S01` abre el expediente del sector con ese ID.
También funciona `/via-b/?sector=S01`. Si el ID no existe, se abre el mapa.
El enlace usa el ID, no el nombre editable del sector.

## Pruebas de aceptación

Desde la raíz del repositorio, con las dependencias de `requirements.txt` instaladas:

```sh
python via-b/pruebas/aceptacion.py
```

Por defecto usa `RUTA_DATOS` de `via-b/config.js`. Para elegir otra carpeta:

```sh
python via-b/pruebas/aceptacion.py via-b/datos/prueba/
```

Cada prueba muestra `PASA` o `FALLA` con el motivo; el resumen final y el código
de salida 1 indican si hay fallos. Las coincidencias de texto se señalan para
revisión manual.
