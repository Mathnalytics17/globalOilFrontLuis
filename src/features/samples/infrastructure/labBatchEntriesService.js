import api from '@infrastructure/api/apiClient';

const BASE_URL = '/lubrication/lab-batch-entries/';

export const labBatchEntriesService = {
  async list(params = {}) {
    const { data } = await api.get(BASE_URL, { params });
    return data;
  },

  async availableBatches(params = {}) {
    const { data } = await api.get(`${BASE_URL}available-batches/`, { params });
    return data;
  },

  async create(payload) {
    const { data } = await api.post(BASE_URL, payload);
    return data;
  },

  async retrieve(id) {
    const { data } = await api.get(`${BASE_URL}${id}/`);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`${BASE_URL}${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`${BASE_URL}${id}/`);
    return data;
  },
};

export default labBatchEntriesService;
