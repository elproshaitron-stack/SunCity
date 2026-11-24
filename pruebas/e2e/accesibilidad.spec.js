const { test, expect } = require('./ayuda');
const AxeBuilder = require('@axe-core/playwright').default;

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];

// Cada ruta con la señal de que ya terminó de dibujarse
const RUTAS = [
  { nombre: 'portada', url: '/', listo: (p) => p.getByRole('link', { name: 'Abrir Región' }) },
  // La gráfica compartida llega como módulo y vuelve a dibujar el veredicto: se espera a que esté
  { nombre: 'vía A', url: '/via-a/', listo: (p) => p.getByRole('article').getByRole('button', { name: 'Ver datos en tabla' }) },
  { nombre: 'vía A con error de descarga', url: '/via-a/#lat=10.00&lon=10.00&var=T2M&mes=0', sinPower: true,
    listo: (p) => p.getByRole('button', { name: 'Reintentar descarga' }) },
  { nombre: 'vía B', url: '/via-b/', listo: (p) => p.getByRole('combobox', { name: 'Explorar un sector' }).and(p.locator(':enabled')) },
  { nombre: 'vía B con expediente', url: '/via-b/?sector=S01', listo: (p) => p.getByRole('dialog') },
  { nombre: 'vía A con globo', url: '/via-a/', mapa: 'Abrir globo',
    listo: (p) => p.locator('.maplibregl-canvas') },
  { nombre: 'vía B con mapa', url: '/via-b/', mapa: 'Abrir mapa',
    listo: (p) => p.locator('.maplibregl-canvas') },
  { nombre: 'método', url: '/metodo/', listo: (p) => p.getByRole('heading', { level: 1, name: 'Método' }) },
  { nombre: '404', url: '/no-existe.html', listo: (p) => p.getByRole('heading', { level: 1, name: 'Esta página no existe' }) },
  { nombre: 'catálogo', url: '/compartido/catalogo.html', listo: (p) => p.getByRole('heading', { level: 2, name: /Íconos/ }) },
];

function resumen(infracciones) {
  return infracciones.map((v) => `${v.impact} · ${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

for (const ruta of RUTAS) {
  test(`axe: ${ruta.nombre}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (ruta.sinPower) await page.route('https://power.larc.nasa.gov/**', (r) => r.abort('connectionrefused'));
    const solicitudesMapa = [];
    page.on('request', (solicitud) => {
      if (solicitud.url().endsWith('/maplibre-gl.js')) solicitudesMapa.push(solicitud.url());
    });
    await page.goto(ruta.url);
    expect(solicitudesMapa).toEqual([]);
    if (ruta.mapa) {
      test.setTimeout(90_000);
      await page.getByRole('button', { name: ruta.mapa }).click();
    }
    await expect(ruta.listo(page)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Un cuadro más para que termine cualquier redibujo pendiente
    await page.evaluate(() => new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo))));

    const { violations } = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
    await info.attach('axe.json', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });

    expect(resumen(violations), `Infracciones en ${ruta.url}`).toEqual([]);
  });
}
