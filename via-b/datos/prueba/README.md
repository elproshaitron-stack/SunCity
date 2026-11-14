# Datos inventados. No son resultados.

Polígonos esquemáticos y población inventada; no son límites oficiales.
Los seis sectores miden aproximadamente 3.1 × 3.1 km. Las referencias
están al oeste de la ciudad; su idoneidad no ha sido evaluada.

`generar_prueba.py` usa semilla 2027 y el esquema de `../esquema.js`.
La serie representa diferencias nocturnas sintéticas sector menos desierto,
con etiqueta MOD11 Terra para probar la interfaz, sin observaciones satelitales.
El cálculo primario usa 2001–2019; 2020–2025 solo se dibuja punteado.

Recetas de prueba reproducibles (no equivalen a los productos reales):

- primario: serie original, 2001–2019.
- con_deriva: serie original, 2001–2025.
- aqua: suma 0.15 + 0.08 × seno(año − 2001), 2001–2019.
- ref_b: resta 0.2 + 0.01 × (año − 2001), 2001–2019.
- mod21: multiplica por 0.95 y suma 0.1, 2001–2019.
- sin_2001_2002: serie original, 2003–2019.

Cada variante usa `tendencia` y FDR entre sus seis sectores con `ajustar_fdr`.
El mínimo de años es el marcador de la función compartida. Estas reglas
autorizadas para la prueba no fijan las decisiones científicas de v4.
