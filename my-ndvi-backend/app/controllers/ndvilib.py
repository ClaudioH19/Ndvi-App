def replace_nan_inf(arr, fill_value=-9999):
    """
    Reemplaza NaN, +inf y -inf por fill_value en arrays numpy o listas anidadas.
    """
    arr = np.array(arr)
    arr = np.nan_to_num(arr, nan=fill_value, posinf=fill_value, neginf=fill_value)
    return arr
import os
import rasterio 
import numpy as np
import matplotlib.pyplot as plt
import cv2
from app.controllers.pixel_processing import clasificate_pixels, penalize_isolated_points

############################################################################
# Este archivo trabaja con la herramienta de batch de PixelWrench2         #
# Para calcular el NDVI de varias imagenes primero se necesita obtener las #
# bandas necesarias (NIR y Red) y normalizarlas entre 0 y 1 al hacer /255  #
############################################################################

# CONFIGURACION - Modificar segun necesidad
############################################################################ y RAW
threshold = 0.55   # umbral para considerar vegetacion
plot = True        # mostrar graficos
clusters = 6       # numero de clusters para kmeans
window_size = 256   # tamano de la ventana para penalizar puntos aislados, si hay mas NA se elimina el pixel
############################################################################

    

def apply_mask(ndvi, threshold=threshold):
    #todo lo menor al threshold se considera no vegetacion
    #el pixel que arroje ndvi menor a threshold se vuelve NA 
    # para no hacer calculos en el futuro
    mask = ndvi < threshold
    ndvi_masked = np.where(mask, np.nan, ndvi)

    return ndvi_masked


def calculate_stats_ndvi(ndvi_masked):
    avg = np.nanmean(ndvi_masked)
    std = np.nanstd(ndvi_masked)
    cv = std / avg if avg != 0 else np.nan
    return {'average': avg, 'std_dev': std, 'coefficient_of_variation': cv}


def calculate_nvdi(image_data):
    nir, red, _ = image_data
    ndvi = (nir - red) / (nir + red + 1e-10)
    return ndvi


async def save_mask(mask, image_name, output_folder):
    """
    Guarda la mascara binaria como archivo TIF.
    
    Args:
        mask: matriz booleana con la mascara
        image_name: nombre base de la imagen
        output_folder: carpeta donde guardar la mascara
    
    Returns:
        nombre del archivo de mascara generado
    """
    mask_filename = f"{image_name}_mask.tif"
    mask_output_path = os.path.join(output_folder, mask_filename)
    
    with rasterio.open(
        mask_output_path,
        'w',
        driver='GTiff',
        height=mask.shape[0],
        width=mask.shape[1],
        count=1,
        dtype='uint8',
        crs='+proj=latlong',
        transform=rasterio.transform.from_origin(0, 0, 1, 1),
    ) as dst:
        dst.write(mask.astype('uint8'), 1)
    
    print(f"Mascara guardada en: {mask_output_path}")
    return mask_filename


