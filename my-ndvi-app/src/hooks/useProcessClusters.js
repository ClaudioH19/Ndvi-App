import { useState, useCallback } from "react";

function toFloat32Buffer(array2d) {
  // Aplana el array 2D y lo convierte a Float32Array binario
  const flat   = array2d.flat(1);
  const buffer = new Float32Array(flat.length);
  for (let i = 0; i < flat.length; i++) {
    buffer[i] = flat[i] === null ? NaN : flat[i];
  }
  return buffer;
}

export default function useProcessClusters() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const processClusters = useCallback(async (ndviClasificado, selectedList, ndviCompleto) => {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();

      // classified_filtered: NDVI con NaN donde no hay cluster seleccionado (~12MB)
      fd.append("classified_filtered",
        new Blob([toFloat32Buffer(ndviClasificado)], { type: "application/octet-stream" }),
        "classified.bin"
      );

      // ndvi: NDVI completo original (~12MB)
      fd.append("ndvi",
        new Blob([toFloat32Buffer(ndviCompleto)], { type: "application/octet-stream" }),
        "ndvi.bin"
      );

      fd.append("selected_clusters", JSON.stringify(selectedList));

      const r = await fetch("/api/v1/ndvi/process", {
        method: "POST",
        body: fd,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { processClusters, loading, error };
}