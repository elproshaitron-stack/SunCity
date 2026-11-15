# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Fechas en ISO 8601.

## [1.0.0] - 2026-11-15

Primera versión completa de la plataforma: dos vías que comparten el cálculo de tendencia, un sistema de
diseño común, método público y evidencia de calidad.

### Plataforma
- Portada, barra y pie comunes, página de Método que lee `docs/METODO.md`, página 404, ícono, manifest y
  metadatos para compartir con el logo de SunCity (PR #17, #18, #19, #24).
- Sistema de diseño: tokens en dos temas, 20 componentes `sc-` con todos sus estados, comportamiento en
  `componentes.js`, catálogo vivo y un solo juego de íconos (PR #9, #14, #15, #16).
- Estilo de mapa común para el globo y el plano de Hermosillo (PR #20).
- MapLibre y las tres fuentes servidos desde el sitio; política de seguridad de contenido en todas las
  páginas, sin scripts en línea; la plataforma abre y avisa sin red externa (PR #33).
- Listo para publicar: `_headers` con seguridad y caché, y `docs/PUBLICAR.md`.

### Vía A · Región
- Globo 3D, tres preguntas y veredicto con Theil-Sen y Mann-Kendall en el navegador contra NASA POWER
  (PR #7, #21).
- Estados de carga, error con reintento, copia guardada y punto sin datos; error junto a cada campo
  (PR #22). Gráfica accesible con tabla (PR #23). "Usar mi ubicación" (PR #24). Resultado imprimible
  (PR #25). Atrás vuelve a la consulta anterior (PR #29).

### Vía B · Hermosillo
- Mapa con la temperatura de la superficie de noche de MODIS (NASA GIBS) y lectura por punto (PR #20).
- Series, tendencias, semáforo y ciclo diario con datos observados de MOD11 desde NASA GIBS (D18, PR #31).
- Sobre tokens y componentes (PR #30). Sectores con etiqueta y patrón, tabla ordenable, expediente en
  lenguaje llano, estados, "Usar mi ubicación", edición de nombres con Deshacer, estado en la dirección e
  impresión (PR #35).
- Revisión de polígonos, metadatos de cada conjunto de datos y pendiente mínima detectable (PR #34).

### Calidad
- `verificar.py` corre todas las pruebas y revisa colores y textos; integración continua (PR #32).
- Pruebas de punta a punta en Chromium, Firefox y WebKit a tres anchos, capturas del catálogo, axe y
  Lighthouse (PR #36).
- Recorrido de accesibilidad, documentos ISO 9241-110 y 25010, y revisión de las diez condiciones
  (PR #26, #27, #29).

### Limitaciones conocidas
Ver `docs/calidad/condiciones.md`. En esta versión:
- **Polígonos esquemáticos (D15).** Los resultados de Hermosillo usan MODIS real sobre cuadros de unos
  3 km; cambiarán con los polígonos definitivos.
- **Sin MOD21, Yale ni ECOSTRESS** en los datos reales (D18): `aceptacion.py` sobre `datos/reales/` da
  4 de 7 hasta tener el export de Earth Engine y AppEEARS.
- **Rendimiento en celular por debajo del umbral** en la Vía A, la Vía B y Método (Lighthouse), sobre todo
  por cargar MapLibre antes de usarlo.
- **Publicación pendiente:** el despliegue y la dirección completa de `og:image`. La integración continua
  de GitHub no arranca por un aviso de facturación de la cuenta.

## [0.9.0] - 2026-11-14

Versión del hackathon: Vía A con NASA POWER y Vía B con datos de prueba.
