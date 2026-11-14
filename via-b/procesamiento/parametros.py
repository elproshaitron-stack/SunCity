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
CICLO_PASOS = [("10:30", "Terra", "dia"), ("13:30", "Aqua", "dia"),
               ("22:30", "Terra", "noche"), ("01:30", "Aqua", "noche")]
