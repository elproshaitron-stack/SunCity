const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');

const puerto = Number(process.env.E2E_PUERTO || 8765);
const python = process.env.E2E_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const baseURL = `http://127.0.0.1:${puerto}`;
const anchos = {
  movil: { width: 375, height: 812 },
  tableta: { width: 768, height: 1024 },
  escritorio: { width: 1366, height: 768 },
};
const motores = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
};
const proyectos = [];
for (const [motor, dispositivo] of Object.entries(motores)) {
  for (const [ancho, viewport] of Object.entries(anchos)) {
    proyectos.push({
      name: `${motor}-${ancho}`,
      testMatch: 'flujos.spec.js',
      use: { ...dispositivo, viewport, deviceScaleFactor: 1 },
    });
  }
}

for (const [ancho, viewport] of Object.entries(anchos)) {
  proyectos.push({
    name: `axe-${ancho}`,
    testMatch: 'accesibilidad.spec.js',
    use: { ...motores.chromium, viewport, deviceScaleFactor: 1 },
  });
}

proyectos.push({
  name: 'visual',
  testMatch: 'catalogo-visual.spec.js',
  use: { ...motores.chromium, viewport: anchos.escritorio, deviceScaleFactor: 1 },
});

module.exports = defineConfig({
  snapshotPathTemplate: '{testDir}/capturas/{arg}{ext}',
  testDir: __dirname,
  outputDir: 'resultados',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'informe' }]],
  use: {
    baseURL,
    locale: 'es-MX',
    timezoneId: 'America/Hermosillo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: proyectos,
  webServer: {
    command: `${python} servir.py ${puerto}`,
    cwd: path.resolve(__dirname, '..', '..'),
    url: baseURL,
    timeout: 20_000,
    stderr: 'ignore',
  },
});
