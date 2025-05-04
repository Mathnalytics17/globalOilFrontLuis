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
  
  // Verifica si el token existe y no está expirado
  if (token) {
    const decoded = jwt_decode(token);
    if (decoded.exp * 1000 < Date.now()) {
      // Token expirado - no lo uses
      localStorage.removeItem('access_token');
      return config;
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorMessage = ApiErrorHandler.getErrorMessage(error);
    
    // Si el error es 401 y no es una solicitud de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw error;
        
        const { data } = await axios.post(`${api.defaults.baseURL}/users/token/refresh/`, { 
          refresh: refreshToken 
        });
        
        localStorage.setItem('access_token', data.access);
        api.defaults.headers.Authorization = `Bearer ${data.access}`;
        
        // Reintentar la solicitud original con el nuevo token
        return api(originalRequest);
      } catch (refreshError) {
        // Mostrar mensaje más descriptivo
        const refreshErrorMessage = ApiErrorHandler.getErrorMessage(refreshError);
        toast.error(refreshErrorMessage);
        
        // Limpiar y redirigir
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
   
        return Promise.reject(refreshError);
      }
    }
    
    // Mostrar error al usuario (excepto para 401 que ya manejamos)
    if (error.response?.status !== 401) {
      toast.error(errorMessage);
    }
    
    return Promise.reject({ ...error, message: errorMessage });
  }
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [roles, setRoles] = useState([]);
  const router = useRouter();
  // Función para verificar si el usuario está autenticado
  const isAuthenticated = () => {
    return !!localStorage.getItem('access_token');
  };

  // Validación mejorada de email
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };



  


  const loadUser = async () => {
    setIsLoading(true);
    try {
      if (!isAuthenticated()) throw new Error('No autenticado');
      
      const { data } = await api.get('/users/me/');
      setUser(data);
      
      // Actualizado a los nuevos roles
      const rolesArray = data.role ? [data.role] : [];
      setRoles(rolesArray);
      localStorage.setItem('user_roles', JSON.stringify(rolesArray));
      setAdmin(rolesArray.includes('ADMIN') || rolesArray.includes('GLOBAL') || Boolean(data.is_superuser));
      
      return data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      loadUser().catch(() => {});
    }  else if (!isAuthenticated()) {
      router.push('/users/login');
      return;
    }else {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    const handleRouteChange = (url) => {
      const publicRoutes = [
        '/',
        '/formularioGoogleSheets',
        '/users/login',
        '/users/signUp',
        '/users/forgotPassword',
        '/users/resetPassword',
        '/self-management'
      ];
      
      const path = url.split('?')[0];
      
      if (publicRoutes.includes(path)) return;
      
      if (!isAuthenticated() && path.startsWith('/')) {
        router.push('/users/login');
        return;
      }
    
      
    };

    handleRouteChange(router.pathname);
    router.events.on('routeChangeStart', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      if (!validateEmail(email)) throw new Error('Email inválido');
      if (password.length < 6) throw new Error('Contraseña muy corta');
      
      const response = await api.post('/users/login/', { email, password });
      
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      
      const userData = await loadUser();
      router.push('/dashboard');
      
      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = error.response?.status === 401 
        ? 'Credenciales incorrectas' 
        : ApiErrorHandler.getErrorMessage(error);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setRoles([]);
    setAdmin(false);
    router.push('/users/login');
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      if (!validateEmail(userData.email)) throw new Error('Email inválido');
      if (userData.password !== userData.password2) throw new Error('Contraseñas no coinciden');
      
      await api.post('/users/register/', userData);
      toast.success('Registro exitoso');
      return { success: true };
    } catch (error) {
      const errorMessage = ApiErrorHandler.getErrorMessage(error);
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

  // Función para refrescar token
  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No hay token de refresco');
      
      const { data } = await axios.post(`${api.defaults.baseURL}users/token/refresh/`, { 
        refresh: refreshToken 
      });
      
      localStorage.setItem('access_token', data.access);
      api.defaults.headers.Authorization = `Bearer ${data.access}`;
      return data.access;
    } catch (error) {
      logout();
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
    validateEmail
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}