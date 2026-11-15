# Vía B · Explorador de Hermosillo

Datos reales de MODIS sobre polígonos esquemáticos (ver "Qué es real y qué es de prueba").
HTML, CSS y módulos ES sin build.

## Qué es real y qué es de prueba

`config.js` elige la carpeta: `datos/reales/` (por defecto) o `datos/prueba/`.

| Parte | Con `datos/reales/` |
|---|---|
| Capa de temperatura del mapa, lectura bajo el cursor y sección 00 | Real: MODIS Terra MOD11A2 desde NASA GIBS |
| Serie 2001-2025, pendiente, intervalo, p, FDR, semáforo y curva de variantes | Real: MOD11 Terra y Aqua de NASA GIBS (D18), procesado con `procesamiento/procesar.py` |
| Ciclo diario y nivel | Real, solo MOD11 |
| Polígonos de los seis sectores y de las dos referencias | **Esquemáticos**: cuadros de 3.1 × 3.1 km (D15 abierta). Los resultados cambiarán con los definitivos |
| MOD21, población, NDVI, cotejo de Yale y zoom de ECOSTRESS | Sin dato: GIBS no los publica. Llegan con el export de Earth Engine y AppEEARS |

Para regenerar: `python via-b/procesamiento/exportar_gibs.py` y luego `python via-b/procesamiento/procesar.py`.

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

Se necesita conexión para MapLibre GL JS 5.24.1 (unpkg), los mosaicos vectoriales de OpenFreeMap
y la capa de NASA GIBS. No abrir como `file://`. Si el mapa no carga, el selector sigue abriendo cada sector.
Tocar un sector o elegirlo en el selector abre el expediente; Cerrar o Escape
lo cierra. En celular aparece como hoja inferior y en escritorio como panel lateral.

## Archivos

- `index.html`, `estilos.css`, `app.js`: interfaz, mapa, lectura CSV y expediente. La página usa los tokens y
  componentes de `../compartido/` (barra, pie, avisos, campos, botones) y el expediente es una `sc-hoja`: panel
  fijo al lado del mapa en pantallas anchas y hoja inferior modal en celular.
- `../compartido/mapa-estilo.js`: estilo común de MapLibre (el mismo del globo de la Vía A).
- `../compartido/lst-noche.js`: lee la capa de MODIS de NASA GIBS y traduce cada píxel a °C.
- `config.js`: único lugar donde cambiar `RUTA_DATOS` (por defecto `datos/prueba/`).
- `datos/esquema.js`: único lugar donde se definen las columnas de los CSV
  y variantes admitidas. Cambiar los valores del mapa al recibir v4; conservar
  las claves internas. Mantener el objeto como JSON válido: también lo lee Python.
- `semaforo.js`: regla D16; p FDR < 0.05, signo de la pendiente primaria e IC 95 % del mismo lado de cero.
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
- `../compartido/serie-anual.js`: gráfica de la serie anual, compartida con la Vía A. Se recorre con
  las flechas y trae "Ver datos en tabla".

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

## Estado actual

El expediente incluye el nivel medio MOD11–MOD21, el ciclo diario, la curva de
variantes y el zoom de prueba para S01. La demostración usa datos inventados.
D15 (polígonos y referencias) sigue abierta; D16 (semáforo) está cerrada. Para usar datos
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
