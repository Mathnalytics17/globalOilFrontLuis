import axios from 'axios';

import { getApiErrorMessage, isAuthEndpoint } from '@utils/errors';
import {
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  setTokens,
} from '@utils/token';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

let isRefreshing = false;
let refreshPromise = null;
let onSessionExpiredCallback = null;

export const setSessionExpiredHandler = (callback) => {
  onSessionExpiredCallback = callback;
};

const refreshAccessToken = async () => {
  const refresh = getRefreshToken();

  if (!refresh) {
    throw new Error('NO_REFRESH_TOKEN');
  }

  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = axios
    .post(
      `${API_BASE_URL}/users/token/refresh/`,
      { refresh },
      { timeout: 5000 }
    )
    .then(({ data }) => {
      if (!data?.access) {
        throw new Error('INVALID_REFRESH_RESPONSE');
      }

      setTokens({ access: data.access });
      apiClient.defaults.headers.Authorization = `Bearer ${data.access}`;

      return data.access;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
};

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    const shouldTryRefresh =
      error?.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRefresh &&
      !isAuthEndpoint(originalRequest.url);

    if (!shouldTryRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      if (typeof onSessionExpiredCallback === 'function') {
        onSessionExpiredCallback();
      }

      return Promise.reject(new Error('SESSION_EXPIRED'));
    }
  }
);

export { getApiErrorMessage };

export default apiClient;
