# Las diez condiciones de "terminado" (A18)

Revisión de la sección 1 de `docs/07-PLAN-DE-CIERRE.md` al 15 de noviembre de 2026, versión 0.9.0.
Cada condición tiene su estado y la evidencia que hay hoy en el repositorio. **La versión 1.0 todavía no
existe:** 1 condición se cumple, 4 en parte y 5 no. Lo que falta depende sobre todo del carril C
(calidad y publicación), del carril B (Vía B) y de cerrar D15.

| # | Condición | Estado | Evidencia hoy | Qué falta y de quién |
|---|---|---|---|---|
| 1 | Las dos vías usan los mismos tokens y componentes; no queda un color suelto | Parcial | Portada, Vía A, Método, 404 y catálogo usan solo tokens y componentes `sc-`. `via-b/estilos.css` tiene 37 colores escritos a mano; `via-b/ciclo-diario.js` y `variantes.js` dibujan con colores propios | B1 (Vía B sobre tokens); C1 (`verificar.py` que lo revise) |
| 2 | Cada componente tiene todos sus estados dibujados | **Cumple** | `compartido/catalogo.html`: 20 componentes, cada estado en los dos temas, con su código; cursor, foco y presionado fijados desde el CSS real | — |
| 3 | Cada pantalla resuelve carga, vacío, error, sin red y datos parciales | Parcial | Vía A: esqueleto, error con "Reintentar descarga", copia guardada, punto sin datos y error por campo (PR #22). Método: error con "Reintentar". Faltan los de la Vía B y las pruebas de punta a punta que los comprueben | B5; C5 |
| 4 | Accesibilidad WCAG 2.2 AA | Parcial | Recorrido de las cinco rutas y de la Vía A con teclado, con correcciones: `recorrido-a15.md`. Sin axe y sin lector de pantalla real. La Vía B no tiene "Saltar al contenido" | C7 (axe); B1; revisión con NVDA o VoiceOver |
| 5 | Funciona en 375, 768 y 1366 px, en Chromium, Firefox y WebKit | Parcial | Revisado a mano en 375, 800 y 1366 px en Chromium. Firefox y WebKit sin probar | C5 (Playwright en tres motores) |
| 6 | Rápida en un celular con datos móviles | No | Solo medido en local y sin limitar la red: LCP 2.0 s y CLS 0.000 en la Vía A; 77 kB de JavaScript propio (`25010.md`) | C8 (Lighthouse con el umbral del plan) |
| 7 | No depende de terceros para abrir | No | Si NASA POWER falla, la Vía A usa la copia guardada. Pero MapLibre viene de unpkg y las fuentes de Google Fonts | C3 (terceros servidos desde el sitio); C10 (prueba sin red) |
| 8 | Segura como sitio estático | No | Ningún dato de una API entra por `innerHTML` (`25010.md`). No hay política de seguridad de contenido y hay scripts en línea | C9 |
| 9 | Publicada y versionada | No | Sin dirección pública, sin etiqueta `v1.0.0` y sin `CHANGELOG.md`. El sitio está listo para servirse desde la raíz del repositorio, sin compilación | Despliegue (Navarrete); C15; C16 |
| 10 | La Vía B muestra datos observados | No | El mapa de la Vía B ya es real (MODIS MOD11A2 desde NASA GIBS), pero los sectores, sus series y sus tendencias son de prueba (`via-b/README.md`) | D15 (Navarrete y Mario); C13 |

## Cómo se cierra cada condición

- **1, 3 y 4 (parte de B):** B1, B5 y B10.
- **1, 3, 4, 5, 6, 7 y 8 (parte de C):** C1, C2, C3, C5, C7, C8, C9 y C10. El PR #10 de Codex (C1) sigue en borrador.
- **9:** el despliegue y C15; después C16 con `CHANGELOG.md` y la etiqueta.
- **10:** cerrar D15 y correr `via-b/procesamiento/` con las exportaciones de Earth Engine (C13).

Cuando las diez estén en "Cumple", se marca A18 en el tablero.

## Cambio hecho durante esta revisión

El botón Atrás de la Vía A salía de la página porque el estado se guardaba con `replaceState`. Ahora
cada consulta nueva es una entrada del historial: Atrás vuelve a la anterior con su resultado (probado
cambiando mes y ciudad y volviendo dos veces). Con eso, Controlabilidad pasa a "Cumple" en `9241-110.md`.
