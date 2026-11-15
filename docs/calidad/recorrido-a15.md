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

## Pendiente

- **Lector de pantalla real**: NVDA en Windows y VoiceOver en iPhone (C7 automatiza axe; lo manual
  queda para quien tenga los dispositivos).
