// C5: flujos de punta a punta. Usa roles y textos visibles, no clases ni ids de maquetación,
// para que sobrevivan a los cambios de interfaz de cada vía.
const { test, expect } = require('./ayuda');

const veredicto = (page) => page.getByRole('article').filter({ hasText: 'Cambio por década' });

test.describe('Portada', () => {
  test('carga y enlaza a las dos vías', async ({ page, request }) => {
    const respuesta = await page.goto('/');
    expect(respuesta.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const [nombre, destino] of [['Abrir Región', /via-a\/$/], ['Abrir Hermosillo', /via-b\/$/]]) {
      const enlace = page.getByRole('link', { name: nombre });
      await expect(enlace).toBeVisible();
      const href = await enlace.getAttribute('href');
      expect(href).toMatch(destino);
      expect((await request.get(new URL(href, page.url()).href)).status()).toBe(200);
    }
    await page.getByRole('link', { name: 'Abrir Región' }).click();
    await expect(page).toHaveURL(/\/via-a\//);
    await expect(page.getByRole('heading', { level: 1, name: /Qué cambia en mi región/ })).toBeVisible();
  });
});

test.describe('Vía A', () => {
  test('ciudad, variable y mes dan un veredicto; Atrás vuelve a la consulta anterior', async ({ page }) => {
    await page.goto('/via-a/');
    await expect(veredicto(page)).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Hermosillo' }))
      .toHaveText(/^(Significativo|Sin evidencia suficiente todavía)\./);

    const mexicali = page.getByRole('button', { name: 'Mexicali, Baja California' });
    await mexicali.click();
    await expect(mexicali).toHaveAttribute('aria-pressed', 'true');
    await expect(veredicto(page)).toContainText('Mexicali, Baja California');

    await page.getByRole('radio', { name: 'Máxima del aire' }).check();
    await expect(veredicto(page)).toContainText('la temperatura máxima del año');

    await page.getByRole('radio', { name: 'Solo julio de cada año' }).check();
    await expect(veredicto(page)).toContainText('la temperatura máxima de julio');
    await expect(veredicto(page).getByRole('heading', { level: 2 })).toHaveText(/por década|sin cambio/i);
    await expect(page).toHaveURL(/var=T2M_MAX&mes=7$/);

    await page.goBack();
    await expect(page).toHaveURL(/var=T2M_MAX&mes=0$/);
    await expect(page.getByRole('radio', { name: 'Año completo' })).toBeChecked();
    await expect(veredicto(page)).toContainText('la temperatura máxima del año');

    await page.goBack();
    await expect(page).toHaveURL(/var=T2M_MIN&mes=0$/);
    await expect(page.getByRole('radio', { name: 'Mínima del aire' })).toBeChecked();
    await expect(veredicto(page)).toContainText('Mexicali, Baja California');
  });

  test('coordenadas fuera de rango: el error sale junto al campo', async ({ page }) => {
    await page.goto('/via-a/');
    await expect(veredicto(page)).toBeVisible();
    const lat = page.getByRole('spinbutton', { name: 'Latitud' });
    const lon = page.getByRole('spinbutton', { name: 'Longitud' });
    await lat.fill('95');
    await lon.fill('10');
    await page.getByRole('button', { name: 'Usar este punto' }).click();
    await expect(lat).toHaveAttribute('aria-invalid', 'true');
    await expect(lat).toHaveAccessibleDescription(/Escribe una latitud entre −90 y 90/);
    await expect(page.getByText('Escribe una latitud entre −90 y 90.')).toBeVisible();
    await expect(lat).toBeFocused();
    await expect(lon).not.toHaveAttribute('aria-invalid', 'true');

    // Al corregirlo, el error se va
    await lat.fill('29.07');
    await lon.fill('-110.97');
    await page.getByRole('button', { name: 'Usar este punto' }).click();
    await expect(lat).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Escribe una latitud entre −90 y 90.')).toBeHidden();
  });

  test.describe('con NASA POWER bloqueado', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('https://power.larc.nasa.gov/**', (ruta) => ruta.abort('connectionrefused'));
    });

    test('Hermosillo usa la copia guardada y lo avisa', async ({ page }) => {
      await page.goto('/via-a/');
      await expect(page.getByText('Sin respuesta de NASA POWER')).toBeVisible();
      await expect(page.getByText(/Se muestra la copia guardada de Hermosillo/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Intentar en vivo' })).toBeVisible();
      await expect(veredicto(page)).toBeVisible();
    });

    test('otro punto muestra el error con "Reintentar descarga"', async ({ page }) => {
      await page.goto('/via-a/#lat=10.00&lon=10.00&var=T2M&mes=0');
      const alerta = page.getByRole('alert').filter({ hasText: 'No se pudo descargar la serie' });
      await expect(alerta).toBeVisible();
      const reintentar = alerta.getByRole('button', { name: 'Reintentar descarga' });
      await expect(reintentar).toBeFocused();
      await expect(veredicto(page)).toBeHidden();

      // Con la red de vuelta, reintentar trae el veredicto
      await page.unroute('https://power.larc.nasa.gov/**');
      await reintentar.click();
      await expect(veredicto(page)).toBeVisible();
      await expect(alerta).toBeHidden();
    });
  });
});

test.describe('Vía B', () => {
  const selector = (page) => page.getByRole('combobox', { name: 'Explorar un sector' });

  test('el selector abre el expediente y Escape lo cierra', async ({ page }) => {
    await page.goto('/via-b/');
    await expect(selector(page)).toBeEnabled();
    const opcion = selector(page).locator('option').nth(1);
    const valor = await opcion.getAttribute('value');
    const nombre = (await opcion.textContent()).trim();
    await selector(page).selectOption(valor);

    const expediente = page.getByRole('dialog', { name: nombre });
    await expect(expediente).toBeVisible();
    await expect(expediente.getByRole('heading', { level: 2, name: nombre })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(expediente).toBeHidden();
    await expect(selector(page)).toBeFocused();
    await expect(selector(page)).toHaveValue('');
  });

  test('?sector=S01 abre el expediente directo', async ({ page }) => {
    await page.goto('/via-b/?sector=S01');
    const expediente = page.getByRole('dialog');
    await expect(expediente).toBeVisible();
    await expect(selector(page)).toHaveValue('S01');
    const nombre = (await selector(page).locator('option[value="S01"]').textContent()).trim();
    await expect(expediente.getByRole('heading', { level: 2 })).toHaveText(nombre);
  });
});

test.describe('Método y 404', () => {
  test('Método carga el texto con su glosario', async ({ page }) => {
    await page.goto('/metodo/');
    await expect(page.getByRole('heading', { level: 1, name: 'Método' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Glosario/i }).first()).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('una ruta que no existe responde 404 con salida a la portada', async ({ page }) => {
    const respuesta = await page.goto('/no-existe.html');
    expect(respuesta.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Esta página no existe' })).toBeVisible();
    await page.getByRole('link', { name: 'Ir a la portada' }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByRole('link', { name: 'Abrir Región' })).toBeVisible();
  });
});
