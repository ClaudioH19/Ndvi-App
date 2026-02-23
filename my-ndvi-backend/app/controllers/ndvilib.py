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
        image_data = [nir, red, green]
        ndvi_completo = calculate_nvdi(image_data)
        image_data_classified = clasificate_pixels(image_data, clusters=clusters)
        
        return {"nir": nir.tolist(), "red": red.tolist(), "green": green.tolist(), "ndvi": ndvi_completo.tolist(), "classified": image_data_classified.tolist()}

    finally:
        os.remove(temp_path)

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
def process_images():
    # PROCESAMIENTO PRINCIPAL DE IMAGENES
    stats=[]
    for idx,nombre in enumerate(nombres):
    
        print(f"\n--- Procesando imagen {idx+1}/{len(nombres)}: {nombre} ---")
        
        # Paso 1: Leer y normalizar canales (NIR, Red, Green)
            # Se normaliza porque asi lo trata pixelwrench2, y asi se asegura que el NDVI este en el rango -1 a 1
        image_data = list(read_channels_normalized(nombre))

        # Paso 2: Calcular NDVI completo de la imagen original
        ndvi_completo = calculate_nvdi(image_data)

        #calcular el ndvi completo leyendo TC00069_Ndvi.TIF, que ya esta calculado por pixelwrench2, para evitar diferencias en el calculo del NDVI entre el metodo de pixelwrench2 y el metodo de este script
        #ndvi_path = os.path.join(data_folder, f"{nombre}_Ndvi.tif")
        #with rasterio.open(ndvi_path) as src:
        #    ndvi_completo = src.read(1).astype('float32')
        #    #dividir por 255 para normalizar el NDVI al rango -1 a 1, ya que pixelwrench2 guarda el NDVI en formato uint8 (0-255) y se necesita normalizarlo para aplicar el threshold correctamente
        #    ndvi_completo = (ndvi_completo / 255.0) * 2 - 1  # Normalizar a rango -1 a 1


        # Paso 3: Clasificar pixeles en la imagen original con K-Means para seleccionar clusters de interes
        image_data_classified = clasificate_pixels(image_data, clusters=clusters)
        
        # Si se omitio la imagen, continuar con la siguiente
        if image_data_classified is None:
            continue
        
        # Paso 4: Aplicar penalizacion a puntos aislados (dos pasadas de filtrado)
            # Primera pasada con ventana grande para eliminar grandes zonas de ruido
            # Segunda pasada con ventana mas pequeña para eliminar puntos aislados residuales
        image_data_classified = penalize_isolated_points(
            image_data_classified, 
            window_size=window_size, 
            threshold=threshold, 
            animate=animate_penalization
        )

        # Paso 5: Extraer mascara binaria final (True donde hay datos validos)
        mask = ~np.isnan(image_data_classified)
        
        # Paso 6: Aplicar mascara al NDVI completo original
        ndvi_masked = np.where(mask, ndvi_completo, np.nan)


        # EN DESUSO - Se intento eliminar bordes dudosos del NDVI usando deteccion de bordes, pero no se obtuvo mejora significativa
        # Paso 6.1: Identificar bordes de las zonas clasificadas para eliminar bordes con NDVI dudoso
        #edges = identify_edges(image_data)
        #aplicar mascara de bordes al NDVI para eliminar bordes dudosos
        #ndvi_masked = np.where(edges, np.nan, ndvi_masked)
        
        # Paso 7: Aplicar threshold de vegetacion (eliminar NDVI < threshold)
        ndvi_masked = apply_mask(ndvi_masked, threshold)

        # Paso 8: Calcular estadisticas del NDVI procesado
        stats_ndvi = calculate_stats_ndvi(ndvi_masked)
        
        # Paso 9: Guardar mascara binaria como archivo TIF
        mask_filename = save_mask(mask, nombre, data_folder)
        
        # Paso 10: Almacenar resultados (nombre, estadisticas, archivo de mascara)
        stats.append((nombre, stats_ndvi, mask_filename))
        
        # Paso 11: Mostrar visualizacion si esta habilitado
        if plot:
            show_plot(ndvi_masked, stats_ndvi['average'], nombre, cmap=cmap)



    report_path = os.path.join(data_folder, "ndvi_report.txt")
    with open(report_path, "w") as report_file:
        report_file.write("Image Name\tThreshold\tNDVI Avg\tNDVI Std\tNDVI CV\tMask File\n")
        for nombre, stats_ndvi, mask_filename in stats:
            report_file.write(f"{nombre}\t{threshold}\t{stats_ndvi['average']:.4f}\t{stats_ndvi['std_dev']:.4f}\t{stats_ndvi['coefficient_of_variation']:.4f}\t{mask_filename}\n")
        print(f"Report generated: {report_path}")
"""
