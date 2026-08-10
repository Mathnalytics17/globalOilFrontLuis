import apiClient from '@infrastructure/api/apiClient';

export const foldersService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/folders/', { params });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(`/folders/${id}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post('/folders/', payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await apiClient.put(`/folders/${id}/`, payload);
    return data;
  },

  async patch(id, payload) {
    const { data } = await apiClient.patch(`/folders/${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`/folders/${id}/`);
    return data;
  },
};
