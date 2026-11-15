# Registro de decisiones

**Regla:** ninguna tendencia se calcula antes de que su regla esté escrita aquí. Una decisión cerrada no se cambia después de ver resultados; si hay que cambiarla, se agrega una fila nueva que explique por qué y se conserva la anterior.

Las decisiones que ya traía v4 se copian a este archivo en cuanto el PDF de v4 esté a la mano.

## Cómo registrar

Cada decisión lleva: qué se decidió, quién, cuándo (fecha y hora) y por qué. Estado: `abierta` o `cerrada`.

## Decisiones abiertas

| ID | Decisión | Opciones | Responsable | Estado | Elegido | Fecha y hora | Motivo |
|---|---|---|---|---|---|---|---|
| D15 | Polígonos reales de sectores y referencias | Los esquemáticos de `via-b/datos/prueba/` u otros | Navarrete y Mario | abierta | | | Definen todo el resultado. Las referencias deben tener NDVI < 0.2 (`procesar.py` avisa) y cada sector 9 km² o más |

## Hechos confirmados al probar

Se llenan con lo que respondan las comprobaciones de la primera hora.

| Comprobación | Responsable | Resultado | Fecha y hora |
|---|---|---|---|
| La llamada de POWER responde desde el navegador | Navarrete | Sí. `fetch` desde otro origen (example.com) respondió 200 en 1.7 s, sin bloqueo CORS. API v2.10.0 | 14 nov 11:45 |
| Formato de las llaves de mes y de promedio anual en POWER | Navarrete | `properties.parameter[VAR]["AAAAMM"]`, `MM` = 01 a 12 y `13` = anual. Para `T2M_MIN` y `T2M_MAX` cada valor es el extremo del mes (13: del año); para `T2M`, `TS` y `PRECTOTCORR` es promedio | 14 nov 11:45 |
| Valor de relleno de POWER | Navarrete | `header.fill_value` = -999. Hermosillo 1981-2025 no tiene ningún valor de relleno en las cinco variables | 14 nov 11:45 |
| `TS` y `PRECTOTCORR` existen en el servicio mensual | Navarrete | Sí, junto con `T2M`. Unidades: `C` para temperaturas, `mm/day` para `PRECTOTCORR` | 14 nov 11:45 |
| Escenas de ECOSTRESS sobre Hermosillo en Earth Engine | Navarrete | | |
| Noches válidas de `MOD21A1N` en la temporada de un año | Navarrete | | |
| Existe MYD21 en Earth Engine | Navarrete | | |
| Años que cubre la estación de Hermosillo (SMN y Climate Data Online) | Navarrete | | |
| La función de referencia corre con una serie inventada | Navarrete | Sí (scipy 1.18.1). Ver hallazgo H01 | 14 nov 11:55 |
| Vía A de punta a punta en un navegador real | Navarrete | Sí. `power.js` y `tendencia.js` en el navegador: POWER en vivo en 0.5 a 1.1 s para Hermosillo, Mexicali, Phoenix y un punto del Pacífico; Hermosillo julio `T2M_MIN` = +0.378 °C/década (igual que Python). Leaflet 1.9.4 y teselas de OpenStreetMap cargan | 14 nov 12:15 |
| Theil-Sen y Mann-Kendall en JavaScript igualan a Python a tres decimales | Navarrete | Sí: 119 casos (15 series reales de Hermosillo y 104 sintéticas, con empates y años faltantes), 0 fallos, diferencia máxima 8e-8. `node via-a/pruebas/probar_tendencia.cjs` | 14 nov 11:55 |
| Temperatura de la superficie de noche real en el navegador | Claude (agente), a pedido de Navarrete | Sí. NASA GIBS publica `MODIS_Terra_L3_Land_Surface_Temp_8Day_Night` (MOD11A2 v6.1, compuesto de 8 días) como mosaicos PNG sin clave y con CORS, nivel 7 (píxel de unos 1.1 km en Hermosillo). Su paleta `MODIS_Land_Surface_Temp.xml` tiene 252 colores únicos, cada uno un intervalo de 0.6 K: el 100 % de los 41,245 píxeles con dato del mosaico de Hermosillo coincide con un color de la paleta, así que el color se traduce a °C con ±0.3 K. Ejemplo, 11 al 18 de julio de 2024: centro de Hermosillo 32.2 °C, desierto al oeste 29.2 °C. Es una lectura descriptiva por periodo, sin los filtros de calidad de `QC_Night`; no reemplaza la serie de `via-b/procesamiento` | 15 nov |
| Primer cálculo de la Vía B con datos observados (D18) | Claude (agente), a pedido de Navarrete | Sí. 1,152 mosaicos de GIBS, 100 % de los píxeles con dato coinciden con la paleta. Sobre los polígonos esquemáticos de `datos/prueba/sectores.geojson`: primario 2001-2019, 19 años por sector, 5 de 6 sectores con aumento significativo de la diferencia nocturna sector − RA (p FDR < 0.05), de +0.42 a +0.82 °C/década; S06 +0.16 (p FDR 0.29). Ciclo diario 2003-2019 (MOD11): sectores entre 2.3 y 4.2 °C más frescos que RA a las 10:30 y 13:30, y hasta 1.9 °C más calientes a las 22:30 y 1:30. MYD11 (Aqua): 16 de 200 polígono-años sin cobertura suficiente. `aceptacion.py` sobre `datos/reales/`: 4 PASA y 3 FALLA (faltan MOD21, Yale y ECOSTRESS, que GIBS no publica). Los números cambiarán con los polígonos definitivos (D15) | 15 nov |
| Rediseño de la Vía A con globo 3D | Claude (agente), a pedido de Navarrete | Sí. MapLibre GL JS 5.24.1 con proyección de globo y mosaicos vectoriales de OpenFreeMap, sin clave, reemplazan a Leaflet y OpenStreetMap en la Vía A. Probado en navegador a 1366 px y 375 px: vuelo a Hermosillo, clic en el globo, ciudades, variable, mes, enlace compartible y puente a la Vía B. El recuadro de la celda asume la rejilla nativa de MERRA-2 (0.5° × 0.625°) y se rotula como aproximado. Sin mapa siguen funcionando las casillas de latitud y longitud | 15 nov |

