import apiClient from '@infrastructure/api/apiClient';

export const companiesService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/companies/', { params });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(`/companies/${id}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post('/companies/', payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await apiClient.put(`/companies/${id}/`, payload);
    return data;
  },

  async patch(id, payload) {
    const { data } = await apiClient.patch(`/companies/${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`/companies/${id}/`);
    return data;
  },
};
