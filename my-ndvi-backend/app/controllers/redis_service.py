"""
Servicio Redis para persistencia de sesiones NDVI.

Esquema de claves (TTL 24 h por defecto):
  session:{sid}:stats          → Redis list  — JSON de cada fila de stats
  session:{sid}:mask_keys      → Redis list  — nombres base de cada máscara almacenada
  session:{sid}:masks:{name}   → Redis bytes — contenido TIFF de la máscara (sólo clusters seleccionados)
  session:{sid}:ndvi_maps:{name} → Redis bytes — contenido TIFF del mapa NDVI completo
"""

import json
import os
import redis as redispy

REDIS_HOST   = os.getenv("REDIS_HOST", "redis")
REDIS_PORT   = int(os.getenv("REDIS_PORT", 6379))
SESSION_TTL  = 60 * 60 * 24   # 24 horas


def _client() -> redispy.Redis:
    return redispy.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=False)


def save_session_result(
    session_id:      str,
    image_name:      str,
    mask_name:       str,
    stats_ndvi:      dict,
    tiff_bytes:      bytes,
    ndvi_map_bytes:  bytes | None = None,
) -> None:
    """
    Guarda en Redis una fila de estadísticas, el TIFF de máscara (clusters
    seleccionados) y opcionalmente el mapa NDVI completo.

    Parámetros
    ----------
    session_id      : identificador único de sesión generado por el cliente
    image_name      : nombre base (antes del primer '_') del archivo procesado
    mask_name       : nombre sugerido para el TIFF de máscara
    stats_ndvi      : dict con keys average, std_dev, coefficient_of_variation
    tiff_bytes      : GeoTIFF de la máscara (solo clusters seleccionados)
    ndvi_map_bytes  : GeoTIFF del mapa NDVI completo (todos los píxeles)
    """
    r = _client()

    row = {
        "image_name": image_name,
        "mask_name":  mask_name,
        **{k: float(v) for k, v in stats_ndvi.items()},
    }

    stats_key       = f"session:{session_id}:stats"
    mask_keys_key   = f"session:{session_id}:mask_keys"
    mask_data_key   = f"session:{session_id}:masks:{image_name}"
    ndvi_map_key    = f"session:{session_id}:ndvi_maps:{image_name}"

    r.rpush(stats_key,     json.dumps(row))
    r.expire(stats_key,    SESSION_TTL)

    r.rpush(mask_keys_key, image_name)
    r.expire(mask_keys_key, SESSION_TTL)

    r.set(mask_data_key,   tiff_bytes)
    r.expire(mask_data_key, SESSION_TTL)

    if ndvi_map_bytes:
        r.set(ndvi_map_key,  ndvi_map_bytes)
        r.expire(ndvi_map_key, SESSION_TTL)
        print(f"[redis] session={session_id} image={image_name} — {len(tiff_bytes)} bytes mask + {len(ndvi_map_bytes)} bytes ndvi_map")
    else:
        print(f"[redis] session={session_id} image={image_name} — {len(tiff_bytes)} bytes mask")


def get_session_data(session_id: str):
    """
    Recupera todas las filas de stats, TIFFs de máscara y mapas NDVI completos.

    Retorna
    -------
    rows      : list[dict]         — filas de estadísticas (orden de inserción)
    masks     : dict[str, bytes]   — {image_name: tiff_bytes}  (solo clusters)
    ndvi_maps : dict[str, bytes]   — {image_name: tiff_bytes}  (NDVI completo)
    """
    r = _client()

    raw_rows  = r.lrange(f"session:{session_id}:stats",     0, -1)
    raw_keys  = r.lrange(f"session:{session_id}:mask_keys", 0, -1)

    rows      = [json.loads(b) for b in raw_rows]
    mask_keys = [k.decode() if isinstance(k, bytes) else k for k in raw_keys]

    masks: dict[str, bytes] = {}
    ndvi_maps: dict[str, bytes] = {}
    for key in mask_keys:
        data = r.get(f"session:{session_id}:masks:{key}")
        if data:
            masks[key] = data
        ndvi_data = r.get(f"session:{session_id}:ndvi_maps:{key}")
        if ndvi_data:
            ndvi_maps[key] = ndvi_data

    return rows, masks, ndvi_maps
