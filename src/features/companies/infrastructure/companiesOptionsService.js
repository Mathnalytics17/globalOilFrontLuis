import apiClient from '@infrastructure/api/apiClient';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const normalizeCompany = (item) => ({
  id: item.id,
  nombre: item.nombre || item.name || item.razon_social || item.company_name || `Empresa ${item.id}`,
  raw: item,
});

export const companiesOptionsService = {
  async list(params = {}) {
    try {
      const response = await apiClient.get('/companies/', { params });
      return normalizeList(response.data).map(normalizeCompany);
    } catch (error) {
      // Algunos proyectos tienen las empresas bajo otra ruta. Dejamos fallback para no romper el módulo.
      const response = await apiClient.get('/management-companies/', { params });
      return normalizeList(response.data).map(normalizeCompany);
    }
  },
};
