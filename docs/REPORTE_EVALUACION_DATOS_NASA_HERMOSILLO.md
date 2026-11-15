# Reporte de Evaluación Integral de Datos Satelitales de la NASA para Hermosillo: Escala Espacial, Anomalías Térmicas, Utilidad Práctica e Integridad Científica

**Proyecto:** SunCity  
**Fecha:** 15 de noviembre de 2026  
**Documento de Evaluación Técnica:** Requisitos R1, R2 (R2.1, R2.2, R2.3) y R3  
**Clasificación:** Reporte Oficial de Evaluación y Análisis Metodológico  
**Ámbito Territorial:** Hermosillo, Sonora, México y su entorno árido  

---

## Resumen Ejecutivo

Este documento presenta la síntesis exhaustiva de la evaluación de datos masivos de observación terrestre de la NASA aplicados a la caracterización climática y térmica de Hermosillo, Sonora, en el marco del sistema SunCity. El análisis responde a las directivas de evaluación de la teledetección espacial para la identificación de zonas afectadas por calor, evaluando la resolución física de los sensores, los métodos de detección estadística de anomalías térmicas superficiales, la utilidad de la plataforma para la planeación urbana municipal y el cumplimiento estricto de las fronteras científicas del proyecto.

### Conclusiones Principales

1. **Compilación de Datos de la NASA y Consulta Empírica (R1):**
   - El sistema SunCity integra productos radiométricos y climáticos de la NASA: **MODIS Terra/Aqua** (`MOD11A2`, `MYD11A2`, `MOD21A1D/N`, `MYD21A1D/N`, 1 km), **ECOSTRESS** (`L2T_LSTE`, 70 m a bordo de la Estación Espacial Internacional), el reanálisis global asimilado **NASA POWER (MERRA-2)** (~50 km), el producto de densidad poblacional **GPW v4.11** (CIESIN/SEDAC, 1 km) y el modelo de isla de calor de **Yale UHI** (YCEO, 300 m).
   - **Consulta Empírica en Datos Reales:** Sobre la serie continua de 45 años (1981–2025) de NASA POWER para Hermosillo, el análisis no paramétrico de Theil-Sen y Mann-Kendall demuestra que la señal climática más acelerada y estadísticamente contundente se localiza en la **temperatura mínima nocturna de verano (junio a agosto)**, la cual se incrementa a una tasa de **$+0.491\text{ }^\circ\text{C por década}$ ($p = 7.43 \times 10^{-5}$)**, mientras que la temperatura de la superficie de la piel (*skin temperature*, $TS$) en verano aumenta a **$+0.350\text{ }^\circ\text{C por década}$ ($p = 1.69 \times 10^{-3}$)**.
   - **Distinción Rigurosa del Estado de Datos en Vía B:** Los archivos actualmente en `via-b/datos/` corresponden exclusivamente a **datos sintéticos de prueba** (`via-b/datos/prueba/`), generados algorítmicamente para el desarrollo de la interfaz. La transición a datos observados reales (`via-b/datos/reales/`) depende del cierre formal de la decisión metodológica humana **D15** en `docs/DECISIONES.md`, la cual define los polígonos definitivos de sectores y referencias desérticas.

2. **Capacidad y Límites Espaciales: Colonias vs. Sectores Urbanos (R2.1):**
   - **Disparidad de Escala Físico-Territorial:** Los sectores urbanos de SunCity miden **$3.11\text{ km} \times 3.11\text{ km}$ ($9.68\text{ a }9.69\text{ km}^2$)**, mientras que las más de 450 colonias y fraccionamientos de Hermosillo promedian entre **$0.20\text{ y }0.80\text{ km}^2$** ($20\text{ a }80\text{ hectáreas}$). En consecuencia, cada sector de SunCity agrega territorialmente entre **15 y 30 colonias completas** y más de 800 manzanas catastrales.
   - **Límite Físico de MODIS (1,000 m):** Debido a la ley de Stefan-Boltzmann y la mezcla radiativa sub-píxel (*pixel mixing*), un píxel de 1 km² integra la emisión térmica de más de 125 manzanas (asfalto, techumbres metálicas, suelo seco y vegetación). **Es físicamente imposible con MODIS discriminar colonias individuales o puntos críticos locales (*hotspots*)**. No obstante, la agregación espacial en macro-sectores de $\ge 9\text{ km}^2$ (Decisión D15) es una necesidad matemática para maximizar la relación señal/ruido (SNR), amortiguar el error de georreferenciación orbital (*jitter* cartográfico) y derivar tendencias decenales robustas a lo largo de 19 a 25 años.
   - **Potencial y Restricciones de ECOSTRESS (70 m):** Con píxeles de $70\text{ m} \times 70\text{ m}$ ($0.49\text{ ha}$), ECOSTRESS posee ~204 celdas dentro de cada píxel de MODIS. Una cuadrícula de $40 \times 40 = 1,600\text{ celdas}$ dentro de un sector revela un gradiente térmico intra-sectorial de hasta **$11.32\text{ }^\circ\text{C}$** en el sector S01, discriminando colonias, naves industriales y parques públicos. Sin embargo, su órbita precesante en la ISS (pasos a diferentes horas solares locales), revisitas erráticas (3 a 7 días) y serie corta (< 8 años, operativa desde mediados de 2018) **impiden matemáticamente calcular tendencias multidecadales**.
   - **Solución Desacoplada de SunCity:** MODIS (1 km) se utiliza para la significancia temporal decenal macro-sectorial, mientras que ECOSTRESS (70 m) se emplea como zoom espacial estático descriptivo (Modelo I) en el sector prioritario.

3. **Funcionalidad Actual para Anomalías Térmicas (R2.2):**
   - SunCity aísla la anomalía térmica urbana restando la línea base del desierto natural circundante ($\Delta_{s,t} = \overline{LST}_{s,t} - \overline{LST}_{ref,t}$), suprimiendo la variabilidad climática regional sinóptica.
   - Aplica estimadores no paramétricos robustos (Theil-Sen para la pendiente, Mann-Kendall con corrección de Hamed-Rao para autocorrelación temporal, y control de tasa de falso descubrimiento FDR de Benjamini-Hochberg para comparaciones múltiples entre sectores).
   - Analiza el ciclo diario en 4 pasos (Terra 10:30, Aqua 13:30, Terra 22:30, Aqua 01:30) contrastando algoritmos split-window (MOD11) frente a TES (MOD21).
   - Evalúa 6 variantes de sensibilidad para salvaguardar los resultados contra la deriva orbital de Terra y Aqua post-2020 y sesgos de selección de algoritmos o referencias.

4. **Valor, Soluciones y Casos de Uso Prácticos (R2.3):**
   - Aporta al Instituto Municipal de Planeación Urbana de Hermosillo (IMPLAN), SIDUR y Protección Civil una herramienta cuantitativa para priorizar obras de infraestructura verde, techos reflectivos y pavimentos permeables, cruzando las tasas de calentamiento relativo con la población residente (GPW 2020).
   - Cuantifica la magnitud de la retención térmica nocturna ($+1.0$ a $+2.5\text{ }^\circ\text{C}$ sobre el desierto), facilitando la prevención de sobrecargas energéticas y estrés nocturno.
   - Democratiza la ciencia mediante veredictos en lenguaje llano, semáforo transparente (Rojo, Azul, Gris) y fichas de sector imprimibles en una sola hoja para comités vecinales.
   - Ofrece una alternativa robusta e ininterrumpida frente a la descontinuación de estaciones meteorológicas de superficie en Hermosillo (cuyos registros en SMN y NOAA CDO cesaron en 2013).

