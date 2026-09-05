import apiClient from '@infrastructure/api/apiClient';

const BASE_URL = "/misc/test-methods/";

const normalizeList = (data) => (Array.isArray(data) ? data : data?.results || []);

export const testMethodsService = {
  async list(params = {}) {
    const { data } = await apiClient.get(BASE_URL, { params });
    return normalizeList(data);
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

  async restore(id) {
    const { data } = await apiClient.post(`${BASE_URL}${id}/restore/`);
    return data;
  },
};
