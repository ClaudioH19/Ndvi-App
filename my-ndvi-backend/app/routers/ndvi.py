from fastapi import APIRouter, File, UploadFile, Body
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
    ndvi: list = Body(...),
    classified_filtered: list = Body(...),
    selected_clusters: list = Body(...)
):
    image_data_classified_array = np.array(classified_filtered, dtype=float)
    ndvi_array = np.array(ndvi, dtype=float)
    # Puedes usar selected_clusters si lo necesitas
    return await ndvilib.process_clusters(image_data_classified_array, ndvi_array)
