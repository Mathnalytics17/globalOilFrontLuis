// context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import jwt_decode from 'jwt-decode';

const AuthContext = createContext();
export default AuthContext;

// Configuración base de Axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
  timeout: 10000, // 10 segundos de timeout
});

// Modal de sesión expirada
const SessionExpiredModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      }}>
        <h2 style={{ color: '#e53e3e', marginBottom: '1rem' }}>⚠️ Sesión Expirada</h2>
        <p style={{ marginBottom: '1.5rem', color: '#4a5568' }}>
          Tu sesión ha expirado por seguridad. Serás redirigido al login.
        </p>
        <button
          onClick={onClose}
          style={{
            background: '#e53e3e',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          Ir al Login
        </button>
      </div>
    </div>
  );
};

// Clase para manejar errores de forma más descriptiva
class ApiErrorHandler {
  static getErrorMessage(error) {
    if (error.response) {
      // Errores de servidor (4xx, 5xx)
      const { status, data } = error.response;
      
      switch(status) {
        case 400:
          return this.handle400Error(data);
        case 401:
          return 'No se encontró el usuario. Por favor verifique sus credenciales.';	
        case 403:
          return 'No tiene permisos para realizar esta acción.';
        case 404:
          return 'Recurso no encontrado.';
        case 422:
          return this.handle422Error(data);
        case 429:
          return 'Demasiadas solicitudes. Por favor espere un momento.';
        case 500:
          return 'Error interno del servidor. Por favor intente más tarde.';
        default:
          return data?.message || `Error en la solicitud (${status})`;
      }
    } else if (error.request) {
      // La solicitud fue hecha pero no hubo respuesta
      return 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    } else {
      // Error al configurar la solicitud
      return 'Error al procesar la solicitud.';
    }
  }

  static handle400Error(data) {
    if (typeof data === 'string') return data;
    
    // Manejo de errores de validación
    if (data.errors) {
      return Object.values(data.errors).join(' ');
    }
    
    if (data.detail) return data.detail;
    
    if (typeof data === 'object') {
      const firstError = Object.values(data)[0];
      if (Array.isArray(firstError)) {
        return firstError[0];
      }
      return firstError || 'Datos inválidos';
    }
    
    return 'Solicitud incorrecta';
  }

  static handle422Error(data) {
    if (data.detail) return data.detail;
    
    // Manejo especial para errores de validación de formularios
    const errors = [];
    for (const field in data) {
      if (Array.isArray(data[field])) {
        errors.push(`${field}: ${data[field].join(', ')}`);
      } else {
        errors.push(`${field}: ${data[field]}`);
      }
    }
    
    return errors.length > 0 ? errors.join(' | ') : 'Error de validación';
  }
}

