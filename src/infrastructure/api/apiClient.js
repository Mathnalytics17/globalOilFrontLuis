import axios from 'axios';

import { getApiErrorMessage, getApiFieldErrors, getErrorPresentation, isAuthEndpoint } from '@shared/utils/errors';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

const SAFE_METHODS = new Set(['get', 'head', 'options', 'trace']);
const inFlightMutations = new Map();

// A state update does not disable a button until React renders again. This
// small interval was enough for double clicks to create duplicate writes.
// Coalesce identical mutations at the transport boundary so every screen that
// uses this client shares the same protection, including legacy screens.
const stableSerialize = (value) => {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const mutationKeyFor = (config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) return '';
  try {
    return [
      String(config.method || 'post').toLowerCase(),
      config.baseURL || '',
      config.url || '',
      stableSerialize(config.params),
      typeof config.data === 'string' ? config.data : stableSerialize(config.data),
    ].join('|');
  } catch (_) {
    return '';
  }
};

let onSessionExpiredCallback = null;

export const setSessionExpiredHandler = (callback) => {
  onSessionExpiredCallback = callback;
};

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
};

apiClient.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toLowerCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) config.headers['X-CSRFToken'] = csrfToken;

    const mutationKey = config.skipMutationDedupe ? '' : mutationKeyFor(config);
    if (mutationKey) {
      const baseAdapter = config.adapter || apiClient.defaults.adapter;
      config.adapter = (adapterConfig) => {
        const activeRequest = inFlightMutations.get(mutationKey);
        if (activeRequest) return activeRequest;

        const adapter = axios.getAdapter(baseAdapter);
        const request = adapter({ ...adapterConfig, adapter: baseAdapter });
        inFlightMutations.set(mutationKey, request);
        request.finally(() => {
          if (inFlightMutations.get(mutationKey) === request) inFlightMutations.delete(mutationKey);
        }).catch(() => {});
        return request;
      };
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const request = error.config || {};
    const status = error?.response?.status;
    const presentation = getErrorPresentation(error);

    // Some legacy callers still read response.data.detail directly. Normalize
    // sensitive transport/access failures here so those paths cannot turn a
    // permission check or a server exception into a revealing UI message.
    error.userPresentation = presentation;
    error.fieldErrors = getApiFieldErrors(error);
    if (status === 403 || status === 404 || status >= 500) {
      const previousData = error.response?.data;
      error.response.data = {
        ...(previousData && typeof previousData === 'object' ? previousData : {}),
        detail: presentation.message,
        message: presentation.message,
      };
    }

    if (
      status === 401
      && !request._skipSessionExpired
      && !isAuthEndpoint(request.url)
      && typeof onSessionExpiredCallback === 'function'
    ) {
      onSessionExpiredCallback();
    }
    return Promise.reject(error);
  }
);

export { getApiErrorMessage };
export default apiClient;
