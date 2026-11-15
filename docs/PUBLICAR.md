# Publicar SunCity (C15)

El sitio es estático: se publica la raíz del repositorio tal cual, sin compilación.

## Antes de publicar

```bash
python verificar.py          # debe terminar con código 0
```

## Opciones probadas en el diseño

| Servicio | Carpeta | Comando de compilación | Cabeceras y 404 |
|---|---|---|---|
| Netlify | `/` (raíz) | ninguno | `_headers` se aplica solo; `404.html` se sirve en rutas que no existen |
| Cloudflare Pages | `/` (raíz) | ninguno | `_headers` se aplica solo; `404.html` igual |
| GitHub Pages | rama `main`, carpeta `/` | ninguno | ignora `_headers` (queda la política en la meta de cada página, sin `frame-ancestors`); `404.html` se sirve solo. Requiere repositorio público o plan de pago |
| Cualquier servidor | la raíz | ninguno | copiar las cabeceras de `_headers` a su configuración |

## Si se publica en una subcarpeta

Por ejemplo `usuario.github.io/SunCity/`: cambiar `<base href="/">` de `404.html` por `/SunCity/`.
Las demás páginas usan rutas relativas y no necesitan cambios.

## Después de tener la dirección pública

1. Cambiar `og:image` en `index.html`, `via-a/index.html` y `metodo/index.html` a la dirección completa
   (`https://…/compartido/marca/compartir.png`) para que las redes muestren la imagen.
2. Abrir las cinco rutas (`/`, `/via-a/`, `/via-b/`, `/metodo/` y una que no exista) y revisar en las
   herramientas del navegador que no haya violaciones de la política de seguridad.

## Caché

| Qué | Tiempo |
|---|---|
| Páginas | sin caché, siempre se revalidan |
| `compartido/vendor/` (MapLibre y fuentes) | un año, inmutable |
| Logo e íconos | una semana |
| JavaScript y CSS propios | una hora, con revalidación |
| Datos de la Vía B | una hora; los de la Vía A, un día |

Al cambiar la versión de MapLibre o de una fuente, usar un nombre de archivo nuevo para no chocar con la
caché inmutable.

## La integración continua

`.github/workflows/verificar.yml` corre `verificar.py` en cada PR. El 15 de noviembre de 2026 GitHub
no lo arrancaba: "The job was not started because recent account payments have failed or your spending
limit needs to be increased". Se resuelve en la configuración de facturación de la cuenta.
