# 3. Arquitectura y diagramas

Las dos vías no comparten datos. Comparten la forma del resultado y un componente de gráfica. Con eso cada desarrollador avanza sin esperar al otro.

## 3.1 Vista general

```mermaid
flowchart LR
    U(["Usuario"])
    P[("NASA POWER<br/>MERRA-2, mensual,<br/>desde 1981")]
    M[("MODIS, ECOSTRESS<br/>Yale UHI, GPW")]
    subgraph VA["via-a/ · navegador"]
        direction TB
        A1["Tres preguntas:<br/>dónde, variable, temporada"]
        A2["Serie anual"]
        A3["Theil-Sen + Mann-Kendall<br/>JavaScript"]
        A4["Veredicto en lenguaje llano"]
        A1 --> A2 --> A3 --> A4
    end
    subgraph VB["via-b/ · Python + interfaz"]
        direction TB
        B1["Export y filtros de calidad"]
        B2["serie.csv"]
        B3["tendencia, variantes, FDR"]
        B4["resultados.csv"]
        B5["Mapa, expediente, semáforo"]
        B1 --> B2 --> B3 --> B4 --> B5
    end
    CO["compartido/<br/>objeto de resultado<br/>componente de serie anual<br/>tendencia.py"]
    U --> VA
    P --> VA
    M --> VB
    VA -- "ver dentro de Hermosillo" --> VB
    VA -.-> CO
    VB -.-> CO
```

## 3.2 Vía A: flujo de una consulta

```mermaid
sequenceDiagram
    actor U as Usuario
    participant W as Vía A (navegador)
    participant P as NASA POWER
    U->>W: Elige lugar (clic o ciudad de la lista)
    U->>W: Elige variable y temporada
    W->>P: GET /api/temporal/monthly/point
    P-->>W: JSON mensual, 1981-2025
    Note over W: Si el navegador bloquea la llamada,<br/>se leen los JSON guardados
    W->>W: Serie anual (año completo o mes fijo)
    W->>W: Theil-Sen + intervalo del 95 %
    W->>W: Mann-Kendall (p sin ajuste)
    W-->>U: Serie, pendiente por década, rango y veredicto
    W-->>U: Límite de escala y enlace a la Vía B
```

## 3.3 Vía A: veredicto

```mermaid
flowchart TD
    S["Serie anual de la variable"] --> T["Theil-Sen: pendiente e intervalo del 95 %"]
    S --> K["Mann-Kendall: valor p"]
    T --> D{"p menor que 0.05"}
    K --> D
    D -->|sí| V1["Significativo<br/>con pendiente y rango"]
    D -->|no| V2["Sin evidencia suficiente todavía<br/>con pendiente y rango"]
    V1 --> X["Etiqueta: exploratorio"]
    V2 --> X
```

## 3.4 Vía B: del satélite al expediente

```mermaid
flowchart TD
    subgraph EX["1. Export · Navarrete"]
        E1["MOD11A2 y MYD11A2<br/>8 días, 1 km"]
        E2["MOD21A1N diario<br/>promedio de temporada"]
        E3["Filtro de calidad por bits"]
        E1 --> E3
        E2 --> E3
    end
    subgraph SE["2. Series"]
        S1["Media anual por polígono:<br/>sectores y dos referencias de desierto"]
        S2["serie.csv<br/>diferencia sector − desierto"]
        S1 --> S2
    end
    subgraph ES["3. Estadística · Navarrete"]
        T1["tendencia: Theil-Sen,<br/>Mann-Kendall, Hamed-Rao"]
        T2["Cinco variantes"]
        T3["FDR entre sectores"]
        T4["resultados.csv"]
        T1 --> T2 --> T3 --> T4
    end
    subgraph IN["4. Interfaz · Mario"]
        I1["Mapa de sectores"]
        I2["Expediente"]
        I3["Semáforo y veredicto"]
        I1 --> I2 --> I3
    end
    E3 --> S1
    S2 --> T1
    S2 --> I2
    T4 --> I2
    D[["DECISIONES.md"]] -.->|"reglas fijadas antes de calcular"| T1
```

## 3.5 Vía B: ciclo diario (Modelo J)

Media 2003-2019 de la diferencia sector − referencia A en cuatro horas de paso. Bajo cero es oasis; sobre cero es isla de calor.

