// C6: capturas de referencia del catálogo, una por sección y por tema.
// Cualquier cambio visual que no venga con capturas nuevas rompe la prueba.
// Las capturas de referencia se generan en la imagen de Docker de Playwright (ver README.md):
// así coinciden píxel a píxel con la integración continua.
const fs = require('fs');
const path = require('path');
const { test, expect, RAIZ } = require('./ayuda');

// Las secciones salen del propio catálogo: una plantilla nueva pide su captura nueva
const html = fs.readFileSync(path.join(RAIZ, 'compartido', 'catalogo.html'), 'utf8');
const SECCIONES = [...html.matchAll(/<template data-id="([\w-]+)"/g)].map((m) => m[1]);
const TEMAS = ['papel', 'noche'];

test.describe('Catálogo @visual', () => {
  test.skip(process.platform !== 'linux' && !process.env.E2E_VISUAL_LOCAL,
    'Las capturas de referencia son de Linux: corre `npm run visual:docker` (ver README.md).');

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/compartido/catalogo.html');
    // Muestrario de íconos (se arma con fetch) y fuentes listas
    await expect(page.locator('#icono .cat-icono').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  });

  test('hay secciones que comparar', () => {
    expect(SECCIONES.length).toBeGreaterThan(10);
  });

  for (const id of SECCIONES) {
    for (const tema of TEMAS) {
      test(`${id} · ${tema}`, async ({ page }) => {
        const caja = page.locator(`section#${id} .cat-tema.tema-${tema}`);
        await caja.scrollIntoViewIfNeeded();
        await expect(caja).toHaveScreenshot(`${id}-${tema}.png`);
      });
    }
  }
});
