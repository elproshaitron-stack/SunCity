# Reglas para agentes (Codex, Antigravity, Claude)

Este archivo manda sobre cualquier costumbre propia del agente. El tablero de tareas vigente está en [docs/07-PLAN-DE-CIERRE.md](docs/07-PLAN-DE-CIERRE.md); el contexto y la auditoría, en [docs/06-PLAN-AGENTES.md](docs/06-PLAN-AGENTES.md).

## Qué es el proyecto

SunCity responde qué variable climática cambia en una región, cuánto por década y si el cambio es significativo. Tiene dos vías que comparten el cálculo de tendencia:

- `via-a/`: cualquier punto del planeta con NASA POWER, entera en el navegador.
- `via-b/`: sectores de Hermosillo frente a su desierto, con MODIS y ECOSTRESS. Interfaz en JavaScript y procesamiento en Python.
- `compartido/`: función de referencia en Python y componente de serie anual.

Sin compilación ni empaquetador: HTML, CSS y JavaScript servidos tal cual con `python servir.py`.

## Carriles: cada agente toca solo lo suyo

| Persona | Carril | Agente de apoyo | Puede editar | Rama |
|---|---|---|---|---|
| A | Sistema de diseño y Vía A | Claude | `compartido/tokens.css`, `compartido/componentes.*`, `compartido/catalogo.html`, `compartido/iconos.svg`, `compartido/serie-anual.js`, `compartido/mapa-estilo.js`, `via-a/**` (menos `via-a/pruebas/**`), `index.html`, `404.html`, `metodo/**`, `docs/**`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `servir.py` | `claude/<id>-<tema>` |
| B | Vía B: Hermosillo | Antigravity | `via-b/*.html`, `via-b/*.css`, `via-b/*.js` | `agy/<id>-<tema>` |
| C | Calidad, datos y publicación | Codex | `verificar.py`, `pruebas/**`, `.github/**`, `compartido/vendor/**`, `compartido/tendencia.py`, `via-b/procesamiento/**`, `via-b/datos/**` (menos `datos/reales/export/`), `via-b/pruebas/**`, `via-a/pruebas/**`, `requirements.txt`, `CHANGELOG.md` | `codex/<id>-<tema>` |

Si una tarea necesita un archivo de otro carril, no lo edites: abre un issue con la etiqueta del carril dueño y describe el cambio exacto. Mario es el dueño humano de `via-b/`; todo PR de Antigravity lo revisa él.

## Contratos que no se cambian sin una decisión registrada

1. Objeto de resultado de las dos vías: `n_anios`, `pendiente_c_decada`, `ic95_inf`, `ic95_sup`, `p`.
2. Columnas y nombres de los CSV: `via-b/datos/esquema.js` es la única fuente.
3. Firma de `dibujarSerieAnual(contenedor, {anios, valores, resultado, unidad, aniosPunteados, incluirCero})`.
4. Tokens de `compartido/tokens.css` y componentes `sc-` de `compartido/componentes.*`: se usan, no se redefinen en cada vía. Si falta un componente, se le pide a la persona A.

## Reglas de ciencia

- Ninguna tendencia se calcula antes de que su regla esté escrita en `docs/DECISIONES.md`. Una decisión cerrada no se edita: se agrega una fila nueva.
- Una tendencia no significativa se muestra igual: gris, con pendiente e intervalo.
- Los datos de `via-b/datos/prueba/` son inventados. Nunca se presentan como resultados ni se copian a `datos/reales/`.
- Ningún texto en pantalla, README o pitch afirma lo que prohíbe [docs/01-PLAN.md, sección 7](docs/01-PLAN.md#7-lo-que-no-se-afirma): que Hermosillo sea un oasis de día, que el proyecto mida salud o temperatura del aire o mejore la calidad de vida, causas de la tendencia, ni que la Vía A vea ciudades.
- Un agente no inventa datos, identificadores de productos ni cifras. Si algo no se puede verificar, lo dice en el PR.

## Cómo se trabaja

1. Lee el tablero y toma la primera tarea sin marcar de tu carril cuyas dependencias estén marcadas. Una tarea a la vez.
2. Crea tu rama desde `main` actualizado. Nunca hagas `push` a `main` ni reescribas historia.
3. Haz el cambio más chico que cumpla el criterio de aceptación. Nada de dependencias nuevas, marcos ni compiladores sin una decisión en `DECISIONES.md`.
4. Corre la verificación completa y pega la salida en el PR:
   ```bash
   python -m pip install -r requirements.txt
   python via-a/pruebas/generar_casos.py
   node via-a/pruebas/probar_tendencia.cjs
   python via-b/procesamiento/probar_procesamiento.py
   python via-b/pruebas/aceptacion.py
   ```
   O, en un solo paso, `python verificar.py`, que corre todo lo anterior y además busca colores fuera de los tokens y textos prohibidos. La integración continua lo corre en cada PR.
5. Si tocaste interfaz, pruébala en un navegador real a 375 px y a 1366 px, y dilo en el PR con lo que viste.
6. Abre un PR hacia `main` con el ID de la tarea en el título. En el mismo PR marca la casilla de la tarea en el tablero.
7. No fusiones tu propio PR. A revisa los de B y C; B revisa los de A; C revisa la parte de pruebas de todos.

## Cuándo detenerse y preguntar

Detente y deja la pregunta en el PR o en un issue si la tarea exige: una cuenta o credencial (Earth Engine, AppEEARS), una decisión abierta de `DECISIONES.md`, cambiar un contrato, borrar datos, publicar algo, o tocar un archivo de otro carril. Las tareas marcadas **H** en el tablero son de personas: ningún agente las hace.

## Estilo

- Todo en español: código, comentarios, nombres, textos y mensajes de commit. Tú, sin emojis ni signos de exclamación.
- Commits: `Vía A: …`, `Vía B: …`, `Datos: …`, `Docs: …`.
- Interfaz: un solo botón primario por vista, estado nunca solo por color, objetivo táctil de 44 px, contraste de texto 4.5:1 o más, foco visible, `prefers-reduced-motion` respetado.
- Cifras en fuente mono con números tabulares.
