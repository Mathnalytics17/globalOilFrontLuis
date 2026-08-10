export const getApiErrorMessage = (error, fallback = "Ocurrió un error inesperado.") => {
  if (!error) return fallback;

  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 404) {
    return "No se encontró el recurso solicitado. Revisa que la ruta del backend esté registrada correctamente.";
  }

  if (status === 401) return "Tu sesión no es válida o expiró. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permisos para realizar esta acción.";
  if (status >= 500) return "El servidor falló procesando la solicitud. Revisa la consola del backend.";

  if (typeof data === "string") {
    if (data.includes("Page not found")) return "La URL del servicio no existe en el backend.";
    return data;
  }

  if (Array.isArray(data)) return data.join(" ");
  if (data?.message) return Array.isArray(data.message) ? data.message.join(" ") : String(data.message);
  if (data?.detail) return String(data.detail);
  if (data?.error) return Array.isArray(data.error) ? data.error.join(" ") : String(data.error);

  if (data && typeof data === "object") {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      if (Array.isArray(value)) return value.map((item) => `${field}: ${item}`);
      if (typeof value === "string") return [`${field}: ${value}`];
      return [];
    });
    if (messages.length) return messages.join(" | ");
  }

  return error?.message || fallback;
};
