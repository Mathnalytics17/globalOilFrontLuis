import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';

import apiClient, { setSessionExpiredHandler } from '@infrastructure/api/apiClient';
import { authService } from '@features/auth/infrastructure/authService';
import { getApiErrorMessage } from '@shared/utils/errors';
import { isGlobalUser } from '@features/auth/application/sessionAccess';

const AuthContext = createContext(null);
const PUBLIC_ROUTES = [
  '/', '/formularioGoogleSheets', '/users/login', '/users/signUp',
  '/users/forgotPassword', '/users/resetPassword', '/self-management', '/users/confirmUser',
];

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAuthError(null);
  }, []);

  const loadUser = useCallback(async ({ silent = false } = {}) => {
    try {
      const { data } = await apiClient.get('/users/me/', { _skipSessionExpired: true });
      setUser(data);
      return data;
    } catch (error) {
      if (error?.response?.status !== 401 && !silent) {
        const message = getApiErrorMessage(error, 'No fue posible verificar la sesión.');
        setAuthError(message);
        toast.error(message);
      }
      clearAuthState();
      return null;
    }
  }, [clearAuthState]);

  const handleSessionExpired = useCallback(() => {
    // Requests started by the protected view can finish while navigation happens.
    // Remove their notifications so no protected-view detail leaks onto login.
    toast.dismiss();
    clearAuthState();
    if (!PUBLIC_ROUTES.includes(router.pathname)) {
      router.replace('/users/login?session=expired');
    }
  }, [clearAuthState, router]);

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    return () => setSessionExpiredHandler(null);
  }, [handleSessionExpired]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        await authService.initializeCsrf();
        await loadUser({ silent: true });
      } finally {
        if (active) setIsLoading(false);
      }
    };
    bootstrap();
    return () => { active = false; };
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !user && !PUBLIC_ROUTES.includes(router.pathname)) {
      router.replace('/users/login');
    }
  }, [isLoading, user, router]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { user: loggedInUser } = await authService.login({ email, password });
      setUser(loggedInUser);
      router.replace('/dashboard');
      return { success: true, user: loggedInUser };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Error al iniciar sesión.');
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async (showMessage = true) => {
    try {
      await authService.logout();
    } catch {
      // A failed network logout must still remove the browser's authenticated state.
    } finally {
      toast.dismiss();
      clearAuthState();
      if (showMessage) toast.info('Sesión cerrada.');
      router.replace('/users/login');
    }
  }, [clearAuthState, router]);

  const hasRole = useCallback((role) => Boolean(user && (
    user.role === role || (Array.isArray(user.roles) && user.roles.includes(role)) || user.is_superuser
  )), [user]);

  const hasPermission = useCallback((permission) => {
    if (!permission) return true;
    if (!user) return false;
    return user.is_superuser || isGlobalUser(user) || (user.permissions || []).includes(permission);
  }, [user]);

  const value = useMemo(() => ({
    user,
    roles: user?.roles || (user?.role ? [user.role] : []),
    admin: isGlobalUser(user),
    isLoading,
    authError,
    api: apiClient,
    login,
    logout,
    loadUser,
    isAuthenticated: () => Boolean(user),
    isTokenValid: () => Boolean(user),
    hasRole,
    hasPermission,
    can: hasPermission,
    clearAuthState,
  }), [authError, clearAuthState, hasPermission, hasRole, isLoading, loadUser, login, logout, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
}

export default AuthContext;
