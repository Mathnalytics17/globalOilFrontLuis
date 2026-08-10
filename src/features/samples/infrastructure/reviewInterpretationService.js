import apiClient from '@infrastructure/api/apiClient';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export const reviewInterpretationService = {
  async listReviewBatches(params = {}) {
    const { data } = await apiClient.get('/lubrication/review-results/batches/', { params });
    return normalizeList(data);
  },

  async getReviewBatch(loteId) {
    const { data } = await apiClient.get(`/lubrication/review-results/batches/${loteId}/`);
    return data;
  },

  async getResultHistory(resultadoId) {
    const { data } = await apiClient.get(`/lubrication/review-results/results/${resultadoId}/history/`);
    return data;
  },

  async correctResult(resultadoId, payload) {
    const { data } = await apiClient.post(`/lubrication/review-results/results/${resultadoId}/correct/`, payload);
    return data;
  },

  async markReviewed(pruebaMuestraId, payload = {}) {
    const { data } = await apiClient.post(`/lubrication/review-results/sample-tests/${pruebaMuestraId}/mark-reviewed/`, payload);
    return data;
  },

  async completeBatchReview(loteId, payload = {}) {
    const { data } = await apiClient.post(`/lubrication/review-results/batches/${loteId}/complete/`, payload);
    return data;
  },

  async getInterpretationBatch(loteId) {
    const { data } = await apiClient.get(`/lubrication/interpretation/batches/${loteId}/`);
    return data;
  },

  async getInterpretationSample(sampleId) {
    const { data } = await apiClient.get(`/lubrication/interpretation/samples/${sampleId}/`, {
      // Algunas muestras contienen estructuras de resultados extensas. Evitamos
      // que el cliente cierre la conexión mientras Django termina de responder.
      timeout: 60000,
    });
    return data;
  },

  async saveInterpretationSample(sampleId, payload) {
    const { data } = await apiClient.patch(`/lubrication/interpretation/samples/${sampleId}/`, payload);
    return data;
  },

  async getTrends(sampleId, pruebas = []) {
    const params = new URLSearchParams();
    pruebas.forEach((item) => params.append('pruebas', item));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const { data } = await apiClient.get(`/lubrication/interpretation/samples/${sampleId}/trends/${suffix}`, {
      timeout: 60000,
    });
    return data;
  },
};
