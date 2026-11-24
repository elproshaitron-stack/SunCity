# Las diez condiciones de "terminado" (A18)

Revisión del 24 de noviembre de 2026 sobre `origin/main` (`1a6e815`), versión 0.9.0. De las diez condiciones del [plan de cierre](../07-PLAN-DE-CIERRE.md), 4 se cumplen, 4 se cumplen en parte y 2 siguen pendientes.

`python verificar.py` terminó con **9 PASA, 1 AVISO, 0 FALLA y código 0**. La paridad de tendencia entre Python y JavaScript pasó los 119 casos. Los datos de prueba pasaron 7 de 7 comprobaciones y los observados, 4 de 7. C1 y C2 están en `main` desde el [PR #32](https://github.com/elproshaitron-stack/SunCity/pull/32). La [corrida remota](https://github.com/elproshaitron-stack/SunCity/actions/runs/43758723400) del 15 de noviembre quedó sin iniciar por un problema de facturación o límite de gasto. El 24 de noviembre, la [corrida del PR #41](https://github.com/elproshaitron-stack/SunCity/actions/runs/45486922614) sí ejecutó el verificador y obtuvo el mismo resumen que la comprobación local.

| # | Condición | Estado | Evidencia hoy | Qué falta y de quién |
|---|---|---|---|---|
| 1 | Las dos vías usan los mismos tokens y componentes | **Cumple** | Las cinco rutas usan componentes `sc-`. La revisión de colores de `verificar.py` pasa con las excepciones justificadas en el verificador | — |
| 2 | Cada componente tiene todos sus estados dibujados | **Cumple** | `compartido/catalogo.html`: 20 componentes, cada estado en los dos temas, con su código; cursor, foco y presionado fijados desde el CSS real | — |
| 3 | Cada pantalla resuelve carga, vacío, error, sin red y datos parciales | Parcial | Vía A: esqueleto, reintento y respaldo. Vía B: esqueletos, aviso de CSV roto, sector sin cálculo y aviso de datos parciales (B5). Método: reintento | C5, pruebas de los estados de punta a punta |
| 4 | Accesibilidad WCAG 2.2 AA | Parcial | Recorrido de las cinco rutas y de la Vía A con teclado, con correcciones: `recorrido-a15.md`. Con B1 la Vía B ya tiene "Saltar al contenido" y pasa la revisión automática (0 sin nombre, 0 de contraste). Sin axe y sin lector de pantalla real | C7 (axe); revisión con NVDA o VoiceOver |
| 5 | Funciona en 375, 768 y 1366 px, en Chromium, Firefox y WebKit | Parcial | Revisado a mano en 375, 800 y 1366 px en Chromium. Firefox y WebKit sin probar | C5 (Playwright en tres motores) |
| 6 | Rápida en un celular con datos móviles | No | Solo medido en local y sin limitar la red: LCP 2.0 s y CLS 0.000 en la Vía A; 77 kB de JavaScript propio (`25010.md`) | C8 (Lighthouse con el umbral del plan) |
| 7 | No depende de terceros para abrir | **Cumple** | MapLibre 5.24.1 y las tres fuentes se sirven desde `compartido/vendor/` (licencias en `compartido/vendor/LICENCIAS.md`). Probado con la red externa bloqueada por la política de seguridad: la Vía A usa la copia guardada y avisa "El mapa base no cargó"; la Vía B dice que no hay mapa base ni capa de GIBS y los sectores siguen abriendo; portada, Método, 404 y catálogo no piden nada de fuera | — |
| 8 | Segura como sitio estático | **Cumple** | Política de seguridad de contenido en las seis páginas: `script-src 'self'` (sin scripts en línea ni `onclick`), `connect-src` limitado a NASA POWER, NASA GIBS y OpenFreeMap, `object-src 'none'`. Ningún dato de una API entra por `innerHTML`. Probado en Chrome: cero violaciones en las cinco rutas y el catálogo | Si el servidor de publicación permite cabeceras, repetir la política como cabecera y sumar `frame-ancestors` (C15) |
| 9 | Publicada y versionada | No | Sin dirección pública, sin etiqueta `v1.0.0` y sin `CHANGELOG.md`. El sitio está listo para servirse desde la raíz del repositorio, sin compilación | Despliegue (Navarrete); C15; C16 |
| 10 | La Vía B muestra datos observados | Parcial | Desde D18 la Vía B calcula con MODIS MOD11 real (NASA GIBS) y lo muestra por defecto. `aceptacion.py` sobre `datos/reales/`: 4 PASA y 3 FALLA, porque faltan MOD21, Yale y ECOSTRESS. Los polígonos siguen siendo esquemáticos | D15 (Navarrete y Mario); export de Earth Engine y AppEEARS para MOD21, Yale y ECOSTRESS (C13) |

## Evidencia pendiente

- **3 a 6.** Resolver los conflictos del [PR #36](https://github.com/elproshaitron-stack/SunCity/pull/36). Registrar la matriz de Chromium, Firefox y WebKit a 375, 768 y 1366 px, la revisión con axe, las mediciones de Lighthouse y la prueba manual con NVDA o VoiceOver. El [recorrido A15](recorrido-a15.md) conserva la evidencia de teclado.
- **9.** Verificar el despliegue de C15. Completar C16 con el registro de cambios y la etiqueta cuando se cumplan los criterios de cierre.
- **10.** Navarrete y Mario resuelven D15. El carril C procesa los polígonos y las exportaciones definitivas, comprueba los siete criterios de aceptación y guarda la evidencia de C13.

A18 se marca cuando las diez condiciones estén verificadas.

## Corrección registrada el 15 de noviembre

El botón Atrás de la Vía A vuelve a la consulta anterior. La revisión A15 lo comprobó al cambiar mes y ciudad y retroceder dos veces. La evidencia de controlabilidad está en [9241-110.md](9241-110.md).
