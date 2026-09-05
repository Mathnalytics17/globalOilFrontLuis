import apiClient from '@infrastructure/api/apiClient';
import { normalizePaginated } from '../../../utils/pagination';

export const machinesService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/machines/', { params });
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
};
