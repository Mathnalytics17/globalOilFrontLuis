import apiClient from '@infrastructure/api/apiClient';
import { normalizePaginated } from '@src/utils/pagination';

const BASE_URL = '/technical-catalogs/predefined-test-batches/';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const predefinedTestBatchesService = {
  async list(params = {}) {
    const response = await apiClient.get(BASE_URL, { params });
    return normalizeList(response.data);
  },

  async page(params = {}) {
    const response = await apiClient.get(BASE_URL, { params });
    return normalizePaginated(response.data);
  },

  async getById(id) {
    const response = await apiClient.get(`${BASE_URL}${id}/`);
    return response.data;
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
