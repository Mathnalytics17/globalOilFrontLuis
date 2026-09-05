import apiClient from '@infrastructure/api/apiClient';

const BASE_URL = '/technical-catalogs/sample-management-types/';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const sampleManagementTypesService = {
  async list(params = {}) {
    const response = await apiClient.get(BASE_URL, { params });
    return normalizeList(response.data);
  },

  async getById(id) {
    const response = await apiClient.get(`${BASE_URL}${id}/`);
    return response.data;
  },

  async getAvailableForCompany(empresaId) {
    const params = {};

    if (empresaId) {
      params.empresa_id = empresaId;
    }

    const items = await this.list(params);

    // Para cliente ocasional no hay empresa, entonces mostramos solo tipos globales.
    if (!empresaId) {
      return items.filter((item) => item.aplica_a_todos === true);
    }

    return items;
  },

  async create(payload) {
    const response = await apiClient.post(BASE_URL, payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.patch(`${BASE_URL}${id}/`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`${BASE_URL}${id}/`);
    return response.data;
  },

  async restore(id) {
    const response = await apiClient.post(`${BASE_URL}${id}/restore/`);
    return response.data;
  },
};
