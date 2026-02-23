import { useState, useCallback } from "react";

export default function useSubmitRaw() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const submitRaw = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/v1/ndvi/submit-raw", { method: "POST", body: fd });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submitRaw, loading, error };
}
