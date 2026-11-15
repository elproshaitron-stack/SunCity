"""Parámetros del procesamiento de la Vía B. Cada valor está registrado en docs/DECISIONES.md."""

ANIO_INICIO, ANIO_FIN = 2001, 2025          # se exporta todo; cada variante elige su tramo
MES_INICIO, MES_FIN = 6, 8                  # D14: temporada junio-agosto (meses consecutivos)

COBERTURA_MIN = 0.5                         # D03: fracción mínima de píxeles del polígono con dato
OBS_MIN = {"MOD11": 3, "MOD21": 10}         # D03: compuestos de 8 días / noches diarias válidas por píxel
MIN_ANIOS = 15                              # D08: años válidos mínimos para calcular tendencia

REFERENCIA_PRINCIPAL = "RA"
REFERENCIA_ALTERNA = "RB"

# Variantes (Modelo E): producto, referencia y años del cálculo
VARIANTES = {
    "primario":      {"producto": "MOD11_Terra_noche", "ref": "RA", "anios": (2001, 2019)},
    "con_deriva":    {"producto": "MOD11_Terra_noche", "ref": "RA", "anios": (2001, 2025)},
    "aqua":          {"producto": "MOD11_Aqua_noche",  "ref": "RA", "anios": (2003, 2019)},
    "ref_b":         {"producto": "MOD11_Terra_noche", "ref": "RB", "anios": (2001, 2019)},
    "mod21":         {"producto": "MOD21_Terra_noche", "ref": "RA", "anios": (2001, 2019)},
    "sin_2001_2002": {"producto": "MOD11_Terra_noche", "ref": "RA", "anios": (2003, 2019)},
}

# Ciclo diario (Modelo J): media 2003-2019 de sector − referencia A
CICLO_ANIOS = (2003, 2019)
# (id del paso en ciclo_diario.csv, satélite, momento): ids de via-b/ciclo-diario.js
CICLO_PASOS = [("terra_1030", "Terra", "dia"), ("aqua_1330", "Aqua", "dia"),
               ("terra_2230", "Terra", "noche"), ("aqua_0130", "Aqua", "noche")]

# Pendiente mínima detectable (C14, método de 05-MODELOS.md, 5.6). No cambia ninguna tendencia ni el semáforo.
# El 80 % de potencia es la convención usual; si el equipo quiere otro valor, se registra en DECISIONES.md.
POTENCIA = {"objetivo": 0.8, "alfa": 0.05, "simulaciones": 20000, "semilla": 2026}
