# 1. Plan del proyecto

Basado en Sonora Calor, Plan v5 (14 de noviembre de 2026).

## 1. Decisión

Se entrega una sola herramienta con dos niveles que comparten el mismo cálculo de tendencia.

- **Vía A, herramienta a escala.** Responde a escala de región en cualquier lugar: el usuario elige lugar y variable, ve la serie y recibe tasa de cambio y significancia. Corre entera en el navegador contra NASA POWER, sin servidor ni clave. Es la respuesta literal al reto.
- **Vía B, Hermosillo.** Baja a sectores de la ciudad y los compara con su desierto, con el efecto oasis como entrada. Conserva el núcleo científico de v4 sin recortes: expediente por sector, semáforo, variantes y `DECISIONES.md`.

El pitch vende la A; el trabajo científico vive en la B.

## 2. Alcance

| | Vía A | Vía B |
|---|---|---|
| Pregunta | ¿Qué variable cambia en mi región, cuánto, y es significativo? | ¿Qué sectores se calientan de noche más rápido que su desierto? |
| Datos | NASA POWER (MERRA-2), 1981 a hoy | MODIS a 1 km, 2001-2019; ECOSTRESS a 70 m |
| Escala | Celda de reanálisis | Sector de 9 km² o más |
| Serie | 45 años, 1981-2025 | 19 años, 2001-2019; 2020-2025 punteado |
| Cálculo | Theil-Sen + Mann-Kendall en JavaScript | La misma función en Python, más Hamed-Rao, FDR y variantes |
| Valor p | Sin ajuste, con etiqueta "exploratorio" | Ajustado por FDR entre sectores |
| Parte del reto | "Seleccionar variables", audiencia general, demos | "Dónde", "cuánto", "significativo", misma variable con signo opuesto |

### Vía A en detalle

Flujo de tres preguntas:

1. **¿Dónde?** Un clic en el mapa o una ciudad de la lista de demostración.
2. **¿Qué variable?** Una de la lista corta, con definición de una línea.
3. **¿Qué temporada?** Año completo o un mes fijo. Así se quita el ciclo estacional.

Variables de arranque (parámetros de POWER, modelo MERRA-2):

| Parámetro | Qué es |
|---|---|
| `T2M_MIN` | Temperatura mínima del aire a 2 m: qué tan fresca llega a estar la noche. En POWER mensual es el extremo del mes, no un promedio |
| `T2M_MAX` | Temperatura máxima del aire a 2 m. En POWER mensual es el extremo del mes |
| `T2M` | Temperatura media del aire a 2 m |
| `TS` | Temperatura de la superficie del suelo |
| `PRECTOTCORR` | Precipitación |

Salida en lenguaje llano: qué cambia, dónde, cuánto por década con su rango, y "significativo" o "sin evidencia suficiente todavía".

Límite que se dice en pantalla: MERRA-2 trabaja en celdas de unas decenas de kilómetros. Una celda cubre Hermosillo y su desierto juntos, así que la Vía A no puede ver la ciudad. Ese límite es el puente a la Vía B: "para ver dentro de la ciudad hace falta otro satélite".

Demostraciones grabadas: Hermosillo con `T2M_MIN`, y la segunda ciudad árida que elija Emilio.

### Vía B en detalle

Orden del expediente de un sector:

1. Ciclo diario (Modelo J): cuatro barras sobre una línea en cero. Es lo primero que se ve.
2. Serie de diferencias nocturna 2001-2019 con pendiente e intervalo; 2020-2025 punteado.
3. Curva de variantes, ahora con cinco.
4. Nivel como rango, población, semáforo y veredicto.
5. Zoom ECOSTRESS, solo en el sector prioritario.

Las reglas del semáforo y las pruebas de aceptación de la Vía B están definidas en v4.

## 3. Qué cambió contra v4

1. MOD21 nocturno a 1 km en Earth Engine es diario (`MOD21A1N`), no de 8 días. La temporada se promedia desde imágenes diarias.
2. Terra cruzó el ecuador a las 10:45 en sus dos primeros años, no a las 10:30. Se agrega la variante `sin_2001_2002`.
3. ECOSTRESS está confirmado en AppEEARS. Su cobertura en Earth Engine no quedó clara y se comprueba con un conteo antes de depender de él.
4. El ciclo diario con rango MOD11-MOD21 necesita MOD21 de Aqua (MYD21) en los pasos de 13:30 y 1:30. v4 solo exporta MOD21 de Terra.
5. El estudio de El Colegio de Sonora mide oasis dentro de la ciudad, de día. No compara la ciudad con el desierto. Esa comparación la hace el Modelo J.
6. La estación de Hermosillo puede no cubrir 2001-2019 en los archivos de NOAA. Se revisa antes de prometer la gráfica de aire.

## 4. Evidencia publicada sobre Hermosillo

Según López González y otros (2021), de El Colegio de Sonora:

- Usaron Landsat 8 de junio a agosto de 2016, cerca de las 10:52 de la mañana. Es un estudio diurno.
- La temperatura de superficie media por manzana fue de 37.35 a 45.44 °C.
- Cada 10 % más de cobertura vegetal se asoció con 1.1 °C menos de superficie (R² = 0.33).
- Hallaron oasis e islas de calor dentro de la ciudad. No compararon la ciudad con el desierto que la rodea.
- Que una ciudad árida esté 1 a 2 °C más fresca que su entorno de día lo citan de otros estudios, no de datos de Hermosillo.

