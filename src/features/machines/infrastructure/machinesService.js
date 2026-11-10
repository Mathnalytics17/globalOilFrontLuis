import apiClient from '@infrastructure/api/apiClient';
import { normalizePaginated } from '@shared/utils/pagination';

export const machinesService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/machines/', {
      // This makes cache keys explicit when the list gains point identities.
      // It prevents an older cached response (without puntos_muestreo) from
      // disabling code-based navigation in the Machines and History screens.
      params: { page_size: 1000, point_identity_version: 2, ...params },
    });
    return normalizePaginated(data).results;
  },

  async page(params = {}) {
    const { data } = await apiClient.get('/machines/', { params });
    return normalizePaginated(data);
  },

  async getById(id) {
    const { data } = await apiClient.get(`/machines/${id}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post('/machines/', payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await apiClient.put(`/machines/${id}/`, payload);
    return data;
  },

  async patch(id, payload) {
    const { data } = await apiClient.patch(`/machines/${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`/machines/${id}/`);
    return data;
  },
  async reactivate(id) {
    const { data } = await apiClient.post(`/machines/${id}/reactivate/`);
    return data;
  },
  async activity(id, params = {}) {
    const { data } = await apiClient.get(`/machines/${id}/activity/`, { params });
    return normalizePaginated(data);
  },
  async history(id, params = {}) {
    const { data } = await apiClient.get(`/machines/${id}/history/`, { params });
    return normalizePaginated(data);
  },
  async resolvePointCode(code) {
    const { data } = await apiClient.get('/machines/resolve-point-code/', {
      params: { code },
    });
    return Array.isArray(data?.results) ? data.results : [];
  },
};
