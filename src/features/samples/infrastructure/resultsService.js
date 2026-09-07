import apiClient from '@infrastructure/api/apiClient';

export const resultsService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/lubrication/results/', { params });
    return data;
  },

  async invalidate(id, reason) {
    const { data } = await apiClient.post(`/lubrication/results/${id}/invalidate/`, { reason });
    return data;
  },
};
