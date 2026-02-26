"""
Libreria de procesamiento de pixeles para analisis NDVI
Funciones para clasificacion por clusters y penalizacion de pixeles aislados
"""

import numpy as np
import sklearn.cluster
import matplotlib.pyplot as plt
from matplotlib.widgets import Button
from scipy.ndimage import uniform_filter
from app.controllers.cluster_rules import apply_rules


def clasificate_pixels(image_data, clusters=5):
    """
    Clasifica pixeles usando K-Means y devuelve el array de clusters para cada pixel y los centroides.

    Args:
        image_data: tuple (nir, red, green) - bandas normalizadas
        clusters: numero de clusters para K-Means

    Returns:
        labels: array 2D con el cluster asignado a cada pixel
        centroids: array 2D (clusters x features) con los centroides de cada cluster
    """
    nir, red, green = image_data
    ndvi = (nir - red) / (nir + red + 1e-10)

    x_coords, y_coords = np.meshgrid(np.arange(ndvi.shape[1]), np.arange(ndvi.shape[0]))
    x_coords = x_coords / ndvi.shape[1]
    y_coords = y_coords / ndvi.shape[0]

    ndre = (nir - green) / (nir + green + 1e-10)

    # Canal gris para mejor clustering
    grayscale = (nir + red + green) / 3.0
    grayscale = grayscale / (np.nanmax(grayscale) + 1e-10)

    # Desviación estándar local
    std_grayscale = uniform_filter(grayscale, size=9, mode='constant', cval=0)
    variance = uniform_filter((grayscale - std_grayscale) ** 2, size=9, mode='constant', cval=0)
    variance = np.maximum(variance, 0)
    std_grayscale = np.sqrt(variance)
    std_grayscale = std_grayscale / (np.nanmax(std_grayscale) + 1e-10)

    std_ndvi = uniform_filter(ndvi, size=9, mode='constant', cval=0)
    variance = uniform_filter((ndvi - std_ndvi) ** 2, size=9, mode='constant', cval=0)
    variance = np.maximum(variance, 0)
    std_ndvi = np.sqrt(variance)
    std_ndvi = std_ndvi / (np.nanmax(std_ndvi) + 1e-10)

    pixels = np.stack((nir.flatten(), red.flatten(), green.flatten(), 
                       ndre.flatten(), ndvi.flatten(), std_ndvi.flatten(), y_coords.flatten(), std_grayscale.flatten()), axis=-1)
    
    kmeans = sklearn.cluster.KMeans(n_clusters=clusters, random_state=0)
    kmeans.fit(pixels)
    labels = kmeans.labels_.reshape(ndvi.shape)
    centroids = kmeans.cluster_centers_
    return labels, centroids


def label_clusters(centroids):
    """
    Asigna una etiqueta a cada cluster usando las reglas de cluster_rules.py.
    Edita ese archivo para ajustar umbrales y agregar/quitar etiquetas.
    """
    return [apply_rules(c) for c in centroids]


def _apply_penalization(ndvi_input, win_size):
    valid_mask = ~np.isnan(ndvi_input)
    valid_float = valid_mask.astype(float)
    nan_float = (~valid_mask).astype(float)
    
    valid_count = uniform_filter(valid_float, size=win_size, mode='constant', cval=0) * (win_size ** 2)
    nan_count = uniform_filter(nan_float, size=win_size, mode='constant', cval=0) * (win_size ** 2)
    
    to_remove = (valid_count < nan_count) & valid_mask
    to_keep = (valid_count >= nan_count) & valid_mask
    
    result = ndvi_input.copy()
    result[to_remove] = np.nan
    
    return result, to_keep, to_remove, valid_mask


def penalize_isolated_points(ndvi, window_size=64, threshold=0.55, animate=False):
    """
    Penaliza pixeles aislados en dos pasadas con ventanas de diferente tamaño.
    
    Args:
        ndvi: matriz NDVI
        window_size: tamano de ventana para primera pasada
        threshold: umbral de NDVI
        animate: si True, muestra animacion del proceso
    
    Returns:
        ndvi con pixeles aislados convertidos a NaN
    """
    result_pass1, to_keep1, to_remove1, valid_mask1 = _apply_penalization(ndvi, window_size)
    window_size2 = 16 #max(1, int(window_size // 4))
    result_pass2, to_keep2, to_remove2, valid_mask2 = _apply_penalization(result_pass1, window_size2)
    
    return result_pass2
