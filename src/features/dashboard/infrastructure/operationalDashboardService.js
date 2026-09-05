import apiClient from '@infrastructure/api/apiClient';

const BASE_URL = '/dashboard';

const operationalDashboardService = {
  async getCenter(params = {}) {
    const { data } = await apiClient.get(`${BASE_URL}/operational-center/`, { params });
    return data;
  },

  async sendDailyDigest() {
    const { data } = await apiClient.post(`${BASE_URL}/operational-center/send-daily-digest/`);
    return data;
  },

  async getNotificationTopics() {
    const { data } = await apiClient.get(`${BASE_URL}/notification-topics/`);
    return Array.isArray(data) ? data : data.results || [];
  },

  async updateNotificationTopic(id, payload) {
    const { data } = await apiClient.patch(`${BASE_URL}/notification-topics/${id}/`, payload);
    return data;
  },

  async createNotificationTopic(payload) {
    const { data } = await apiClient.post(`${BASE_URL}/notification-topics/`, payload);
    return data;
  },

  async testNotificationTopic(id) {
    const { data } = await apiClient.post(`${BASE_URL}/notification-topics/${id}/test-email/`);
    return data;
  },

  async deleteNotificationTopic(id) {
    await apiClient.delete(`${BASE_URL}/notification-topics/${id}/`);
  },

  async getNotificationEventTypes() {
    const { data } = await apiClient.get(`${BASE_URL}/notification-topics/event-types/`);
    return data;
  },

  async getNotificationUsers() {
    const { data } = await apiClient.get(`${BASE_URL}/notification-topics/users/`);
    return data;
  },

  async getNotificationRoles() {
    const { data } = await apiClient.get(`${BASE_URL}/notification-topics/roles/`);
    return data;
  },

  async getDispatches() {
    const { data } = await apiClient.get(`${BASE_URL}/notification-dispatches/`);
    return Array.isArray(data) ? data : data.results || [];
  },
};

export default operationalDashboardService;
