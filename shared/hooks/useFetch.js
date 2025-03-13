/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable no-tabs */

/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useState } from "react";

export const useFetch = ({ service, init }) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [called, setCalled] = useState(false);
  const [error, setError] = useState(undefined);

  /**
   * Función que ejecuta el servicio y captura los estados de la petición
   * @param {T} args argumentos del servicio
   * @returns {void}
   */
  const getService = async (...args) => {
    try {
      setLoading(true);
      const res = await service(...args);
      setLoading(false);
      setCalled(true);
      setError(undefined);
      setData(res);
      return res;
    } catch (err) {
      setLoading(false);
      setData(undefined);
      setError({
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Se ha producido un error",
        code: err?.response?.status || err?.code || 404,
      });
    }
  };
  /**
   * Función que reinicia los estados
   * @returns {void}
   */
  const reset = useCallback(() => {
    setData(undefined);
    setLoading(false);
    setCalled(false);
    setError(undefined);
  }, []);
  // Efecto que ejecuta el servicio cuando inicializa el componente
  useEffect(() => {
    init && getService();
  }, []);
  return {
    data,
    loading,
    called,
    error,
    fetch: getService,
    reset,
    setForcedData: setData,
  };
};
