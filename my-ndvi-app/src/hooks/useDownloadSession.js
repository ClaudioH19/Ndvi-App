import { useState, useCallback } from "react";

/**
 * Hook para descargar todos los datos guardados en Redis de una sesión.
 * Descarga un ZIP con el Excel de stats y todos los TIFFs de máscara.
 */
export default function useDownloadSession() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError]             = useState(null);

  const downloadSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setDownloading(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/ndvi/session/${sessionId}/download`);
      if (r.status === 404) throw new Error("La sesión no tiene datos guardados todavía.");
      if (!r.ok)            throw new Error(`HTTP ${r.status}`);

      const blob     = await r.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `session_${sessionId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }, []);

  return { downloadSession, downloading, error };
}
