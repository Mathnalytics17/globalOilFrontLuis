export const getApiErrorMessage = (error, fallback = 'Ocurrió un error inesperado') => {
  const data = error?.response?.data;

  if (!data) return error?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.message) return Array.isArray(data.message) ? data.message.join(' ') : data.message;

  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    if (Array.isArray(value)) return `${firstKey}: ${value.join(' ')}`;
    if (typeof value === 'string') return `${firstKey}: ${value}`;
  }

  return fallback;
};

export const getApiFieldErrors = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) acc[key] = value.join(' ');
    else if (typeof value === 'string') acc[key] = value;
    return acc;
  }, {});
};
