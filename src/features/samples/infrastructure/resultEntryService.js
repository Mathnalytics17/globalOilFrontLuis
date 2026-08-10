import apiClient from '@infrastructure/api/apiClient';

const BASE_URL = '/lubrication/result-entry/';

const normalizePaginated = (data) => {
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
  return { count: Number(data?.count || 0), next: data?.next || null, previous: data?.previous || null, results: Array.isArray(data?.results) ? data.results : [] };
};
const normalizeList = (data) => normalizePaginated(data).results;

export const resultEntryService = {
  async listBatches(params = {}) {
    const { data } = await apiClient.get(`${BASE_URL}batches/`, { params });
    return normalizeList(data);
  },

  async pageBatches(params = {}) {
    const { data } = await apiClient.get(`${BASE_URL}batches/`, { params });
    return normalizePaginated(data);
  },

  async getBatch(loteId) {
    const { data } = await apiClient.get(`${BASE_URL}batches/${loteId}/`);
    return data;
  },

  async confirmBatchResults(loteId) {
    const { data } = await apiClient.post(`${BASE_URL}batches/${loteId}/confirm-all/`, {}, {
      timeout: 120000,
    });
    return data;
  },

  async getForm(pruebaMuestraId) {
    const { data } = await apiClient.get(`${BASE_URL}sample-tests/${pruebaMuestraId}/form/`);
    return data;
  },

  async saveDraft(pruebaMuestraId, payload) {
    const { data } = await apiClient.post(`${BASE_URL}sample-tests/${pruebaMuestraId}/save-draft/`, payload);
    return data;
  },

  async confirm(pruebaMuestraId, payload) {
    const { data } = await apiClient.post(`${BASE_URL}sample-tests/${pruebaMuestraId}/confirm/`, payload);
    return data;
  },

  async downloadTemplate(loteId, mode = 'consolidado') {
    return apiClient.get(`${BASE_URL}excel/template/`, {
      params: { lote: loteId, modo: mode },
      responseType: 'blob',
    });
  },

  async downloadExport(loteId, mode = 'consolidado', sampleId = null) {
    return apiClient.get(`${BASE_URL}excel/export/`, {
      params: {
        lote: loteId,
        modo: mode,
        ...(sampleId ? { muestra: sampleId } : {}),
      },
      responseType: 'blob',
    });
  },

  async previewExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`${BASE_URL}excel/preview/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },

  async importExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`${BASE_URL}excel/import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },
};
