# Terceros servidos desde el sitio (C3)

Para que la plataforma abra sin depender de otros servidores, estas bibliotecas y fuentes viven en el
propio repositorio. Se bajaron el 15 de noviembre de 2026.

| Qué | Versión | Origen | Licencia | Archivo de licencia |
|---|---|---|---|---|
| MapLibre GL JS (`maplibre/maplibre-gl.js`, `maplibre/maplibre-gl.css`) | 5.24.1 | <https://unpkg.com/maplibre-gl@5.24.1/dist/> | BSD de 3 cláusulas | `maplibre/LICENSE.txt` |
| Fraunces (pesos 500 y 600, archivo variable) | Google Fonts | <https://fonts.google.com/specimen/Fraunces> | SIL Open Font License 1.1 | `fuentes/OFL-fraunces.txt` |
| Hanken Grotesk (pesos 400 a 700, archivo variable) | Google Fonts | <https://fonts.google.com/specimen/Hanken+Grotesk> | SIL Open Font License 1.1 | `fuentes/OFL-hankengrotesk.txt` |
| IBM Plex Mono (pesos 400, 500 y 600) | Google Fonts | <https://fonts.google.com/specimen/IBM+Plex+Mono> | SIL Open Font License 1.1 | `fuentes/OFL-ibmplexmono.txt` |

Las fuentes solo incluyen los subconjuntos `latin` y `latin-ext`, que cubren el español. Los archivos
variables idénticos para varios pesos se guardan una sola vez; `fuentes/fuentes.css` apunta a ellos.

## Lo que sigue viniendo de fuera

Son los datos y los mapas, que no tiene sentido copiar:

- NASA POWER (datos de la Vía A). Si no responde, la Vía A usa su copia guardada de Hermosillo y Mexicali.
- NASA GIBS (capa de temperatura de la Vía B). Si no responde, la página lo dice y los resultados de los sectores siguen visibles.
- OpenFreeMap (mosaicos vectoriales y tipografías del mapa). Si no responde, el mapa queda con su color de fondo y la página lo dice; las casillas de coordenadas y el selector de sectores siguen funcionando.

## Actualizar

Bajar la versión nueva a la misma carpeta, actualizar esta tabla y probar las cinco rutas.
