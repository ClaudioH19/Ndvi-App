from fastapi import APIRouter, File, UploadFile
from app.controllers import ndvilib
from app.controllers import pixel_processing
import numpy as np
router = APIRouter()

#@router.post("/list-attributes")
#async def list_attributes(file: UploadFile = File(...)):
#    return await ndvilib.list_raw_attributes(file)

@router.post("/submit-raw")
async def process_ndvi(file: UploadFile = File(...)):
    return await ndvilib.process_raw_file(file)

@router.post("/save-mask")
async def save_mask(mask: list, image_name: str, output_folder: str):
    mask_array = np.array(mask)
    return await ndvilib.save_mask(mask_array, image_name, output_folder)

@router.post("/process")
async def process_clusters(image_data_classified: list, ndvi_completo: list):
    image_data_classified_array = np.array(image_data_classified)
    ndvi_completo_array = np.array(ndvi_completo)
    return await ndvilib.process_clusters(image_data_classified_array, ndvi_completo_array)
