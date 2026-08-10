import apiClient from '@infrastructure/api/apiClient';

const BASE_URL = '/lubrication/sample-tests/';

export const sampleTestsService = {
  async list(params = {}) {
    const { data } = await apiClient.get(BASE_URL, { params });
    return data;
  },

  async listBySample(sampleId) {
    const { data } = await apiClient.get(`${BASE_URL}by-sample/${sampleId}/`);
    return data;
  },

  async listByBatch(batchId) {
    const { data } = await apiClient.get(`${BASE_URL}by-batch/${batchId}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post(BASE_URL, payload);
    return data;
  },

  async patch(id, payload) {
    const { data } = await apiClient.patch(`${BASE_URL}${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`${BASE_URL}${id}/`);
    return data;
  },

  async assignBatch(payload) {
    const { data } = await apiClient.post(`${BASE_URL}assign-batch/`, payload);
    return data;
  },
};
