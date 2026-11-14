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
| D05 | Vía A: lista de variables | `T2M_MIN`, `T2M_MAX`, `T2M`, `TS`, `PRECTOTCORR`, sujeto a que existan en el servicio mensual | Navarrete | abierta | | | |
| D06 | Vía A: regla de temporada | Año completo / Mes fijo / Ambas a elección del usuario | Navarrete | abierta | | | |
| D07 | Vía A: el valor p se muestra sin ajuste y con etiqueta "exploratorio" | Confirmar | Navarrete, Carlos | abierta | | | |
| D08 | Mínimo real de años (`min_anios`; 15 es un marcador) | Número por definir | Carlos | abierta | | | |
| D09 | Vía A: origen de los datos de POWER | API en vivo / JSON guardados | Navarrete | abierta | | | |
| D10 | Zoom ECOSTRESS: origen | Earth Engine / AppEEARS | Ángel Díaz | abierta | | | |
| D11 | Modelo G: fuente de temperatura del aire | Estación (SMN o Climate Data Online) / `T2M_MIN` de POWER | Emilio, Carlos | abierta | | | |
| D12 | Segunda ciudad árida de la Vía A | Por definir | Emilio | abierta | | | |

## Hechos confirmados al probar

Se llenan con lo que respondan las comprobaciones de la primera hora.

| Comprobación | Responsable | Resultado | Fecha y hora |
|---|---|---|---|
| La llamada de POWER responde desde el navegador | Navarrete | | |
| Formato de las llaves de mes y de promedio anual en POWER | Navarrete | | |
| Valor de relleno de POWER | Navarrete | | |
| `TS` y `PRECTOTCORR` existen en el servicio mensual | Navarrete | | |
| Escenas de ECOSTRESS sobre Hermosillo en Earth Engine | Ángel Díaz | | |
| Noches válidas de `MOD21A1N` en la temporada de un año | Ángel Díaz | | |
| Existe MYD21 en Earth Engine | Ángel Díaz | | |
| Años que cubre la estación de Hermosillo (SMN y Climate Data Online) | Emilio | | |
| La función de referencia corre con una serie inventada | Carlos | | |

## Decisiones cerradas

| ID | Decisión | Elegido | Quién | Fecha y hora | Motivo |
|---|---|---|---|---|---|
| D00 | Forma de la entrega | Una herramienta con dos vías que comparten el cálculo de tendencia | Equipo | 14 nov 2026 | Plan v5 |
