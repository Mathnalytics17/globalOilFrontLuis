const GENERIC_UNAVAILABLE = 'El recurso solicitado no está disponible.';

const firstValidationMessage = (data) => {
  if (typeof data === 'string' && data.trim()) return data;
  if (!data || typeof data !== 'object') return null;

  // DRF may nest errors as { muestras: [{ punto_muestreo: ["..."] }] }.
  // Walk that structure instead of coercing an object to "[object Object]".
  for (const value of Array.isArray(data) ? data : Object.values(data)) {
    const message = firstValidationMessage(value);
    if (message) return message;
  }
  return null;
};

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const responsePayload = (error) => error?.response?.data;

const standardError = (error) => {
  const data = responsePayload(error);
  return isObject(data?.error) ? data.error : null;
};

const legacyFieldPayload = (data) => {
  if (!isObject(data)) return data;
  const { detail, message, code, error, ...fields } = data;
  return fields;
};

/**
 * Converts DRF's nested validation format into the dot paths used by forms,
 * e.g. {muestras: [{punto_muestreo: ['...']}]} becomes
 * {'muestras.0.punto_muestreo': '...'}.
 */
export const getApiFieldErrors = (error) => {
  const data = responsePayload(error);
  const fields = standardError(error)?.fields ?? legacyFieldPayload(data);
  const flattened = {};

  const visit = (value, path = []) => {
    if (typeof value === 'string' && value.trim()) {
      if (path.length) flattened[path.join('.')] = value;
      return;
    }
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === 'string')) {
        if (path.length && value[0]) flattened[path.join('.')] = value.join(' ');
        return;
      }
      value.forEach((item, index) => visit(item, [...path, index]));
      return;
    }
    if (isObject(value)) {
      Object.entries(value).forEach(([key, item]) => {
        if (['detail', 'message', 'code', 'error'].includes(key)) return;
        visit(item, [...path, key]);
      });
    }
  };

  visit(fields);
  return flattened;
};

/** Converts HTTP/transport errors into safe, actionable UI language. */
export const getErrorPresentation = (error, fallback = 'No se pudo completar la operación.') => {
  if (!error?.response) {
    return error?.request
      ? { kind: 'network', title: 'Sin conexión con el servicio', message: 'Verifique su conexión e inténtelo nuevamente.', retryable: true }
      : { kind: 'unexpected', title: 'No fue posible completar la operación', message: fallback, retryable: true };
  }

  const { status, data } = error.response;
  const standardized = standardError(error);
  if (status === 401) return { kind: 'session', title: 'La sesión finalizó', message: 'Inicie sesión nuevamente para continuar.', retryable: false };
  if (status === 403 || status === 404) return { kind: 'unavailable', title: 'Recurso no disponible', message: GENERIC_UNAVAILABLE, retryable: false };
  if (status === 409) return { kind: 'conflict', title: 'No se pudo aplicar el cambio', message: typeof data?.detail === 'string' ? data.detail : 'El recurso cambió o ya no permite esta operación. Actualice la información e inténtelo de nuevo.', retryable: true };
  if (status === 429) return { kind: 'rate-limit', title: 'Demasiados intentos', message: 'Espere un momento antes de volver a intentarlo.', retryable: true };
  if (status >= 500) return { kind: 'server', title: 'El servicio no está disponible', message: 'Inténtelo nuevamente en unos minutos. Si continúa, contacte a soporte.', retryable: true };

  const detail = standardized?.message
    || (typeof data?.detail === 'string' ? data.detail : typeof data?.message === 'string' ? data.message : Array.isArray(data?.message) ? data.message[0] : firstValidationMessage(data));
  return {
    kind: standardized?.code || 'validation',
    title: 'Revise la información',
    message: detail || fallback,
    fields: getApiFieldErrors(error),
    retryable: false,
  };
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
