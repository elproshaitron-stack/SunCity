# Método

Esta es la explicación pública de cómo calcula SunCity. Es la única fuente de la página `/metodo/`: la página lee este archivo, así que lo que se cambie aquí se ve allá sin copiarlo. El detalle técnico vive en [Datos y APIs](04-DATOS-Y-APIS.md), [Modelos](05-MODELOS.md) y el [registro de decisiones](DECISIONES.md).

## En pocas palabras

SunCity toma una serie de valores por año y responde tres cosas: cuánto cambia por década, en qué rango es creíble ese cambio y si es significativo. Usa el mismo cálculo en sus dos vías:

- **Región:** cualquier punto del planeta, con datos de NASA POWER de 1981 a 2025.
- **Hermosillo:** sectores de la ciudad comparados con su desierto, con temperatura de la superficie medida por satélite.

## Qué datos usa

### Región

| Dato | Detalle |
|---|---|
| Fuente | NASA POWER, API mensual, sin clave |
| Modelo | MERRA-2, un reanálisis de la NASA que reconstruye el clima del planeta combinando observaciones |
| Periodo | 1981 a 2025: 45 años |
| Escala | Celdas de unas decenas de kilómetros (rejilla de 0.5° de latitud por 0.625° de longitud) |
| Si la API falla | Hermosillo y Mexicali tienen una copia guardada de la misma serie |

Las cinco variables:

| Variable | Qué es | Valor de cada mes |
|---|---|---|
| Mínima del aire (`T2M_MIN`) | Temperatura mínima del aire a 2 m | El extremo del mes, no un promedio |
| Máxima del aire (`T2M_MAX`) | Temperatura máxima del aire a 2 m | El extremo del mes |
| Media del aire (`T2M`) | Temperatura media del aire a 2 m | Promedio del mes |
| Superficie (`TS`) | Temperatura de la superficie del suelo | Promedio del mes |
| Precipitación (`PRECTOTCORR`) | Lluvia, en mm por día | Promedio diario del mes |

**Temporada.** Si eliges un mes, se usa ese mes de cada año. Si eliges el año completo, se usa el valor anual que publica POWER: para la mínima y la máxima es el extremo del año, no un promedio. Comparar siempre la misma época quita el ciclo de las estaciones.

### Hermosillo

| Dato | Detalle |
|---|---|
| Temperatura de la superficie de noche | MODIS (satélites Terra y Aqua), productos MOD11 y MOD21, a 1 km |
| Periodo principal | 2001 a 2019. De 2020 a 2025 se dibuja punteado y no entra al cálculo, porque las órbitas de Terra y Aqua empezaron a derivar |
| Temporada | Junio a agosto: las noches más cálidas |
| Sector | Un área de la ciudad de 9 km² o más |
| Referencia | Un área de desierto cercano con poca vegetación (NDVI menor que 0.2) |
| Acercamiento | ECOSTRESS a 70 m, escenas nocturnas despejadas, solo en el sector prioritario |
| Mapa | El compuesto de 8 días de MODIS Terra (MOD11A2) que publica NASA GIBS, leído píxel por píxel en tu navegador |

**El mapa muestra datos reales.** Para el año y el periodo de 8 días que elijas, la capa es la temperatura de la superficie de noche que midió MODIS Terra, tal como la publica NASA GIBS. Cada color de esas imágenes equivale a un intervalo de 0.6 °C, así que se puede leer el valor de cada píxel de 1 km y promediarlo dentro de un sector. Es la foto de un periodo, no una tendencia: no lleva los filtros de calidad del cálculo, y desde 2020 la hora de paso de Terra cambia.

La serie de cada sector es la diferencia, año por año, entre la temperatura nocturna del sector y la de su desierto. Así se quita lo que le pasa a toda la región y queda lo propio de la ciudad.

**Por ahora la Vía B usa datos de prueba.** Los sectores, sus polígonos y sus números son sintéticos y sirven para probar la herramienta. Se reemplazan cuando estén los resultados observados.

## Cómo se calcula la tendencia

### Pendiente: Theil-Sen

Se calcula la pendiente entre cada par de años y se toma la mediana. Se multiplica por 10 para dar el cambio por década. Como es una mediana, un año raro no la mueve mucho.

El **rango del 95 %** es el intervalo de pendientes compatibles con los datos (Sen, 1968). Si incluye el cero, el signo del cambio no es seguro.

### Significancia: Mann-Kendall

Se cuentan los pares de años en que el valor sube y los pares en que baja. Si hay muchos más de un tipo que del otro, hay tendencia. El **valor p** dice qué tan probable sería ver una tendencia así si en realidad no hubiera ninguna. Menos de 0.05 se llama significativo.

### Reglas de cada vía

| | Región | Hermosillo |
|---|---|---|
| Valor p | Mann-Kendall original | El mayor entre Mann-Kendall original y la versión de Hamed-Rao, que corrige la dependencia entre años. Si Hamed-Rao no se puede calcular, se usa el original y el expediente lo dice |
| Ajuste por probar varias cosas | Ninguno. Tú eliges qué probar, así que el resultado es exploratorio | Benjamini-Hochberg entre sectores (FDR) |
| Mínimo de años | 15 | 15. Con menos, el sector queda "sin cálculo" |
| Dónde se calcula | En tu navegador, en JavaScript | En Python, con la misma función |

La versión en JavaScript y la de Python dan la misma pendiente y el mismo valor p: se compararon en 119 series, con diferencia máxima de 0.00000008.

### El color de un sector

Un sector se pinta de rojo si su valor p ajustado es menor que 0.05, su pendiente es positiva y todo su rango del 95 % está arriba de cero. Azul si pasa lo mismo hacia abajo. Gris en cualquier otro caso. Gris no quiere decir "sin cambio": quiere decir que los datos no alcanzan para afirmarlo.

