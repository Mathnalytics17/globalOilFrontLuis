import apiClient from '@infrastructure/api/apiClient';

export const assetTreeService = {
  async syncCompanyRoots() {
    const { data } = await apiClient.post('/sync-company-roots/');
    return data;
  },

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

  async organizeSamplingPoint(id, payload) {
    const { data } = await apiClient.post(`/sampling-points/${id}/organize/`, payload);
    return data;
  },
};
