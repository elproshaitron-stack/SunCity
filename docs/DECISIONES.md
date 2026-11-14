# Registro de decisiones

**Regla:** ninguna tendencia se calcula antes de que su regla esté escrita aquí. Una decisión cerrada no se cambia después de ver resultados; si hay que cambiarla, se agrega una fila nueva que explique por qué y se conserva la anterior.

Las decisiones que ya traía v4 se copian a este archivo en cuanto el PDF de v4 esté a la mano.

## Cómo registrar

Cada decisión lleva: qué se decidió, quién, cuándo (fecha y hora) y por qué. Estado: `abierta` o `cerrada`.

## Decisiones abiertas de v5

| ID | Decisión | Opciones | Responsable | Estado | Elegido | Fecha y hora | Motivo |
|---|---|---|---|---|---|---|---|
| D01 | ¿La variante `sin_2001_2002` cuenta para el semáforo? | Cuenta / No cuenta | Carlos | abierta | | | |
| D02 | Cómo se promedia MOD21 diario en la temporada | Por definir | Carlos, Ángel Díaz | abierta | | | |
| D03 | Mínimo de noches válidas de MOD21 por temporada | Número por definir, tras el conteo de un año | Carlos, Ángel Díaz | abierta | | | |
| D04 | Ciclo diario en los pasos de Aqua (13:30 y 1:30) | MYD21 + MOD11 (rango) / Solo MOD11 | Ángel Díaz | abierta | | | |
| D05 | Vía A: lista de variables | `T2M_MIN`, `T2M_MAX`, `T2M`, `TS`, `PRECTOTCORR` | Navarrete | propuesta, implementada | Las cinco | 14 nov 11:55 | Las cinco existen en el servicio mensual (verificado) |
| D06 | Vía A: regla de temporada | Año completo / Mes fijo / Ambas a elección del usuario | Navarrete | propuesta, implementada | Ambas. Año completo = llave `AAAA13` que publica POWER; mes fijo = llave `AAAAMM` de cada año | 14 nov 11:55 | Usa el valor anual oficial sin agregación propia. Ojo: para `T2M_MIN` y `T2M_MAX` el anual es el extremo del año, no un promedio; la definición en pantalla lo dice |
| D07 | Vía A: el valor p se muestra sin ajuste y con etiqueta "exploratorio" | Confirmar | Navarrete, Carlos | propuesta, implementada | p de Mann-Kendall original, sin ajuste, umbral 0.05, etiqueta "exploratorio" | 14 nov 11:55 | Plan v5, sección 4. Falta que Carlos confirme |
| D08 | Mínimo real de años (`min_anios`; 15 es un marcador) | Número por definir | Carlos | abierta | | | |
| D09 | Vía A: origen de los datos de POWER | API en vivo / JSON guardados | Navarrete | propuesta, implementada | API en vivo; si falla, JSON guardado de las ciudades de demostración | 14 nov 11:55 | La API responde desde el navegador. El respaldo cubre una caída durante la demo |
| D10 | Zoom ECOSTRESS: origen | Earth Engine / AppEEARS | Ángel Díaz | abierta | | | |
| D11 | Modelo G: fuente de temperatura del aire | Estación (SMN o Climate Data Online) / `T2M_MIN` de POWER | Emilio, Carlos | abierta | | | |
| D12 | Segunda ciudad árida de la Vía A | Por definir | Emilio | abierta, con provisional | Mexicali (32.62, −115.45), provisional | 14 nov 12:20 | Árida, mexicana y con contraste: `T2M_MIN` anual +0.53 °C/década (p = 0.003) frente a +0.21 (p = 0.35) en Hermosillo. Cambiarla es una línea en `via-a/js/app.js` y otra en `via-a/datos/descargar.py` |

## Hechos confirmados al probar

Se llenan con lo que respondan las comprobaciones de la primera hora.

| Comprobación | Responsable | Resultado | Fecha y hora |
|---|---|---|---|
| La llamada de POWER responde desde el navegador | Navarrete | Sí. `fetch` desde otro origen (example.com) respondió 200 en 1.7 s, sin bloqueo CORS. API v2.10.0 | 14 nov 11:45 |
| Formato de las llaves de mes y de promedio anual en POWER | Navarrete | `properties.parameter[VAR]["AAAAMM"]`, `MM` = 01 a 12 y `13` = anual. Para `T2M_MIN` y `T2M_MAX` cada valor es el extremo del mes (13: del año); para `T2M`, `TS` y `PRECTOTCORR` es promedio | 14 nov 11:45 |
| Valor de relleno de POWER | Navarrete | `header.fill_value` = -999. Hermosillo 1981-2025 no tiene ningún valor de relleno en las cinco variables | 14 nov 11:45 |
| `TS` y `PRECTOTCORR` existen en el servicio mensual | Navarrete | Sí, junto con `T2M`. Unidades: `C` para temperaturas, `mm/day` para `PRECTOTCORR` | 14 nov 11:45 |
| Escenas de ECOSTRESS sobre Hermosillo en Earth Engine | Ángel Díaz | | |
| Noches válidas de `MOD21A1N` en la temporada de un año | Ángel Díaz | | |
| Existe MYD21 en Earth Engine | Ángel Díaz | | |
| Años que cubre la estación de Hermosillo (SMN y Climate Data Online) | Emilio | | |
| La función de referencia corre con una serie inventada | Carlos | Sí (scipy 1.18.1). Ver hallazgo H01 | 14 nov 11:55 |
| Vía A de punta a punta en un navegador real | Navarrete | Sí. `power.js` y `tendencia.js` en el navegador: POWER en vivo en 0.5 a 1.1 s para Hermosillo, Mexicali, Phoenix y un punto del Pacífico; Hermosillo julio `T2M_MIN` = +0.378 °C/década (igual que Python). Leaflet 1.9.4 y teselas de OpenStreetMap cargan | 14 nov 12:15 |
| Theil-Sen y Mann-Kendall en JavaScript igualan a Python a tres decimales | Navarrete | Sí: 119 casos (15 series reales de Hermosillo y 104 sintéticas, con empates y años faltantes), 0 fallos, diferencia máxima 8e-8. `node via-a/pruebas/probar_tendencia.cjs` | 14 nov 11:55 |

## Hallazgos

| ID | Hallazgo | Afecta | Para | Fecha y hora |
|---|---|---|---|---|
| H01 | En `compartido/tendencia.py`, Hamed-Rao puede dar varianza negativa con tendencias fuertes y su p sale `NaN`. Python evalúa `max(p_mk, nan)` como `p_mk` sin avisar, así que el p "más conservador" deja de aplicarse justo ahí. Pasó en 2 de 104 series sintéticas (n = 25 y n = 45). Hay que decidir qué hacer cuando `p_hamed_rao` es `NaN` (por ejemplo, reportar `p_mk` y marcarlo) y escribirlo aquí antes de calcular | Vía B | Carlos | 14 nov 11:55 |

## Decisiones cerradas

| ID | Decisión | Elegido | Quién | Fecha y hora | Motivo |
|---|---|---|---|---|---|
| D00 | Forma de la entrega | Una herramienta con dos vías que comparten el cálculo de tendencia | Equipo | 14 nov 2026 | Plan v5 |
