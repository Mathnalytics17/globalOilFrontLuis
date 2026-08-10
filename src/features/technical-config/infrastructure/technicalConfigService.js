import dynamicTechnicalConfigService from './dynamicTechnicalConfigService';
import { normalizePaginated } from '../../../utils/pagination';

const unwrapList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return value || [];
};

const callList = async (resource, params = {}) => unwrapList(await resource.list(params));
const callPage = async (resource, params = {}) => normalizePaginated(await resource.list(params));

export const listCatalogs = (params = {}) => callList(dynamicTechnicalConfigService.catalogs, params);
export const pageCatalogs = (params = {}) => callPage(dynamicTechnicalConfigService.catalogs, params);
export const getCatalog = (id) => dynamicTechnicalConfigService.catalogs.get(id);
export const createCatalog = (payload) => dynamicTechnicalConfigService.catalogs.create(payload);
export const updateCatalog = (id, payload) => dynamicTechnicalConfigService.catalogs.update(id, payload);
export const patchCatalog = (id, payload) => dynamicTechnicalConfigService.catalogs.patch(id, payload);
export const deleteCatalog = (id) => dynamicTechnicalConfigService.catalogs.remove(id);
export const restoreCatalog = (id) => dynamicTechnicalConfigService.catalogs.restore(id);

export const listSampleFields = (params = {}) => callList(dynamicTechnicalConfigService.sampleFields, params);
export const pageSampleFields = (params = {}) => callPage(dynamicTechnicalConfigService.sampleFields, params);
export const createSampleField = (payload) => dynamicTechnicalConfigService.sampleFields.create(payload);
export const updateSampleField = (id, payload) => dynamicTechnicalConfigService.sampleFields.update(id, payload);
export const patchSampleField = (id, payload) => dynamicTechnicalConfigService.sampleFields.patch(id, payload);
export const deleteSampleField = (id) => dynamicTechnicalConfigService.sampleFields.remove(id);
export const restoreSampleField = (id) => dynamicTechnicalConfigService.sampleFields.restore(id);

export const listCatalogItems = (params = {}) => callList(dynamicTechnicalConfigService.items, params);
export const pageCatalogItems = (params = {}) => callPage(dynamicTechnicalConfigService.items, params);
export const listItems = listCatalogItems;
export const getCatalogItem = (id) => dynamicTechnicalConfigService.items.get(id);
export const createCatalogItem = (payload) => dynamicTechnicalConfigService.items.create(payload);
export const createItem = createCatalogItem;
export const updateCatalogItem = (id, payload) => dynamicTechnicalConfigService.items.update(id, payload);
export const patchCatalogItem = (id, payload) => dynamicTechnicalConfigService.items.patch(id, payload);
export const deleteCatalogItem = (id) => dynamicTechnicalConfigService.items.remove(id);
export const restoreCatalogItem = (id) => dynamicTechnicalConfigService.items.restore(id);

export const listTests = (params = {}) => callList(dynamicTechnicalConfigService.tests, params);
export const pageTests = (params = {}) => callPage(dynamicTechnicalConfigService.tests, params);
export const getTest = (id) => dynamicTechnicalConfigService.tests.get(id);

export const listLimitSources = (params = {}) => callList(dynamicTechnicalConfigService.limitSources, params);
export const createLimitSource = (payload) => dynamicTechnicalConfigService.limitSources.create(payload);
export const updateLimitSource = (id, payload) => dynamicTechnicalConfigService.limitSources.update(id, payload);
export const patchLimitSource = (id, payload) => dynamicTechnicalConfigService.limitSources.patch(id, payload);
export const deleteLimitSource = (id) => dynamicTechnicalConfigService.limitSources.remove(id);
export const configureLimitSource = (payload) => dynamicTechnicalConfigService.limitSources.configure(payload);

export const listLimitFields = (params = {}) => callList(dynamicTechnicalConfigService.limitFields, params);
export const pageLimitFields = (params = {}) => callPage(dynamicTechnicalConfigService.limitFields, params);
export const createLimitField = (payload) => dynamicTechnicalConfigService.limitFields.create(payload);
export const updateLimitField = (id, payload) => dynamicTechnicalConfigService.limitFields.update(id, payload);
export const patchLimitField = (id, payload) => dynamicTechnicalConfigService.limitFields.patch(id, payload);
export const deleteLimitField = (id) => dynamicTechnicalConfigService.limitFields.remove(id);

export const listEvaluationCriteria = (params = {}) => callList(dynamicTechnicalConfigService.evaluationCriteria, params);
export const pageEvaluationCriteria = (params = {}) => callPage(dynamicTechnicalConfigService.evaluationCriteria, params);
export const createEvaluationCriterion = (payload) => dynamicTechnicalConfigService.evaluationCriteria.create(payload);
export const updateEvaluationCriterion = (id, payload) => dynamicTechnicalConfigService.evaluationCriteria.update(id, payload);
export const patchEvaluationCriterion = (id, payload) => dynamicTechnicalConfigService.evaluationCriteria.patch(id, payload);
export const deleteEvaluationCriterion = (id) => dynamicTechnicalConfigService.evaluationCriteria.remove(id);

export const listComparisonScales = (params = {}) => callList(dynamicTechnicalConfigService.comparisonScales, params);
export const getComparisonScale = (id) => dynamicTechnicalConfigService.comparisonScales.get(id);
export const pageComparisonScales = (params = {}) => callPage(dynamicTechnicalConfigService.comparisonScales, params);
export const createComparisonScale = (payload) => dynamicTechnicalConfigService.comparisonScales.create(payload);
export const updateComparisonScale = (id, payload) => dynamicTechnicalConfigService.comparisonScales.update(id, payload);
export const patchComparisonScale = (id, payload) => dynamicTechnicalConfigService.comparisonScales.patch(id, payload);
export const deleteComparisonScale = (id) => dynamicTechnicalConfigService.comparisonScales.remove(id);
export const restoreComparisonScale = (id) => dynamicTechnicalConfigService.comparisonScales.restore(id);

