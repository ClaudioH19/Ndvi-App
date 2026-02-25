import { useState, useCallback } from "react";

/**
 * Convierte el ndvi_masked (array 2D de JS con sentinels -9999/9999/null)
 * a un Float32Array plano en orden row-major, listo para enviar como blob.
 */
function ndviMaskedToBuffer(ndviMasked) {
  const H = ndviMasked.length;
  const W = ndviMasked[0]?.length ?? 0;
  const buf = new Float32Array(H * W);
  for (let y = 0; y < H; y++) {
    const row = ndviMasked[y];
    for (let x = 0; x < W; x++) {
      const v = row[x];
      // null/undefined/NaN → sentinel que el backend interpreta como excluido
      buf[y * W + x] = (v == null || isNaN(v)) ? -9999 : v;
    }
  }
  return buf;
}

export default function useSaveMask() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const saveMask = useCallback(async (ndviMasked, imageName) => {
    if (!ndviMasked || !imageName) return null;
    setLoading(true);
    setError(null);
    try {
      const buf  = ndviMaskedToBuffer(ndviMasked);
      const blob = new Blob([buf.buffer], { type: "application/octet-stream" });

      const fd = new FormData();
      fd.append("ndvi_masked", blob, "ndvi_masked.bin");
      fd.append("image_name", imageName);

      const r = await fetch("/api/v1/ndvi/save-mask", { method: "POST", body: fd });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      // El backend devuelve el TIFF binario — disparar descarga en el browser
      const tiffBlob = await r.blob();
      const filename = r.headers.get("Content-Disposition")
        ?.match(/filename="?([^"]+)"?/)?.[1] ?? `${imageName}_mask.tif`;

      const url = URL.createObjectURL(tiffBlob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { filename };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { saveMask, loading, error };
}