// Interceptor para añadir el token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  
  if (token) {
    try {
      const decoded = jwt_decode(token);
      if (decoded.exp * 1000 < Date.now()) {
        // Token expirado - no lo uses
        localStorage.removeItem('access_token');
        throw new axios.Cancel('Token expirado');
      }
      config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('❌ Token inválido:', error);
      localStorage.removeItem('access_token');
      throw new axios.Cancel('Token inválido');
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// INTERCEPTOR DE RESPUESTA MEJORADO
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si fue cancelado por token expirado
    if (axios.isCancel(error) && (error.message === 'Token expirado' || error.message === 'Token inválido')) {
      // El modal se manejará en el contexto
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    
    // Evitar loops infinitos
    if (originalRequest._retryCount >= 2) {
      return Promise.reject(error);
    }
    
    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

    // Si el error es 401 y no es una solicitud de refresh
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url.includes('/token/refresh/')) {
      
      originalRequest._retry = true;
      
      try {
        console.log('🔄 Token expirado, intentando renovar...');
        
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No hay token de refresco');
        }
        
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users/token/refresh/`,
          { refresh: refreshToken },
          { timeout: 5000 }
        );
        
        localStorage.setItem('access_token', data.access);
        api.defaults.headers.Authorization = `Bearer ${data.access}`;
        
        // Reintentar la solicitud original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('❌ Error renovando token:', refreshError);
        // El modal se mostrará a través del contexto
        throw new Error('SESSION_EXPIRED');
      }
    }
    
    // Para otros errores, solo mostrar toast si no es error de autenticación
    if (error.response?.status >= 400 && 
        error.response?.status !== 401 && 
        !error.config._skipErrorToast) {
      
      const errorMessage = ApiErrorHandler.getErrorMessage(error);
      toast.error(errorMessage);
    }
    
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [roles, setRoles] = useState([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const router = useRouter();

  // Función para verificar si el token es válido
  const isTokenValid = () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return false;
      
      const decoded = jwt_decode(token);
      const isValid = decoded.exp * 1000 > Date.now();
      
      if (!isValid) {
        console.log('⚠️ Token expirado en validación');
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ Error validando token:', error);
      return false;
    }
  };

  // Función para verificar si el usuario está autenticado
  const isAuthenticated = () => {
    return isTokenValid();
  };

  // Validación mejorada de email
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Función para manejar sesión expirada
  const handleSessionExpired = () => {
    console.log('🔴 Mostrando modal de sesión expirada');
    setShowSessionModal(true);
    
    // Limpiar todo
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_roles');
    setUser(null);
    setRoles([]);
    setAdmin(false);
    
    // Redirigir después de 3 segundos si no cierran el modal
    setTimeout(() => {
      if (showSessionModal) {
        setShowSessionModal(false);
        router.push('/users/login?session=expired');
      }
    }, 5000);
  };

  const handleCloseSessionModal = () => {
    setShowSessionModal(false);
    router.push('/users/login?session=expired');
  };

  // MEJORA la función loadUser en AuthContext.js
  const loadUser = async () => {
    // No cargar si no hay token
    if (!isAuthenticated()) {
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setAuthError(null); // Resetear errores previos
    
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        throw new Error('No token found');
      }

      // Verificar expiración del token
      if (!isTokenValid()) {
        throw new Error('Token expirado');
      }

      const { data } = await api.get('/users/me/');
      
      // Validar que la respuesta tenga la estructura esperada
      if (!data || typeof data !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }

      setUser(data);
      
      const rolesArray = data.role ? [data.role] : [];
      setRoles(rolesArray);
      localStorage.setItem('user_roles', JSON.stringify(rolesArray));
      
      const isAdmin = rolesArray.includes('ADMIN') || 
                     rolesArray.includes('GLOBAL') || 
                     Boolean(data.is_superuser);
      setAdmin(isAdmin);
      
      console.log('✅ Usuario cargado:', data.email);
      return data;
      
    } catch (error) {
      console.error('❌ Error cargando usuario:', error);
      
      // Manejar diferentes tipos de errores
      if (error.response?.status === 401 || 
          error.message === 'Token expirado' || 
          error.message === 'SESSION_EXPIRED') {
        
        handleSessionExpired();
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network')) {
        setAuthError('Error de conexión');
        toast.error('Error de conexión. Verifique su internet.');
      } else if (error.message !== 'SESSION_EXPIRED') {
        setAuthError('Error cargando usuario');
        toast.error('Error cargando información del usuario');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect principal mejorado
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Verificar si hay token antes de cargar
        const token = localStorage.getItem('access_token');
        if (!token) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Verificar expiración del token antes de hacer la petición
        if (!isTokenValid()) {
          console.log('⚠️ Token expirado al inicializar');
          if (isMounted) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setIsLoading(false);
          }
          return;
        }

        // Solo cargar usuario si el token es válido
        if (isMounted) {
          await loadUser();
        }
      } catch (error) {
        console.error('❌ Error inicializando auth:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false; // Cleanup para evitar memory leaks
    };
  }, []);

  // Manejo de rutas mejorado
  useEffect(() => {
    const handleRouteChange = async (url) => {
      const publicRoutes = [
        '/',
        '/formularioGoogleSheets',
        '/users/login',
        '/users/signUp',
        '/users/forgotPassword',
        '/users/resetPassword',
        '/self-management',
        '/users/confirmUser'
      ];
      
      const path = url.split('?')[0];
      
      if (publicRoutes.includes(path)) return;
      
      if (!isAuthenticated()) {
        // Esperar a que termine la carga inicial
        if (isLoading) {
          const timer = setTimeout(() => {
            if (!isAuthenticated() && !publicRoutes.includes(path)) {
              router.push('/users/login');
            }
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          router.push('/users/login');
        }
        return;
      }
    };

    // Solo agregar el listener cuando no esté loading
    if (!isLoading) {
      router.events.on('routeChangeStart', handleRouteChange);
    }
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, isLoading]);

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Validaciones previas con mensajes específicos
      if (!validateEmail(email)) {
        return { 
          success: false, 
          error: 'Por favor ingrese un email válido' 
        };
      }
      
      if (password.length < 6) {
        return { 
          success: false, 
          error: 'La contraseña debe tener al menos 6 caracteres' 
        };
      }
      
      const response = await api.post('/users/login/', { email, password });
      
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      const userData = await loadUser();
      router.push('/dashboard');
      
      toast.success('¡Bienvenido!');
      return { success: true, user: userData };
      
    } catch (error) {
      // Manejo específico de errores de la API
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch(status) {
          case 401:
            errorMessage = 'Email o contraseña incorrectos';
            break;
          case 400:
            if (data.email) {
              errorMessage = data.email[0];
            } else if (data.password) {
              errorMessage = data.password[0];
            } else if (data.detail) {
              errorMessage = data.detail;
            } else {
              errorMessage = 'Datos de entrada inválidos';
            }
            break;
          case 500:
            errorMessage = 'Error del servidor. Por favor intente más tarde';
            break;
          default:
            errorMessage = data?.message || `Error (${status})`;
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor. Verifique su conexión';
      } else {
        errorMessage = error.message || 'Error inesperado';
      }
      
      console.error('Login error:', error);
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (showMessage = true) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_roles');
    setUser(null);
    setRoles([]);
    setAdmin(false);
    setAuthError(null);
    
    if (showMessage) {
      toast.info('Sesión cerrada');
    }
    
    router.push('/users/login');
  };

  const register = async (userData) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      if (!validateEmail(userData.email)) throw new Error('Email inválido');
      if (userData.password !== userData.password2) throw new Error('Contraseñas no coinciden');
      
      await api.post('/users/register/', userData);
      toast.success('Registro exitoso. Por favor inicie sesión.');
      return { success: true };
    } catch (error) {
      const errorMessage = ApiErrorHandler.getErrorMessage(error);
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Función para verificar permisos
  const hasPermission = (requiredRole) => {
    if (!user) return false;
    return user.role === requiredRole || 
           (user.roles && user.roles.includes(requiredRole)) || 
           user.is_superuser;
  };

  // FUNCIÓN refreshToken CORREGIDA
  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No hay token de refresco');
      
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/users/token/refresh/`,
        { refresh: refreshToken },
        { timeout: 5000 }
      );
      
      localStorage.setItem('access_token', data.access);
      api.defaults.headers.Authorization = `Bearer ${data.access}`;
      return data.access;
    } catch (error) {
      console.error('❌ Error en refreshToken:', error);
      handleSessionExpired();
      throw error;
    }
  };

  // Función para verificar si el usuario tiene un rol específico
  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role || (user.roles && user.roles.includes(role));
  };

  // Valor del contexto
  const contextValue = {
    user,
    isLoading,
    authError,
    api,
    roles,
    admin,
    isAuthenticated,
    hasPermission,
    login,
    logout,
    register,
    loadUser,
    refreshToken,
    hasRole,
    validateEmail,
    isTokenValid
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <SessionExpiredModal 
        isOpen={showSessionModal} 
        onClose={handleCloseSessionModal} 
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