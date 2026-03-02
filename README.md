# NDVI Analysis Tool

Herramienta web para el análisis NDVI (Índice de Vegetación de Diferencia Normalizada) de imágenes multiespectrales capturadas con cámaras Tetracam y procesadas con PixelWrench2.

---

## Arquitectura

```
┌─────────────────┐     HTTP / nginx     ┌──────────────────┐
│   Frontend      │ ◄──────────────────► │   Backend        │
│   React + Vite  │     /api/v1/ndvi/*   │   Python FastAPI │
│   Puerto 80     │                      │   Puerto 8000    │
└─────────────────┘                      └────────┬─────────┘
                                                  │ redis-py
                                          ┌───────▼────────┐
                                          │   Redis 7      │
                                          │   Puerto 6379  │
                                          └────────────────┘
```

El proyecto se levanta con Docker Compose. Hay tres servicios: `frontend`, `backend` y `redis`.

---

## Servicios Docker

### `docker-compose.yml`

| Servicio   | Imagen / Build         | Puerto | Dependencias       |
|------------|------------------------|--------|--------------------|
| `frontend` | `./my-ndvi-app`        | 80     | `backend`          |
| `backend`  | `./my-ndvi-backend`    | 8000   | `redis`            |
| `redis`    | `redis:7-alpine`       | 6379   | —                  |

Redis persiste datos en el volumen nombrado `redis_data` con `appendonly yes`.  
El backend recibe las variables de entorno `REDIS_HOST=redis` y `REDIS_PORT=6379`.

---

## Frontend — `my-ndvi-app`

Stack: **React 18 + Vite + Tailwind CSS**, servido en producción por **Nginx**.

### Estructura relevante

```
src/
  components/
    imageEditor.jsx     ← componente principal (ver más abajo)
    Btn.jsx             ← botón reutilizable con variantes de color
    DropZone.jsx        ← zona de arrastre inicial
    header.jsx          ← cabecera de la app
    SidePanel.jsx       ← panel lateral con vistas y clusters
    StatsCard.jsx       ← tarjeta de estadísticas NDVI
    StatusBar.jsx       ← barra de estado inferior
    TiffModal.jsx       ← modal para cargar las 3 bandas TIFF
  hooks/
    useImageHelpers.js      ← utilidades de render (CIR, NDVI, VIRIDIS, etc.)
    useProcessClusters.js   ← hook para POST /process
    useSaveMask.js          ← hook para POST /save-mask
    useSubmitTiffs.js       ← hook para POST /submit-tiffs
    useDownloadSession.js   ← hook para GET /session/{id}/download
  services/
    apiService.js       ← cliente fetch genérico
  api/
    apiClient.js        ← cliente fetch alternativo (JSON)
```

### `imageEditor.jsx` — flujo principal

1. **Carga de TIFFs**: el usuario abre el modal (`TiffModal`), selecciona o arrastra los 3 archivos (NIR, Red, Green). El modal valida que los nombres contienen la palabra clave del canal y que el nombre base (antes del primer `_`) coincide en los 3 archivos.

2. **Identificador de sesión**: al cargar la página se genera un UUID (`crypto.randomUUID()`) que identifica la sesión. Este ID persiste durante toda la vida de la pestaña y se usa para agrupar los resultados en Redis.

3. **Envío de bandas** (`/submit-tiffs`): el backend normaliza las bandas, calcula el NDVI completo y clasifica los píxeles con K-Means (6 clusters por defecto). Devuelve las matrices raw, NDVI y labels de cluster.

4. **Selección de clusters**: el usuario hace clic sobre la imagen para activar/desactivar clusters (pintados en el canvas superpuesto).

5. **Procesamiento** (`/process`): se envía el NDVI con NaN donde el cluster no fue seleccionado, más el NDVI completo. El backend aplica penalización de puntos aislados, umbral NDVI y devuelve la máscara final con estadísticas.
   - El botón **Procesar** se deshabilita automáticamente tras obtener un resultado para evitar reprocesados accidentales; el usuario debe pulsar **Reiniciar** para empezar de nuevo.
   - El resultado se guarda automáticamente en Redis bajo el `session_id`.

6. **Guardar Máscara** (`/save-mask`): descarga un GeoTIFF binario (255 = vegetación, 0 = excluido) al navegador.

7. **Descargar Sesión**: activo solo cuando al menos un proceso se ha completado en la sesión actual. Llama a `/session/{id}/download` y descarga un ZIP con el Excel de estadísticas y todos los TIFFs de la sesión.

