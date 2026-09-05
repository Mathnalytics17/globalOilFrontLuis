import apiClient from '@infrastructure/api/apiClient';

const asArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.catalogs)) return payload.catalogs;
  return [];
};

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeCatalog = (entry) => {
  const isSampleField = Boolean(entry?.catalogo_info || entry?.catalogo?.items);
  const catalog = isSampleField ? (entry.catalogo_info || entry.catalogo || {}) : entry;

  const fieldType = normalizeText(entry?.tipo_muestra || entry?.tipoMuestra || 'ambos') || 'ambos';
  const catalogType = normalizeText(catalog?.tipo_muestra || catalog?.tipoMuestra || 'ambos') || 'ambos';
  const effectiveType = fieldType === 'ambos'
    ? catalogType
    : catalogType === 'ambos' || catalogType === fieldType
      ? fieldType
      : 'incompatible';

  return {
    ...catalog,
    sample_field_id: isSampleField ? entry.id : entry?.sample_field_id,
    sample_field: isSampleField ? entry : entry?.sample_field,
    nombre: isSampleField ? (entry.nombre_visible || catalog.nombre) : catalog.nombre,
    codigo: isSampleField ? (entry.codigo || catalog.codigo) : catalog.codigo,
    tipo_muestra: effectiveType,
    campo_tipo_muestra: fieldType,
    catalogo_tipo_muestra: catalogType,
    activo: entry?.activo !== false && catalog?.activo !== false,
    es_requerido_en_muestra: isSampleField ? Boolean(entry.obligatorio) : Boolean(catalog?.es_requerido_en_muestra),
    permite_desconocido: isSampleField ? entry.permite_desconocido !== false : catalog?.permite_desconocido !== false,
    orden: Number(entry?.orden ?? catalog?.orden ?? 0),
    ayuda: entry?.ayuda || catalog?.descripcion || '',
    items: asArray(catalog?.items).map((item) => ({
      ...item,
      activo: item?.activo !== false,
    })),
  };
};

export const sampleCatalogsService = {
  async getBatchCreationOptions() {
    const [companiesRes, machinesRes] = await Promise.allSettled([
      apiClient.get('/companies/'),
      apiClient.get('/machines/'),
    ]);

    return {
      companies:
        companiesRes.status === 'fulfilled' ? asArray(companiesRes.value.data) : [],
      machines:
        machinesRes.status === 'fulfilled' ? asArray(machinesRes.value.data) : [],
      hasPartialFailure:
        companiesRes.status === 'rejected' || machinesRes.status === 'rejected',
    };
  },

  async getSampleFormCatalogs(tipoMuestra) {
    const { data } = await apiClient.get('/technical-config/catalogs/sample-form/', {
      params: { tipo_muestra: tipoMuestra },
    });

    return asArray(data).map(normalizeCatalog);
  },

  async getAllSampleFormCatalogs() {
    const [aceiteRes, grasaRes] = await Promise.allSettled([
      this.getSampleFormCatalogs('aceite'),
      this.getSampleFormCatalogs('grasa'),
    ]);

    const catalogs = [
      ...(aceiteRes.status === 'fulfilled' ? aceiteRes.value : []),
      ...(grasaRes.status === 'fulfilled' ? grasaRes.value : []),
    ];

    const byId = new Map();
    catalogs.forEach((catalog) => {
      if (catalog?.id) byId.set(String(catalog.sample_field_id || catalog.id), catalog);
    });

    return Array.from(byId.values()).sort((a, b) => {
      const orderA = Number(a?.orden ?? 0);
      const orderB = Number(b?.orden ?? 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a?.nombre || '').localeCompare(String(b?.nombre || ''));
    });
  },
};

export default sampleCatalogsService;
