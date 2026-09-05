// utils/token.js
import jwtDecode from 'jwt-decode';

export const TOKEN_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  roles: 'user_roles',
};

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.access);
};

export const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.refresh);
};

export const setTokens = ({ access, refresh }) => {
  if (typeof window === 'undefined') return;

  if (access) {
    localStorage.setItem(TOKEN_KEYS.access, access);
  }

  if (refresh) {
    localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  }
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem(TOKEN_KEYS.roles);
};

export const setStoredRoles = (roles = []) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEYS.roles, JSON.stringify(roles));
};

export const getStoredRoles = () => {
  if (typeof window === 'undefined') return [];

  try {
    const rawRoles = localStorage.getItem(TOKEN_KEYS.roles);
    return rawRoles ? JSON.parse(rawRoles) : [];
  } catch {
    return [];
  }
};

export const isTokenExpired = (token) => {
  try {
    if (!token) return true;

    const decoded = jwtDecode(token);

    if (!decoded?.exp) return true;

    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const isAccessTokenValid = () => {
  const token = getAccessToken();
  return Boolean(token) && !isTokenExpired(token);
};