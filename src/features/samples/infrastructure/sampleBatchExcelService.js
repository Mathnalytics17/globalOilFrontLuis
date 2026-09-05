import api from '@infrastructure/api/apiClient';

const TEMPLATE_URL = "/lubrication/sample-batches/excel/template/";
const PREVIEW_URL = "/lubrication/sample-batches/excel/preview/";

const getFilenameFromDisposition = (contentDisposition) => {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  return decodeURIComponent(match?.[1] || match?.[2] || "");
};

export const sampleBatchExcelService = {
  async downloadTemplate(params = {}) {
    const response = await api.get(TEMPLATE_URL, {
      params,
      responseType: "blob",
    });

    const filename =
      getFilenameFromDisposition(response.headers?.["content-disposition"]) ||
      "MUESTRAS_LOTE_sample-batch-v1.xlsx";

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);

    return filename;
  },

  async preview(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(PREVIEW_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });

    return response.data;
  },
};
