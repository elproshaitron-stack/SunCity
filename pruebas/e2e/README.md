# Pruebas de navegador

Desde esta carpeta, con Python y Node disponibles:

```sh
npm ci
npx playwright install chromium firefox webkit
npm run flujos
```

Playwright inicia el servidor local. Los nueve flujos se ejecutan a 375, 768 y 1366 px en Chromium, Firefox y WebKit. NASA POWER responde con la serie guardada de Hermosillo y se bloquean las demás peticiones externas. El informe queda en `informe/`. Para comprobar un motor, pasa `-- --project='webkit-*'` a `npm run flujos`.

La integración continua ejecuta los tres motores por separado y guarda sus informes en GitHub Actions.
