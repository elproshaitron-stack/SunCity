# Vía A: herramienta a escala

El usuario elige lugar, variable y temporada; ve la serie 1981-2025, el cambio por década con su rango del 95 % y si es significativo. Corre entera en el navegador contra NASA POWER, sin servidor ni clave.

## Abrirla

Desde la raíz del repositorio, con el servidor de Mario:

```bash
python servir.py
```

Luego abrir <http://localhost:8000/via-a/>. Así carga el componente compartido de gráfica y funciona el enlace a la Vía B. Un enlace con `#lat=29.07&lon=-110.97&var=T2M_MIN&mes=7` abre directo en ese caso (sirve para las demos grabadas).

Si se sirve solo la carpeta `via-a/`, la página usa su gráfica provisional (`js/grafica.js`) y el enlace a la Vía B no abre.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html`, `css/estilos.css` | Página y estilos |
| `js/tendencia.js` | Theil-Sen + intervalo del 95 % y Mann-Kendall. Réplica de scipy 1.18 y pymannkendall |
| `js/power.js` | Llamada a POWER, definiciones de las cinco variables y armado de la serie anual |
| `js/grafica.js` | Gráfica de respaldo, solo si no carga `compartido/serie-anual.js` |
| `js/app.js` | Flujo de tres preguntas, veredicto, CSV y enlace |
| `datos/descargar.py` | Descarga una vez los JSON de las ciudades de demostración (respaldo sin conexión) |
| `pruebas/` | Prueba de igualdad JavaScript contra Python |

## Cómo decide el veredicto

- **Significativo:** p de Mann-Kendall menor que 0.05.
- **Sin evidencia suficiente todavía:** p de 0.05 o más. Se muestran igual la pendiente y su rango.
- El p no está ajustado y la tarjeta lo dice ("exploratorio").
- Año completo usa el valor anual que publica POWER (llave 13). Para `T2M_MIN` y `T2M_MAX` ese valor es el extremo del año, no un promedio. Ver `docs/DECISIONES.md`, D06.

## Pruebas

```bash
pip install -r requirements.txt          # desde la raíz del repo
python via-a/pruebas/generar_casos.py    # casos de referencia con Python
node via-a/pruebas/probar_tendencia.cjs  # compara JavaScript contra Python a tres decimales
```

Último resultado: 119 casos (15 series reales de Hermosillo y 104 sintéticas), 0 fallos. Además, probado en un navegador real con POWER en vivo (Hermosillo, Mexicali, Phoenix y un punto del Pacífico) y con el mapa cargando.

## Pendiente

- [x] Respaldos guardados: `datos/hermosillo.json` y `datos/mexicali.json` (POWER, 14 nov 2026). Para volver a bajarlos: `python via-a/datos/descargar.py`.
- [x] Segunda ciudad: Mexicali (D12, cerrada).
- [x] Usa el componente compartido `compartido/serie-anual.js` (con `incluirCero: false`, porque grafica valores absolutos).
- [x] D07 cerrada: p sin ajuste, umbral 0.05.
- [x] El enlace "Ver dentro de Hermosillo" abre `via-b/index.html`.
