# Registro de decisiones

**Regla:** ninguna tendencia se calcula antes de que su regla esté escrita aquí. Una decisión cerrada no se cambia después de ver resultados; si hay que cambiarla, se agrega una fila nueva que explique por qué y se conserva la anterior.

Las decisiones que ya traía v4 se copian a este archivo en cuanto el PDF de v4 esté a la mano.

## Cómo registrar

Cada decisión lleva: qué se decidió, quién, cuándo (fecha y hora) y por qué. Estado: `abierta` o `cerrada`.

## Decisiones abiertas

| ID | Decisión | Opciones | Responsable | Estado | Elegido | Fecha y hora | Motivo |
|---|---|---|---|---|---|---|---|
| D01 | ¿La variante `sin_2001_2002` cuenta para el semáforo? | Cuenta / No cuenta | Navarrete | abierta | | | |
| D02 | Cómo se promedia MOD21 diario en la temporada | Por definir | Navarrete | abierta | | | |
| D03 | Mínimo de noches válidas de MOD21 por temporada | Número por definir, tras el conteo de un año | Navarrete | abierta | | | |
| D04 | Ciclo diario en los pasos de Aqua (13:30 y 1:30) | MYD21 + MOD11 (rango) / Solo MOD11 | Navarrete | abierta | | | |
| D08 | Mínimo real de años (`min_anios`; 15 es un marcador) | Número por definir | Navarrete | abierta | | | |
| D10 | Zoom ECOSTRESS: origen | Earth Engine / AppEEARS | Navarrete | abierta | | | |
| D11 | Modelo G: fuente de temperatura del aire | Estación (SMN o Climate Data Online) / `T2M_MIN` de POWER | Navarrete | abierta | | | |

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
