// C8: presupuestos de Lighthouse con los umbrales de la condición 6 del plan de cierre.
// Perfil de celular (el de Lighthouse por omisión: Moto G Power con red 4G lenta simulada).
// Tres corridas por ruta; se compara la mediana. El sitio se mide tal cual, con su red real.
const { chromium } = require('@playwright/test');

const PUERTO = Number(process.env.LH_PUERTO || 8766);
const PYTHON = process.env.E2E_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const RUTAS = ['/', '/via-a/', '/via-b/', '/metodo/'];

module.exports = {
  ci: {
    collect: {
      startServerCommand: `${PYTHON} ../../servir.py ${PUERTO}`,
      startServerReadyPattern: 'http://localhost',
      url: RUTAS.map((r) => `http://127.0.0.1:${PUERTO}${r}`),
      numberOfRuns: 3,
      chromePath: process.env.CHROME_PATH || chromium.executablePath(),
      settings: {
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        chromeFlags: '--headless=new --no-sandbox',
        locale: 'es',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median-run' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median-run' }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci/informes' },
  },
};
