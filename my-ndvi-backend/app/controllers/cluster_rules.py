"""
Reglas naïve para etiquetar clusters K-Means según su centroide.

Formato de cada regla
─────────────────────
  metric    : nombre de la métrica a comparar
                "ndvi"  → índice 4  (val = (NIR-Red)/(NIR+Red))
                "ndre"  → índice 3  (val = (NIR-Green)/(NIR+Green))
                "nir"   → índice 0
                "red"   → índice 1
                "green" → índice 2
  op        : operador de comparación  "<" | "<=" | ">" | ">="
  threshold : umbral numérico
  label     : etiqueta asignada si la condición se cumple

Las reglas se evalúan en ORDEN; la primera que se cumple gana.
La última regla (sin "metric") actúa como comodín / catch-all.

Índices de columna del centroide K-Means
─────────────────────────────────────────
  0: NIR        1: Red        2: Green
  3: NDRE       4: NDVI       5: stdNDVI
  6: Y (coord)  7: stdGray
"""

import operator as _op

_OPS = {
    "<":  _op.lt,
    "<=": _op.le,
    ">":  _op.gt,
    ">=": _op.ge,
}

_METRIC_IDX = {
    "nir":   0,
    "red":   1,
    "green": 2,
    "ndre":  3,
    "ndvi":  4,
}

# ═══════════════════════════════════════════════════════════════════
#  TABLA DE REGLAS  —  edita aquí para ajustar la clasificación
# ═══════════════════════════════════════════════════════════════════
CLUSTER_RULES = [
    # NDVI fuertemente negativo → cielo/reflejo especular
    {"metric": "ndvi", "op": "<",  "threshold": 0.00,  "label": "Cielo"},

    # NDVI alto → vegetación sana
    {"metric": "ndvi", "op": ">",  "threshold": 0.55,  "label": "Planta"},

    # NDRE muy bajo → maleza / vegetación estresada
    {"metric": "ndre", "op": "<",  "threshold": 0.05,  "label": "Maleza"},

    # Sin coincidencia → suelo desnudo / sombra
    {"label": "Sombra/Suelo"},
]
# ═══════════════════════════════════════════════════════════════════


def apply_rules(centroid):
    """Devuelve la etiqueta correspondiente al centroide dado."""
    for rule in CLUSTER_RULES:
        if "metric" not in rule:          # comodín
            return rule["label"]
        idx = _METRIC_IDX[rule["metric"]]
        fn  = _OPS[rule["op"]]
        if fn(float(centroid[idx]), rule["threshold"]):
            return rule["label"]
    return "Desconocido"