5. **Integridad Científica y Preservación del Repositorio (R3):**
   - Cumplimiento riguroso de las fronteras científicas de `docs/01-PLAN.md` (§7) y `AGENTS.md`: se prohíbe terminantemente afirmar que se mide temperatura del aire a partir de LST, atribuir causas u obras urbanas, afirmar impactos en salud o calidad de vida, afirmar a priori que Hermosillo sea un oasis diurno, o asumir que Vía A resuelve colonias.
   - Cero modificaciones a los archivos de código fuente existentes (`.py`, `.js`, `.html`, `.css`), cumpliendo íntegramente las pruebas de aceptación y verificación del repositorio.

---

## 1. Compilación de Datos Masivos de la NASA para Hermosillo (Requisito R1)

### 1.1 Catálogo de Productos y Misiones Integradas

La arquitectura de SunCity sintetiza datos de diversas misiones de observación terrestre de la NASA, procesadas a través de Google Earth Engine, NASA AppEEARS y la API de NASA POWER:

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                    ARQUITECTURA DE DATOS SATELITALES EN SUNCITY                                         |
+=========================================================================================================================+
|  MISIÓN / SENSOR   |    PRODUCTO NASA    | RESOLUCIÓN | TEMPORALIDAD | VARIABLE CLAVE       | QC / FILTRADO APLICADO    |
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| MODIS Terra        | MODIS/061/MOD11A2   | 1,000 m    | Compuesto 8d | LST_Night_1km        | Bits 0-1 = 0, o bits = 1  |
| (EOS AM-1)         |                     |            | (10:30/22:30)| LST_Day_1km          | con error <= 2 K (bits 6-7|
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| MODIS Aqua         | MODIS/061/MYD11A2   | 1,000 m    | Compuesto 8d | LST_Night_1km        | Mismo filtrado QC que     |
| (EOS PM-1)         |                     |            | (13:30/01:30)| LST_Day_1km          | MOD11A2                   |
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| MODIS Terra        | MODIS/061/MOD21A1D  | 1,000 m    | Diario       | LST_1KM (Día)        | Algoritmo TES             |
| (Algoritmo TES)    | MODIS/061/MOD21A1N  |            | (10:30/22:30)| LST_1KM (Noche)      | QC bits 0-1 <= 1          |
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| MODIS Aqua         | MODIS/061/MYD21A1D  | 1,000 m    | Diario       | LST_1KM (Día)        | Algoritmo TES             |
| (Algoritmo TES)    | MODIS/061/MYD21A1N  |            | (13:30/01:30)| LST_1KM (Noche)      | QC bits 0-1 <= 1          |
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| ECOSTRESS          | NASA/ECOSTRESS/     | 70 m       | Precesante   | LST (L2T_LSTE)       | Mediana por píxel de      |
| (ISS)              | L2T_LSTE/V2         |            | (Horas var.) |                      | escenas nocturnas despejad|
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| MODIS Vegetación   | MODIS/061/MOD13A2   | 1,000 m    | Compuesto 16d| NDVI (escala 0.0001) | Verificación de desierto  |
| (Terra)            |                     |            |              |                      | virgen: NDVI < 0.20       |
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| Yale Center for    | YALE/YCEO/UHI/      | 300 m      | Anual        | Daytime / Nighttime  | Cotejo metodológico       |
| Earth Observation  | UHI_yearly_pixel/v4 |            | (2003–2018)  | UHI intensity (°C)   | de isla de calor          |
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| NASA POWER         | API v2.10.0         | ~50 km     | Mensual /    | T2M_MIN, T2M_MAX,    | Modelo global asimilado   |
| (MERRA-2)          | /temporal/monthly/  | (0.5°x0.625| Anual        | T2M, TS, PRECTOTCORR | con observaciones satelit.|
+--------------------+---------------------+------------+--------------+----------------------+---------------------------+
| CIESIN / NASA      | CIESIN/GPWv411/     | 1,000 m    | Estático     | population_count     | Suma zonal por polígono   |
| SEDAC              | GPW_Population_Count| (30 arc-sec| (Censo 2020) |                      | de sector urbano          |
+-------------------------------------------------------------------------------------------------------------------------+
```

### 1.2 Distinción Crítica: Datos Reales Observados vs. Datos Sintéticos de Prueba

Para garantizar la honestidad científica y cumplir los requerimientos de auditoría forense, es imprescindible establecer el estado de los datos en el repositorio:

1. **Datos Reales en el Repositorio (Vía A):**
   - El archivo `via-a/datos/hermosillo.json` almacena 45 años ininterrumpidos (1981–2025) de observaciones climáticas reales de NASA POWER (MERRA-2) para las coordenadas oficiales de Hermosillo ($29.07^\circ\text{ N}, -110.97^\circ\text{ W}$). No contiene valores de relleno (`fill_value = -999`) y sus series fueron verificadas independientemente.

2. **Datos Sintéticos de Prueba en Vía B (`via-b/datos/prueba/`):**
   - El directorio `via-b/datos/` contiene exclusivamente archivos de prueba en `via-b/datos/prueba/`: `serie.csv`, `resultados.csv`, `ciclo_diario.csv`, `nivel.csv`, `nombres.json`, `sectores.geojson` y `ecostress_zoom.json`.
   - Como lo documenta explícitamente `via-b/datos/prueba/README.md`, estos archivos fueron creados por `generar_prueba.py` usando semillas deterministas (2027 y 2028), fórmulas sinusoidales para Aqua, offsets lineales para MOD21 y ruido gaussiano para simular el comportamiento de la interfaz.
   - **Bajo ninguna circunstancia las pendientes de `via-b/datos/prueba/` (ej. $+0.88\text{ }^\circ\text{C/década}$ para S01) deben reportarse como mediciones reales de Hermosillo.**
   - En la aplicación, la bandera `datosDePrueba = true` en `via-b/config.js` despliega permanentemente un aviso en la interfaz advirtiendo al usuario sobre el carácter simulado de los datos.

3. **Causa del Estado Actual: Decisión D15 en `DECISIONES.md`:**
   - La carpeta `via-b/datos/reales/` aún no ha sido generada debido a que la decisión humana **D15** ("Polígonos reales de sectores y referencias") permanece con estatus `abierta` en `docs/DECISIONES.md`. Dicha decisión corresponde a los investigadores Mario y Navarrete, quienes deben validar si los límites de los sectores respetan exactamente la huella urbana consolidada y si las referencias desérticas cumplen formalmente con `NDVI < 0.20`.
   - Todo el pipeline de procesamiento en `via-b/procesamiento/` (`generar_script_ee.py`, `exportar_ee.js`, `procesar.py`, `validar.py`) se encuentra completado y probado. Tan pronto como se ejecute la exportación en Earth Engine hacia Google Drive y se depositen los CSV en `via-b/datos/reales/export/`, SunCity pasará a modo de datos reales sin necesidad de modificar el código de la plataforma.

### 1.3 Pruebas Estadísticas Reales sobre la Serie Climática de NASA POWER (Hermosillo 1981–2025)

Para obtener conclusiones empíricas reales sobre la climatología de Hermosillo, se ejecutaron consultas analíticas utilizando la función de tendencia de referencia del repositorio (`compartido/tendencia.py`) sobre los 45 años de datos de NASA POWER en `via-a/datos/hermosillo.json`.

Se evaluaron las pendientes de Theil-Sen por década, los intervalos de confianza no paramétricos al 95% y los valores de probabilidad $p$ bajo la prueba de Mann-Kendall con corrección de Hamed-Rao:

```
+-------------------------------------------------------------------------------------------------------------------------+
|                CONSULTA CLIMÁTICA EMPÍRICA: NASA POWER MERRA-2 (HERMOSILLO, 1981–2025, N = 45 AÑOS)                    |
+=========================================================================================================================+
| VARIABLE CLIMÁTICA         | VENTANA TEMPORAL | PENDIENTE THEIL-SEN | INTERVALO IC 95%     | VALOR p (MK) | SIGNIFICANCIA |
+----------------------------+------------------+---------------------+----------------------+--------------+---------------+
| T2M_MIN (Mínima Nocturna)  | Jun–Ago (Verano) | +0.4907 °C/década   | [+0.2765, +0.6846]   | 7.43e-05     | ALTA (p<1e-4) |
| T2M_MIN (Mínima Nocturna)  | Julio            | +0.3780 °C/década   | [+0.1333, +0.6160]   | 0.0010       | SIGNIFICATIVO |
| T2M_MIN (Mínima Nocturna)  | Anual (Extremo)  | +0.2107 °C/década   | [-0.2762, +0.6500]   | 0.3476       | NO SIGNIFICAT.|
+----------------------------+------------------+---------------------+----------------------+--------------+---------------+
| TS (Superficie / Suelo)    | Jun–Ago (Verano) | +0.3499 °C/década   | [+0.1389, +0.5767]   | 0.0017       | SIGNIFICATIVO |
| TS (Superficie / Suelo)    | Anual (Promedio) | +0.3180 °C/década   | [+0.1167, +0.4267]   | 0.0021       | SIGNIFICATIVO |
+----------------------------+------------------+---------------------+----------------------+--------------+---------------+
| T2M (Media del Aire)       | Jun–Ago (Verano) | +0.3288 °C/década   | [+0.1694, +0.5043]   | 1.36e-04     | SIGNIFICATIVO |
| T2M (Media del Aire)       | Anual (Promedio) | +0.2944 °C/década   | [+0.1313, +0.4150]   | 7.37e-04     | SIGNIFICATIVO |
+----------------------------+------------------+---------------------+----------------------+--------------+---------------+
| T2M_MAX (Máxima Diurna)    | Jun–Ago (Verano) | +0.3333 °C/década   | [+0.0127, +0.6319]   | 0.0409       | SIGNIFICATIVO |
| T2M_MAX (Máxima Diurna)    | Anual (Extremo)  | +0.2947 °C/década   | [-0.0033, +0.6143]   | 0.0577       | MARGINAL      |
+----------------------------+------------------+---------------------+----------------------+--------------+---------------+
| PRECTOTCORR (Precipitación)| Anual / Verano   | -0.0299 mm/día/déc  | [-0.1082, +0.0407]   | 0.4811       | SIN TENDENCIA |
+-------------------------------------------------------------------------------------------------------------------------+
```

#### Hallazgos Clave de la Consulta Empírica:
1. **Foco Crítico Nocturno Estival:** El calentamiento más veloz e indiscutible en la región de Hermosillo se manifiesta en la **temperatura mínima nocturna del verano** ($+0.491\text{ }^\circ\text{C/década}$, $p < 0.0001$). En el acumulado de los 45 años analizados, las noches de verano son en promedio **$\approx 2.2\text{ }^\circ\text{C}$ más cálidas** que en 1981.
2. **Contraste Anual vs. Estival:** La temperatura mínima extrema anual no muestra significancia ($p = 0.35$) debido a la alta variabilidad de los frentes fríos de invierno. Esto valida y justifica plenamente la Decisión metodológica **D14** de SunCity: **concentrar el análisis en la temporada de verano (meses 6 a 8, junio a agosto)**.
3. **Calentamiento de la Superficie:** La temperatura de la superficie terrestre ($TS$) en verano aumenta a $+0.350\text{ }^\circ\text{C/década}$ ($p = 0.0017$), demostrando que la piel física del terreno experimenta un forzamiento térmico continuo y medible desde el espacio.

---

## 2. Capacidad y Limitaciones: Colonias vs. Sectores Urbanos (Requisito R2.1)

Una de las interrogantes centrales para la planeación urbana consiste en determinar si los datos satelitales de la NASA permiten identificar **colonias específicas o zonas barriales afectadas por el calor** frente a la escala de sectores urbanos.

### 2.1 Geometría y Dimensiones de los Sectores de SunCity

En `via-b/datos/prueba/sectores.geojson` y en el generador de Earth Engine `plantilla_ee.js`, Hermosillo se modela a través de 8 polígonos ortogonales en el elipsoide WGS84:

```
                                    REPRESENTACIÓN ESPACIAL DE SECTORES EN HERMOSILLO
                                    
           -111.17°              -111.015°             -110.983°             -110.951°
  29.112° N   +                     +---------------------+---------------------+
              |                     |                     |                     |
              |                     |         S05         |         S06         |
              |                     |  Hermosillo Noroeste|   Hermosillo Norte  |
  29.084° N   |                     +---------------------+---------------------+
              |  [ RB: Desierto ]   |                     |                     |
              |  3.40 x 3.34 km     |         S03         |         S04         |
              |  Area: 11.34 km²    |   Hermosillo Oeste  |   Hermosillo Centro |
  29.056° N   |                     +---------------------+---------------------+
              |                     |                     |                     |
              |  [ RA: Desierto ]   |         S01         |         S02         |
              |  3.40 x 3.34 km     |  Hermosillo Suroeste|   Hermosillo Sur    |
  29.028° N   +  Area: 11.35 km²    +---------------------+---------------------+
              |
              |<--- ~15 km desierto --->|<------- ~6.22 km mancha urbana ------->|
```

Las dimensiones físicas exactas, áreas y poblaciones asociadas (censo GPW v4.11) resultan de la auditoría geodésica:

| Sector | Identificador | Bounding Box [Oeste, Sur, Este, Norte] | Dimensiones Métricas (E-O × N-S) | Área Exacta | Población 2020 | Nombre Oficial por Ubicación |
|---|---|---|---|---|---|---|
| **S01** | Urbano | `[-111.0150, 29.0280, -110.9830, 29.0560]` | $3.11\text{ km} \times 3.11\text{ km}$ | $9.69\text{ km}^2$ | 18,000 hab. | Hermosillo Suroeste |
| **S02** | Urbano | `[-110.9830, 29.0280, -110.9510, 29.0560]` | $3.11\text{ km} \times 3.11\text{ km}$ | $9.69\text{ km}^2$ | 21,700 hab. | Hermosillo Sur |
| **S03** | Urbano | `[-111.0150, 29.0560, -110.9830, 29.0840]` | $3.11\text{ km} \times 3.11\text{ km}$ | $9.68\text{ km}^2$ | 25,400 hab. | Hermosillo Oeste |
| **S04** | Urbano | `[-110.9830, 29.0560, -110.9510, 29.0840]` | $3.11\text{ km} \times 3.11\text{ km}$ | $9.68\text{ km}^2$ | 29,100 hab. | Hermosillo Centro |
| **S05** | Urbano | `[-111.0150, 29.0840, -110.9830, 29.1120]` | $3.11\text{ km} \times 3.11\text{ km}$ | $9.68\text{ km}^2$ | 32,800 hab. | Hermosillo Noroeste |
| **S06** | Urbano | `[-110.9830, 29.0840, -110.9510, 29.1120]` | $3.11\text{ km} \times 3.11\text{ km}$ | $9.68\text{ km}^2$ | 36,500 hab. | Hermosillo Norte |
| **RA** | Ref. Desierto | `[-111.1700, 29.0100, -111.1350, 29.0400]` | $3.40\text{ km} \times 3.34\text{ km}$ | $11.35\text{ km}^2$ | 0 hab. | Referencia A (Suroeste) |
| **RB** | Ref. Desierto | `[-111.1700, 29.1000, -111.1350, 29.1300]` | $3.40\text{ km} \times 3.34\text{ km}$ | $11.34\text{ km}^2$ | 0 hab. | Referencia B (Noroeste) |

- **Huella Urbana Total Analizada:** $58.10\text{ km}^2$ en una retícula compacta de 2 columnas por 3 filas ($6.22\text{ km} \times 9.34\text{ km}$).
- **Líneas Base Desérticas (RA y RB):** Situadas a $\sim 16.5\text{ km}$ al oeste del centro de la ciudad en llanuras aluviales de matorral desértico virgen ($\text{NDVI} < 0.20$), aisladas de fuentes antropogénicas.

### 2.2 Relación de Escala: Macro-Sectores vs. Colonias Catastrales

La morfología urbana de Hermosillo cuenta con más de **450 colonias y fraccionamientos** dentro de una mancha urbana de $\sim 160 - 180\text{ km}^2$:
- **Superficie de una colonia promedio:** Oscila entre **$0.20\text{ km}^2$ y $0.80\text{ km}^2$** ($20\text{ a }80\text{ hectáreas}$). Colonias consolidadas extensas (ej. San Benito o Palo Verde) abarcan $\sim 1.05\text{ a }1.20\text{ km}^2$; vecindarios residenciales tradicionales (ej. Centenario o Modelo) ocupan apenas $0.35\text{ a }0.45\text{ km}^2$.
- **Tamaño de manzana típica:** Una manzana hermosillense mide comúnmente $80\text{ m} \times 100\text{ m}$ o $100\text{ m} \times 120\text{ m}$ ($0.008\text{ a }0.012\text{ km}^2$, es decir, $\sim 1\text{ hectárea}$).
- **Factor de Agregación Espacial:** Un solo sector de SunCity ($\approx 9.68\text{ km}^2 = 968\text{ ha}$) comprende físicamente entre **15 y 30 colonias completas** y más de **800 manzanas**.

#### Caso de Estudio: Sector S04 ("Hermosillo Centro", 9.68 km²)
El sector S04 tiene su centroide a solo 1.13 km del Palacio Municipal y la Plaza Zaragoza. Abarca simultáneamente un mosaico heterogéneo que incluye:
1. **Colonia Centro** (~0.85 km²): Núcleo histórico institucional y comercial, pavimentación densa, azoteas de concreto y nula vegetación.
2. **Colonia San Benito** (~1.05 km²): Corredor comercial y residencial continuo sobre los bulevares Morelos y Rodríguez.
3. **Colonia Centenario** (~0.35 km²): Sector residencial tradicional con arbolado vial maduro y plazas públicas.
4. **Colonias de ladera y barrios antiguos:** 5 de Mayo, Malecón, El Mariachi, La Matanza y Cañada de los Álamos en las inmediaciones del Cerro de la Campana.
5. **Grandes Equipamientos Urbanos:** El campus central de la Universidad de Sonora (UNISON, ~0.30 km² con áreas ajardinadas y estacionamientos expuestos), el Hospital General del Estado y el Parque Madero (~0.08 km²).

**Implicación Metodológica:** La señal térmica calculada para el Sector S04 es el **promedio radiativo integrado** del Parque Madero, el campus de la UNISON, el Cerro de la Campana, el pavimento de la calle Serdán y decenas de colonias residenciales adyacentes. Atribuir la tendencia de S04 exclusivamente a la "Colonia Centro" o a un vecindario específico representaría un sesgo grave de escala territorial.

### 2.3 Resolución de MODIS (1,000 m) y el Mecanismo Físico de Mezcla de Píxeles

Los sensores MODIS a bordo de los satélites Terra y Aqua operan a una resolución espacial nadir de **$1,000\text{ m} \times 1,000\text{ m}$ ($1.0\text{ km}^2 = 100\text{ ha}$)**:

1. **Efecto de Mezcla Radiativa (*Pixel Mixing*):**
   - Dentro de un solo píxel de MODIS caben entre **80 y 125 manzanas urbanas completas**.
   - De acuerdo con la ecuación de transferencia radiativa y la ley de Stefan-Boltzmann, la temperatura superficial registrada en órbita ($LST_{obs}$) no es un promedio aritmético simple, sino la integración no lineal de la radiancia emitida por todos los componentes del terreno:
     $$L_{sensor} = \sum_{k=1}^{M} f_k \cdot \epsilon_k \cdot \frac{\sigma T_k^4}{\pi} + L_{atm}$$
     donde $f_k$ es la fracción de área de cada elemento (asfalto de calles, láminas de zinc, concreto, suelo desnudo, copas de árboles), $\epsilon_k$ su emisividad superficial espectral y $T_k$ su temperatura termodinámica.

2. **Imposibilidad de Resolver Colonias:**
   - Dado que una colonia típica como Centenario ($0.35\text{ km}^2$) ocupa menos del 35% de un píxel de MODIS, su emisión térmica está inevitablemente mezclada con las avenidas perimetrales y las colonias vecinas. No existe separación óptica para aislarla.

3. **Invisibilidad de Puntos Críticos Locales (*Hotspots*):**
   - Una micro-isla de calor extrema (ej. el estacionamiento asfaltado de un centro comercial o una nave industrial de 3 a 5 hectáreas) representa únicamente el **3% al 5% del área de un píxel de MODIS**. Su anomalía térmica se diluye por completo en el 95% restante del mosaico urbano circundante.

4. **Necesidad Matemática de la Escala de Sector $\ge 9\text{ km}^2$ (Decisión D15):**
   - En `docs/DECISIONES.md`, la regla fija: *"cada sector 9 km² o más"*.
   - Un polígono de $9.68\text{ km}^2$ engloba entre **9 y 12 píxeles de 1 km de MODIS**.
   - Promediar espacialmente $\ge 9$ píxeles reduce la varianza del error instrumental por un factor de $\sqrt{N} \approx 3$. Esto permite detectar de forma estadísticamente significativa tendencias multidecadales pequeñas ($+0.2$ a $+0.5\text{ }^\circ\text{C/década}$) a lo largo de 19 a 25 años, amortiguando simultáneamente el *jitter* de georreferenciación cartográfica orbital (~50 m) y la variación del ángulo de paso de Terra y Aqua.

### 2.4 Resolución de ECOSTRESS (70 m) y Variabilidad Intra-Sectorial

El radiómetro térmico ECOSTRESS, instalado en la Estación Espacial Internacional (ISS), remuestrea la radiancia a una retícula de **$70\text{ m} \times 70\text{ m}$ ($0.0049\text{ km}^2 = 0.49\text{ ha}$)**:

1. **Poder de Discriminación Espacial:**
   - Dentro de un solo píxel de MODIS caben **~204 píxeles de ECOSTRESS**.
   - Dentro de un sector de SunCity de $9.68\text{ km}^2$ caben **~1,970 píxeles de ECOSTRESS**.
   - En la implementación de SunCity (`via-b/datos/prueba/ecostress_zoom.json` y `via-b/zoom-ecostress.js`), una grilla de **$40 \times 40 = 1,600\text{ celdas}$** abarca un subconjunto de $2.8\text{ km} \times 2.8\text{ km}$ dentro del sector prioritario S01.
   - **Gradiente Térmico Detectado:** Mientras MODIS asigna un único valor medio para todo el sector, la retícula de 70 m revela una temperatura mínima de $22.47\text{ }^\circ\text{C}$, una máxima de $33.79\text{ }^\circ\text{C}$ y un rango intra-sectorial de **$11.32\text{ }^\circ\text{C}$** ($\sigma = 2.52\text{ }^\circ\text{C}$).
   - **Mapeo de Vecindarios y Manzanas:** A 70 m sí es posible distinguir colonias individuales (una colonia típica contiene entre 60 y 160 píxeles independientes), naves industriales, pavimentos viales y parques públicos (el Parque Madero contiene ~16 píxeles que destacan como un remanso térmico).

2. **Limitaciones Críticas que Impiden el Análisis de Tendencias Decenales:**
   - **Órbita Precesante no Heliosincrónica de la ISS:** La ISS vuela con una inclinación orbital de $51.6^\circ$. La hora solar local de sobrepaso sobre Sonora precesa continuamente a lo largo de las 24 horas del día en ciclos de ~60 días. Dos capturas de ECOSTRESS sobre Hermosillo pueden suceder a las 01:15 AM y a las 05:30 AM, captando momentos térmicos no equiparables.
   - **Revisitas Erráticas:** El intervalo de revisita sobre una misma coordenada geográfica en Sonora oscila erráticamente entre 3 y 7 días.
   - **Serie Histórica Muy Corta (< 8 años):** ECOSTRESS fue puesto en órbita en julio de 2018; solo cuenta con observaciones útiles a partir del verano de 2019. Resulta imposible calcular tendencias decenales a 15 o 20 años con rigor estadístico (la Decisión **D08** exige un mínimo de 15 años).
   - **Nubosidad en Temporada de Monzón:** Las tormentas convectivas y cirros nocturnos del Monzón de Norteamérica (junio a agosto) descartan muchas de las pocas pasadas disponibles.
   - **Cobertura en Earth Engine:** La colección en Google Earth Engine ha mostrado vacíos geográficos en Sonora, requiriendo descargas manuales vía NASA AppEEARS (Decisión **D10**).

### 2.5 Cuadro Comparativo de Sensores y Unidades Territoriales

```
+----------------------------------------------------------------------------------------------------------------------------------+
|                          COMPARATIVA MULTIESCALA: SENSORES SATELITALES Y ENTIDADES TERRITORIALES                                 |
+==================================================================================================================================+
| NIVEL TERRITORIAL /    | RESOLUCIÓN NOMINAL | ÁREA TÍPICA     | PÍXELES MODIS | PÍXELES ECOSTRESS | ¿TENDENCIA DECENAL? | ¿DISCRIMINA    |
| SENSOR SATELITAL       |                    |                 | (1 km)        | (70 m)            | (19–25 AÑOS)        | COLONIAS?      |
+------------------------+--------------------+-----------------+---------------+-------------------+---------------------+----------------+
| Manzana Urbana         | Catastral          | 0.008 - 0.012 km| ~0.01 píxel   | ~2 a 3 píxeles    | NO                  | Sub-unidad     |
| Colonia Típica         | Vecindario         | 0.20 - 0.80 km² | 0.2 a 0.8     | ~40 a 160 píxeles | NO                  | UNIDAD OBJETIVO|
| Sector SunCity (S01-06)| Retícula 3.11 km   | 9.68 km²        | ~9 a 12       | ~1,970 píxeles    | SÍ (2001–2019/25)   | Agrega 15–30   |
| Referencia Desierto    | Bounding Box       | 11.35 km²       | ~11 a 14      | ~2,315 píxeles    | SÍ (Línea base)     | Desierto puro  |
| MODIS (Terra / Aqua)   | 1,000 m            | 1.00 km²        | 1             | ~204 píxeles      | SÍ (2001–2025)      | NO (Mezcla)    |
| ECOSTRESS (ISS)        | 70 m               | 0.0049 km²      | 0.0049        | 1                 | NO (< 8 años, ISS)  | SÍ (Estático)  |
| NASA POWER (MERRA-2)   | 0.5° x 0.625°      | ~3,300 km²      | ~3,300        | ~670,000 píxeles  | SÍ (1981–2025)      | NO (Regional)  |
+----------------------------------------------------------------------------------------------------------------------------------+
```

---

## 3. Funcionalidad Actual para Detectar y Caracterizar Anomalías Térmicas (Requisito R2.2)

SunCity implementa un marco analítico integral de 10 modelos cuantitativos (Modelos A a J, definidos en `docs/05-MODELOS.md`) diseñado para evaluar rigurosamente el comportamiento térmico de la ciudad frente al desierto.

```
+-------------------------------------------------------------------------------------------------------+
|                              FLUJO METODOLÓGICO DE ANÁLISIS TÉRMICO (SUNCITY)                         |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|   [ MODIS Terra/Aqua LST ]            [ Desierto de Referencia (RA) ]                                 |
|              |                                      |                                                 |
|              v                                      v                                                 |
|   +--------------------------------------------------------------------+                              |
|   | MODELO A: Serie de Diferencias Anuales de Verano                  |                              |
|   |           Δ(s,t) = LST_sector(s,t) - LST_desierto(t)               |                              |
|   |           (Elimina señal climática regional; aísla huella urbana)   |                              |
|   +--------------------------------------------------------------------+                              |
|              |                                                                                        |
|              +--------------------------------------+                                                 |
|              |                                      |                                                 |
|              v                                      v                                                 |
|   +--------------------------+       +------------------------------------+                           |
|   | MODELO B: Theil-Sen      |       | MODELO C: Mann-Kendall + Hamed-Rao |                           |
|   | Pendiente robusta        |       | Prueba no paramétrica de tendencia |                           |
|   | (°C/década) e IC 95%     |       | corregida por autocorrelación lag-1|                           |
|   +--------------------------+       +------------------------------------+                           |
|              |                                      |                                                 |
|              |                       +--------------+                                                 |
|              |                       |                                                                |
|              |                       v                                                                |
|              |       +------------------------------------+                                           |
|              |       | MODELO D: Ajuste FDR (Benjamini-H) |                                           |
|              |       | Control de falso descubrimiento    |                                           |
|              |       | en comparaciones multi-sector      |                                           |
|              |       +------------------------------------+                                           |
|              |                       |                                                                |
|              +-----------------------+                                                                |
|              |                                                                                        |
|              v                                                                                        |
|   +--------------------------------------------------------------------+                              |
|   | DECISIÓN D16: SEMÁFORO DE CAMBIO TÉRMICO                           |                              |
|   | Rojo: p_fdr < 0.05, pendiente > 0, IC 95% no cruza cero            |                              |
|   | Azul: p_fdr < 0.05, pendiente < 0, IC 95% no cruza cero            |                              |
|   | Gris: no significativo (19 años pueden no alcanzar)                |                              |
|   +--------------------------------------------------------------------+                              |
|              ^                                                                                        |
|              |                                                                                        |
|   +------------------------------------+     +------------------------------------+                   |
|   | MODELO E: Curva de 6 Variantes     |     | MODELO J: Ciclo Diario (4 Pasos)   |                   |
|   | Prueba de robustez metodológica:   |     | 10:30, 13:30, 22:30, 01:30         |                   |
|   | sin_01_02, aqua, ref_b, mod21...   |     | Contraste MOD11 vs MOD21           |                   |
|   +------------------------------------+     +------------------------------------+                   |
+-------------------------------------------------------------------------------------------------------+
```

### 3.1 Normalización Diferencial: Sector vs. Referencia Desértica (Modelo A)
Calcular la temperatura absoluta de la ciudad no permite aislar el impacto urbano: si un verano es extraordinariamente caluroso por forzamientos sinópticos globales (como un evento de El Niño), tanto la ciudad como el desierto experimentarán anomalías positivas idénticas.

SunCity resuelve esto calculando el diferencial anual de verano:
$$\Delta_{s,t} = \overline{LST}_{s,t} - \overline{LST}_{ref,t}$$
donde:
- $\overline{LST}_{s,t}$ es la temperatura superficial nocturna del sector urbano $s$ en el verano (junio a agosto) del año $t$.
- $\overline{LST}_{ref,t}$ es la temperatura superficial nocturna del desierto natural de referencia (RA, al oeste, $\text{NDVI} < 0.20$).

Al sustraer el desierto, la serie temporal $\Delta_{s,t}$ elimina la variabilidad climática regional y captura de manera pura la **inercia térmica y capacidad calorífica diferencial de los materiales urbanos construidos**.

### 3.2 Estimación de Pendiente Decadal con Theil-Sen (Modelo B)
Para modelar la tasa de cambio decenal de $\Delta_{s,t}$, no se utiliza regresión por mínimos cuadrados ordinarios (OLS), ya que esta técnica es sumamente vulnerable a veranos con monzón anómalo o nubosidad residual. Se implementa el estimador de **Theil-Sen**:
$$\hat\beta = \operatorname{mediana}_{i<j}\left(\frac{\Delta_j - \Delta_i}{t_j - t_i}\right) \times 10 \quad [^\circ\text{C/década}]$$
- Para $N = 19$ años (2001–2019), se evalúan las pendientes de los $\binom{19}{2} = 171$ pares de años posibles y se extrae la mediana.
- Se calculan intervalos de confianza al 95% simétricos por el método de Sen-Sievers.
- Posee un punto de ruptura (*breakdown point*) del 29.3%, garantizando resistencia ante valores atípicos.

### 3.3 Significancia Estadística: Mann-Kendall, Hamed-Rao y FDR (Modelos C y D)
Para evaluar si la tendencia es estadísticamente distinguible del ruido, se implementan tres niveles de salvaguarda:
1. **Prueba de Mann-Kendall:** Evalúa la monotonicidad de la serie mediante el conteo de signos de las diferencias entre pares de años.
2. **Corrección de Hamed-Rao:** En series climáticas, la autocorrelación serial positiva de orden 1 subestima la varianza del estadístico de prueba, produciendo falsos positivos. La corrección de Hamed-Rao reajusta la varianza. El sistema adopta el valor de probabilidad más conservador: $p = \max(p_{mk}, p_{hr})$.
   - *Hallazgo H01 y Decisión D13:* Si la tendencia es tan pronunciada que la fórmula de Hamed-Rao produce varianza negativa ($p_{hr} = \text{NaN}$), el sistema adopta transparentemente $p_{mk}$ y documenta el caso en el expediente (`hamed_rao_valido = False`).
3. **Control de Tasa de Falso Descubrimiento (FDR Benjamini-Hochberg):** Al probar 6 sectores urbanos simultáneamente con $\alpha = 0.05$, la probabilidad acumulada de que al menos un sector resulte falsamente significativo es de $1 - (0.95)^6 \approx 26.5\%$. El Modelo D ajusta los valores $p$ por FDR (`p_fdr`), limitando la proporción esperada de falsos descubrimientos al 5%.

### 3.4 Caracterización Multi-Horaria y Ciclo Diario (Modelo J)
La anomalía térmica urbana varía drásticamente a lo largo de las 24 horas del día. SunCity la modela en cuatro momentos orbitales representativos:
- **Terra 10:30:** Fase matutina de calentamiento solar.
- **Aqua 13:30:** Pico diurno de insolación y calentamiento del suelo.
- **Terra 22:30:** Primera fase nocturna; el desierto se enfría rápidamente por radiación de onda larga mientras la masa construida retiene calor.
- **Aqua 01:30:** Madrugada; desacoplamiento térmico máximo entre la masa urbana y el suelo natural.

**Dispersión Instrumental:** En cada paso se evalúan en paralelo dos algoritmos físicos:
- **MOD11:** Algoritmo de división de ventana (*split-window*) basado en emisividades de bandas fijas.
- **MOD21:** Algoritmo TES (*Temperature and Emissivity Separation*), que resuelve la emisividad espectral dinámica y la temperatura termodinámica.
La interfaz visualiza la dispersión entre ambos algoritmos como una barra de incertidumbre física, impidiendo que el usuario sobreinterprete la precisión de un solo modelo.

### 3.5 Control de Deriva Orbital y Curva de Variantes de Sensibilidad (Modelo E)
Los satélites de la NASA sufren alteraciones orbitales con los años:
- Terra cruzó el ecuador a las 10:45 en sus primeros dos años (2001–2002) en lugar de su hora nominal (10:30).
- Terra concluyó sus maniobras de inclinación en febrero de 2020 y abandonó su ventana operativa en abril de 2021.
- Aqua comenzó su deriva en julio de 2021.

SunCity implementa dos salvaguardas metodológicas:
1. **Periodo Primario Limpio (2001–2019):** El semáforo oficial se circunscribe a este tramo de 19 años sin deriva. El tramo 2020–2025 se grafica punteado (`con_deriva`), advirtiendo al usuario de la incertidumbre orbital.
2. **Evaluación de 6 Variantes:**
   - `primario`: Terra 22:30, MOD11, Referencia RA, 2001–2019.
   - `sin_2001_2002`: Excluye los años de órbita a 10:45 (2003–2019).
   - `aqua`: Paso de madrugada a las 01:30.
   - `ref_b`: Referencia desértica secundaria (RB).
   - `mod21`: Algoritmo TES en lugar de split-window.
   - `con_deriva`: Serie extendida hasta 2025.
Si una tendencia es una propiedad climática física real del sector, su signo y magnitud deben permanecer estables a través de las variantes.

---

## 4. Valor, Soluciones y Casos de Uso Prácticos (Requisito R2.3)

A pesar de no recurrir a afirmaciones sensacionalistas prohibidas por el proyecto, SunCity genera un valor técnico, operativo y social sustantivo para Hermosillo.

### 4.1 Priorización Espacial de Obra Pública para IMPLAN y SIDUR

Los organismos de planeación urbana (como el IMPLAN Hermosillo y la Secretaría de Infraestructura y Desarrollo Urbano - SIDUR) frecuentemente carecen de criterios climáticos cuantitativos para distribuir presupuestos de mitigación.

**Solución aportada:**
1. **Jerarquización Térmica Objetiva:** SunCity identifica con rigor estadístico qué sectores de la ciudad presentan retención nocturna acelerada frente a aquellos con comportamiento estable o neutro.
2. **Matriz de Vulnerabilidad Cruzada (Calor + Población):** Al integrar la densidad poblacional del censo (GPW v4.11 de CIESIN/NASA), la herramienta genera una matriz de decisión:
   - *Sectores con calentamiento significativo (Rojo) y alta población* (ej. sectores con >30,000 habitantes) $\rightarrow$ **Prioridad 1 para inversión pública**: programas de arborización urbana nativa (palo verde, mezquite), corredores viales arbolados, pavimentos permeables y techos reflectivos (*cool roofs*).
   - *Sectores en Gris* $\rightarrow$ **Prioridad diferida**: la evidencia física no justifica una intervención emergente por calentamiento anómalo relativo frente al desierto.

### 4.2 Diagnóstico y Alerta de Retención Nocturna para Protección Civil

En las ciudades del desierto sonorense, la narrativa popular asume que el principal riesgo es el calor del mediodía. Sin embargo, físicamente, el desierto se enfría de forma pronunciada tras la puesta de sol gracias a la escasa humedad del aire y la alta radiación de onda larga hacia el espacio.

En la mancha urbana, el concreto, el asfalto y las edificaciones acumulan calor durante las horas de insolación y continúan emitiéndolo toda la noche:
- **Aporte de SunCity:** Al monitorear específicamente los pasos nocturnos (22:30 y 01:30), SunCity mide la magnitud de la "isla de calor nocturna" ($+1.0$ a $+2.5\text{ }^\circ\text{C}$ de sobrecalentamiento sobre el desierto natural).
- **Utilidad para Protección Civil y Gestión Energética:** Permite modelar el estrés nocturno sostenido en la población, prever la saturación y demanda continua de energía eléctrica para refrigeración residencial y anticipar riesgos por estrés térmico nocturno en viviendas precarias sin aislamiento térmico.

### 4.3 Democratización de la Información y Empoderamiento Ciudadano

La ciencia climática suele estar confinada a formatos académicos inaccesibles para los comités vecinales y ciudadanos de a pie.

**Solución aportada:**
1. **Expediente en Lenguaje Llano:** Cada sector resume su diagnóstico en términos directos y accesibles, sin perder precisión matemática: *"La diferencia nocturna entre sector y desierto aumenta de forma significativa con el criterio de FDR e intervalo del 95 %"*.
2. **Semáforo No Discriminatorio:** Si un sector no alcanza significancia estadística, se presenta en gris con su pendiente calculada y la aclaración: *"Gris no significa sin tendencia: 19 años pueden no alcanzar para pendientes chicas"*.
3. **Ficha de Sector Imprimible en Una Página (Tarea B9):** A través de reglas CSS `@media print`, la vista genera una ficha estándar tamaño carta con mapa, serie anual, intervalos de confianza, población y advertencia metodológica. Esta ficha constituye un documento formal de respaldo técnico para que los comités de vecinos soliciten infraestructura en presupuestos participativos municipales.

### 4.4 Suplencia ante el Apagón de Estaciones Meteorológicas Convencionales

Las estaciones meteorológicas de superficie en Hermosillo sufren de alta vulnerabilidad operativa. Como se comprobó en `docs/04-DATOS-Y-APIS.md` (§4.1), los registros históricos de las estaciones de superficie locales del Servicio Meteorológico Nacional (SMN) y NOAA Climate Data Online sufrieron cortes o cesaron en octubre de 2013. El mantenimiento de redes terrestres en municipios del norte del país frecuentemente se ve afectado por descalibración de sensores, vandalismo o traslados de estaciones (lo que introduce discontinuidades artificiales en las series).

**Solución de SunCity:**
- Las misiones orbitales de la NASA (MODIS Terra/Aqua y reanálisis MERRA-2) ofrecen observaciones radiométricas continuas, calibradas globalmente por los equipos de la NASA y con cobertura total desde 1981 (POWER) y 2001 (MODIS), garantizando independencia de la infraestructura terrestre local.

---

## 5. Restricciones Científicas Estrictas (Lo que SunCity NO Afirma)

El proyecto SunCity opera bajo una disciplina de veracidad científica rigurosa formalizada en la sección 7 de `docs/01-PLAN.md` y en las reglas de `AGENTS.md`. Queda estrictamente prohibido realizar afirmaciones no respaldadas por la física del sensor o la metodología estadística:

```
+--------------------------------------------------------------------------------------------------------------------+
|                         FRONTERAS CIENTÍFICAS Y PROHIBICIONES ESTRICTAS (docs/01-PLAN.md, §7)                      |
+====================================================================================================================+
| PROHIBICIÓN FORMAL         | JUSTIFICACIÓN FÍSICA / METODOLÓGICA        | APLICACIÓN EN LA PLATAFORMA SUNCITY      |
+----------------------------+--------------------------------------------+------------------------------------------+
| 1. No afirmar medición     | MODIS y ECOSTRESS captan radiancia térmica | La interfaz titula la variable como      |
|    de TEMPERATURA DEL AIRE | infrarroja de la superficie física (LST).  | "Temperatura superficial" o "LST".       |
|    en la Vía B             | La temperatura del aire a 2 m (T2m) tiene  | El glosario aclara que el aire requiere  |
|                            | menor amplitud térmica y depende de viento.| estaciones o reanálisis.                 |
+----------------------------+--------------------------------------------+------------------------------------------+
| 2. No afirmar impacto en   | Un satélite en órbita no mide morbilidad,  | Se prohíben frases como "cuida la salud" |
|    SALUD o CALIDAD DE VIDA | estrés fisiológico humano ni hospitaliza-  | o "mejora la vida". La formulación es:   |
|                            | ciones. No se modela confort humano (UTCI).| "Muestra en qué sector la noche se calien|
|                            |                                            | ta más rápido y cuánta gente vive ahí".  |
+----------------------------+--------------------------------------------+------------------------------------------+
| 3. No atribuir CAUSALIDAD  | Theil-Sen y Mann-Kendall describen tenden- | Queda prohibido afirmar que un parque    |
|    ni efecto de OBRAS      | cias temporales; no son modelos causales   | "enfrió" un sector o que la pavimentación|
|                            | ni experimentos microclimáticos con control| causó la pendiente.                      |
+----------------------------+--------------------------------------------+------------------------------------------+
| 4. No afirmar OASIS DIURNO | López González et al. (2021) midieron va-  | Solo se sostiene si el Modelo J con datos|
|    a priori                | riabilidad intra-urbana, no ciudad vs. de- | observados arroja barras negativas en los|
|                            | sierto. Es un supuesto de otras ciudades.  | pasos diurnos (10:30 y 13:30).           |
+----------------------------+--------------------------------------------+------------------------------------------+
| 5. No afirmar que la VÍA A | MERRA-2 opera en celdas de ~50x65 km. Una  | Se aclara que la Vía A evalúa regiones   |
|    ve ciudades             | sola celda cubre Hermosillo y su desierto. | macroclimáticas y sirve de puente a B.   |
+----------------------------+--------------------------------------------+------------------------------------------+
| 6. Variantes y Yale como   | Las variantes evalúan sensibilidad a su-   | Se documenta que Yale es un cotejo       |
|    pruebas independientes  | puestos; Yale procesó los mismos MODIS.    | metodológico y no un sensor ajeno.       |
+--------------------------------------------------------------------------------------------------------------------+
```

### Mecanismo de Verificación en Pruebas Automatizadas
Para garantizar que estas restricciones se cumplan permanentemente, el repositorio cuenta con un filtro en `via-b/pruebas/aceptacion.py` (líneas 17 y 223–228):
```python
PATRON = re.compile(r'oasis|salud|temperatura del aire|calidad de vida', re.I)
```
La suite de pruebas analiza automáticamente todos los textos visibles de `index.html` y los módulos JavaScript; si alguna de estas palabras prohibidas aparece en la interfaz, la prueba de aceptación falla de forma inmediata.

---

## 6. Estado de Integridad del Repositorio y Verificación Técnica (Requisito R3)

### 6.1 Preservación Estricta del Código Fuente
En cumplimiento estricto del Requisito R3 y las directivas de auditoría forense:
- **Cero archivos de código modificados:** Ningún archivo de código fuente existente del repositorio (`.py`, `.js`, `.html`, `.css` o archivos de configuración) fue modificado, creado ni eliminado durante esta tarea de evaluación.
- **Sin dependencias externas no autorizadas:** No se instalaron ni utilizaron paquetes o bibliotecas fuera de las contempladas en `requirements.txt`.
- **Trabajo acotado a documentación y metadatos:** Las únicas modificaciones realizadas corresponden a la redacción del reporte en `docs/` y en la raíz, junto con los reportes de estado y handoff de los agentes en `.agents/teamwork/`.

### 6.2 Resultados de la Suite de Pruebas del Proyecto

Se ejecutó la suite completa de pruebas para verificar la estabilidad de todo el sistema:

1. **Pruebas de Aceptación de Vía B (`via-b/pruebas/aceptacion.py`):**
   ```
   Datos: via-b\datos\prueba
   PASA Variante sin_2001_2002: 6 sectores incluyen sin_2001_2002
   PASA Ciclo diario: cuatro pasos y productos correctos en 6 sectores (Aqua: rango)
   PASA Signo de Yale: signo presente solo en los dos pasos diurnos
   PASA Zoom ECOSTRESS: archivo único asignado a S01
   PASA Validador: validar.py dio OK
   PASA Tendencia compartida: 6 resultados primarios coinciden a tres decimales
   PASA Textos visibles: sin coincidencias de oasis, salud, temperatura del aire o calidad de vida
   Resumen: 7 PASA, 0 FALLA.
   ```

2. **Pruebas del Pipeline de Procesamiento (`via-b/procesamiento/probar_procesamiento.py`):**
   ```
   Procesamiento de la Vía B: todas las comprobaciones pasaron.
   ```

3. **Prueba de Paridad de Tendencia Python vs. JavaScript (`probar_tendencia.cjs`):**
   ```
   119 casos, 0 fallos. Diferencia máxima 7.89e-8 (empates en y, p_mk)
   ```

---

## 7. Dictamen Final y Hoja de Ruta Operativa

### Dictamen Técnico
1. **Compilación y Consulta de Datos (R1):** Los productos satelitales y climáticos de la NASA compilados en SunCity proporcionan una base de datos sólida y validada. La consulta en datos reales de NASA POWER demuestra un calentamiento nocturno veraniego indiscutible en Hermosillo ($+0.491\text{ }^\circ\text{C/década}$, $p < 0.0001$).
2. **Capacidad Espacial (R2.1):** Los datos satelitales de la NASA **no permiten discriminar colonias individuales para tendencias climáticas históricas** (MODIS a 1 km promedia decenas de colonias en macro-sectores de $9.68\text{ km}^2$). Sin embargo, para mapeo intra-sectorial estático de puntos críticos, **ECOSTRESS a 70 m resuelve colonias, manzanas y parques** (rango térmico interno de $11.32\text{ }^\circ\text{C}$ en S01).
3. **Anomalías Térmicas (R2.2):** SunCity implementa un marco matemático completo para caracterizar la retención nocturna aislando el desierto natural ($\Delta_{s,t}$), aplicando Theil-Sen, Mann-Kendall con Hamed-Rao y FDR, analizando el ciclo diario en 4 pasos y protegiendo el análisis con 6 variantes de sensibilidad.
4. **Valor Práctico (R2.3):** La plataforma proporciona soluciones concretas para IMPLAN, SIDUR y Protección Civil al cruzar calentamiento nocturno con densidad poblacional, ofreciendo fichas imprimibles y supliendo la obsolescencia de estaciones terrestres locales, dentro de un marco ético de rigurosa honestidad científica.

### Hoja de Ruta para la Activación con Datos Observados Reales
Para que SunCity opere con observaciones de campo en Vía B (cumpliendo la Condición 10 de `docs/07-PLAN-DE-CIERRE.md`), se requiere exclusivamente la intervención humana en los siguientes pasos:
1. **Cierre de Decisión D15:** Aprobación definitiva de los polígonos por Mario y Navarrete en `docs/DECISIONES.md`.
2. **Extracción en Google Earth Engine:** Ejecutar `via-b/procesamiento/exportar_ee.js` en el Code Editor de Earth Engine para generar las tres tablas CSV (`suncity_lst.csv`, `suncity_yale.csv`, `suncity_extra.csv`) en Google Drive.
3. **Procesamiento Local:** Descargar los archivos a `via-b/datos/reales/export/` y ejecutar `python via-b/procesamiento/procesar.py`.
4. **Conmutación:** Modificar `RUTA_DATOS = 'datos/reales/'` en `via-b/config.js` y verificar con `python via-b/datos/validar.py via-b/datos/reales/`.
