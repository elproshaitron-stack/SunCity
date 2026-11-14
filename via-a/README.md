# Vía A: herramienta a escala

El usuario elige lugar, variable y temporada; ve la serie 1981-2025, el cambio por década con su rango del 95 % y si es significativo. Corre entera en el navegador contra NASA POWER, sin servidor ni clave.

## Abrirla

```bash
cd via-a
python -m http.server 8000
```

Luego abrir <http://localhost:8000>. Un enlace con `#lat=29.07&lon=-110.97&var=T2M_MIN&mes=7` abre directo en ese caso (sirve para las demos grabadas).

Abrir `index.html` con doble clic también funciona con la API en vivo, pero el respaldo de datos guardados necesita el servidor.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html`, `css/estilos.css` | Página y estilos |
| `js/tendencia.js` | Theil-Sen + intervalo del 95 % y Mann-Kendall. Réplica de scipy 1.18 y pymannkendall |
| `js/power.js` | Llamada a POWER, definiciones de las cinco variables y armado de la serie anual |
| `js/grafica.js` | Gráfica de serie anual. **Provisional** hasta que exista el componente compartido de Mario |
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

Último resultado: 119 casos (15 series reales de Hermosillo y 104 sintéticas), 0 fallos.

## Pendiente

- [ ] Correr `python via-a/datos/descargar.py` en una máquina con internet y subir `datos/hermosillo.json`.
- [ ] Agregar la segunda ciudad cuando Emilio la elija (D12): una línea en `CIUDADES` de `js/app.js` y otra en `datos/descargar.py`.
- [ ] Cambiar `js/grafica.js` por el componente compartido de Mario cuando exista.
- [ ] Que Carlos confirme D07 (p sin ajuste, umbral 0.05).
- [ ] La página de la Vía B debe existir en `via-b/index.html` para que funcione el enlace "Ver dentro de Hermosillo".
