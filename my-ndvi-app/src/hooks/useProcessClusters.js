import { useState, useCallback } from "react";

export default function useProcessClusters() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const processClusters = useCallback(async (ndvi, classifiedFiltered, selectedList) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/v1/ndvi/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ndvi,
          classified_filtered: classifiedFiltered,
          selected_clusters:   selectedList,
        }),
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
