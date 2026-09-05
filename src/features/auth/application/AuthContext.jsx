import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';

import apiClient, { setSessionExpiredHandler } from '@infrastructure/api/apiClient';
import { authService } from '@features/auth/infrastructure/authService';
import { getApiErrorMessage } from '@utils/errors';
import {
  clearTokens,
  getAccessToken,
  isAccessTokenValid,
  isTokenExpired,
  setStoredRoles,
  setTokens,
} from '@utils/token';
import SessionExpiredModal from '@components/modals/users/SessionExpiredModal';
import { isGlobalUser } from './sessionAccess';

const AuthContext = createContext(null);

export default AuthContext;

const PUBLIC_ROUTES = [
  '/',
  '/formularioGoogleSheets',
  '/users/login',
  '/users/signUp',
  '/users/forgotPassword',
  '/users/resetPassword',
  '/self-management',
  '/users/confirmUser',
];

export function AuthProvider({ children }) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const validateEmail = useCallback((email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
  }, []);

  const syncUserState = useCallback((userData) => {
    const userRoles = [];

    if (userData?.role) {
      userRoles.push(userData.role);
    }

    if (Array.isArray(userData?.roles)) {
      userData.roles.forEach((role) => {
        if (!userRoles.includes(role)) {
          userRoles.push(role);
        }
      });
    }

    const isAdmin = isGlobalUser(userData);

    setUser(userData);
    setRoles(userRoles);
    setAdmin(isAdmin);
    setStoredRoles(userRoles);
  }, []);

  const clearAuthState = useCallback(() => {
    clearTokens();

    setUser(null);
    setRoles([]);
    setAdmin(false);
    setAuthError(null);

    delete apiClient.defaults.headers.Authorization;
  }, []);

  const goToLogin = useCallback(
    (sessionExpired = false) => {
      const query = sessionExpired ? '?session=expired' : '';
      router.push(`/users/login${query}`);
    },
    [router]
  );

  const handleSessionExpired = useCallback(() => {
    clearAuthState();
    setShowSessionModal(true);
  }, [clearAuthState]);

  const closeSessionModal = useCallback(() => {
    setShowSessionModal(false);
    goToLogin(true);
  }, [goToLogin]);

  const loadUser = useCallback(
    async ({ silent = false } = {}) => {
      const token = getAccessToken();

      if (!token || isTokenExpired(token)) {
        clearAuthState();

        if (!silent) {
          handleSessionExpired();
        }

        return null;
      }

      if (!silent) {
        setIsLoading(true);
      }

      setAuthError(null);

      try {
        const userData = await authService.getCurrentUser();
        syncUserState(userData);

        return userData;
      } catch (error) {
        if (
          error?.response?.status === 401 ||
          error?.message === 'SESSION_EXPIRED'
        ) {
          handleSessionExpired();
          return null;
        }

        const message = getApiErrorMessage(
          error,
          'Error cargando informacion del usuario.'
        );

        setAuthError(message);

        if (!silent) {
          toast.error(message);
        }

        return null;
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [clearAuthState, handleSessionExpired, syncUserState]
  );

  const login = useCallback(
    async (email, password) => {
      setIsLoading(true);
      setAuthError(null);

      clearAuthState();

      try {
        if (!validateEmail(email)) {
          return {
            success: false,
            error: 'Por favor ingrese un email valido.',
          };
        }

        if (!password) {
          return {
            success: false,
            error: 'Por favor ingrese su contrasena.',
          };
        }

        const data = await authService.login({ email, password });

        if (!data?.access || !data?.refresh) {
          throw new Error('El servidor no retorno tokens validos.');
        }

        setTokens({
          access: data.access,
          refresh: data.refresh,
        });

        apiClient.defaults.headers.Authorization = `Bearer ${data.access}`;

        const userData = await loadUser({ silent: true });

        toast.success('Bienvenido.');
        router.push('/dashboard');

        return {
          success: true,
          user: userData,
        };
      } catch (error) {
        const message = getApiErrorMessage(error, 'Error al iniciar sesion.');

        setAuthError(message);

        return {
          success: false,
          error: message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [clearAuthState, loadUser, router, validateEmail]
  );

  const logout = useCallback(
    (showMessage = true) => {
      clearAuthState();

      if (showMessage) {
        toast.info('Sesion cerrada.');
      }

      goToLogin(false);
    },
    [clearAuthState, goToLogin]
  );

  const register = useCallback(
    async (userData) => {
      setIsLoading(true);
      setAuthError(null);

      try {
        if (!validateEmail(userData.email)) {
          throw new Error('Email invalido.');
        }

        if (userData.password !== userData.password2) {
          throw new Error('Las contrasenas no coinciden.');
        }

        await authService.register(userData);

        toast.success('Registro exitoso. Por favor inicie sesion.');

        return {
          success: true,
        };
      } catch (error) {
        const message = getApiErrorMessage(error, 'Error al registrar usuario.');

        setAuthError(message);

        return {
          success: false,
          error: message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [validateEmail]
  );

  const isAuthenticated = useCallback(() => {
    return isAccessTokenValid();
  }, []);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;

      return (
        user.role === role ||
        roles.includes(role) ||
        Boolean(user.is_superuser)
      );
    },
    [user, roles]
  );

  const hasPermission = useCallback(
    (permissionOrRole) => {
      if (!permissionOrRole) return true;
      if (!user) return false;

      if (Boolean(user.is_superuser)) return true;

      const permissions = Array.isArray(user.permissions) ? user.permissions : [];
      const normalized = String(permissionOrRole);

      return (
        permissions.includes(normalized) ||
        permissions.includes(normalized.toLowerCase()) ||
        hasRole(normalized)
      );
    },
    [user, hasRole]
  );

  const can = hasPermission;

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
  }, [handleSessionExpired]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const token = getAccessToken();

      if (!token || isTokenExpired(token)) {
        clearAuthState();

        if (mounted) {
          setIsLoading(false);
        }

        return;
      }

      await loadUser({ silent: true });

      if (mounted) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [clearAuthState, loadUser]);

  useEffect(() => {
    if (isLoading) return;

    const currentPath = router.pathname;

    if (PUBLIC_ROUTES.includes(currentPath)) return;

    if (!isAuthenticated()) {
      goToLogin(false);
    }
  }, [isLoading, router.pathname, isAuthenticated, goToLogin]);

  const contextValue = useMemo(
    () => ({
      user,
      roles,
      admin,
      isLoading,
      authError,
      api: apiClient,

      login,
      logout,
      register,
      loadUser,

      isAuthenticated,
      hasRole,
      hasPermission,
      can,
      validateEmail,
      isTokenValid: isAuthenticated,
      clearAuthState,
    }),
    [
      user,
      roles,
      admin,
      isLoading,
      authError,
      login,
      logout,
      register,
      loadUser,
      isAuthenticated,
      hasRole,
      hasPermission,
      can,
      validateEmail,
      clearAuthState,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}

      <SessionExpiredModal
        isOpen={showSessionModal}
        onClose={closeSessionModal}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }

  return context;
}
