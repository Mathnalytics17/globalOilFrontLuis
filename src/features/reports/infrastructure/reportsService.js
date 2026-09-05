import apiClient from '@infrastructure/api/apiClient';
import { normalizePaginated } from '../../../utils/pagination';

const BASE_URL = '/lubrication/reports/';

export const reportsService = {
  async list(params = {}) {
    const { data } = await apiClient.get(BASE_URL, { params });
    return normalizePaginated(data).results;
  },

  async page(params = {}) {
    const { data } = await apiClient.get(BASE_URL, { params });
    return normalizePaginated(data);
  },

  async getById(id) {
    const { data } = await apiClient.get(`${BASE_URL}${id}/`);
    return data;
  },

  async create(payload) {
    const { data } = await apiClient.post(BASE_URL, payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await apiClient.put(`${BASE_URL}${id}/`, payload);
    return data;
  },

  async patch(id, payload) {
    const { data } = await apiClient.patch(`${BASE_URL}${id}/`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await apiClient.delete(`${BASE_URL}${id}/`);
    return data;
  },

  async print(sampleId) {
    return apiClient.get(`${BASE_URL}imprimir_reporte/`, {
      params: { pdf: sampleId },
      responseType: 'blob',
      timeout: 120000,
    });
  },

  async downloadBatch(batchId, format = 'pdf') {
    return apiClient.get(`${BASE_URL}batch-export/`, {
      params: { lote: batchId, formato: format },
      responseType: 'blob',
    });
  },

  async sendBatch(batchId, format = 'pdf', payload = {}) {
    const { data } = await apiClient.post(`${BASE_URL}batch-send/`, {
      lote: batchId,
      formato: format,
      ...payload,
    });
    return data;
  },

  async dashboard(params = {}) {
    const { data } = await apiClient.get(`${BASE_URL}dashboard/`, { params });
    return data;
  },

  async generateFromInterpretation(sampleId, payload = {}) {
    const { data } = await apiClient.post(`${BASE_URL}generate-from-interpretation/`, {
      muestra: sampleId,
      ...payload,
    });
    return data;
  },

  async generateBatchFromInterpretation(batchId, payload = {}) {
    const { data } = await apiClient.post(`${BASE_URL}generate-batch-from-interpretation/`, {
      lote: batchId,
      ...payload,
    }, { timeout: 120000 });
    return data;
  },

  async previewFromInterpretation(sampleId) {
    return apiClient.get(`${BASE_URL}preview-from-interpretation/`, {
      params: { muestra: sampleId },
      responseType: 'blob',
      timeout: 120000,
    });
  },

  async uploadSignature(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'firmas');
    const { data } = await apiClient.post(`${BASE_URL}upload-signature/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async sendEmail(id, payload = {}) {
    const { data } = await apiClient.post(`${BASE_URL}${id}/send-email/`, payload);
    return data;
  },

  async approve(id) {
    const { data } = await apiClient.post(`${BASE_URL}${id}/approve/`);
    return data;
  },

  async publishClient(id) {
    const { data } = await apiClient.post(`${BASE_URL}${id}/publish-client/`);
    return data;
  },

  async unpublishClient(id) {
    const { data } = await apiClient.post(`${BASE_URL}${id}/unpublish-client/`);
    return data;
  },

  async versions(id) {
    const { data } = await apiClient.get(`${BASE_URL}${id}/versions/`);
    return data;
  },
};
