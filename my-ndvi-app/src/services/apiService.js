// Servicio API centralizado para llamadas fetch

const apiService = {
  async post(url, body, options = {}) {
    const res = await fetch(url, {
      method: 'POST',
      ...options,
      body,
    });
    if (!res.ok) throw new Error('Error en POST ' + url);
    return await res.json();
  },

  async get(url, options = {}) {
    const res = await fetch(url, {
      method: 'GET',
      ...options,
    });
    if (!res.ok) throw new Error('Error en GET ' + url);
    return await res.json();
  },

  // Puedes agregar más métodos (put, delete, etc.)
};

export default apiService;
