from fastapi import APIRouter, File, UploadFile, Body, Form, Response, HTTPException
from app.controllers import ndvilib
from app.controllers import pixel_processing
import numpy as np
import io
import zipfile
import openpyxl

router = APIRouter()


@router.post("/submit-raw")
async def process_ndvi(file: UploadFile = File(...)):
    return await ndvilib.process_raw_file(file)

@router.post("/submit-tiffs")
async def process_tiffs(
    nir:   UploadFile = File(...),
    red:   UploadFile = File(...),
    green: UploadFile = File(...),
):
    return await ndvilib.process_tiff_files(nir, red, green)

@router.post("/save-mask")
async def save_mask(
    ndvi_masked: UploadFile = File(...),
    image_name:  str        = Form(...),
):
    raw_bytes = await ndvi_masked.read()
    ndvi_arr  = np.frombuffer(raw_bytes, dtype=np.float32).reshape(1536, 2048)

    tiff_bytes, filename = await ndvilib.save_mask(ndvi_arr, image_name)
    return Response(
        content=tiff_bytes,
        media_type="image/tiff",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/process")
async def process_clusters(
    classified_filtered: UploadFile = File(...),
    ndvi:                UploadFile = File(...),
    selected_clusters:   str        = Form(...),
    session_id:          str        = Form(None),
    image_name:          str        = Form(None),
):
    classified_bytes = await classified_filtered.read()
    ndvi_bytes       = await ndvi.read()

    image_data_classified_array = np.frombuffer(classified_bytes, dtype=np.float32).reshape(1536, 2048)
    ndvi_array                  = np.frombuffer(ndvi_bytes,       dtype=np.float32).reshape(1536, 2048)

    result = await ndvilib.process_clusters(image_data_classified_array, ndvi_array)

    # Extraer el array numpy ANTES de serializar (no debe ir al cliente)
    ndvi_masked_arr = result.pop("_ndvi_masked_arr")

    # Guardar en Redis si hay sesión activa
    if session_id and image_name:
        try:
            from app.controllers.redis_service import save_session_result
            mask_name  = f"{image_name}_mask.tif"
            tiff_bytes, _     = await ndvilib.save_mask(ndvi_masked_arr, image_name)
            ndvi_map_bytes, _ = await ndvilib.save_mask(ndvi_array,      f"{image_name}_ndvi_full")
            save_session_result(
                session_id=session_id,
                image_name=image_name,
                mask_name=mask_name,
                stats_ndvi=result["stats_ndvi"],
                tiff_bytes=tiff_bytes,
                ndvi_map_bytes=ndvi_map_bytes,
            )
        except Exception as exc:
            # Redis no disponible: no interrumpir el flujo principal
            print(f"[redis] advertencia al guardar sesión: {exc}")

    # Convertir numpy scalars a Python nativos para que FastAPI pueda serializar
    stats = result["stats_ndvi"]
    result["stats_ndvi"] = {k: float(v) for k, v in stats.items()}

    return result


@router.get("/session/{session_id}/download")
async def download_session(session_id: str):
    """
    Descarga todos los datos de una sesión como un archivo ZIP que contiene:
      - session_{id}_stats.xlsx  con una fila por imagen procesada
      - {image_name}_mask.tif    para cada máscara almacenada
    """
    try:
        from app.controllers.redis_service import get_session_data
        rows, masks, ndvi_maps = get_session_data(session_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Redis no disponible: {exc}")

    if not rows and not masks:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o vacía")

    # ── Excel ──────────────────────────────────────────────────────────────
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "NDVI Stats"

    if rows:
        headers = ["image_name", "mask_name", "average", "std_dev", "coefficient_of_variation"]
        ws.append(headers)
        for row in rows:
            ws.append([row.get(h) for h in headers])

        # Ajustar ancho de columnas
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = max(max_len + 2, 14)

    excel_buf = io.BytesIO()
    wb.save(excel_buf)
    excel_buf.seek(0)

    # ── ZIP ────────────────────────────────────────────────────────────────
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"session_{session_id}_stats.xlsx", excel_buf.read())
        for img_name, tiff_bytes in masks.items():
            zf.writestr(f"{img_name}_mask.tif", tiff_bytes)
        for img_name, ndvi_bytes in ndvi_maps.items():
            zf.writestr(f"{img_name}_ndvi_full.tif", ndvi_bytes)

    zip_buf.seek(0)
    return Response(
        content=zip_buf.read(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="session_{session_id}.zip"'},
    )
