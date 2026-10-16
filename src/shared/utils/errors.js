const GENERIC_UNAVAILABLE = 'El recurso solicitado no está disponible.';

const firstValidationMessage = (data) => {
  if (!data || typeof data !== 'object') return null;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (typeof value === 'string' && value) return value;
  }
  return null;
};

/** Converts HTTP/transport errors into safe, actionable UI language. */
export const getErrorPresentation = (error, fallback = 'No se pudo completar la operación.') => {
  if (!error?.response) {
    return error?.request
      ? { kind: 'network', title: 'Sin conexión con el servicio', message: 'Verifique su conexión e inténtelo nuevamente.', retryable: true }
      : { kind: 'unexpected', title: 'No fue posible completar la operación', message: fallback, retryable: true };
  }

  const { status, data } = error.response;
  if (status === 401) return { kind: 'session', title: 'La sesión finalizó', message: 'Inicie sesión nuevamente para continuar.', retryable: false };
  if (status === 403 || status === 404) return { kind: 'unavailable', title: 'Recurso no disponible', message: GENERIC_UNAVAILABLE, retryable: false };
  if (status === 409) return { kind: 'conflict', title: 'No se pudo aplicar el cambio', message: typeof data?.detail === 'string' ? data.detail : 'El recurso cambió o ya no permite esta operación. Actualice la información e inténtelo de nuevo.', retryable: true };
  if (status === 429) return { kind: 'rate-limit', title: 'Demasiados intentos', message: 'Espere un momento antes de volver a intentarlo.', retryable: true };
  if (status >= 500) return { kind: 'server', title: 'El servicio no está disponible', message: 'Inténtelo nuevamente en unos minutos. Si continúa, contacte a soporte.', retryable: true };

  const detail = typeof data?.detail === 'string' ? data.detail : typeof data?.message === 'string' ? data.message : Array.isArray(data?.message) ? data.message[0] : firstValidationMessage(data);
  return { kind: 'validation', title: 'Revise la información', message: detail || fallback, retryable: false };
};

export const getApiErrorMessage = (error, fallback = 'No se pudo completar la operación.') => getErrorPresentation(error, fallback).message;
export const isAccessOrMissingError = (error) => [403, 404].includes(error?.response?.status);

export const isAuthEndpoint = (url = '') => {
  return (
    url.includes('/users/login/') ||
    url.includes('/users/register/') ||
    url.includes('/users/csrf/') ||
    url.includes('/users/logout/') ||
    url.includes('/users/password-reset/') ||
    url.includes('/users/password-reset/confirm/') ||
    url.includes('/users/confirmUser/')
  );
};