### `TiffModal.jsx` — validaciones como banners apilados

Las advertencias se muestran como mensajes apilados encima de los slots de banda:

- **Rojo** (borde `red-500`): los 3 archivos no comparten el mismo nombre base → posiblemente son de imágenes distintas.
- **Naranja** (borde `orange-500`): el nombre de un archivo no contiene la palabra clave del canal (ej. "nir", "red", "green") → posible canal equivocado.

Ambos tipos de aviso son meramente informativos; el usuario puede continuar de todas formas.

### `Btn.jsx` — variantes disponibles

| Variante  | Color          | Uso principal                  |
|-----------|----------------|--------------------------------|
| `white`   | Blanco/ámbar   | Cargar TIFFs                   |
| `yellow`  | Amarillo       | Procesar                       |
| `green`   | Verde          | Guardar Máscara                |
| `blue`    | Azul           | Descargar Sesión               |
| `ghost`   | Transparente   | Reiniciar                      |

---

## Backend — `my-ndvi-backend`

Stack: **Python + FastAPI + Uvicorn**.

### Estructura relevante

```
app/
  main.py                         ← crea la app FastAPI e incluye el router
  routers/
    ndvi.py                       ← endpoints REST
  controllers/
    ndvilib.py                    ← lógica NDVI principal
    pixel_processing.py           ← K-Means, penalización de puntos aislados
    cluster_rules.py              ← etiquetado semántico de clusters
    redis_service.py              ← persistencia de sesiones en Redis
```

### Endpoints

| Método | Ruta                                   | Descripción                                                  |
|--------|----------------------------------------|--------------------------------------------------------------|
| `POST` | `/api/v1/ndvi/submit-raw`              | Procesa un archivo `.raw` de Tetracam                        |
| `POST` | `/api/v1/ndvi/submit-tiffs`            | Procesa 3 TIFFs de banda única (NIR, Red, Green)             |
| `POST` | `/api/v1/ndvi/save-mask`               | Genera y devuelve un GeoTIFF de máscara binaria              |
| `POST` | `/api/v1/ndvi/process`                 | Procesa clusters seleccionados, guarda en Redis si hay sesión |
| `GET`  | `/api/v1/ndvi/session/{id}/download`   | Descarga ZIP con Excel + TIFFs de la sesión                  |

### `ndvilib.py` — pipeline NDVI

```
Bandas (NIR, Red, Green)
        │
        ▼
  calculate_nvdi()        →  NDVI = (NIR - Red) / (NIR + Red + ε)
        │
        ▼
  clasificate_pixels()    →  K-Means sobre espacio (NIR, Red, Green)  →  labels + centroids
        │
        ▼  [usuario selecciona clusters]
        │
  process_clusters()
        ├── penalize_isolated_points()   →  elimina píxeles aislados (ventana configurable)
        ├── apply_mask()                 →  NDVI < umbral → NaN
        └── calculate_stats_ndvi()       →  average, std_dev, coefficient_of_variation
```

Parámetros globales (modificar en `ndvilib.py`):

| Variable      | Valor por defecto | Descripción                                      |
|---------------|-------------------|--------------------------------------------------|
| `threshold`   | `0.55`            | Umbral mínimo NDVI para considerar vegetación    |
| `clusters`    | `6`               | Número de clusters K-Means                       |
| `window_size` | `256`             | Tamaño de ventana para penalización de aislados  |

### `redis_service.py` — persistencia de sesiones

Cada sesión se identifica con un UUID generado en el frontend. Por sesión se almacenan:

| Clave Redis                          | Tipo     | Contenido                                           |
|--------------------------------------|----------|-----------------------------------------------------|
| `session:{id}:stats`                 | List     | JSON rows: `{image_name, mask_name, average, std_dev, cv}` |
| `session:{id}:mask_keys`             | List     | Nombres base de las imágenes procesadas             |
| `session:{id}:masks:{image_name}`    | String   | Bytes del GeoTIFF de máscara                        |

Todas las claves expiran automáticamente a las **24 horas**.

#### `save_session_result(session_id, image_name, mask_name, stats_ndvi, tiff_bytes)`

Llamada desde el endpoint `/process` cuando el cliente envía `session_id` e `image_name` en el formulario. Guarda la fila de stats y el TIFF en Redis.

#### `get_session_data(session_id) → (rows, masks)`

