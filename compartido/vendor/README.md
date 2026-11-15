# Recursos locales de SunCity

Preparación de C3. Los binarios son copias del proveedor, sin recompilar ni modificar. A y B deben conectar sus pantallas antes de dar por cumplida la condición de cero peticiones a Google Fonts y unpkg.

| Recurso | Versión del proveedor | Contenido |
|---|---|---|
| MapLibre GL JS | 5.24.1 | `maplibre-gl-5.24.1/maplibre-gl.js` y `.css` |
| Fraunces | Google Fonts v38 | Normal; pesos 500 y 600; eje óptico solicitado 9–144 |
| Hanken Grotesk | Google Fonts v12 | Normal; pesos 400, 500, 600 y 700 |
| IBM Plex Mono | Google Fonts v23 | Normal; pesos 400, 500 y 600 |

`fuentes.css` conserva las declaraciones `@font-face`, `font-display: swap` y rangos Unicode de la respuesta de Google Fonts para los subconjuntos `latin` y `latin-ext`, que incluyen los caracteres del español. Solo cambian las URL para señalar archivos locales. Los pesos que el proveedor resuelve al mismo WOFF2 comparten archivo: el peso en su nombre identifica el primer bloque que lo utilizó, no una restricción añadida al binario. No se incluyen los subconjuntos vietnamita, cirílico ni otros alfabetos de la respuesta.

## Conectar desde Vía A o Vía B

En `via-a/index.html` y, cuando B2 migre el mapa, en `via-b/index.html`:

```html
<link rel="stylesheet" href="../compartido/vendor/fuentes.css">
<link rel="stylesheet" href="../compartido/vendor/maplibre-gl-5.24.1/maplibre-gl.css">
<script src="../compartido/vendor/maplibre-gl-5.24.1/maplibre-gl.js"></script>
```

La etiqueta del script conserva la posición y orden de ejecución de la carga actual, antes del código que usa `maplibregl`. Sustituir las etiquetas remotas y retirar los dos `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com`. No cargar las copias local y remota a la vez. Desde la portada `/`, usar `compartido/vendor/...`; desde `/metodo/`, las mismas rutas con `../` que las dos vías. Las URL de las fuentes en el CSS se resuelven respecto de `fuentes.css`.

El mapa sigue necesitando sus teselas, glifos y cualquier recurso que indique el estilo: este paquete localiza el motor y las fuentes de la interfaz, y no garantiza funcionamiento completo del mapa sin red. El worker de la distribución de MapLibre está incluido en el JS. El `sourceMappingURL` al final del JS original apunta a `maplibre-gl.js.map`, omitido por tamaño: solo afecta al mapa de código fuente en herramientas de desarrollo, no a la ejecución.

## Procedencia e integridad

MapLibre procede del paquete oficial `https://registry.npmjs.org/maplibre-gl/-/maplibre-gl-5.24.1.tgz`. Antes de copiar sus miembros se comprobó el SHA-512 contra `dist.integrity` publicado por npm. `LICENSE.txt` es la licencia del paquete; `LICENSE-dist.txt` conserva los avisos adicionales de la distribución y sus dependencias.

Las fuentes proceden de la misma consulta CSS que ya usa Vía A, con agente de navegador Chromium; cada URL original, versión de Google Fonts, fecha UTC real y SHA-256 está en `manifest.json`. Las licencias OFL 1.1 se copiaron del repositorio oficial `google/fonts`: `ofl/fraunces/OFL.txt`, `ofl/hankengrotesk/OFL.txt` y `ofl/ibmplexmono/OFL.txt`. Se conservan los avisos y los nombres originales. El número v de Google Fonts es su revisión de distribución, no una versión tipográfica semántica.

`manifest.json` inventaría todos los archivos de esta carpeta salvo el propio manifiesto. Este README y el CSS adaptado se identifican como derivados locales. Una actualización exige revisar procedencia y licencias y regenerar hashes; nunca actualizar hashes automáticamente para ocultar un fallo.

El archivo local `.gitattributes` desactiva la conversión de finales de línea dentro de `vendor`. Git conserva los bytes originales incluso con `core.autocrlf=true` en Windows; así los hashes son iguales después de descargar el repositorio en otro sistema.

También se omite la revisión de espacios en blanco exclusivamente dentro de `vendor`, porque las distribuciones originales incluyen espacios finales y finales CRLF que se conservan sin normalizar. La revisión del código propio de `pruebas/` continúa activa.

## Comprobar sin red

Desde cualquier directorio, ejecutar `python /ruta/a/SunCity/pruebas/verificar_vendor.py`. También acepta una carpeta de recursos alternativa como argumento para comprobar una copia. Verifica integridad, archivos faltantes o no inventariados, firma WOFF2, licencias, cobertura declarada de familias/pesos/subconjuntos y que todas las referencias CSS sean locales o datos embebidos. Devuelve 0 si todo pasa y 1 en caso de fallo. La comprobación no descarga ni instala nada.
