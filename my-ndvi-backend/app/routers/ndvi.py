from fastapi import APIRouter, File, UploadFile, Body, Form
from app.controllers import ndvilib
from app.controllers import pixel_processing
import numpy as np
router = APIRouter()


@router.post("/submit-raw")
async def process_ndvi(file: UploadFile = File(...)):
    return await ndvilib.process_raw_file(file)

@router.post("/save-mask")
async def save_mask(mask: list, image_name: str, output_folder: str):
    mask_array = np.array(mask)
    return await ndvilib.save_mask(mask_array, image_name, output_folder)

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