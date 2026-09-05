import apiClient from '@infrastructure/api/apiClient';

export const samplesService = {
  async listForTable(params = {}) {
    const { data } = await apiClient.get('/lubrication/samples-list/', {
      params,
    });
    return data;
  },

  async list(params = {}) {
    const { data } = await apiClient.get('/lubrication/samples/', {
      params,
    });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(`/lubrication/samples/${id}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post('/lubrication/samples/', payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await apiClient.put(`/lubrication/samples/${id}/`, payload);
    return data;
  },

  async patch(id, payload) {
    const { data } = await apiClient.patch(`/lubrication/samples/${id}/`, payload);
    return data;
  },

  async history(id) {
    const { data } = await apiClient.get(`/lubrication/samples/${id}/history/`);
    return Array.isArray(data) ? data : data.results || [];
  },

  async invalidate(id, reason) {
    const { data } = await apiClient.post(`/lubrication/samples/${id}/invalidate/`, { reason });
    return data;
  },

  async reactivate(id, reason) {
    const { data } = await apiClient.post(`/lubrication/samples/${id}/reactivate/`, { reason });
    return data;
  },
};
