import { useState, useCallback } from "react";

export default function useSubmitTiffs() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const submitTiffs = useCallback(async (nirFile, redFile, greenFile) => {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("nir",   nirFile);
      fd.append("red",   redFile);
      fd.append("green", greenFile);
      const r = await fetch("/api/v1/ndvi/submit-tiffs", { method: "POST", body: fd });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submitTiffs, loading, error };
}