Llamada desde el endpoint `/session/{id}/download`. Devuelve la lista de filas y un dict `{image_name: tiff_bytes}`.

### Endpoint `/process` — flujo detallado

```
POST /api/v1/ndvi/process
  ├── classified_filtered  (binary float32 1536×2048)
  ├── ndvi                 (binary float32 1536×2048)
  ├── selected_clusters    (JSON array)
  ├── session_id           (string, opcional)
  └── image_name           (string, opcional)
        │
        ▼
  process_clusters()  →  ndvi_masked + stats_ndvi + _ndvi_masked_arr (numpy, no serializado)
        │
        ├── [si session_id e image_name presentes]
        │       save_mask()             →  GeoTIFF bytes
        │       save_session_result()   →  Redis
        │
        └── respuesta JSON: { ndvi_masked: [...], stats_ndvi: {...} }
```

Si Redis no está disponible, el error se loggea pero **no interrumpe** la respuesta al cliente.

### Endpoint `/session/{id}/download` — flujo detallado

```
GET /api/v1/ndvi/session/{session_id}/download
        │
        ▼
  get_session_data()               →  rows, masks
        │
        ├── Construye Excel con openpyxl
        │     columnas: image_name, mask_name, average, std_dev, coefficient_of_variation
        │
        └── Construye ZIP (zipfile + DEFLATE)
              ├── session_{id}_stats.xlsx
              └── {image_name}_mask.tif  (uno por imagen procesada)
        │
        ▼
  Response(application/zip)
```

---

## Cómo levantar el proyecto

```bash
# Clonar y entrar al directorio
git clone <repo>
cd NDVI

# Construir y levantar todos los servicios
docker-compose up --build

# La app estará disponible en http://localhost
```

### Variables de entorno (backend)

| Variable     | Default  | Descripción                 |
|--------------|----------|-----------------------------|
| `REDIS_HOST` | `redis`  | Hostname del servicio Redis |
| `REDIS_PORT` | `6379`   | Puerto del servicio Redis   |

---

## Seguridad

### Redis

El contenedor Redis **no expone ningún puerto al host** (no hay `ports: - "6379:6379"` en el compose). Solo es accesible dentro de la red Docker interna, por lo que no es alcanzable desde internet.

> **Advertencia**: si en algún momento se añade `ports: - "6379:6379"` al compose y se despliega en un servidor público, Redis queda expuesto sin autenticación. Docker bypasea `iptables`/`ufw`, por lo que las reglas de firewall del sistema operativo **no protegen** los puertos mapeados por Docker. La única protección efectiva es no mapear el puerto.

---

## Flujo de uso típico

1. Abrir `http://localhost` en el navegador.
2. Pulsar **Cargar TIFFs** y seleccionar los 3 archivos de banda (NIR, Red, Green) exportados por PixelWrench2.
3. Verificar que no aparecen banners de advertencia (nombre base inconsistente o canal posiblemente equivocado).
4. Pulsar **Procesar Bandas** en el modal.
5. Una vez cargada la imagen CIR, hacer clic sobre los clusters de vegetación para seleccionarlos (resaltados en azul claro).
6. Pulsar **Procesar** en la barra superior.
7. Revisar el resultado NDVI Masked (escala viridis) y las estadísticas en la tarjeta lateral.
8. Opcionalmente pulsar **Guardar Máscara** para descargar el GeoTIFF de máscara.
9. Repetir desde el paso 2 con otras imágenes de la misma sesión (pulsar **Reiniciar** primero).
10. Al finalizar, pulsar **Descargar Sesión** (se activa tras el primer procesado) para obtener un ZIP con el Excel de estadísticas y todos los TIFFs de la sesión.

---

## Notas técnicas

- Las imágenes se asumen de **2048 × 1536 píxeles** (resolución Tetracam ADC). Cambiar `RAW_W` / `RAW_H` en `useImageHelpers.js` y los `.reshape(1536, 2048)` en el backend si se usa otra resolución.
- El nombre base de cada imagen se extrae tomando todo lo que precede al primer `_` en el nombre del archivo NIR. Este nombre se usa como identificador en Redis y como prefijo del TIFF de máscara.
- El identificador de sesión (`crypto.randomUUID()`) se genera una vez por carga de página y **no persiste** al recargar el navegador. Si se recarga, se inicia una nueva sesión vacía.
- Redis expira las claves a las 24 h. Pasado ese tiempo, el endpoint `/session/{id}/download` retornará 404.