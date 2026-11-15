# Pruebas de punta a punta (C5 a C8)

Playwright, axe y Lighthouse para SunCity. **Solo para desarrollo:** el sitio no carga nada de esta
carpeta y sigue sin compilación. Corren en cada PR con `.github/workflows/e2e.yml`.

## Instalar

```bash
cd pruebas/e2e
npm ci
npx playwright install chromium firefox webkit
```

Las pruebas levantan solas `python servir.py 8765` desde la raíz del repositorio. Otro puerto:
`E2E_PUERTO=8790`. Otro intérprete: `E2E_PYTHON=python3`.

## Qué hay

| Archivo | Tarea | Qué comprueba |
|---|---|---|
| `flujos.spec.js` | C5 | Portada; Vía A (ciudad, variable, mes, Atrás, error junto al campo, NASA POWER bloqueado con copia guardada y con "Reintentar descarga"); Vía B (selector, Escape, `?sector=S01`); Método; 404. En Chromium, Firefox y WebKit a 375, 768 y 1366 px |
| `accesibilidad.spec.js` | C7 | axe en las cinco rutas, en dos estados extra (error de descarga y expediente abierto) y en el catálogo, a los tres anchos. Falla con una infracción seria o crítica; las moderadas y menores quedan como anotación en el informe |
| `catalogo-visual.spec.js` | C6 | Una captura por sección del catálogo y por tema (papel y noche). Un píxel distinto rompe la prueba |
| `lighthouserc.cjs` | C8 | Lighthouse en perfil de celular: rendimiento 90 o más, LCP menor que 2.5 s y CLS menor que 0.1, mediana de tres corridas |
| `ayuda.js` | | Cierra la red externa: NASA POWER responde con `via-a/datos/hermosillo.json` y todo lo demás (fuentes, MapLibre de unpkg, teselas, NASA GIBS) se bloquea |

Las pruebas buscan por rol y texto visible (`getByRole`, `getByText`), no por clases, para que
sobrevivan a los cambios de maquetación de cada vía.

## Correr

```bash
npm run flujos       # C5: 9 proyectos (3 motores × 3 anchos)
npm run axe          # C7
npm run visual       # C6, dentro de Docker (ver abajo)
npm run lighthouse   # C8; informes en .lighthouseci/informes/
npx playwright test  # todo lo de Playwright
npm run informe      # abre el informe HTML de la última corrida
```

Un fallo deja captura, traza y contexto en `resultados/`; `npx playwright show-trace <traza.zip>` lo
reproduce paso a paso.

## Capturas del catálogo: cómo actualizarlas a propósito

Las capturas de referencia están en `capturas/` y se generan en Linux, en la imagen
`mcr.microsoft.com/playwright:v<versión>-noble`, la misma que usa la integración continua. Fuera de
Linux, la prueba visual se salta sola; `npm run visual` la corre en Docker.

1. Haz el cambio visual en `compartido/` y revísalo en `compartido/catalogo.html`.
2. `npm run visual` falla y deja en `resultados/` la captura esperada, la nueva y la diferencia.
3. Si el cambio es el que querías: `npm run visual:actualizar`.
4. Revisa con `git diff --stat pruebas/e2e/capturas/` que solo cambiaron las secciones que tocaste
   y súbelas en el mismo PR, diciendo en la descripción qué cambió y por qué.

Una sección nueva del catálogo (`<template data-id>`) pide su captura: el primer `visual:actualizar`
la crea.

Las fuentes de Google se bloquean en las pruebas, así que hoy las capturas usan las fuentes de
respaldo. Cuando C3 sirva Fraunces, Hanken Grotesk e IBM Plex Mono desde el sitio, todas las
capturas cambian una vez: hay que correr `npm run visual:actualizar` en ese PR.

## Lighthouse

Mide el sitio tal cual, con la red real (fuentes de Google, MapLibre de unpkg, NASA POWER y GIBS),
en el perfil de celular de Lighthouse (red 4G lenta y CPU 4 veces más lenta, simuladas). Usa el
Chromium de Playwright; otro navegador con `CHROME_PATH`. Los números de la última medición están en
`docs/calidad/25010.md`.
