// Ayudas comunes: la red externa queda cerrada para que ninguna prueba dependa de internet.
// NASA POWER responde con la serie guardada de Hermosillo (via-a/datos/hermosillo.json);
// las fuentes, MapLibre en CDN, las teselas del mapa base y NASA GIBS se bloquean.
// Si C3 sirve MapLibre y las fuentes desde el sitio, las pruebas siguen igual: ya son locales.
const base = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const SERIE_POWER = fs.readFileSync(path.join(RAIZ, 'via-a', 'datos', 'hermosillo.json'));
const LOCALES = new Set(['127.0.0.1', 'localhost', '[::1]']);

const test = base.test.extend({
  context: async ({ context }, usar) => {
    await context.route('**/*', (ruta) => {
      const url = new URL(ruta.request().url());
      if (LOCALES.has(url.hostname)) return ruta.continue();
      if (url.hostname === 'power.larc.nasa.gov') {
        return ruta.fulfill({
          status: 200, contentType: 'application/json', body: SERIE_POWER,
          headers: { 'access-control-allow-origin': '*' },
        });
      }
      return ruta.abort('blockedbyclient');
    });
    await usar(context);
  },
});

module.exports = { test, expect: base.expect, RAIZ };
