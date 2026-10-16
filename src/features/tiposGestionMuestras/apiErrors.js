import { getApiErrorMessage as getSharedApiErrorMessage } from '@shared/utils/errors';

export const getApiErrorMessage = (error, fallback = 'No se pudo completar la operación.') =>
  getSharedApiErrorMessage(error, fallback);

export const getApiFieldErrors = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) acc[key] = value.join(' ');
    else if (typeof value === 'string') acc[key] = value;
    return acc;
  }, {});
};
