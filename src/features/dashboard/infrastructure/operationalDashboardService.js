import apiClient from '@infrastructure/api/apiClient';

const BASE_URL = '/dashboard';

const operationalDashboardService = {
  async getCenter(params = {}) {
    const { data } = await apiClient.get(`${BASE_URL}/operational-center/`, { params });
    return data;
  },

};

export default operationalDashboardService;
