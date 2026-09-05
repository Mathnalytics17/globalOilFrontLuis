import apiClient from '@infrastructure/api/apiClient';

export const authService = {
  login: async ({ email, password }) => {
    const { data } = await apiClient.post(
      '/users/login/',
      { email, password },
      { _skipAuthRefresh: true }
    );

    return data;
  },

  register: async (userData) => {
    const { data } = await apiClient.post(
      '/users/register/',
      userData,
      { _skipAuthRefresh: true }
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

  refreshToken: async (refresh) => {
    const { data } = await apiClient.post(
      '/users/token/refresh/',
      { refresh },
      { _skipAuthRefresh: true }
    );

    return data;
  },

  forgotPassword: async (email) => {
    const { data } = await apiClient.post(
      '/users/password-reset/',
      { email },
      { _skipAuthRefresh: true }
    );

    return data;
  },

  resetPassword: async (payload) => {
    const { data } = await apiClient.post(
      '/users/password-reset/confirm/',
      payload,
      { _skipAuthRefresh: true }
    );

    return data;
  },
};
