import apiClient from '@infrastructure/api/apiClient';

const unwrap = (response) => response?.data ?? response;

const toQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

const endpoint = (path) => `${String(path).replace(/^\/+|\/+$/g, '')}/`;

const resourceService = (path) => {
  const base = endpoint(path);
  return {
    list: async (params = {}) => unwrap(await apiClient.get(`${base}${toQuery(params)}`)),
    get: async (id) => unwrap(await apiClient.get(`${base}${id}/`)),
    create: async (payload) => unwrap(await apiClient.post(base, payload)),
    update: async (id, payload) => unwrap(await apiClient.put(`${base}${id}/`, payload)),
    patch: async (id, payload) => unwrap(await apiClient.patch(`${base}${id}/`, payload)),
    remove: async (id) => unwrap(await apiClient.delete(`${base}${id}/`)),
    delete: async (id) => unwrap(await apiClient.delete(`${base}${id}/`)),
    restore: async (id) => unwrap(await apiClient.post(`${base}${id}/restore/`)),
    reactivate: async (id) => unwrap(await apiClient.post(`${base}${id}/reactivate/`)),
  };
};

const catalogFields = resourceService('technical-config/catalog-fields');
const catalogItems = resourceService('technical-config/catalog-items');
const catalogItemValues = resourceService('technical-config/catalog-item-values');
const limitSourcesBase = resourceService('technical-config/limit-sources');

export const dynamicTechnicalConfigService = {
  catalogs: resourceService('technical-config/catalogs'),
  sampleFields: resourceService('technical-config/sample-fields'),
  catalogFields,
  fields: catalogFields,
  catalogItems,
  items: catalogItems,
  catalogItemValues,
  itemValues: catalogItemValues,
  comparisonScales: resourceService('technical-config/comparison-scales'),
  comparisonScaleItems: {
    ...resourceService('technical-config/comparison-scale-items'),
    reorder: async (payload) => unwrap(await apiClient.post(endpoint('technical-config/comparison-scale-items/reorder'), payload)),
  },

  limitSources: {
    ...limitSourcesBase,
    configure: async (payload) => unwrap(await apiClient.post(endpoint('technical-config/limit-sources/configure'), payload)),
    resolvePreview: async (payload) => unwrap(await apiClient.post(endpoint('technical-config/limit-sources/resolve-preview'), payload)),
    generateFields: async (id, payload = {}) => unwrap(await apiClient.post(`${endpoint('technical-config/limit-sources')}${id}/generate-fields/`, payload)),
  },
  limitFields: resourceService('technical-config/limit-fields'),
  evaluationCriteria: resourceService('technical-config/evaluation-criteria'),

  tests: resourceService('lubrication/tests'),
  testEquipment: resourceService('technical-catalogs/test-equipment'),
  equipmentMethods: resourceService('technical-catalogs/equipment-methods'),
  units: resourceService('technical-catalogs/units'),
  conditions: resourceService('technical-catalogs/conditions'),
};

// Alias planos para compatibilidad con pantallas existentes.
dynamicTechnicalConfigService.listCatalogs = dynamicTechnicalConfigService.catalogs.list;
dynamicTechnicalConfigService.createCatalog = dynamicTechnicalConfigService.catalogs.create;
dynamicTechnicalConfigService.updateCatalog = dynamicTechnicalConfigService.catalogs.update;
dynamicTechnicalConfigService.listSampleFields = dynamicTechnicalConfigService.sampleFields.list;
dynamicTechnicalConfigService.createSampleField = dynamicTechnicalConfigService.sampleFields.create;
dynamicTechnicalConfigService.updateSampleField = dynamicTechnicalConfigService.sampleFields.update;
dynamicTechnicalConfigService.listCatalogItems = dynamicTechnicalConfigService.items.list;
dynamicTechnicalConfigService.createCatalogItem = dynamicTechnicalConfigService.items.create;
dynamicTechnicalConfigService.updateCatalogItem = dynamicTechnicalConfigService.items.update;
dynamicTechnicalConfigService.listLimitSources = dynamicTechnicalConfigService.limitSources.list;
dynamicTechnicalConfigService.createLimitSource = dynamicTechnicalConfigService.limitSources.create;
dynamicTechnicalConfigService.updateLimitSource = dynamicTechnicalConfigService.limitSources.update;
dynamicTechnicalConfigService.listLimitFields = dynamicTechnicalConfigService.limitFields.list;
dynamicTechnicalConfigService.createLimitField = dynamicTechnicalConfigService.limitFields.create;
dynamicTechnicalConfigService.updateLimitField = dynamicTechnicalConfigService.limitFields.update;
dynamicTechnicalConfigService.listEvaluationCriteria = dynamicTechnicalConfigService.evaluationCriteria.list;
dynamicTechnicalConfigService.createEvaluationCriterion = dynamicTechnicalConfigService.evaluationCriteria.create;
dynamicTechnicalConfigService.updateEvaluationCriterion = dynamicTechnicalConfigService.evaluationCriteria.update;
dynamicTechnicalConfigService.listComparisonScales = dynamicTechnicalConfigService.comparisonScales.list;
dynamicTechnicalConfigService.createComparisonScale = dynamicTechnicalConfigService.comparisonScales.create;
dynamicTechnicalConfigService.updateComparisonScale = dynamicTechnicalConfigService.comparisonScales.update;
dynamicTechnicalConfigService.listComparisonScaleItems = dynamicTechnicalConfigService.comparisonScaleItems.list;
dynamicTechnicalConfigService.createComparisonScaleItem = dynamicTechnicalConfigService.comparisonScaleItems.create;
dynamicTechnicalConfigService.updateComparisonScaleItem = dynamicTechnicalConfigService.comparisonScaleItems.update;
dynamicTechnicalConfigService.reorderComparisonScaleItems = dynamicTechnicalConfigService.comparisonScaleItems.reorder;
dynamicTechnicalConfigService.listTests = dynamicTechnicalConfigService.tests.list;
dynamicTechnicalConfigService.listTestEquipment = dynamicTechnicalConfigService.testEquipment.list;
dynamicTechnicalConfigService.createTestEquipment = dynamicTechnicalConfigService.testEquipment.create;
dynamicTechnicalConfigService.updateTestEquipment = dynamicTechnicalConfigService.testEquipment.update;
dynamicTechnicalConfigService.listEquipmentMethods = dynamicTechnicalConfigService.equipmentMethods.list;
dynamicTechnicalConfigService.createEquipmentMethod = dynamicTechnicalConfigService.equipmentMethods.create;
dynamicTechnicalConfigService.updateEquipmentMethod = dynamicTechnicalConfigService.equipmentMethods.update;

export default dynamicTechnicalConfigService;
