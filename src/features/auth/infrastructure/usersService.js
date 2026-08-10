import apiClient from '@infrastructure/api/apiClient';

export const usersService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/users/', { params });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(`/users/${id}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post('/users/', payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await apiClient.put(`/users/${id}/`, payload);
    return data;
  },

  async patch(id, payload) {
    const { data } = await apiClient.patch(`/users/${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`/users/${id}/`);
    return data;
  },

  async verifyEmail(payload) {
    const { data } = await apiClient.post('/users/verify-email/', payload, {
      _skipAuthRefresh: true,
    });
    return data;
  },
};
