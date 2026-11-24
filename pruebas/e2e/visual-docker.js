// Corre las capturas del catálogo en la misma imagen de Docker que la integración continua.
//   node visual-docker.js               compara contra las capturas guardadas
//   node visual-docker.js --actualizar  las vuelve a generar (un cambio visual a propósito)
const { spawnSync } = require('child_process');
const path = require('path');
const { version } = require('@playwright/test/package.json');

const raiz = path.resolve(__dirname, '..', '..');
const actualizar = process.argv.includes('--actualizar');
const orden = [
  'npm ci --no-audit --no-fund --loglevel=error',
  `npx playwright test --project=visual${actualizar ? ' --update-snapshots' : ''}`,
].join(' && ');

const r = spawnSync('docker', [
  'run', '--rm', '--ipc=host',
  '-v', `${raiz}:/repo`,
  '-v', '/repo/pruebas/e2e/node_modules', // node_modules de Linux, aparte de los del equipo
  '-w', '/repo/pruebas/e2e',
  '-e', 'CI=1',
  `mcr.microsoft.com/playwright:v${version}-noble`,
  'bash', '-c', orden,
], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
