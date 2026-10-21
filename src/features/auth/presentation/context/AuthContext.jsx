import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';

import apiClient, {
  isSessionExpiredError,
  resetSessionExpiryNotification,
  setSessionExpiredHandler,
} from '@infrastructure/api/apiClient';
import { authService } from '@features/auth/infrastructure/authService';
import { getApiErrorMessage } from '@shared/utils/errors';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import { resolveHomeRoute } from '@features/auth/application/homeRoute';

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
      // Do not bypass the transport-level expiry handler here. A refresh with
      // an expired server session must take the same deterministic path as a
      // 401 raised by any protected page.
      const { data } = await apiClient.get('/users/me/');
      setUser(data);
      resetSessionExpiryNotification();
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
      // This must not depend on a Next.js client transition completing. When
      // a session expires, page-level requests may reject in the same turn;
      // replacing the document prevents their error handlers from leaving a
      // stale "recurso no disponible" toast on the protected screen.
      if (typeof window !== 'undefined') {
        window.location.replace('/users/login?session=expired');
        return;
      }
      void router.replace('/users/login?session=expired').catch(() => {});
    }
  }, [clearAuthState, router]);

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    const suppressExpiredRequestOverlay = (event) => {
      if (!isSessionExpiredError(event.reason)) return;
      // Browser/Next development overlays listen to unhandledrejection. The
      // user is already being sent to login, so exposing an Axios stack here
      // adds no value and makes the app appear broken.
      event.preventDefault();
      handleSessionExpired();
    };
    window.addEventListener('unhandledrejection', suppressExpiredRequestOverlay);
    return () => {
      window.removeEventListener('unhandledrejection', suppressExpiredRequestOverlay);
      setSessionExpiredHandler(null);
    };
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
      void router.replace('/users/login').catch(() => {});
    }
  }, [isLoading, user, router]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { user: loggedInUser } = await authService.login({ email, password });
      setUser(loggedInUser);
      resetSessionExpiryNotification();
      void router.replace(resolveHomeRoute(loggedInUser, (permission) => (
        loggedInUser.is_superuser || isGlobalUser(loggedInUser) || (loggedInUser.permissions || []).includes(permission)
      ))).catch(() => {});
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
      resetSessionExpiryNotification();
      if (showMessage) toast.info('Sesión cerrada.');
      void router.replace('/users/login').catch(() => {});
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