def reconstruir_adc_16bit_cientifico(raw, width=2048, height=1536):
    
    with open(raw, 'rb') as f:
        f.seek(0) 
        # Leemos en 16 bits (2 bytes por píxel) para no perder los 10 bits originales
        raw_data = np.fromfile(f, dtype=np.uint16)

    raw_img = raw_data[:width * height].reshape((height, width))

    # --- EXTRACCIÓN DE BANDAS (Alineación Tetracam confirmada) ---
    red = raw_img[0::2, 0::2] 
    nir = raw_img[1::2, 1::2] 
    
    g1 = raw_img[0::2, 1::2].astype(np.uint32)
    g2 = raw_img[1::2, 0::2].astype(np.uint32)
    green = ((g1 + g2) // 2).astype(np.uint16)

    # --- RECUPERACIÓN DE ESCALA (Sin Normalización) ---
    def procesar_banda(banda):
        # Resize para volver a 2048x1536 (Indispensable para QGIS)
        return cv2.resize(banda, (width, height), interpolation=cv2.INTER_LINEAR)

    return procesar_banda(nir), procesar_banda(red), procesar_banda(green)

async def process_raw_file(file):
    # Guardar el archivo temporalmente para procesarlo
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(file.file.read())
    
    try:
        nir, red, green = reconstruir_adc_16bit_cientifico(temp_path)
        # Normalizar cada banda con su propio máximo — igual que PixelWrench
        nir   = nir.astype('float32')   / nir.max()
        red   = red.astype('float32')   / red.max()
        green = green.astype('float32') / green.max()
        
        print(f"[raw] nir min: {nir.min()}, max: {nir.max()}")
        print(f"[raw] red min: {red.min()}, max: {red.max()}")
        
        image_data = [nir, red, green]
        ndvi_completo = calculate_nvdi(image_data)
        image_data_classified = clasificate_pixels(image_data, clusters=clusters)
        
        return {"nir": nir.tolist(), "red": red.tolist(), "green": green.tolist(), "ndvi": ndvi_completo.tolist(), "classified": image_data_classified.tolist()}

    finally:
        os.remove(temp_path)

"""
async def process_clusters(image_data_classified,nvdi_completo):
    # Aplicar penalizacion a puntos aislados (dos pasadas de filtrado)
    # Primera pasada con ventana grande para eliminar grandes zonas de ruido
    # Segunda pasada con ventana mas pequeña para eliminar puntos aislados residuales
    image_data_classified = penalize_isolated_points(
        image_data_classified, 
        window_size=window_size, 
        threshold=threshold, 
        animate=False
    )

    mask = ~np.isnan(image_data_classified)
    ndvi_masked = np.where(mask, nvdi_completo, np.nan)
    ndvi_masked = apply_mask(ndvi_masked, threshold)
    stats_ndvi = calculate_stats_ndvi(ndvi_masked)

    ndvi_masked_clean = replace_nan_inf(ndvi_masked)
    return {"ndvi_masked": ndvi_masked_clean.tolist(), "stats_ndvi": stats_ndvi}
"""


async def process_clusters(image_data_classified, nvdi_completo):
    print(f"[process_clusters] input shape: {image_data_classified.shape}, dtype: {image_data_classified.dtype}")
    print(f"[process_clusters] ndvi shape: {nvdi_completo.shape}, dtype: {nvdi_completo.dtype}")
    print(f"[process_clusters] valid pixels (no NaN): {int(~np.isnan(image_data_classified).sum())}")
    print(f"[process_clusters] ndvi min: {np.nanmin(image_data_classified)}, max: {np.nanmax(image_data_classified)}")

    print("[process_clusters] running penalize_isolated_points...")
    image_data_classified = penalize_isolated_points(
        image_data_classified,
        window_size=window_size,
        threshold=threshold,
        animate=False
    )
    print(f"[process_clusters] after penalization valid pixels: {int(~np.isnan(image_data_classified).sum())}")

    print("[process_clusters] applying mask...")
    mask = ~np.isnan(image_data_classified)
    ndvi_masked = np.where(mask, nvdi_completo, np.nan)

    print("[process_clusters] applying threshold mask...")
    ndvi_masked = apply_mask(ndvi_masked, threshold)
    print(f"[process_clusters] after threshold valid pixels: {int(~np.isnan(ndvi_masked).sum())}")

    print("[process_clusters] calculating stats...")
    stats_ndvi = calculate_stats_ndvi(ndvi_masked)
    print(f"[process_clusters] stats: {stats_ndvi}")

    print("[process_clusters] cleaning NaN/Inf...")
    ndvi_masked_clean = replace_nan_inf(ndvi_masked)
    print("[process_clusters] done, returning result")

    return {"ndvi_masked": ndvi_masked_clean.tolist(), "stats_ndvi": stats_ndvi}