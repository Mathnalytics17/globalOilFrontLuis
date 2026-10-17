import apiClient from '@infrastructure/api/apiClient';

export const assetTreeService = {
  async getBasicStructure(params = {}) {
    const { data } = await apiClient.get('/actives-tree/basic-structure/', {
      params,
    });
    return data;
  },

  async createSamplingPoint(payload) {
    const { data } = await apiClient.post('/sampling-points/', payload);
    return data;
  },

  async updateSamplingPoint(id, payload) {
    const { data } = await apiClient.patch(`/sampling-points/${id}/`, payload);
    return data;
  },

  async removeSamplingPoint(id) {
    await apiClient.delete(`/sampling-points/${id}/`);
  },
  async reactivateSamplingPoint(id) {
    const { data } = await apiClient.post(`/sampling-points/${id}/reactivate/`);
    return data;
  },
  async samplingPointActivity(id, params = {}) {
    const { data } = await apiClient.get(`/sampling-points/${id}/activity/`, { params });
    return Array.isArray(data) ? { results: data, count: data.length } : data;
  },

  async listSamplingPoints(params = {}) {
    const { data } = await apiClient.get('/sampling-points/', { params });
    return Array.isArray(data) ? data : (data?.results || []);
  },

  async listLubricants(params = {}) {
    const { data } = await apiClient.get('/lubricants/', { params });
    return Array.isArray(data) ? data : (data?.results || []);
  },

  async createLubricant(payload) {
    const { data } = await apiClient.post('/lubricants/', payload);
    return data;
  },

  async updateLubricant(id, payload) {
    const { data } = await apiClient.patch(`/lubricants/${id}/`, payload);
    return data;
  },

  async removeLubricant(id) {
    await apiClient.delete(`/lubricants/${id}/`);
  },

  async organizeSamplingPoint(id, payload) {
    const { data } = await apiClient.post(`/sampling-points/${id}/organize/`, payload);
    return data;
  },
};
