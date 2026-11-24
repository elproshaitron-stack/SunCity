# Pruebas de navegador

Desde esta carpeta, con Python y Node disponibles:

```sh
npm ci
npx playwright install chromium firefox webkit
npm run flujos
```

Playwright inicia el servidor local. Los nueve flujos se ejecutan a 375, 768 y 1366 px en Chromium, Firefox y WebKit. NASA POWER responde con la serie guardada de Hermosillo y se bloquean las demás peticiones externas. El informe queda en `informe/`. Para comprobar un motor, ejecuta `npx playwright test --project='webkit-*'`.

La integración continua ejecuta los tres motores por separado y guarda sus informes en GitHub Actions.

## Catálogo y accesibilidad

`npm run axe` analiza las rutas y estados a los tres tamaños en Chromium. Cualquier infracción de las reglas seleccionadas hace fallar la prueba.

`npm run visual` compara las capturas del catálogo usando la imagen de Docker de Playwright que usa CI. Usa `npm run visual:actualizar` tras un cambio visual aprobado y revisa las diferencias antes de subir las capturas.

## Rendimiento móvil

`npm run lighthouse` mide portada, Región, Hermosillo y Método. Realiza tres corridas por ruta y usa la mediana. Exige rendimiento de 90 o más, LCP de hasta 2.5 s y CLS de hasta 0.1. Los informes quedan en `.lighthouseci/`.