## Hallazgos

| ID | Hallazgo | Afecta | Para | Fecha y hora |
|---|---|---|---|---|
| H01 | En `compartido/tendencia.py`, Hamed-Rao puede dar varianza negativa con tendencias fuertes y su p sale `NaN`. Python evalúa `max(p_mk, nan)` como `p_mk` sin avisar, así que el p "más conservador" deja de aplicarse justo ahí. Pasó en 2 de 104 series sintéticas (n = 25 y n = 45). Resuelto con D13 | Vía B | Navarrete | 14 nov 11:55 |

## Decisiones cerradas

| ID | Decisión | Elegido | Quién | Fecha y hora | Motivo |
|---|---|---|---|---|---|
| D00 | Forma de la entrega | Una herramienta con dos vías que comparten el cálculo de tendencia | Equipo | 14 nov 2026 | Plan v5 |
| D05 | Vía A: lista de variables | `T2M_MIN`, `T2M_MAX`, `T2M`, `TS` y `PRECTOTCORR` | Navarrete y Mario | 14 nov 12:20 | Las cinco existen en el servicio mensual de POWER (verificado) |
| D06 | Vía A: regla de temporada | Ambas a elección del usuario. Año completo = llave `AAAA13` que publica POWER; mes fijo = llave `AAAAMM` de cada año | Navarrete y Mario | 14 nov 12:20 | Usa el valor anual oficial sin agregación propia. Para `T2M_MIN` y `T2M_MAX` el anual es el extremo del año, no un promedio; la definición en pantalla lo dice |
| D07 | Vía A: valor p | p de Mann-Kendall original, sin ajuste, umbral 0.05, con etiqueta "exploratorio" | Navarrete y Mario | 14 nov 12:20 | Plan v5, sección 4: el usuario elige qué probar |
| D09 | Vía A: origen de los datos de POWER | API en vivo; si falla, JSON guardado de las ciudades de demostración | Navarrete y Mario | 14 nov 12:20 | La API responde desde el navegador; el respaldo cubre una caída del internet durante la demo |
| D12 | Segunda ciudad árida de la Vía A | Mexicali, Baja California (32.62, −115.45) | Navarrete y Mario | 14 nov 12:20 | Árida, mexicana y con contraste: `T2M_MIN` anual +0.53 °C/década (p = 0.003) frente a +0.21 (p = 0.35) en Hermosillo |
| D13 | Valor p de la Vía B cuando Hamed-Rao no se puede calcular (H01) | Si `p_hamed_rao` es `NaN`, se reporta `p_mk` y el resultado lleva `hamed_rao_valido = False` para que el expediente lo diga | Navarrete y Mario | 14 nov 12:25 | Evita que `max(p_mk, nan)` oculte el caso. Pasa con tendencias fuertes, donde `p_mk` ya es muy chico, así que no cambia un veredicto |
| D01 | ¿La variante `sin_2001_2002` cuenta para el semáforo? | No. El semáforo usa solo la variante primaria; las otras cinco se muestran en la curva de variantes | Navarrete y Mario | 14 nov 12:50 | Las variantes no son pruebas independientes; sirven para ver si la tendencia depende de una elección |
| D02 | Cómo se promedia MOD21 diario en la temporada | Media por píxel de las observaciones válidas de la temporada; luego media del polígono | Navarrete y Mario | 14 nov 12:50 | Igual que MOD11, que ya promedia días en sus compuestos de 8 días |
| D03 | Cobertura mínima por polígono y año | Al menos 50 % de los píxeles del polígono con dato, y por píxel en promedio 3 compuestos (MOD11) o 10 noches (MOD21) | Navarrete y Mario | 14 nov 12:50 | Provisional hasta ver el conteo real en `resumen.json`; si descarta demasiados años, se baja antes de calcular tendencias y se registra aquí |
| D04 | Ciclo diario en los pasos de Aqua | MOD11 y MOD21 en los cuatro pasos (rango) | Navarrete y Mario | 14 nov 12:50 | `MYD21A1D` y `MYD21A1N` existen en Earth Engine (verificado en el catálogo) |
| D08 | Mínimo de años para calcular tendencia | 15 | Navarrete y Mario | 14 nov 12:50 | 15 de 19 en el primario y de 17 en `sin_2001_2002`; con menos, el sector queda "sin cálculo" |
| D10 | Zoom ECOSTRESS: origen | AppEEARS | Navarrete y Mario | 14 nov 12:50 | La cobertura en Earth Engine es dudosa; en AppEEARS está confirmada |
| D11 | Modelo G: fuente de temperatura del aire | `T2M_MIN` de POWER, promedio de los meses de la temporada | Navarrete y Mario | 14 nov 12:50 | La estación de Hermosillo parece terminar en 2013 y ya tenemos POWER guardado |
| D14 | Temporada de la Vía B | Junio a agosto | Navarrete y Mario | 14 nov 12:50 | Las noches más cálidas; mismo periodo que el estudio de El Colegio de Sonora. Se cambia en `via-b/procesamiento/parametros.py` |
| D17 | Sector sin años suficientes en la interfaz | Celdas vacías en `resultados.csv`; la interfaz lo muestra gris como "sin cálculo" | Navarrete y Mario | 14 nov 12:55 | Antes un solo sector incompleto impedía abrir toda la Vía B |
| D18 | Fuente de la LST de la Vía B mientras no haya export de Earth Engine | NASA GIBS: compuestos de 8 días de MOD11A2 (Terra, 2001-2025) y MYD11A2 (Aqua, 2003-2025), día y noche, leídos por su paleta oficial (0.6 K) con `via-b/procesamiento/exportar_gibs.py`; el resto del cálculo (`procesar.py`, D01-D17) no cambia. Sin MOD21, sin filtro de bits QC (D03 se aplica solo por cobertura y observaciones), sin población, NDVI ni Yale. Se reemplaza en cuanto llegue el export de Earth Engine | Navarrete (pidió los datos reales; Claude lo implementó) | 15 nov 2026 | GIBS no pide cuenta ni clave y publica el mismo producto MOD11; Earth Engine necesita una cuenta y correr el script a mano |
| D16 | Regla real del semáforo | Opción B: `p_fdr < 0.05`, signo de la pendiente primaria e IC 95 % completamente del lado de ese signo; rojo si positivo, azul si negativo y gris en los demás casos. `sin_2001_2002` no cuenta para el color (D01) | Mario | 15 nov 2026 00:40 | evita que un sector tenga color si su intervalo cruza cero, lo que se vería incoherente en la gráfica |
| D19 | Herramientas de prueba | Solo para desarrollo: `verificar.py`, Playwright, axe y Lighthouse corren en la máquina de quien prueba y en la integración continua (`.github/workflows/`), nunca en las páginas publicadas. Las dependencias de Python siguen en `requirements.txt`; las de Node, si llegan, quedan en `pruebas/` y no se sirven | Navarrete (plan de cierre); Claude lo registró | 15 nov 2026 | AGENTS.md prohíbe dependencias, marcos y compiladores en el sitio sin decisión; probar no cambia lo que recibe quien visita la página |
| D20 | Terceros servidos desde el sitio | MapLibre GL JS y las tres familias (Fraunces, Hanken Grotesk, IBM Plex Mono, en WOFF2 con los pesos usados) se copian a `compartido/vendor/` con su archivo de licencias; cero peticiones a `unpkg.com` y `fonts.googleapis.com` (C3). Los mosaicos del mapa (OpenFreeMap, NASA GIBS) y la API de POWER siguen siendo externos, con respaldo y aviso cuando faltan | Navarrete (plan de cierre, condición 7); lo implementa otra sesión en paralelo | 15 nov 2026 | La plataforma debe abrir con la red externa bloqueada y la política de seguridad de contenido es más corta si todo el código sale del propio sitio |
| D21 | Mapa de la Vía B | MapLibre GL JS 5.24.1, la misma versión que la Vía A, con el estilo común de `compartido/mapa-estilo.js`; Leaflet sale del proyecto. Hecho en el PR #20 | Navarrete (pidió el cambio; Claude lo implementó) | 15 nov 2026 | Una sola biblioteca de mapas y un solo estilo para las dos vías; `aceptacion.py` siguió en 7 PASA tras el cambio |
