// utils/errors.js

export const getApiErrorMessage = (
  error,
  fallback = 'Ocurrió un error inesperado.'
) => {
  if (!error?.response) {
    if (error?.request) {
      return 'No se pudo conectar con el servidor. Verifique su conexión.';
    }

    return error?.message || fallback;
  }

  const { status, data } = error.response;

  if (Array.isArray(data?.message)) {
    return data.message[0];
  }

  if (typeof data?.message === 'string') {
    return data.message;
  }

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (data?.email?.[0]) {
    return data.email[0];
  }

  if (data?.password?.[0]) {
    return data.password[0];
  }

  if (data?.non_field_errors?.[0]) {
    return data.non_field_errors[0];
  }

  if (typeof data === 'object' && data !== null) {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue)) {
      return firstValue[0];
    }

    if (typeof firstValue === 'string') {
      return firstValue;
    }
  }

  switch (status) {
    case 400:
      return 'Datos de entrada inválidos.';
    case 401:
      return 'Credenciales inválidas. Verifique su email y contraseña.';
    case 403:
      return 'No tiene permisos para realizar esta acción.';
    case 404:
      return 'Recurso no encontrado.';
    case 429:
      return 'Demasiadas solicitudes. Por favor espere un momento.';
    case 500:
      return 'Error interno del servidor. Intente más tarde.';
    default:
      return fallback;
  }
};

export const isAuthEndpoint = (url = '') => {
  return (
    url.includes('/users/login/') ||
    url.includes('/users/register/') ||
    url.includes('/users/token/refresh/') ||
    url.includes('/users/password-reset/') ||
    url.includes('/users/password-reset/confirm/') ||
    url.includes('/users/confirmUser/')
  );
};