export const listComparisonScaleItems = (params = {}) => callList(dynamicTechnicalConfigService.comparisonScaleItems, params);
export const pageComparisonScaleItems = (params = {}) => callPage(dynamicTechnicalConfigService.comparisonScaleItems, params);
export const createComparisonScaleItem = (payload) => dynamicTechnicalConfigService.comparisonScaleItems.create(payload);
export const updateComparisonScaleItem = (id, payload) => dynamicTechnicalConfigService.comparisonScaleItems.update(id, payload);
export const patchComparisonScaleItem = (id, payload) => dynamicTechnicalConfigService.comparisonScaleItems.patch(id, payload);
export const deleteComparisonScaleItem = (id) => dynamicTechnicalConfigService.comparisonScaleItems.remove(id);
export const restoreComparisonScaleItem = (id) => dynamicTechnicalConfigService.comparisonScaleItems.restore(id);
export const reorderComparisonScaleItems = (payload) => dynamicTechnicalConfigService.comparisonScaleItems.reorder(payload);

export const listEquipment = (params = {}) => callList(dynamicTechnicalConfigService.testEquipment, params);
export const createEquipment = (payload) => dynamicTechnicalConfigService.testEquipment.create(payload);
export const updateEquipment = (id, payload) => dynamicTechnicalConfigService.testEquipment.update(id, payload);
export const patchEquipment = (id, payload) => dynamicTechnicalConfigService.testEquipment.patch(id, payload);
export const listTestEquipment = listEquipment;
export const createTestEquipment = createEquipment;
export const updateTestEquipment = updateEquipment;

export const listMethods = (params = {}) => callList(dynamicTechnicalConfigService.equipmentMethods, params);
export const createMethod = (payload) => dynamicTechnicalConfigService.equipmentMethods.create(payload);
export const updateMethod = (id, payload) => dynamicTechnicalConfigService.equipmentMethods.update(id, payload);
export const patchMethod = (id, payload) => dynamicTechnicalConfigService.equipmentMethods.patch(id, payload);
export const listEquipmentMethods = listMethods;
export const createEquipmentMethod = createMethod;
export const updateEquipmentMethod = updateMethod;

export const listUnits = (params = {}) => callList(dynamicTechnicalConfigService.units, params);
export const createUnit = (payload) => dynamicTechnicalConfigService.units.create(payload);
export const updateUnit = (id, payload) => dynamicTechnicalConfigService.units.update(id, payload);
export const patchUnit = (id, payload) => dynamicTechnicalConfigService.units.patch(id, payload);

export const listConditions = (params = {}) => callList(dynamicTechnicalConfigService.conditions, params);
export const createCondition = (payload) => dynamicTechnicalConfigService.conditions.create(payload);
export const updateCondition = (id, payload) => dynamicTechnicalConfigService.conditions.update(id, payload);
export const patchCondition = (id, payload) => dynamicTechnicalConfigService.conditions.patch(id, payload);

export const getDashboard = async () => {
  const [catalogs, items, fields, limitSources, tests] = await Promise.all([
    listCatalogs(),
    listCatalogItems(),
    listLimitFields(),
    listLimitSources(),
    listTests(),
  ]);
  return { catalogs, items, fields, limitSources, tests };
};

export const technicalConfigService = {
  tests: dynamicTechnicalConfigService.tests,
  getDashboard,
  listCatalogs,
  pageCatalogs,
  getCatalog,
  createCatalog,
  updateCatalog,
  patchCatalog,
  deleteCatalog,
  restoreCatalog,
  listSampleFields,
  pageSampleFields,
  createSampleField,
  updateSampleField,
  patchSampleField,
  deleteSampleField,
  restoreSampleField,
  listCatalogItems,
  pageCatalogItems,
  listItems,
  getCatalogItem,
  createCatalogItem,
  createItem,
  updateCatalogItem,
  patchCatalogItem,
  deleteCatalogItem,
  restoreCatalogItem,
  listTests,
  pageTests,
  getTest,
  listLimitSources,
  createLimitSource,
  updateLimitSource,
  patchLimitSource,
  deleteLimitSource,
  configureLimitSource,
  listLimitFields,
  pageLimitFields,
  createLimitField,
  updateLimitField,
  patchLimitField,
  deleteLimitField,
  listEvaluationCriteria,
  pageEvaluationCriteria,
  createEvaluationCriterion,
  updateEvaluationCriterion,
  patchEvaluationCriterion,
  deleteEvaluationCriterion,
  listComparisonScales,
  getComparisonScale,
  pageComparisonScales,
  createComparisonScale,
  updateComparisonScale,
  patchComparisonScale,
  deleteComparisonScale,
  restoreComparisonScale,
  listComparisonScaleItems,
  pageComparisonScaleItems,
  createComparisonScaleItem,
  updateComparisonScaleItem,
  patchComparisonScaleItem,
  deleteComparisonScaleItem,
  restoreComparisonScaleItem,
  reorderComparisonScaleItems,
  listEquipment,
  listTestEquipment,
  createEquipment,
  createTestEquipment,
  updateEquipment,
  updateTestEquipment,
  patchEquipment,
  listMethods,
  listEquipmentMethods,
  createMethod,
  createEquipmentMethod,
  updateMethod,
  updateEquipmentMethod,
  patchMethod,
  listUnits,
  createUnit,
  updateUnit,
  patchUnit,
  listConditions,
  createCondition,
  updateCondition,
  patchCondition,
};

export default technicalConfigService;
