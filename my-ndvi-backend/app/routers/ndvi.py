from fastapi import APIRouter, File, UploadFile, Body, Form, Response
from app.controllers import ndvilib
from app.controllers import pixel_processing
import numpy as np
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
):
    classified_bytes = await classified_filtered.read()
    ndvi_bytes       = await ndvi.read()

    image_data_classified_array = np.frombuffer(classified_bytes, dtype=np.float32).reshape(1536, 2048)
    ndvi_array                  = np.frombuffer(ndvi_bytes,       dtype=np.float32).reshape(1536, 2048)

    result = await ndvilib.process_clusters(image_data_classified_array, ndvi_array)

    # Convertir numpy scalars a Python nativos para que FastAPI pueda serializar
    stats = result["stats_ndvi"]
    result["stats_ndvi"] = {k: float(v) for k, v in stats.items()}

    return result