```mermaid
flowchart LR
    subgraph TE["Terra"]
        T1["10:30 · día"]
        T2["22:30 · noche"]
    end
    subgraph AQ["Aqua"]
        A1["13:30 · día"]
        A2["1:30 · noche"]
    end
    T1 --> R1["Rango MOD11-MOD21"]
    T2 --> R1
    A1 --> R2["Solo MOD11,<br/>salvo que se exporte MYD21"]
    A2 --> R2
    R1 --> B["Cuatro barras<br/>sobre una línea en cero"]
    R2 --> B
    Y["Yale, banda Daytime"] -.->|"signo junto a 10:30 y 13:30"| B
```

## 3.6 Contrato entre vías

Objeto de resultado, idéntico en ambas vías:

| Campo | Tipo | Significado |
|---|---|---|
| `n_anios` | entero | Años válidos usados |
| `pendiente_c_decada` | número | Pendiente Theil-Sen por década |
| `ic95_inf` | número | Límite inferior del intervalo del 95 % |
| `ic95_sup` | número | Límite superior del intervalo del 95 % |
| `p` | número | Valor p que se reporta |

```json
{
  "n_anios": 19,
  "pendiente_c_decada": 0.0,
  "ic95_inf": 0.0,
  "ic95_sup": 0.0,
  "p": 1.0
}
```

Los valores del ejemplo son de relleno. En Python la función devuelve además `p_mk` y `p_hamed_rao`; `p` es el mayor de los dos. En la Vía A, `p` es el de Mann-Kendall sin ajuste. Para variables que no son temperatura (precipitación), el campo conserva el nombre y la interfaz muestra la unidad correcta.

```mermaid
classDiagram
    class Resultado {
        +int n_anios
        +float pendiente_c_decada
        +float ic95_inf
        +float ic95_sup
        +float p
    }
    class TendenciaPython {
        +tendencia(anios, delta, min_anios)
        +ajustar_fdr(ps)
    }
    class TendenciaJS {
        +tendencia(anios, valores)
    }
    class SerieAnual {
        +anios
        +valores
        +resultado
        +dibujar()
    }
    TendenciaPython ..> Resultado : devuelve
    TendenciaJS ..> Resultado : devuelve
    SerieAnual ..> Resultado : dibuja línea e intervalo
```

Reglas del contrato:

- El componente de serie anual con línea de pendiente e intervalo lo hace Mario; Navarrete lo reutiliza.
- Los CSV de v4 no cambian de nombre ni de columnas.
- `resultados.csv` admite una variante más: `sin_2001_2002`.
- La misma serie debe dar la misma pendiente en JavaScript y en Python, a tres decimales.

## 3.7 Carpetas

```text
SunCity/
├── README.md
├── requirements.txt
├── docs/
│   ├── 01-PLAN.md
│   ├── 02-FASES.md
│   ├── 03-ARQUITECTURA.md
│   ├── 04-DATOS-Y-APIS.md
│   ├── 05-MODELOS.md
│   ├── DECISIONES.md
│   ├── SunCity-Documentacion.pdf
│   └── construir_pdf.py
├── compartido/
│   └── tendencia.py
├── via-a/
└── via-b/
```

Las columnas de `serie.csv` y `resultados.csv` están definidas en v4. Conviene copiar esa definición a `via-b/README.md` en cuanto el PDF de v4 esté a la mano.

## 3.8 Quién espera a quién

```mermaid
flowchart LR
    subgraph NA["Navarrete"]
        N1["Vía A<br/>terminada"]
        N2["Export en Earth Engine<br/>y AppEEARS"]
        N3["Tendencia, variantes<br/>y FDR"]
        N2 -->|serie.csv| N3
    end
    subgraph MA["Mario"]
        M1["Interfaz de la Vía B<br/>mapa, expediente, semáforo"]
        M2["Componente de<br/>serie anual"]
    end
    N2 -->|serie.csv| M1
    N3 -->|resultados.csv| M1
    M2 -->|"reemplaza la gráfica provisional"| N1
    N1 -->|"enlace: ver dentro de Hermosillo"| M1
```

Mientras llegan los datos reales, Mario trabaja con datos de prueba en el formato fijo de v4, así que ninguna flecha lo bloquea.
