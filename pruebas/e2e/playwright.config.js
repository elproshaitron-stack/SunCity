// Pruebas de punta a punta de SunCity (C5, C6, C7). Solo para desarrollo.
// Levanta `python servir.py` en un puerto propio y prueba cada flujo en tres motores y tres anchos.
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

const PUERTO = Number(process.env.E2E_PUERTO || 8765);
const PYTHON = process.env.E2E_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const RAIZ = path.resolve(__dirname, '..', '..');

// Anchos de la condición 5 del plan de cierre
const ANCHOS = {
  movil: { width: 375, height: 812 },
  tableta: { width: 768, height: 1024 },
  escritorio: { width: 1366, height: 768 },
};
const MOTORES = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
};

const proyectos = [];
for (const [motor, dispositivo] of Object.entries(MOTORES)) {
  for (const [ancho, viewport] of Object.entries(ANCHOS)) {
    proyectos.push({
      name: `${motor}-${ancho}`,
      testMatch: /flujos\.spec\.js/,
      use: { ...dispositivo, viewport, deviceScaleFactor: 1 },
    });
  }
}
// axe en Chromium a los tres anchos: las reglas no dependen del motor, sí del acomodo
for (const [ancho, viewport] of Object.entries(ANCHOS)) {
  proyectos.push({
    name: `axe-${ancho}`,
    testMatch: /accesibilidad\.spec\.js/,
    use: { ...MOTORES.chromium, viewport, deviceScaleFactor: 1 },
  });
}
// Capturas de referencia: un solo motor y un solo ancho, en la imagen de Docker de Playwright (ver README)
proyectos.push({
  name: 'visual',
  testMatch: /catalogo-visual\.spec\.js/,
  use: { ...MOTORES.chromium, viewport: ANCHOS.escritorio, deviceScaleFactor: 1 },
});

module.exports = defineConfig({
  testDir: __dirname,
  outputDir: path.join(__dirname, 'resultados'),
  snapshotPathTemplate: '{testDir}/capturas/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0, threshold: 0.2, animations: 'disabled', caret: 'hide' },
  },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: path.join(__dirname, 'informe') }], ['github']]
    : [['list'], ['html', { open: 'never', outputFolder: path.join(__dirname, 'informe') }]],
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: 'es-MX',
    timezoneId: 'America/Hermosillo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: proyectos,
  webServer: {
    command: `${PYTHON} servir.py ${PUERTO}`,
    cwd: RAIZ,
    url: `http://127.0.0.1:${PUERTO}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
