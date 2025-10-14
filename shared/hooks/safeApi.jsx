// hooks/useSafeApi.js
import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export const useSafeApi = () => {
  const { logout } = useAuth();

  const safeApiCall = useCallback(async (apiCall, options = {}) => {
    const { 
      showError = true, 
      defaultErrorMessage = 'Error en la solicitud',
      onError = null 
    } = options;

    try {
      const response = await apiCall();
      return { data: response.data, error: null, response };
    } catch (error) {
      console.error('❌ Error en safeApiCall:', error);
      
      // Manejar diferentes tipos de errores
      if (error.response?.status === 401) {
        console.log('🔐 Token expirado, cerrando sesión...');
        logout();
        return { data: null, error: 'Sesión expirada', response: null };
      }
      
      if (error.response?.status === 500) {
        console.error('💥 Error del servidor:', error.response.data);
        if (showError) {
          toast.error('Error interno del servidor. Por favor intente más tarde.');
        }
        return { 
          data: null, 
          error: 'Error interno del servidor', 
          response: null 
        };
      }
      
      // Manejo personalizado de errores
      if (onError) {
        onError(error);
      } else if (showError) {
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.error || 
                           error.message || 
                           defaultErrorMessage;
        toast.error(errorMessage);
      }
      
      return { data: null, error: error.message, response: null };
    }
  }, [logout]);

  return { safeApiCall };
};