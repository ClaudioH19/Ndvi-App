import { useState } from 'react';
import apiService from '../services/apiService';

export default function useSubmitRaw() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Lógica para subir archivo al endpoint /api/v1/ndvi/submit-raw
  const submitRaw = async (file) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      console.log('Enviando archivo a submit-raw');
      const data = await apiService.post('/api/v1/ndvi/submit-raw', formData);
      console.log('Respuesta submit-raw:', data);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { submitRaw, loading, error, result };
}
