import apiClient from '@infrastructure/api/apiClient';

export const sampleReportsService = {
  async generatePdf(sampleId) {
    const { data } = await apiClient.get('/lubrication/reports/imprimir_reporte/', {
      params: { pdf: sampleId },
      responseType: 'blob',
    });
    return data;
  },
};