### Variantes

En Hermosillo el cálculo se repite cambiando un supuesto a la vez: con los años de deriva, con el satélite Aqua, con otra referencia de desierto, con el producto MOD21 y sin 2001 y 2002. La curva de variantes muestra si la tendencia depende de una elección. Las variantes no son pruebas independientes, porque usan datos que se traslapan, y no cuentan para el color.

## Qué tan fuerte debe ser la señal

Con pocos años, una tendencia chica puede ser real y aun así no salir significativa. En una simulación con 19 años, una tendencia de 0.3 °C por década con variación de 0.25 °C entre años salió significativa el 70 % de las veces, y solo el 39 % con el ajuste entre sectores.

| Años | Uso | Pares de años | Diferencia mínima entre pares que suben y que bajan para p < 0.05 |
|---|---|---|---|
| 19 | Hermosillo, periodo principal | 171 | 59 |
| 45 | Región, 1981-2025 | 990 | 202 |

## Cómo leer un resultado

| Lo que ves | Qué quiere decir |
|---|---|
| Significativo | El valor p es menor que 0.05: es poco probable que la tendencia sea casualidad |
| Sin evidencia suficiente todavía | Los datos no alcanzan para distinguir la tendencia de la variación normal entre años. Puede haber cambio real |
| Exploratorio | Tú eliges el lugar, la variable y la temporada; con tantas combinaciones posibles, alguna saldrá significativa por azar |
| Sin cálculo | Hay menos de 15 años con datos |

## Glosario

| Término | Qué significa |
|---|---|
| Cambio por década | Cuánto sube o baja la variable cada 10 años, según la tendencia de toda la serie |
| Celda | El cuadro de la rejilla de MERRA-2 que contiene el punto elegido. Todo lo que está dentro recibe el mismo valor |
| FDR | Tasa de falsos descubrimientos. El ajuste de Benjamini-Hochberg sube los valores p cuando se prueban varios sectores a la vez |
| Hamed-Rao | Versión de Mann-Kendall que corrige cuando un año se parece al anterior |
| LST | Temperatura de la superficie medida por satélite: el suelo, techos y calles, no el aire |
| Mann-Kendall | Prueba que cuenta cuántos pares de años suben y cuántos bajan para decidir si hay tendencia |
| MERRA-2 | Reanálisis de la NASA que reconstruye el clima de todo el planeta desde 1980 combinando observaciones |
| NDVI | Índice de vegetación. Menos de 0.2 es suelo casi sin plantas |
| Rango del 95 % | Los valores de pendiente compatibles con los datos. Si incluye el cero, el signo del cambio no es seguro |
| Reanálisis | Un modelo que combina observaciones de muchas fuentes para estimar el clima en todo el planeta, también donde no hay estaciones |
| Referencia | Área de desierto con la que se compara un sector |
| Sector | Área de la ciudad de 9 km² o más que se analiza por separado |
| Theil-Sen | Calcula la pendiente entre cada par de años y toma la mediana |
| Valor p | Qué tan probable sería ver una tendencia así si en realidad no hubiera ninguna |

## Lo que la herramienta no puede ver

- **Región no es ciudad.** Una celda de MERRA-2 cubre Hermosillo y su desierto juntos. La Vía A ve regiones, no ciudades.
- **Tendencia no es causa.** Un cambio significativo dice que algo cambió, no por qué, ni el efecto de ninguna medida urbana.
- **Superficie no es aire.** La temperatura de la superficie no es la que siente una persona, ni mide salud.
- **Las variantes no son pruebas independientes.** Repiten el cálculo sobre datos que se traslapan.
- **El cotejo con Yale no es otro sensor.** Ese producto usa los mismos datos MODIS: coteja el método, no el instrumento.
- **Los primeros años de Terra.** En 2001 y 2002 el satélite cruzaba a las 10:45 y no a las 10:30; por eso existe la variante sin esos años.

## Fuentes

### Datos

- [NASA POWER](https://power.larc.nasa.gov/), API mensual, modelo MERRA-2.
- [MODIS MOD11A2 v6.1](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD11A2) y [MOD21A1N v6.1](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD21A1N), en Earth Engine.
- [ECOSTRESS ECO_L2T_LSTE v002](https://appeears.earthdatacloud.nasa.gov/), descargado con AppEEARS.
- [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/), capa `MODIS_Terra_L3_Land_Surface_Temp_8Day_Night` y su paleta, para el mapa de Hermosillo.
- [Islas de calor de Yale, v4](https://developers.google.com/earth-engine/datasets/catalog/YALE_YCEO_UHI_UHI_yearly_averaged_v4), en Earth Engine, solo como cotejo.

### Métodos

- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. *Journal of the American Statistical Association*, 63, 1379-1389.
- Mann, H. B. (1945). Nonparametric tests against trend. *Econometrica*, 13, 245-259.
- Kendall, M. G. (1975). *Rank Correlation Methods*. Griffin.
- Hamed, K. H. y Rao, A. R. (1998). A modified Mann-Kendall trend test for autocorrelated data. *Journal of Hydrology*, 204, 182-196.
- Benjamini, Y. y Hochberg, Y. (1995). Controlling the false discovery rate. *Journal of the Royal Statistical Society B*, 57, 289-300.

## Versión de los datos

| Vía | Datos |
|---|---|
| Región | NASA POWER en vivo, serie 1981-2025. Copia guardada de Hermosillo y Mexicali para cuando la API no responde |
| Hermosillo | Datos de prueba sintéticos, en `via-b/datos/prueba/` |

La versión del software aparece en el pie de cada página.