**Consecuencia.** La frase "Hermosillo es un oasis de día" no está medida contra el desierto en esa fuente. El Modelo J es la pieza que lo mide, con cuatro horas de paso y dos algoritmos. Si no aparece el oasis, se reporta así y el pitch no usa la frase.

**Calidad de vida.** El proyecto no mide salud ni temperatura del aire. La frase que los datos sostienen es: "muestra a quien planea la ciudad en qué sectores la noche se calienta más rápido, con cuánta certeza, y cuánta gente vive ahí". La relación entre vegetación y temperatura se cita del estudio de arriba, no se presenta como hallazgo propio.

## 5. Equipo

| Persona | Responsabilidad | Primera tarea |
|---|---|---|
| Navarrete | Vía A | Probar la llamada de POWER desde el navegador |
| Mario | Vía B; componente de serie anual compartido | Mapa y expediente con datos de prueba en el formato fijo |
| Carlos | Estadística y `DECISIONES.md` | Correr la función de referencia con una serie inventada |
| Ángel Díaz | Earth Engine y AppEEARS | Contar escenas de ECOSTRESS y noches válidas de `MOD21A1N`; confirmar MYD21 |
| Emilio | Estación de aire y segunda ciudad | Revisar qué años cubre la estación de Hermosillo en SMN y en Climate Data Online |

## 6. Riesgos y plan B

| Riesgo | Cómo se detecta | Plan B |
|---|---|---|
| El navegador bloquea la llamada a POWER | Primera comprobación de Navarrete | Descargar una vez los JSON de las ciudades de demostración y servirlos como archivos |
| ECOSTRESS no cubre Hermosillo en Earth Engine | Conteo de escenas de Ángel Díaz | AppEEARS, cuya solicitud se lanza de todos modos |
| MYD21 no existe en Earth Engine o no se exporta a tiempo | Comprobación de Ángel Díaz | En los pasos de Aqua (13:30 y 1:30) se reporta solo MOD11 |
| La estación de Hermosillo no cubre 2001-2019 | Revisión de Emilio. Un listado muestra sus dos registros terminando en octubre de 2013 | Modelo G con `T2M_MIN` de POWER. No se promete la gráfica de aire antes de confirmar |
| No aparece el oasis diurno en el Modelo J | Barras de 10:30 y 13:30 | Se reporta así y el pitch no usa la frase |
| Pendientes chicas no detectables en 19 años | Tabla de potencia de [05-MODELOS.md](05-MODELOS.md) con el ruido real | Sector en gris con pendiente e intervalo; se explica que gris no significa "sin tendencia" |
| Falta de tiempo | Puertas de [02-FASES.md](02-FASES.md) | Orden de recorte: segunda ciudad de la Vía A, luego su selector de temporada |

## 7. Lo que no se afirma

- Que Hermosillo sea un oasis de día frente a su desierto, hasta tener el Modelo J.
- Que el proyecto mejore la calidad de vida, mida salud o temperatura del aire.
- Causas de la tendencia ni efecto de alguna medida urbana.
- Que la Vía A vea ciudades. Ve regiones.
- Que las variantes sean pruebas independientes, o que Yale sea otro sensor.

## 8. Lo que falta verificar

- La página oficial del reto no abrió. La tabla de requisitos usa el texto pegado por Mario.
- La cobertura de ECOSTRESS sobre Hermosillo en Earth Engine.
- Los identificadores marcados "sin verificar hoy" en [04-DATOS-Y-APIS.md](04-DATOS-Y-APIS.md).
- Los años que cubre la estación de Hermosillo.
- Las guías de jueces y de envío.

## 9. Requisito del reto y pieza que lo cumple

La columna del reto resume el texto que Mario pegó el 14 de noviembre.

| El reto pide | Vía A | Vía B |
|---|---|---|
| Herramienta que seleccione variables de misiones o de modelos | Selector de cinco variables de MERRA-2 | Selector de LST de noche y de día (MODIS) |
| Datos para una región particular | Cualquier punto del mapa | Sectores urbanos y dos polígonos de desierto |
| Serie de tiempo visualizada, lo bastante larga | 45 años, 1981-2025 | 19 años, 2001-2019, y extensión punteada |
| Tasa de cambio | Theil-Sen por década | Theil-Sen por década |
| Significancia: prueba t, Mann-Kendall o intervalos | Mann-Kendall e intervalo del 95 % | Lo mismo, más Hamed-Rao, FDR y variantes |
| Qué, dónde, cuánto, significativo | Veredicto en lenguaje llano | Expediente y semáforo |
| Misma variable, sentido opuesto, mismo proceso | No aplica | Ciclo diario: bajo cero de día, sobre cero de noche |
| Instrumentos y modelos nombrados | MERRA-2 | MODIS |

Consideraciones opcionales que también se cubren:

| Consideración | Pieza |
|---|---|
| Audiencia de estudiantes y público con base científica | Definición de una línea por variable y por término estadístico |
| Serie corta de preguntas | Las tres preguntas de la Vía A |
| Un par de ejemplos de demostración | Hermosillo y la segunda ciudad, grabados |
| Regiones como un desierto o el aire sobre una ciudad grande | Hermosillo y su desierto |
| Datos diarios o mensuales | POWER mensual; MODIS de 8 días y diario |
| Quitar el ciclo estacional | Temporada o mes fijo por año |
| Una tendencia no significativa también interesa | Veredicto gris con pendiente e intervalo |
| Basta con tendencias lineales | Theil-Sen es lineal; no se ajustan curvas |
| Recursos oficiales | AppEEARS (ECOSTRESS y respaldo de MODIS) y Climate Data Online (estación) |
