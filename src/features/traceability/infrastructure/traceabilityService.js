import apiClient from '@infrastructure/api/apiClient';
import { normalizePaginated } from '@shared/utils/pagination';

const BASE_URL = '/lubrication/traceability/';

export const traceabilityService = {
  async page(params = {}) {
    const { data } = await apiClient.get(BASE_URL, { params });
    return normalizePaginated(data);
  },
  async summary(params = {}) {
    const { data } = await apiClient.get(`${BASE_URL}summary/`, { params });
    return data;
  },
  async filters() {
    const { data } = await apiClient.get(`${BASE_URL}filters/`);
    return data;
  },
  async importRuns(params = {}) {
    const { data } = await apiClient.get('/lubrication/import-runs/', { params });
    return normalizePaginated(data);
  },
};
