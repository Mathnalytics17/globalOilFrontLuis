import apiClient from '@infrastructure/api/apiClient';

export const authService = {
  initializeCsrf: async () => apiClient.get('/users/csrf/', { _skipSessionExpired: true }),

  login: async ({ email, password }) => {
    await authService.initializeCsrf();
    const { data } = await apiClient.post(
      '/users/login/',
      { email, password },
      { _skipSessionExpired: true }
    );

    return data;
  },

  register: async (userData) => {
    await authService.initializeCsrf();
    const { data } = await apiClient.post(
      '/users/register/',
      userData,
      { _skipSessionExpired: true }
    );

    return data;
  },

  getCurrentUser: async () => {
    const { data } = await apiClient.get('/users/me/');
    return data;
  },

  updateCurrentUser: async (payload) => {
    const { data } = await apiClient.patch('/users/me/', payload);
    return data;
  },

  logout: async () => {
    await authService.initializeCsrf();
    await apiClient.post('/users/logout/');
  },

  forgotPassword: async (email) => {
    await authService.initializeCsrf();
    const { data } = await apiClient.post(
      '/users/password-reset/',
      { email },
      { _skipSessionExpired: true }
    );

    return data;
  },

  resetPassword: async (payload) => {
    await authService.initializeCsrf();
    const { data } = await apiClient.post(
      '/users/password-reset/confirm/',
      payload,
      { _skipSessionExpired: true }
    );

    return data;
  },
};
