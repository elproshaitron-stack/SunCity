# Datos inventados. No son resultados.

Polígonos esquemáticos y población inventada; no son límites oficiales.
Los seis sectores miden aproximadamente 3.1 × 3.1 km. Las referencias
están al oeste de la ciudad; su idoneidad no ha sido evaluada.

`generar_prueba.py` usa semillas fijas 2027 y 2028, el esquema de
`../esquema.js` y `pasosAqua` de `../../config.js`.
`ciclo_diario.csv` contiene medias 2003–2019 inventadas por hora y producto.
Terra tiene MOD11 y MOD21; Aqua tiene ambos si `pasosAqua` es `rango`, o solo
MOD11 si es `solo_mod11`. Los signos diurnos de Yale
también son inventados y sirven únicamente para probar el marcador.
`nivel.csv` contiene la media primaria de MOD11 y una transformación sintética
para MOD21. `ecostress_zoom.json` es una rejilla 40 × 40 inventada del sector
prioritario S01, con un conteo ficticio de 18 escenas.
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
