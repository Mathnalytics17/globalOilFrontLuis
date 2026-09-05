import apiClient from '@infrastructure/api/apiClient';
import { normalizePaginated } from '../../../utils/pagination';

const BASE_URL = '/lubrication/sample-batches/';

export const sampleBatchesService = {
  async list(params = {}) {
    const { data } = await apiClient.get(BASE_URL, { params });
    return normalizePaginated(data).results;
  },

  async page(params = {}) {
    const { data } = await apiClient.get(BASE_URL, { params });
    return normalizePaginated(data);
  },

  async resumen(params = {}) {
    const { data } = await apiClient.get(`${BASE_URL}resumen/`, { params });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(`${BASE_URL}${id}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post(BASE_URL, payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await apiClient.patch(`${BASE_URL}${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`${BASE_URL}${id}/`);
    return data;
  },

  async recalcularEstado(id) {
    const { data } = await apiClient.post(`${BASE_URL}${id}/recalcular-estado/`);
    return data;
  },

  async addSamples(id, muestras) {
    const { data } = await apiClient.post(`${BASE_URL}${id}/samples/`, {
      muestras,
    });

    return data;
  },
};
