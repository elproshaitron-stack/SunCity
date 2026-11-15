# Recorrido de accesibilidad (A15)

Fecha: 15 de noviembre de 2026. Navegador: Chromium del panel de vista previa, 1366 px y 800 px.
Norma de referencia: ISO/IEC 40500 (WCAG 2.2 AA). Esto es evidencia de revisión, no una certificación.

## Cómo se hizo

1. **Revisión automática de cada ruta**: nombres accesibles, encabezados, regiones, ids repetidos,
   referencias ARIA rotas, imágenes sin texto alternativo, tamaño de objetivos y contraste de cada texto
   visible. El script vive en `.claude/auditar.js` (no se publica).
2. **Recorrido con teclado** de la Vía A de principio a fin, solo con Tab, flechas, Inicio, Fin, Enter
   y Escape, anotando el orden del foco y si el foco se ve.
3. **Lector de pantalla**: se revisó qué se anuncia (regiones `aria-live`, `role="status"` y
   `role="alert"`) leyendo el árbol de accesibilidad. No se usó un lector de pantalla real (NVDA o
   VoiceOver); queda pendiente para C7 o para una revisión manual.

## Resultados por ruta

| Ruta | Encabezados | Salto al contenido | Sin nombre | Contraste bajo | Estado |
|---|---|---|---|---|---|
| `/` | h1, h2 sin saltos | Sí, a `#contenido` | 0 | 0 | Pasa |
| `/via-a/` | h1, h2, h3 sin saltos | Sí, a `#resultado` | 0 de 42 enfocables | 0 | Pasa tras las correcciones |
| `/via-b/` | h1, h2, h3 sin saltos | Sí, a `#contenido` (desde B1) | 0 | 0 | Pasa tras B1 |
| `/metodo/` | h1, h2, h3 sin saltos | Sí, a `#contenido` | 0 de 25 enfocables | 0 | Pasa |
| `/404.html` | h1 | Sí, a `#contenido` | 0 | 0 | Pasa |

## Orden del foco en la Vía A

Saltar al contenido → marca → Región → Hermosillo → Método → globo → Acercar → Alejar → créditos del
mapa → ciudades → Usar mi ubicación → latitud → longitud → Usar este punto → variable (flechas entre
opciones) → temporada (flechas, Inicio y Fin) → gráfica (flechas, Inicio y Fin anuncian cada año) →
Ver datos en tabla → Descargar datos → Copiar enlace → Imprimir resultado → Ver dentro de Hermosillo →
glosario → fuentes del pie. El foco se ve en todos.

## Correcciones hechas

| Hallazgo | Corrección |
|---|---|
| Toda la sección del resultado estaba en `aria-live`: un lector leería tarjeta, cifras y gráfica en cada cambio | Un solo `role="status"` con el veredicto en una frase ("Significativo. Sube 0.38 °C por década, Hermosillo, Sonora, la temperatura mínima de julio.") |
| El lector anunciaba el globo como "Map", en inglés | Nombre en español que explica cómo moverlo con teclado, en la Vía A y en la Vía B |
| Los botones Acercar y Alejar del globo no mostraban el foco de la plataforma | Contorno de `--foco` en los controles y en el lienzo del mapa |
| Los fondos oscuros de la portada, el escenario y el 404 eran solo un degradado | Color de respaldo `--superficie` debajo del degradado |

## axe automático (C7)

`pruebas/e2e/accesibilidad.spec.js` corre axe-core 4.14.0 (con `@axe-core/playwright` 4.14.0) con las
reglas WCAG 2.0, 2.1 y 2.2 A y AA más las buenas prácticas, en Chromium a 375, 768 y 1366 px, sobre
las cinco rutas, la Vía A con el error de descarga, la Vía B con el expediente abierto y el catálogo.
Corre en cada PR. Primera corrida, 15 de noviembre de 2026:

| Hallazgo | Gravedad | Dónde | Corrección |
|---|---|---|---|
| El botón en estado "cargando" se quedaba sin nombre accesible: `visibility: hidden` en su texto también lo quita del árbol de accesibilidad | Crítica (`button-name`) | `sc-boton[aria-busy]`: catálogo y "Usar mi ubicación" de la Vía A mientras espera | `compartido/componentes.css`: el texto se oculta con opacidad; conserva ancho y nombre |
| Una tabla más ancha que su marco solo se podía desplazar con ratón | Seria (`scrollable-region-focusable`) | `/metodo/`, tabla de fuentes a 768 y 1366 px | `compartido/componentes.js`: `SC.marcosTabla()` da `tabindex="0"`, `role="region"` y nombre a cada `.sc-tabla-marco` que desborda, al cargar, al cambiar el ancho y cuando la página agrega tablas; foco visible en `componentes.css` |
| Encabezado de columna vacío | Menor (`empty-table-header`) | `/metodo/`, la primera columna de una tabla que sale de `docs/METODO.md` | Pendiente: el Markdown de origen deja la primera celda de encabezado en blanco |
| Dos regiones de navegación con el mismo nombre | Moderada (`landmark-unique`) | Catálogo: la muestra de `sc-barra` aparece en los dos temas | Aceptado: es la muestra del componente, no una página real |

Tras las correcciones: **cero infracciones serias o críticas** en las 24 combinaciones (8 páginas o
estados por 3 anchos). Las moderadas y menores quedan como anotación en el informe de Playwright.

## Pendiente

- **Lector de pantalla real**: NVDA en Windows y VoiceOver en iPhone (C7 automatiza axe; lo manual
  queda para quien tenga los dispositivos).
