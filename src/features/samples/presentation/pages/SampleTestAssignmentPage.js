import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Layers,
  Info,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { sampleBatchesService } from '@features/samples/infrastructure/sampleBatchesService';
import { sampleTestsService } from '@features/samples/infrastructure/sampleTestsService';
import { testsService } from '@features/technical-config/infrastructure/testsService';
import { sampleManagementTypesService } from '@features/samples/infrastructure/sampleManagementTypesService';
import { predefinedTestBatchesService } from '@features/technical-config/infrastructure/predefinedTestBatchesService';
import technicalConfigService from '@features/technical-config/infrastructure/technicalConfigService';
import { presentLimitBands } from '@utils/limitPresentation';

const createRow = () => ({
  key: `row_${Math.random().toString(36).slice(2)}`,
  prueba: '',
  condicion: '',
  condicion_texto: '',
  unidad: '',
  criterio_limite_catalogo: '',
  criterio_limite_item: '',
  criterio_limite_escala: '',
  criterio_limite_escala_item: '',
  criterio_limite_valor: '',
  criterio_evaluacion: '',
  configuracion_resultados: {},
});

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO');
};

const getBatchClient = (batch) => batch?.cliente_nombre || batch?.cliente_ocasional_nombre || '-';
const getBatchManagement = (batch) => batch?.tipo_gestion_info?.nombre || batch?.tipo_gestion_nombre || batch?.tipo_gestion || '-';
const getLimitSourceType = (source) => source?.tipo_limite || (source?.catalogo_fuente ? 'catalogo' : 'global');

const getEntityId = (value) => {
  if (value && typeof value === 'object') return value.id ?? value.pk ?? '';
  return value ?? '';
};

const getTestResults = (test) => normalizeArray(test?.resultados || test?.results)
  .filter((result) => result?.activo !== false);
const entityKey = (value) => String(value?.id ?? value ?? '');

const getTestResultUnits = (test) => [...new Set(
  getTestResults(test)
    .map((result) => result?.unidad_catalogo_info?.simbolo || result?.unidad_medida || '')
    .filter(Boolean)
)];

const buildResultConfiguration = (test) => Object.fromEntries(
  getTestResults(test).map((result, index) => {
    const resultId = String(result.id || result.pk || `resultado_${index + 1}`);
    return [resultId, {
      resultado_id: result.id || result.pk || null,
      resultado: result.nombre || result.name || `Resultado ${index + 1}`,
      unidad: result.unidad_info?.simbolo || result.unidad_catalogo_info?.simbolo || result.unidad_medida || '',
    }];
  }),
);

const mergeResultConfiguration = (test, saved = {}) => {
  const base = buildResultConfiguration(test);
  const merged = { ...base };

  Object.entries(saved || {}).forEach(([key, value]) => {
    const resultId = value?.resultado_id ? String(value.resultado_id) : String(key);
    const targetKey = Object.keys(base).find((baseKey) => (
      baseKey === resultId || String(base[baseKey]?.resultado_id || '') === resultId
    )) || key;
    merged[targetKey] = {
      ...(base[targetKey] || {}),
      ...(value || {}),
    };
  });

  return merged;
};

const getSourceTestId = (source) => getEntityId(source?.prueba || source?.prueba_id || source?.prueba_info);
const getSourceCatalogId = (source) => getEntityId(source?.catalogo_fuente || source?.catalogo_fuente_id || source?.catalogo_fuente_info || source?.catalogo_info || source?.catalogo_resuelto);
const getSourceSampleFieldId = (source) => getEntityId(source?.campo_tecnico_muestra || source?.campo_tecnico_muestra_id || source?.campo_tecnico_info);
const getFieldSourceId = (field) => getEntityId(field?.fuente_limite || field?.fuente_limite_id || field?.fuente_limite_info);
const getItemCatalogId = (item) => getEntityId(item?.catalogo || item?.catalogo_id || item?.catalogo_info);

const getScaleIdFromField = (field) => getEntityId(
  field?.escala_comparacion
  || field?.escala_comparacion_id
  || field?.escala_comparacion_info
  || field?.escala
);

const getScaleIdFromItem = (item) => getEntityId(item?.escala || item?.escala_id || item?.escala_info);

const labelScaleItem = (item) => item?.etiqueta || item?.nombre || item?.valor || item?.label || '-';

const sortScaleItems = (items) => [...items].sort((a, b) => {
  const orderA = Number(a?.orden ?? 999999);
  const orderB = Number(b?.orden ?? 999999);
  if (orderA !== orderB) return orderA - orderB;
  return Number(a?.id || 0) - Number(b?.id || 0);
});

const isBlank = (value) => value === null || value === undefined || value === '';

const normalizeScaleToken = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/(?<=\d)[,.](?=\d)/g, '_')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const humanizeOption = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const normalized = text.toLowerCase();
  if (['si', 'sí', 'true', '1'].includes(normalized)) return 'Sí';
  if (['no', 'false', '0'].includes(normalized)) return 'No';
  return text.replace(/_/g, ' ');
};

const normalizeText = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const getBooleanLabels = (field = {}) => {
  const trueLabel = field.etiqueta_verdadero
    || field.true_label
    || field.trueLabel
    || field.componente_info?.etiqueta_verdadero
    || field.component_info?.etiqueta_verdadero
    || field.componente?.etiqueta_verdadero
    || 'Sí';
  const falseLabel = field.etiqueta_falso
    || field.false_label
    || field.falseLabel
    || field.componente_info?.etiqueta_falso
    || field.component_info?.etiqueta_falso
    || field.componente?.etiqueta_falso
    || 'No';
  return { trueLabel, falseLabel };
};

const normalizeBooleanCriterionValue = (field, value) => {
  if (field?.tipo_comparacion !== 'booleano' || isBlank(value)) return value;
  const { trueLabel, falseLabel } = getBooleanLabels(field);
  const text = normalizeText(value);
  const trueTexts = ['true', '1', 'si', 'sí', 'yes', 'y', 'presente', 'hay', normalizeText(trueLabel)].filter(Boolean);
  const falseTexts = ['false', '0', 'no', 'not', 'ausente', normalizeText(falseLabel)].filter(Boolean);
  if (trueTexts.includes(text)) return 'true';
  if (falseTexts.includes(text)) return 'false';
  return value;
};

const formatCriterionValue = (field, value) => {
  if (field?.tipo_comparacion !== 'booleano') return value;
  const normalized = normalizeBooleanCriterionValue(field, value);
  const { trueLabel, falseLabel } = getBooleanLabels(field);
  if (normalized === 'true') return trueLabel;
  if (normalized === 'false') return falseLabel;
  return value;
};

const getEvaluationOptions = (field) => {
  if (!field) return [];
  const unique = (options) => {
    const seen = new Set();
    return options.filter((option) => {
      const key = String(option.value).trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  if (field.tipo_comparacion === 'booleano') {
    const { trueLabel, falseLabel } = getBooleanLabels(field);
    return [
      { value: 'true', label: trueLabel },
      { value: 'false', label: falseLabel },
    ];
  }

  const map = field.evaluacion_opciones || field.evaluation_options || null;
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    return unique(Object.entries(map).map(([value, config]) => ({
      value,
      label: (config && typeof config === 'object' && config.label) ? config.label : humanizeOption(value),
    })));
  }

  const permitted = field.opciones_permitidas || field.opciones || field.allowed_values || null;
  if (Array.isArray(permitted)) {
    return unique(permitted.map((option) => {
      if (option && typeof option === 'object') {
        return { value: String(option.value ?? option.id ?? option.codigo ?? option.label ?? ''), label: option.label ?? option.nombre ?? option.etiqueta ?? humanizeOption(option.value) };
      }
      return { value: String(option), label: humanizeOption(option) };
    }));
  }
  return [];
};

const isCriterionObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const parseCriterionValue = (value) => {
  let parsed = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof parsed !== 'string' || !parsed.trim().startsWith('{')) break;
    try {
      parsed = JSON.parse(parsed);
    } catch (_error) {
      break;
    }
  }
  return parsed;
};

const cloneCriterionValue = (value) => (
  isCriterionObject(value) ? JSON.parse(JSON.stringify(value)) : value
);

const firstDefinedLimitValue = (...values) => values.find((value) => !isBlank(value)) ?? '';

const normalizeLimitOperator = (field) => {
  const operator = String(field?.operador || '').toLowerCase();
  if (['min', 'warn_min', 'scale_min'].includes(operator)) return 'min';
  if (['max', 'warn_max', 'scale_max'].includes(operator)) return 'max';
  if (['between', 'range', 'rango'].includes(operator)) return 'between';
  if (operator === 'neq') return 'neq';
  return 'eq';
};

const normalizeAssignmentLimitRule = (field, value) => {
  const operator = normalizeLimitOperator(field);
  const parsed = parseCriterionValue(value);
  const raw = isCriterionObject(parsed)
    ? parsed
    : { limite: parsed, valor_esperado: parsed };
  const yellow = raw.usar_amarillo ?? (
    !isBlank(raw.min_critico) || !isBlank(raw.max_critico)
  );

  if (['eq', 'neq'].includes(operator)) {
    return {
      valor_esperado: firstDefinedLimitValue(raw.valor_esperado, raw.limite),
      usar_amarillo: false,
    };
  }
  if (operator === 'min') {
    return {
      min_critico: firstDefinedLimitValue(raw.min_critico),
      min_aceptable: firstDefinedLimitValue(raw.min_aceptable, raw.min, raw.limite, raw.valor_esperado),
      usar_amarillo: !!yellow,
    };
  }
  if (operator === 'between') {
    return {
      min_critico: firstDefinedLimitValue(raw.min_critico),
      min_aceptable: firstDefinedLimitValue(raw.min_aceptable, raw.min),
      max_aceptable: firstDefinedLimitValue(raw.max_aceptable, raw.max),
      max_critico: firstDefinedLimitValue(raw.max_critico),
      usar_amarillo: !!yellow,
    };
  }
  return {
    max_aceptable: firstDefinedLimitValue(raw.max_aceptable, raw.max, raw.limite, raw.valor_esperado),
    max_critico: firstDefinedLimitValue(raw.max_critico),
    usar_amarillo: !!yellow,
  };
};

const requiredAssignmentBoundaryKeys = (field, rule) => {
  const operator = normalizeLimitOperator(field);
  if (operator === 'min') return rule.usar_amarillo ? ['min_critico', 'min_aceptable'] : ['min_aceptable'];
  if (operator === 'max') return rule.usar_amarillo ? ['max_aceptable', 'max_critico'] : ['max_aceptable'];
  if (operator === 'between') {
    return rule.usar_amarillo
      ? ['min_critico', 'min_aceptable', 'max_aceptable', 'max_critico']
      : ['min_aceptable', 'max_aceptable'];
  }
  return ['valor_esperado'];
};

const getRulePrimaryValue = (field, value) => {
  const rule = normalizeAssignmentLimitRule(field, value);
  const operator = normalizeLimitOperator(field);
  if (operator === 'min') return rule.min_aceptable;
  if (operator === 'max') return rule.max_aceptable;
  if (operator === 'between') return `${rule.min_aceptable || ''} - ${rule.max_aceptable || ''}`;
  return rule.valor_esperado;
};

const isAssignmentLimitRuleComplete = (field, value) => {
  const rule = normalizeAssignmentLimitRule(field, value);
  return requiredAssignmentBoundaryKeys(field, rule).every((key) => !isBlank(rule[key]));
};

const isEmptyCriterionValue = (value) => {
  if (isBlank(value)) return true;
  if (!isCriterionObject(value)) return false;
  return !Object.values(value).some((item) => !isBlank(item));
};

const getCriterionFieldValue = (row, field) => {
  const value = row?.criterio_limite_valor;
  if (!isCriterionObject(value)) return isBlank(value) ? '' : value;
  if (!field) return '';
  return value[String(field.id)] ?? value[field.codigo] ?? '';
};

const isEmptyCriterionForFields = (value, fields = []) => {
  if (!fields.length) return isEmptyCriterionValue(value);
  if (!isCriterionObject(value)) {
    return fields.length !== 1 || isBlank(value);
  }
  return fields.some((field) => isBlank(value[String(field.id)] ?? value[field.codigo]));
};

const getCriterionFieldValueForDisplay = (row, field, fields = []) => {
  const value = row?.criterio_limite_valor;
  let raw = '';
  if (!isCriterionObject(value) && fields.length === 1) raw = isBlank(value) ? '' : value;
  else if (isCriterionObject(value)) raw = value[String(field.id)] ?? value[field.codigo] ?? '';
  return normalizeBooleanCriterionValue(field, getRulePrimaryValue(field, raw));
};

const setCriterionFieldValue = (currentValue, field, nextValue) => {
  const base = isCriterionObject(currentValue) ? { ...currentValue } : {};
  const key = String(field.id);
  if (isBlank(nextValue)) {
    delete base[key];
    delete base[field.codigo];
  } else {
    base[key] = nextValue;
  }
  return Object.keys(base).length ? base : '';
};

const mergeCriterionValues = (baseValue, overrideValue) => {
  if (isEmptyCriterionValue(baseValue)) return overrideValue || '';
  if (isEmptyCriterionValue(overrideValue)) return baseValue || '';

  if (isCriterionObject(baseValue) || isCriterionObject(overrideValue)) {
    const base = isCriterionObject(baseValue) ? baseValue : {};
    const override = isCriterionObject(overrideValue) ? overrideValue : {};
    return Object.keys({ ...base, ...override }).reduce((merged, key) => {
      merged[key] = isCriterionObject(base[key]) && isCriterionObject(override[key])
        ? { ...base[key], ...override[key] }
        : (override[key] ?? base[key]);
      return merged;
    }, {});
  }

  return overrideValue;
};

const mergeCriterionFieldValue = (currentValue, field, nextValue) => {
  if (isBlank(nextValue)) return currentValue;
  return setCriterionFieldValue(currentValue, field, nextValue);
};

const getManualLimitFields = (sources, fields) => (
  sources.flatMap((source) => (
    fields.filter((field) => (
      String(getFieldSourceId(field)) === String(source.id) &&
      field.operador !== 'informativo'
    ))
  ))
);

const getLimitFieldPlaceholder = (field) => {
  if (field?.operador === 'min' || field?.operador === 'warn_min' || field?.operador === 'scale_min') return 'Mínimo';
  if (field?.operador === 'max' || field?.operador === 'warn_max' || field?.operador === 'scale_max') return 'Máximo';
  if (field?.operador === 'eq') return 'Valor esperado';
  return 'Valor límite';
};

const getLimitFieldShortLabel = (field) => {
  const raw = field?.nombre || field?.codigo || getLimitFieldPlaceholder(field);
  return String(raw)
    .replace(/Resultado principal/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || getLimitFieldPlaceholder(field);
};

const getLimitFieldPartLabel = (field) => {
  const op = String(field?.operador || '').toLowerCase();
  if (op === 'min') return 'Mínimo';
  if (op === 'max') return 'Máximo';
  if (op === 'eq') return 'Valor esperado';
  if (op === 'neq') return 'Valor diferente a';
  if (op === 'scale_max') return 'Hasta';
  if (op === 'scale_min') return 'Desde';

  const label = getLimitFieldShortLabel(field);
  const pieces = label.split(/·|-|\s{2,}/).map((item) => item.trim()).filter(Boolean);
  return pieces[pieces.length - 1] || getLimitFieldPlaceholder(field);
};

const ASSIGNMENT_BOUNDARY_LABELS = {
  min_critico: 'Mínimo crítico',
  min_aceptable: 'Mínimo aceptable',
  max_aceptable: 'Máximo aceptable',
  max_critico: 'Máximo crítico',
  valor_esperado: 'Valor esperado',
};

const ASSIGNMENT_OPERATOR_LABELS = {
  min: 'Mínimo (>=)',
  max: 'Máximo (<=)',
  between: 'Rango',
  eq: 'Igual',
  neq: 'Diferente',
};

const formatAssignmentRuleSummary = (field, value) => {
  const rule = normalizeAssignmentLimitRule(field, value);
  const operator = normalizeLimitOperator(field);

  if (operator === 'eq') return `Igual a ${rule.valor_esperado}`;
  if (operator === 'neq') return `Diferente de ${rule.valor_esperado}`;
  if (operator === 'min') {
    return rule.usar_amarillo
      ? `Crítico < ${rule.min_critico}; alerta ${rule.min_critico} a < ${rule.min_aceptable}; aceptable >= ${rule.min_aceptable}`
      : `Aceptable >= ${rule.min_aceptable}; crítico < ${rule.min_aceptable}`;
  }
  if (operator === 'max') {
    return rule.usar_amarillo
      ? `Aceptable <= ${rule.max_aceptable}; alerta > ${rule.max_aceptable} a ${rule.max_critico}; crítico > ${rule.max_critico}`
      : `Aceptable <= ${rule.max_aceptable}; crítico > ${rule.max_aceptable}`;
  }
  return rule.usar_amarillo
    ? `Aceptable ${rule.min_aceptable} a ${rule.max_aceptable}; alerta ${rule.min_critico} a < ${rule.min_aceptable} o > ${rule.max_aceptable} a ${rule.max_critico}; crítico < ${rule.min_critico} o > ${rule.max_critico}`
    : `Aceptable ${rule.min_aceptable} a ${rule.max_aceptable}; crítico fuera del rango`;
};

const getScaleLimitPrompt = (field) => {
  const op = String(field?.operador || '').toLowerCase();
  if (op === 'min' || op === 'scale_min' || op === 'warn_min') return 'Mínimo permitido...';
  if (op === 'max' || op === 'scale_max' || op === 'warn_max') return 'Máximo permitido...';
  if (op === 'eq') return 'Valor esperado...';
  if (op === 'neq') return 'Valor no permitido...';
  return 'Seleccione valor límite...';
};

const getLimitFieldGroupLabel = (field) => {
  const label = getLimitFieldShortLabel(field);
  const opLabel = getLimitFieldPartLabel(field);
  const cleaned = label
    .replace(new RegExp(`\\b${opLabel}\\b`, 'i'), '')
    .replace(/\b(m[ií]nimo|maximo|m[aá]ximo|valor esperado|valor diferente a)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || field?.resultado_info?.nombre || field?.componente_info?.nombre || 'Resultado';
};

const getLimitFieldGroupKey = (field) => (
  field?.componente || field?.componente_id || field?.codigo?.replace(/_(min|max)$/i, '') || getLimitFieldGroupLabel(field)
);

const groupManualLimitFields = (fields = []) => {
  const map = new Map();
  fields.forEach((field) => {
    const key = String(getLimitFieldGroupKey(field));
    if (!map.has(key)) {
      map.set(key, { key, title: getLimitFieldGroupLabel(field), fields: [] });
    }
    map.get(key).fields.push(field);
  });
  return Array.from(map.values());
};

const formatTechnicalAttributes = (sample) => {
  const attrs = Array.isArray(sample?.atributos_tecnicos) ? sample.atributos_tecnicos : [];
  if (!attrs.length) return 'Sin caracteristicas tecnicas';
  return attrs.map((attr) => {
    const catalog = attr.campo_tecnico_nombre || attr.campo_tecnico_info?.nombre_visible || attr.catalogo_info?.nombre || attr.catalogo_nombre || attr.catalogo?.nombre || `Catalogo ${attr.catalogo || ''}`;
    if (attr.desconocido) return `${catalog}: desconocido`;
    const item = attr.item_info?.nombre || attr.item_nombre || attr.item?.nombre || attr.item || '-';
    return `${catalog}: ${item}`;
  }).join(' - ');
};

export default function AsignacionPruebasPage() {
  const router = useRouter();

  const [batches, setBatches] = useState([]);
  const [tests, setTests] = useState([]);
  const [types, setTypes] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [units, setUnits] = useState([]);
  const [limitSources, setLimitSources] = useState([]);
  const [limitFields, setLimitFields] = useState([]);
  const [limitItems, setLimitItems] = useState([]);
  const [comparisonScales, setComparisonScales] = useState([]);
  const [comparisonScaleItems, setComparisonScaleItems] = useState([]);
  const [evaluationCriteria, setEvaluationCriteria] = useState([]);

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [currentAssignments, setCurrentAssignments] = useState([]);
  const [rows, setRows] = useState([createRow()]);
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [usePredefined, setUsePredefined] = useState(true);
  const [batchSearch, setBatchSearch] = useState('');
  const [applyMode, setApplyMode] = useState('all');
  const [selectedSamples, setSelectedSamples] = useState([]);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [criterionModalRowKey, setCriterionModalRowKey] = useState(null);
  const [criterionModalSnapshot, setCriterionModalSnapshot] = useState(null);
  const [resultConfigRowKey, setResultConfigRowKey] = useState(null);
  const [infoRowKey, setInfoRowKey] = useState(null);
  const [assignmentSampleId, setAssignmentSampleId] = useState(null);
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({ nombre: '', simbolo: '', magnitud: '' });
  const [templateForm, setTemplateForm] = useState({
    nombre: '',
    descripcion: '',
    tipo_lote: 'personalizado',
    es_default: false,
  });

  const [loading, setLoading] = useState(true);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (router.query?.lote) setSelectedBatchId(String(router.query.lote));
  }, [router.query?.lote]);

  useEffect(() => {
    if (selectedBatchId && !loading) loadBatchContext(selectedBatchId);
  }, [selectedBatchId, loading]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        batchList,
        testsList,
        typesList,
        bundlesList,
        conditionList,
        unitList,
        limitSourceList,
        limitFieldList,
        catalogItemList,
        scaleList,
        scaleItemList,
        criteriaList,
      ] = await Promise.all([
        sampleBatchesService.list({}),
        testsService.list({ activo: true, page_size: 1000, include_structure: true }),
        sampleManagementTypesService.list({ activo: true }),
        predefinedTestBatchesService.list({}),
        technicalConfigService.listConditions({ activo: true, page_size: 1000 }),
        technicalConfigService.listUnits({ activo: true, page_size: 1000 }),
        technicalConfigService.listLimitSources({ activo: true, page_size: 1000 }),
        technicalConfigService.listLimitFields({ activo: true, page_size: 1000 }),
        technicalConfigService.listCatalogItems({ activo: true, page_size: 1000 }),
        technicalConfigService.listComparisonScales({ activo: true, page_size: 1000 }),
        technicalConfigService.listComparisonScaleItems({ activo: true, page_size: 1000 }),
        technicalConfigService.listEvaluationCriteria({ activo: true, page_size: 5000 }),
      ]);

      const normalizedBatches = normalizeArray(batchList);
      setBatches(normalizedBatches);
      setTests([...testsList].sort((left, right) => (
        String(left.acronimo || left.nombre_variable || '').localeCompare(
          String(right.acronimo || right.nombre_variable || ''),
          'es',
          { sensitivity: 'base' },
        )
      )));
      setTypes(typesList);
      setBundles(bundlesList);
      setConditions(conditionList);
      setUnits(unitList);
      setLimitSources(limitSourceList);
      setLimitFields(limitFieldList);
      setLimitItems(catalogItemList);
      setComparisonScales(scaleList);
      setComparisonScaleItems(scaleItemList);
      setEvaluationCriteria(criteriaList);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la información de asignación.');
    } finally {
      setLoading(false);
    }
  };

  const getSourcesForTest = (testId) => (
    limitSources.filter((source) => String(getSourceTestId(source)) === String(testId))
  );

  const getGlobalSourcesForTest = (testId) => (
    getSourcesForTest(testId).filter((source) => getLimitSourceType(source) === 'global')
  );

  const getRuleConfigForField = (source, field) => {
    const fields = Array.isArray(source?.configuracion_regla?.campos)
      ? source.configuracion_regla.campos
      : [];
    return fields.find((item) => (
      (item.codigo && field?.codigo && String(item.codigo) === String(field.codigo))
      || (item.componente && field?.componente && String(item.componente) === String(field.componente))
      || (item.componente && field?.componente_id && String(item.componente) === String(field.componente_id))
    )) || {};
  };

  const getFieldOrigin = (source, field) => (
    getRuleConfigForField(source, field).origen_limite
    || (getLimitSourceType(source) === 'global' ? 'asignacion' : 'catalogo')
  );

  const getLimitFieldsForSources = (sources) => (
    sources.flatMap((source) => (
      limitFields
        .filter((field) => String(getFieldSourceId(field)) === String(source.id) && field.operador !== 'informativo')
        .map((field) => ({ ...field, origen_limite: getFieldOrigin(source, field), fuente_limite_source: source }))
    ))
  );

  const getAssignmentLimitFields = (sources) => (
    getLimitFieldsForSources(sources).filter((field) => field.origen_limite === 'asignacion')
  );

  const getAdjustableLimitFields = (sources) => (
    getLimitFieldsForSources(sources).filter((field) => (
      ['asignacion', 'directo', 'escala', 'booleano'].includes(field.origen_limite)
    ))
  );

  const getCatalogLimitSources = (sources) => (
    sources.filter((source) => (
      ['catalogo', 'campo_muestra', 'seleccion_asignacion'].includes(getLimitSourceType(source))
      && getSourceCatalogId(source)
      && getLimitFieldsForSources([source]).some((field) => field.origen_limite === 'catalogo')
    ))
  );

  const getConfiguredValueForField = (field, source) => {
    const criterion = (source?.criterios || []).find((item) => item?.activo !== false) || source?.criterios?.[0] || null;
    const values = criterion?.valores_limite || criterion?.valores || {};
    return values[String(field.id)] ?? values[field.codigo] ?? field?.valor_global ?? '';
  };

  const findScaleItemForLimitValue = (scaleId, value) => {
    if (!scaleId || isBlank(value)) return null;
    const normalized = normalizeScaleToken(value);
    return sortScaleItems(comparisonScaleItems.filter((item) => String(getScaleIdFromItem(item)) === String(scaleId)))
      .find((item) => (
        String(item.id) === String(value) ||
        normalizeScaleToken(item.valor_normalizado) === normalized ||
        normalizeScaleToken(labelScaleItem(item)) === normalized
      )) || null;
  };

  const normalizeConfiguredRuleForAssignment = (field, configuredValue) => {
    const rule = normalizeAssignmentLimitRule(field, configuredValue);

    if (['escala', 'escala_ordinal'].includes(field.tipo_comparacion)) {
      const scaleId = getScaleIdFromField(field);
      return Object.fromEntries(Object.entries(rule).map(([key, value]) => {
        if (key === 'usar_amarillo' || isBlank(value)) return [key, value];
        const scaleItem = findScaleItemForLimitValue(scaleId, value);
        return [key, scaleItem?.valor_normalizado || scaleItem?.etiqueta || value];
      }));
    }

    if (['booleano', 'boolean'].includes(field.tipo_comparacion)) {
      return {
        ...rule,
        valor_esperado: normalizeBooleanCriterionValue(field, rule.valor_esperado),
      };
    }

    return rule;
  };

  const getDefaultLimitCriterionForTest = (testId) => {
    const sources = getSourcesForTest(testId);
    const adjustableFields = getAdjustableLimitFields(sources);
    if (!adjustableFields.length) return {};

    let criterio_limite_valor = '';
    let criterio_limite_escala = '';
    let criterio_limite_escala_item = '';

    sources.forEach((source) => {
      getAdjustableLimitFields([source]).forEach((field) => {
        const configuredValue = getConfiguredValueForField(field, source);
        if (isBlank(configuredValue)) return;
        const configuredRule = normalizeConfiguredRuleForAssignment(field, configuredValue);

        if (
          getLimitSourceType(source) === 'global'
          && ['escala', 'escala_ordinal'].includes(field.tipo_comparacion)
        ) {
          const scaleId = getScaleIdFromField(field);
          const scaleItem = findScaleItemForLimitValue(
            scaleId,
            getRulePrimaryValue(field, configuredRule)
          );
          if (scaleId && !criterio_limite_escala) criterio_limite_escala = String(scaleId);
          if (scaleItem && !criterio_limite_escala_item) {
            criterio_limite_escala_item = String(scaleItem.id);
          }
        }

        criterio_limite_valor = mergeCriterionFieldValue(
          criterio_limite_valor,
          field,
          configuredRule
        );
      });
    });

    return {
      criterio_limite_valor,
      criterio_limite_escala,
      criterio_limite_escala_item,
    };
  };

  const getEffectiveLimitCriterionForRow = (row) => {
    const defaultCriterion = getDefaultLimitCriterionForTest(row?.prueba);
    return {
      criterio_limite_escala: row?.criterio_limite_escala || defaultCriterion.criterio_limite_escala || '',
      criterio_limite_escala_item: row?.criterio_limite_escala_item || defaultCriterion.criterio_limite_escala_item || '',
      criterio_limite_valor: mergeCriterionValues(defaultCriterion.criterio_limite_valor, row?.criterio_limite_valor),
    };
  };

  const buildRowFromTest = (testId) => {
    const test = tests.find((item) => String(item.id) === String(testId));
    if (!test) return { ...createRow(), prueba: String(testId || '') };
    const defaultCriterion = getDefaultLimitCriterionForTest(test.id);

    return {
      key: `row_${Math.random().toString(36).slice(2)}`,
      prueba: String(test.id),
      condicion: test.condicion_catalogo ? String(test.condicion_catalogo) : '',
      condicion_texto: test.condicion || test.condicion_catalogo_info?.nombre || '',
      unidad: getTestResultUnits(test).join(', ') || test.unidad_medida || '',
      configuracion_resultados: buildResultConfiguration(test),
      criterio_limite_catalogo: '',
      criterio_limite_item: '',
      criterio_limite_escala: defaultCriterion.criterio_limite_escala || '',
      criterio_limite_escala_item: defaultCriterion.criterio_limite_escala_item || '',
      criterio_limite_valor: defaultCriterion.criterio_limite_valor || '',
      criterio_evaluacion: '',
    };
  };

  const hydrateExistingAssignments = (assignments) => {
    if (!assignments?.length) return false;

    const uniqueRows = [];
    const seen = new Set();

    assignments.forEach((item) => {
      const pruebaId = item.prueba?.id || item.prueba;
      const defaultCriterion = getDefaultLimitCriterionForTest(pruebaId);
      const signature = [
        pruebaId,
        item.condicion_catalogo || '',
        item.condicion_configurada || '',
        item.unidad_configurada || '',
        item.criterio_limite_catalogo || '',
        item.criterio_limite_item || '',
        item.criterio_limite_escala || '',
        item.criterio_limite_escala_item || '',
        item.criterio_limite_valor || '',
        item.criterio_evaluacion || '',
        JSON.stringify(item.configuracion_resultados || {}),
      ].join(' - ');

      if (seen.has(signature)) return;
      seen.add(signature);

      uniqueRows.push({
        key: `existing_${signature}`,
        prueba: String(pruebaId || ''),
        condicion: item.condicion_catalogo ? String(item.condicion_catalogo) : '',
        condicion_texto: item.condicion_configurada || item.prueba?.condicion || '',
        unidad: item.unidad_configurada || item.prueba?.unidad_medida || '',
        criterio_limite_catalogo: item.criterio_limite_catalogo ? String(item.criterio_limite_catalogo) : '',
        criterio_limite_item: item.criterio_limite_item ? String(item.criterio_limite_item) : '',
        criterio_limite_escala: item.criterio_limite_escala ? String(item.criterio_limite_escala) : defaultCriterion.criterio_limite_escala || '',
        criterio_limite_escala_item: item.criterio_limite_escala_item ? String(item.criterio_limite_escala_item) : defaultCriterion.criterio_limite_escala_item || '',
        criterio_limite_valor: item.criterio_limite_valor || defaultCriterion.criterio_limite_valor || '',
        criterio_evaluacion: item.criterio_evaluacion ? String(item.criterio_evaluacion) : '',
        configuracion_resultados: mergeResultConfiguration(
          tests.find((test) => String(test.id) === String(pruebaId)) || item.prueba,
          item.configuracion_resultados,
        ),
      });
    });

    setRows(uniqueRows.length ? uniqueRows : [createRow()]);
    return true;
  };

  const loadBatchContext = async (batchId, options = {}) => {
    if (!batchId) return;
    setLoadingBatch(true);

    try {
      const [batchDetail, assignments] = await Promise.all([
        sampleBatchesService.getById(batchId),
        sampleTestsService.listByBatch(batchId).catch(() => []),
      ]);

      setSelectedBatch(batchDetail);
      setCurrentAssignments(assignments || []);
      if (!options.preserveSelection) {
        setApplyMode('all');
        setSelectedSamples([]);
      }

      if (!options.preserveRows && hydrateExistingAssignments(assignments || [])) {
        setLoadingBatch(false);
        return;
      }

      const defaultBundle = bundles.find((bundle) => (
        bundle.es_default && String(bundle.tipo_gestion || '') === String(batchDetail.tipo_gestion || '')
      ));

      if (defaultBundle && usePredefined) {
        await applyBundle(defaultBundle.id, false);
        setSelectedBundleId(String(defaultBundle.id));
        setLoadingBatch(false);
        return;
      }

      const managementType = types.find((item) => String(item.id) === String(batchDetail.tipo_gestion || ''));
      const suggestedTests = Array.isArray(managementType?.pruebas_sugeridas_info)
        ? managementType.pruebas_sugeridas_info
        : [];

      setRows(suggestedTests.length
        ? suggestedTests.map((item) => buildRowFromTest(item.id))
        : [createRow()]);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el lote seleccionado.');
    } finally {
      setLoadingBatch(false);
    }
  };

  const filteredBatches = useMemo(() => {
    const term = batchSearch.trim().toLowerCase();
    if (!term) return batches;
    return batches.filter((batch) => [
      batch.id,
      getBatchClient(batch),
      batch.contacto_nombre,
      getBatchManagement(batch),
    ].join(' ').toLowerCase().includes(term));
  }, [batches, batchSearch]);

  const availableBundles = useMemo(() => {
    const typeId = String(selectedBatch?.tipo_gestion || '');
    return bundles.filter((bundle) => (
      !bundle.tipo_gestion ||
      String(bundle.tipo_gestion) === typeId ||
      bundle.tipo_lote !== 'gestion'
    ));
  }, [bundles, selectedBatch]);

  const suggestedBundle = useMemo(() => (
    availableBundles.find((bundle) => bundle.es_default && String(bundle.tipo_gestion || '') === String(selectedBatch?.tipo_gestion || ''))
  ), [availableBundles, selectedBatch]);

  const sampleList = selectedBatch?.muestras || [];
  const selectedSampleObjects = useMemo(() => (
    sampleList.filter((sample) => selectedSamples.includes(entityKey(sample)))
  ), [sampleList, selectedSamples]);

  const sampleScope = applyMode === 'all' ? sampleList : selectedSampleObjects;

  const getSampleAttrForSource = (source, sample) => {
    const sourceFieldId = String(getSourceSampleFieldId(source) || '');
    const sourceCatalogId = String(getSourceCatalogId(source) || '');
    const attrs = Array.isArray(sample?.atributos_tecnicos) ? sample.atributos_tecnicos : [];
    return attrs.find((item) => {
      const attrFieldId = String(getEntityId(item.campo_tecnico || item.campo_tecnico_id || item.campo_tecnico_info) || '');
      const attrCatalogId = String(getEntityId(item.catalogo || item.catalogo_id || item.catalogo_info) || '');
      return (sourceFieldId && attrFieldId === sourceFieldId) || (sourceCatalogId && attrCatalogId === sourceCatalogId);
    });
  };

  const getDetectedCriterionForSource = (source) => {
    const samples = sampleScope;
    const attrs = samples
      .map((sample) => getSampleAttrForSource(source, sample))
      .filter(Boolean);

    const fieldName = source?.campo_tecnico_info?.nombre_visible
      || source?.campo_tecnico_info?.nombre
      || source?.catalogo_info?.nombre
      || source?.catalogo_resuelto?.nombre
      || source?.catalogo_fuente_nombre
      || source?.catalogo_nombre
      || 'criterio';

    if (!samples.length) {
      return { label: `Sin muestras para detectar ${fieldName}`, itemId: '', itemName: '', mixed: false, missing: true };
    }

    if (!attrs.length) {
      return { label: `Cliente no eligió ${fieldName}`, itemId: '', itemName: '', mixed: false, missing: true };
    }

    const known = attrs.filter((attr) => !attr.desconocido && getEntityId(attr.item || attr.item_id || attr.item_info));
    if (!known.length) {
      return { label: `Cliente marcó ${fieldName}: Desconocido`, itemId: '', itemName: 'Desconocido', mixed: false, missing: true };
    }

    const uniqueIds = [...new Set(known.map((attr) => String(getEntityId(attr.item || attr.item_id || attr.item_info))))];
    if (uniqueIds.length === 1) {
      const attr = known[0];
      const itemName = attr.item_info?.nombre || attr.item_nombre || attr.item?.nombre || attr.item || '-';
      return {
        label: `Cliente eligió: ${fieldName} = ${itemName}`,
        itemId: uniqueIds[0],
        itemName,
        mixed: false,
        missing: false,
      };
    }

    return {
      label: `${fieldName}: las muestras seleccionadas tienen valores distintos`,
      itemId: '',
      itemName: '',
      mixed: true,
      missing: false,
    };
  };

  const getSampleCriterionLabel = (source) => getDetectedCriterionForSource(source).label;

  const assignmentsBySample = useMemo(() => {
    const grouped = new Map();
    currentAssignments.forEach((item) => {
      const id = item.muestra_id || item.muestra;
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id).push(item);
    });
    return grouped;
  }, [currentAssignments]);

  const updateRow = (key, field, value) => {
    if (field === 'prueba' && value && rows.some((row) => row.key !== key && String(row.prueba) === String(value))) {
      toast.warning('Esta prueba ya está agregada. Edite la fila existente.');
      return;
    }
    setRows((prev) => prev.map((row) => {
      if (row.key !== key) return row;

      if (field === 'prueba') {
        return {
          ...buildRowFromTest(value),
          key,
        };
      }

      if (field === 'condicion') {
        const condition = conditions.find((item) => String(item.id) === String(value));
        return {
          ...row,
          condicion: value,
          condicion_texto: condition ? `${condition.nombre} · ${condition.valor} ${condition.unidad_info?.simbolo || ''}`.trim() : '',
        };
      }

      if (field === 'criterio_limite_catalogo') {
        return { ...row, criterio_limite_catalogo: value, criterio_limite_item: '' };
      }

      if (field === 'criterio_limite_escala') {
        return { ...row, criterio_limite_escala: value, criterio_limite_escala_item: '' };
      }

      return { ...row, [field]: value };
    }));
  };

  const updateRowFields = (key, patch) => {
    setRows((prev) => prev.map((row) => (
      row.key === key ? { ...row, ...patch } : row
    )));
  };

  const updateResultConfiguration = (rowKey, resultKey, patch) => {
    setRows((prev) => prev.map((row) => {
      if (row.key !== rowKey) return row;
      const nextConfiguration = {
        ...(row.configuracion_resultados || {}),
        [resultKey]: {
          ...(row.configuracion_resultados?.[resultKey] || {}),
          ...patch,
        },
      };
      const values = Object.values(nextConfiguration);
      return {
        ...row,
        configuracion_resultados: nextConfiguration,
        unidad: [...new Set(values.map((item) => item.unidad).filter(Boolean))].join(', '),
      };
    }));
  };

  const updateRowCriterionRule = (key, limitField, updater) => {
    setRows((prev) => prev.map((row) => {
      if (row.key !== key) return row;

      const effectiveCriterion = getEffectiveLimitCriterionForRow(row);
      const effectiveRow = {
        ...row,
        criterio_limite_valor: effectiveCriterion.criterio_limite_valor,
      };
      const currentRule = normalizeConfiguredRuleForAssignment(
        limitField,
        getCriterionFieldValue(effectiveRow, limitField)
      );
      const nextRule = typeof updater === 'function' ? updater(currentRule) : updater;

      return {
        ...row,
        criterio_limite_valor: setCriterionFieldValue(
          row.criterio_limite_valor,
          limitField,
          nextRule
        ),
      };
    }));
  };

  const getBoundaryComparableValue = (field, value) => {
    if (isBlank(value)) return null;

    if (['escala', 'escala_ordinal'].includes(field.tipo_comparacion)) {
      const scaleId = getScaleIdFromField(field);
      const items = sortScaleItems(
        comparisonScaleItems.filter((item) => String(getScaleIdFromItem(item)) === String(scaleId))
      );
      const token = normalizeScaleToken(value);
      const index = items.findIndex((item) => (
        String(item.id) === String(value)
        || normalizeScaleToken(item.etiqueta) === token
        || normalizeScaleToken(item.valor_normalizado) === token
        || normalizeScaleToken(labelScaleItem(item)) === token
      ));
      return index >= 0 ? index : null;
    }

    const numeric = Number(String(value).replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : null;
  };

  const getAssignmentRuleOrderError = (field, value) => {
    const rule = normalizeAssignmentLimitRule(field, value);
    const keys = requiredAssignmentBoundaryKeys(field, rule)
      .filter((key) => key !== 'valor_esperado');
    if (keys.some((key) => isBlank(rule[key]))) return '';

    const values = keys.map((key) => getBoundaryComparableValue(field, rule[key]));
    if (values.some((item) => item === null)) return '';

    return values.some((item, index) => index > 0 && values[index - 1] > item)
      ? `${getLimitFieldPartLabel(field)}: las fronteras deben ir de menor a mayor.`
      : '';
  };

  const getRowManualLimitFields = (row) => {
    const sources = limitSources.filter((source) => String(getSourceTestId(source)) === String(row?.prueba));
    return getAdjustableLimitFields(sources);
  };

  const getManualCriterionSummary = (row) => {
    const fields = getRowManualLimitFields(row);
    if (!fields.length) return 'Límite para esta muestra';
    const effectiveCriterion = getEffectiveLimitCriterionForRow(row);
    const effectiveRow = { ...row, criterio_limite_valor: effectiveCriterion.criterio_limite_valor };
    const filled = fields.filter((field) => (
      isAssignmentLimitRuleComplete(field, getCriterionFieldValue(effectiveRow, field))
    ));
    const groups = groupManualLimitFields(fields);
    if (!filled.length) return groups.length > 1 ? `Configurar ${groups.length} resultados` : `Configurar ${fields.length} campo(s)`;
    if (filled.length === fields.length) {
      return groupManualLimitFields(fields).map((group) => {
        const values = group.fields
          .map((field) => {
            const value = getCriterionFieldValue(effectiveRow, field);
            return isAssignmentLimitRuleComplete(field, value)
              ? `${getLimitFieldPartLabel(field)}: ${formatAssignmentRuleSummary(field, value)}`
              : '';
          })
          .filter((value) => !isBlank(value));
        return `${group.title}: ${values.join(' / ')}`;
      }).join(' - ');
    }
    return `${filled.length}/${fields.length} campo(s) configurados`;
  };

  const getEffectiveCatalogCriterionForRow = (row, sources = null) => {
    const rowSources = sources || limitSources.filter((source) => String(getSourceTestId(source)) === String(row?.prueba));
    const catalogSources = getCatalogLimitSources(rowSources);
    const selectedSource = catalogSources.find((source) => String(getSourceCatalogId(source)) === String(row?.criterio_limite_catalogo)) || catalogSources[0];
    const catalogId = row?.criterio_limite_catalogo || (selectedSource ? getSourceCatalogId(selectedSource) : '');
    const detected = selectedSource ? getDetectedCriterionForSource(selectedSource) : {};
    const items = limitItems.filter((item) => String(getItemCatalogId(item)) === String(catalogId));
    const itemId = row?.criterio_limite_item || (!detected?.mixed ? detected?.itemId : '');
    const catalogName = selectedSource?.campo_tecnico_info?.nombre_visible
      || selectedSource?.campo_tecnico_info?.nombre
      || selectedSource?.catalogo_info?.nombre
      || selectedSource?.catalogo_resuelto?.nombre
      || selectedSource?.catalogo_fuente_nombre
      || selectedSource?.catalogo_nombre
      || 'Catalogo';

    return {
      catalogSources,
      selectedSource,
      catalogId,
      detected,
      items,
      itemId,
      catalogName,
    };
  };

  const criterionModalRow = rows.find((row) => row.key === criterionModalRowKey);
  const criterionModalEffectiveCriterion = criterionModalRow ? getEffectiveLimitCriterionForRow(criterionModalRow) : {};
  const criterionModalEffectiveRow = criterionModalRow
    ? { ...criterionModalRow, criterio_limite_valor: criterionModalEffectiveCriterion.criterio_limite_valor }
    : null;
  const criterionModalFields = criterionModalEffectiveRow ? getRowManualLimitFields(criterionModalEffectiveRow) : [];
  const criterionModalGroups = groupManualLimitFields(criterionModalFields);

  const openCriterionModal = (row) => {
    setCriterionModalSnapshot({
      key: row.key,
      value: cloneCriterionValue(row.criterio_limite_valor),
    });
    setCriterionModalRowKey(row.key);
  };

  const cancelCriterionModal = () => {
    if (criterionModalSnapshot) {
      setRows((previous) => previous.map((row) => (
        row.key === criterionModalSnapshot.key
          ? { ...row, criterio_limite_valor: cloneCriterionValue(criterionModalSnapshot.value) }
          : row
      )));
    }
    setCriterionModalSnapshot(null);
    setCriterionModalRowKey(null);
  };

  const applyCriterionModal = () => {
    const incompleteField = criterionModalFields.find((field) => (
      !isAssignmentLimitRuleComplete(
        field,
        getCriterionFieldValue(criterionModalEffectiveRow, field)
      )
    ));
    if (incompleteField) {
      toast.warning(`Complete las fronteras de ${getLimitFieldPartLabel(incompleteField)}.`);
      return;
    }

    const orderError = criterionModalFields
      .map((field) => getAssignmentRuleOrderError(
        field,
        getCriterionFieldValue(criterionModalEffectiveRow, field)
      ))
      .find(Boolean);
    if (orderError) {
      toast.warning(orderError);
      return;
    }

    setCriterionModalSnapshot(null);
    setCriterionModalRowKey(null);
  };

  const applyBundle = async (bundleId, showToast = true) => {
    if (!bundleId) {
      setSelectedBundleId('');
      return;
    }

    try {
      const bundle = await predefinedTestBatchesService.getById(bundleId);
      setSelectedBundleId(String(bundleId));
      setTemplateForm({
        nombre: bundle.nombre || '',
        tipo_lote: bundle.tipo_lote || 'personalizado',
        es_default: !!bundle.es_default,
        descripcion: bundle.descripcion || '',
      });

      const uniqueDetails = Array.from(new Map(
        (bundle.detalles || []).map((detail) => [String(detail.prueba), detail])
      ).values());
      setRows(uniqueDetails.length
        ? uniqueDetails.map((detail) => {
          const defaultCriterion = getDefaultLimitCriterionForTest(detail.prueba);
          return {
            key: `bundle_${detail.id}`,
            prueba: detail.prueba ? String(detail.prueba) : '',
            condicion: detail.condicion ? String(detail.condicion) : '',
            condicion_texto: detail.condicion_texto || '',
            unidad: detail.unidad || '',
            configuracion_resultados: detail.configuracion_resultados
              || buildResultConfiguration(tests.find((item) => String(item.id) === String(detail.prueba))),
            criterio_limite_catalogo: detail.criterio_limite_catalogo ? String(detail.criterio_limite_catalogo) : '',
            criterio_limite_item: detail.criterio_limite_item ? String(detail.criterio_limite_item) : '',
            criterio_limite_escala: detail.criterio_limite_escala ? String(detail.criterio_limite_escala) : defaultCriterion.criterio_limite_escala || '',
            criterio_limite_escala_item: detail.criterio_limite_escala_item ? String(detail.criterio_limite_escala_item) : defaultCriterion.criterio_limite_escala_item || '',
            criterio_limite_valor: detail.criterio_limite_valor || defaultCriterion.criterio_limite_valor || '',
            criterio_evaluacion: detail.criterio_evaluacion ? String(detail.criterio_evaluacion) : '',
          };
        })
        : [createRow()]);

      if (showToast) toast.success('Lote predefinido cargado.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el lote predefinido.');
    }
  };

  const toggleSample = (sampleId) => {
    const key = entityKey(sampleId);
    setSelectedSamples((prev) => (
      prev.includes(key)
        ? prev.filter((id) => id !== key)
        : [...prev, key]
    ));
  };

  const assignmentPayload = useMemo(() => {
    const samplesToSend = applyMode === 'all'
      ? sampleList.map((sample) => sample.id)
      : selectedSampleObjects.map((sample) => sample.id);

    return {
      lote_id: selectedBatchId,
      sample_ids: samplesToSend,
      lote_predefinido: selectedBundleId ? Number(selectedBundleId) : null,
      pruebas: rows.filter((row) => row.prueba).map((row) => {
        const sources = limitSources.filter((source) => String(getSourceTestId(source)) === String(row.prueba));
        const adjustableFields = getAdjustableLimitFields(sources);
        const effectiveCriterion = adjustableFields.length ? getEffectiveLimitCriterionForRow(row) : {};
        const catalogCriterion = getEffectiveCatalogCriterionForRow(row, sources);
        const globalScaleIds = getLimitFieldsForSources(
          sources.filter((source) => getLimitSourceType(source) === 'global')
        ).filter((field) => ['escala', 'escala_ordinal'].includes(field.tipo_comparacion))
          .map((field) => String(getScaleIdFromField(field)))
          .filter(Boolean);
        const globalScaleId = globalScaleIds.includes(String(effectiveCriterion.criterio_limite_escala || ''))
          ? effectiveCriterion.criterio_limite_escala
          : null;
        const globalScaleItem = comparisonScaleItems.find((item) => (
          String(item.id) === String(effectiveCriterion.criterio_limite_escala_item || '')
          && String(getScaleIdFromItem(item)) === String(globalScaleId || '')
        ));
        return {
          prueba: Number(row.prueba),
          condicion: row.condicion ? Number(row.condicion) : null,
          condicion_texto: row.condicion_texto || null,
          unidad: row.unidad || null,
          configuracion_resultados: row.configuracion_resultados || {},
          criterio_limite_catalogo: catalogCriterion.catalogId ? Number(catalogCriterion.catalogId) : null,
          criterio_limite_item: catalogCriterion.itemId ? Number(catalogCriterion.itemId) : null,
          criterio_limite_escala: globalScaleId ? Number(globalScaleId) : null,
          criterio_limite_escala_item: globalScaleItem ? Number(globalScaleItem.id) : null,
          criterio_limite_valor: isEmptyCriterionValue(effectiveCriterion.criterio_limite_valor) ? null : effectiveCriterion.criterio_limite_valor,
          criterio_evaluacion: row.criterio_evaluacion ? Number(row.criterio_evaluacion) : null,
        };
      }),
    };
  }, [applyMode, sampleList, selectedSampleObjects, selectedBatchId, selectedBundleId, rows, limitSources, limitFields, comparisonScaleItems]);

  const saveAssignment = async (estado) => {
    if (!selectedBatchId) {
      toast.warning('Selecciona un lote primero.');
      return;
    }

    if (!assignmentPayload.sample_ids.length) {
      toast.warning('Selecciona al menos una muestra.');
      return;
    }

    if (!assignmentPayload.pruebas.length) {
      toast.warning('Agrega al menos una prueba.');
      return;
    }

    const missingCriterion = rows.find((row) => {
      if (!row.prueba) return false;
      const effectiveCriterion = getEffectiveLimitCriterionForRow(row);
      const effectiveRow = {
        ...row,
        ...effectiveCriterion,
      };
      const sources = limitSources.filter((source) => String(getSourceTestId(source)) === String(row.prueba));
      const catalogCriterion = getEffectiveCatalogCriterionForRow(row, sources);
      if (catalogCriterion.catalogSources.length && !catalogCriterion.itemId) return true;
      const fields = getLimitFieldsForSources(sources);
      const manualFields = getAdjustableLimitFields(sources);
      if (manualFields.length) {
        return manualFields.some((field) => (
          !isAssignmentLimitRuleComplete(field, getCriterionFieldValue(effectiveRow, field))
        ));
      }
      return fields.some((field) => (
        field.operador !== 'informativo'
        && field.origen_limite !== 'catalogo'
        && isBlank(field.valor_global)
      ));
    });

    if (missingCriterion) {
      const test = tests.find((item) => String(item.id) === String(missingCriterion.prueba));
      toast.warning(`Seleccione el criterio de limite para ${test?.acronimo || test?.nombre_variable || 'la prueba'}.`);
      return;
    }

    const invalidOrder = rows
      .filter((row) => row.prueba)
      .flatMap((row) => {
        const sources = limitSources.filter((source) => String(getSourceTestId(source)) === String(row.prueba));
        const fields = getAdjustableLimitFields(sources);
        const effectiveCriterion = getEffectiveLimitCriterionForRow(row);
        const effectiveRow = { ...row, ...effectiveCriterion };
        return fields.map((field) => getAssignmentRuleOrderError(
          field,
          getCriterionFieldValue(effectiveRow, field)
        ));
      })
      .find(Boolean);

    if (invalidOrder) {
      toast.warning(invalidOrder);
      return;
    }

    setSaving(true);

    try {
      const syncResult = await sampleTestsService.assignBatch({
        ...assignmentPayload,
        estado_asignacion: estado,
      });

      toast.success(estado === 'confirmada' ? 'Asignación confirmada.' : 'Borrador guardado.');
      if (syncResult?.protected_count) {
        toast.warning(
          `${syncResult.protected_count} asignación(es) no se retiraron porque ya tienen resultados o revisión.`
        );
      }
      await loadBatchContext(selectedBatchId, {
        preserveSelection: true,
        preserveRows: true,
      });
      if (applyMode === 'selected') {
        setSelectedSamples([]);
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo guardar la asignación.');
    } finally {
      setSaving(false);
    }
  };

  const editAssignmentsForSample = (sampleId) => {
    const assignments = currentAssignments.filter((item) => (
      String(item.muestra_id || item.muestra?.id || item.muestra) === String(sampleId)
    ));
    setApplyMode('selected');
    setSelectedSamples([entityKey(sampleId)]);
    if (assignments.length) hydrateExistingAssignments(assignments);
    setAssignmentSampleId(null);
    document.getElementById('constructor-pruebas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const createUnitInline = async () => {
    if (!unitForm.nombre.trim() || !unitForm.simbolo.trim()) {
      toast.warning('Escribe el nombre y el símbolo de la unidad.');
      return;
    }
    setCreatingUnit(true);
    try {
      const created = await technicalConfigService.createUnit({
        ...unitForm,
        activo: true,
      });
      setUnits((previous) => [...previous, created].sort((left, right) => (
        String(left.nombre || '').localeCompare(String(right.nombre || ''), 'es')
      )));
      setUnitForm({ nombre: '', simbolo: '', magnitud: '' });
      toast.success('Unidad creada y disponible.');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'No se pudo crear la unidad.');
    } finally {
      setCreatingUnit(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!assignmentPayload.pruebas.length) {
      toast.warning('Agrega pruebas antes de crear una plantilla.');
      return;
    }

    if (!templateForm.nombre.trim()) {
      toast.warning('Escribe un nombre para la plantilla.');
      return;
    }

    setSavingTemplate(true);

    try {
      const rawManagement = getEntityId(
        selectedBatch?.tipo_gestion_info
        || selectedBatch?.tipo_gestion
        || selectedBatch?.tipo_gestion_id
      );
      const matchingManagement = types.find((item) => (
        String(item.id) === String(rawManagement)
        || normalizeText(item.nombre) === normalizeText(getBatchManagement(selectedBatch))
      ));
      const managementId = matchingManagement?.id || (
        Number.isFinite(Number(rawManagement)) ? Number(rawManagement) : null
      );
      await predefinedTestBatchesService.create({
        nombre: templateForm.nombre.trim(),
        descripcion: templateForm.descripcion || null,
        tipo_lote: templateForm.tipo_lote,
        tipo_gestion: templateForm.tipo_lote === 'gestion' && managementId ? Number(managementId) : null,
        es_default: !!templateForm.es_default,
        activo: true,
        detalles: assignmentPayload.pruebas.map((item, index) => ({
          prueba: item.prueba,
          condicion: item.condicion,
          condicion_texto: item.condicion_texto,
          unidad: item.unidad,
          configuracion_resultados: item.configuracion_resultados || {},
          orden: index + 1,
          criterio_limite_catalogo: item.criterio_limite_catalogo || null,
          criterio_limite_item: item.criterio_limite_item || null,
          criterio_limite_escala: item.criterio_limite_escala || null,
          criterio_limite_escala_item: item.criterio_limite_escala_item || null,
          criterio_limite_valor: item.criterio_limite_valor || null,
          activo: true,
        })),
      });

      toast.success('Lote predefinido creado.');
      setShowTemplateForm(false);
      await loadAll();
    } catch (error) {
      console.error(error);
      const apiError = error?.response?.data;
      const detail = apiError?.detail
        || apiError?.tipo_gestion?.[0]
        || apiError?.tipo_lote?.[0]
        || apiError?.nombre?.[0]
        || 'No se pudo crear el lote predefinido.';
      toast.error(detail);
    } finally {
      setSavingTemplate(false);
    }
  };

  const stats = {
    samples: sampleList.length || selectedBatch?.total_muestras || 0,
    assigned: currentAssignments.length,
    draft: currentAssignments.filter((item) => item.estado_asignacion === 'borrador').length,
    confirmed: currentAssignments.filter((item) => item.estado_asignacion === 'confirmada').length,
  };

  return (
    <div className="assignPage">
      <div className="assignShell">
        <header className="topBar">
          <div className="titleBlock">
            <button type="button" onClick={() => router.push('/muestras/lotes')} className="backBtn">
              <ArrowLeft size={18} />
            </button>
            <div className="iconBox"><ClipboardList size={21} /></div>
            <div>
              <h1>Asignar pruebas al lote</h1>
              <p>Configure las pruebas que se aplicarán a las muestras de este lote.</p>
            </div>
          </div>

          <div className="topActions">
            <button type="button" onClick={loadAll} className="btn secondary" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              Recargar
            </button>
            <button
              type="button"
              disabled={!currentAssignments.some((item) => item.estado_asignacion === 'confirmada')}
              onClick={() => router.push(`/muestras/resultados${selectedBatchId ? `?lote=${selectedBatchId}` : ''}`)}
              className="btn secondary"
              title={currentAssignments.some((item) => item.estado_asignacion === 'confirmada') ? 'Ingresar resultados' : 'Primero confirme pruebas para el lote'}
            >
              Ingresar resultados
            </button>
            <button type="button" onClick={() => setShowTemplateForm((prev) => !prev)} className="btn linkish">
              + Crear lote predefinido
            </button>
          </div>
        </header>

        <section className="lotHeader">
          <div className="lotIcon"><Layers size={26} /></div>

          <div className="lotSelectWrap">
            <label>Lote de muestras</label>
            <div className="lotSelectorLine">
              {selectedBatchId ? (
                <div className="lockedLot">{selectedBatchId}</div>
              ) : (
                <button type="button" className="lockedLot action" onClick={() => router.push('/muestras/lotes')}>
                  Seleccione un lote desde lotes
                </button>
              )}
            </div>
          </div>

          <LotInfo label="Lote" value={selectedBatch?.id || '-'} strong />
          <LotInfo label="Cliente" value={getBatchClient(selectedBatch)} />
              <LotInfo label="Tipo de gestión" value={getBatchManagement(selectedBatch)} />
              <LotInfo label="Fecha recepción" value={formatDate(selectedBatch?.fecha_recepcion || selectedBatch?.updated_at)} />
          <LotInfo label="Total muestras" value={stats.samples} strong />
          <LotInfo label="Estado" value={selectedBatch?.estado || '-'} pill />
        </section>

        <div className="workGrid">
          <main className="workMain">
            <section className="flowPanel compact">
              <div className="flowTitle">
                <span>1</span>
                <div>
                  <h2>Lote de pruebas predefinido</h2>
                  <p>Seleccione una plantilla o configure las pruebas manualmente.</p>
                </div>
              </div>

              <div className="predefinedLine">
                <label className="checkLine">
                  <input
                    type="checkbox"
                    checked={usePredefined}
                    onChange={(e) => setUsePredefined(e.target.checked)}
                  />
                  Usar lote de pruebas predefinido
                </label>

                <Field label="Lote sugerido">
                  <select
                    value={selectedBundleId || (suggestedBundle?.id ? String(suggestedBundle.id) : '')}
                    disabled={!usePredefined}
                    onChange={(e) => applyBundle(e.target.value)}
                  >
                    <option value="">Sin lote predefinido</option>
                    {availableBundles.map((bundle) => (
                      <option key={bundle.id} value={bundle.id}>
                        {bundle.nombre}{bundle.es_default ? ' · sugerido' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                <button
                  type="button"
                  className="btn red"
                  disabled={!usePredefined || !selectedBundleId}
                  onClick={() => applyBundle(selectedBundleId)}
                >
                  Cargar pruebas
                </button>
              </div>
            </section>

            <section className="flowPanel" id="constructor-pruebas">
              <div className="flowTitle">
                <span>2</span>
                <div>
                  <h2>Constructor de pruebas</h2>
                <p>Variable, condición, criterio de límite y unidad informativa.</p>
                </div>
              </div>

              <div className="tableEditor">
                <div className="editorRow editorHead">
                  <div>Variable</div>
                    <div>Condición</div>
                    <div>Criterio límite</div>
                  <div>Unidad</div>
                  <div>Acciones</div>
                </div>

                {rows.map((row) => {

                  return (
                    <div className="editorRow" key={row.key}>
                      <select value={row.prueba} onChange={(e) => updateRow(row.key, 'prueba', e.target.value)}>
                        <option value="">Variable...</option>
                        {tests.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.acronimo} · {item.nombre_variable}
                          </option>
                        ))}
                      </select>

                      <select value={row.condicion} onChange={(e) => updateRow(row.key, 'condicion', e.target.value)}>
                        <option value="">Sin condición</option>
                        {conditions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre} · {item.valor} {item.unidad_info?.simbolo || ''}
                          </option>
                        ))}
                      </select>

                      <div className="criterionCell">
                        {(() => {
                          const sources = limitSources.filter((source) => String(getSourceTestId(source)) === String(row.prueba));
                          const catalogSources = getCatalogLimitSources(sources);
                          const globalSources = sources.filter((source) => getLimitSourceType(source) === 'global');
                          const assignmentFields = getAdjustableLimitFields(sources);
                          const scaleFields = globalSources.flatMap((source) => (
                            limitFields.filter((field) => (
                              String(getFieldSourceId(field)) === String(source.id) &&
                              ['escala', 'escala_ordinal'].includes(field.tipo_comparacion) &&
                              getScaleIdFromField(field)
                            ))
                          ));
                          const manualValueFields = assignmentFields.length
                            ? assignmentFields
                            : getManualLimitFields(globalSources, limitFields).filter((field) => !['escala', 'escala_ordinal'].includes(field.tipo_comparacion));
                          const selectedScaleField = scaleFields.find((field) => String(getScaleIdFromField(field)) === String(row.criterio_limite_escala)) || scaleFields[0];
                          const scaleId = row.criterio_limite_escala || getScaleIdFromField(selectedScaleField) || '';
                          const scaleItems = sortScaleItems(comparisonScaleItems.filter((item) => String(getScaleIdFromItem(item)) === String(scaleId)));
                          const scaleName = comparisonScales.find((item) => String(item.id) === String(scaleId))?.nombre || selectedScaleField?.escala_comparacion_info?.nombre || 'Escala';

                          if (catalogSources.length || assignmentFields.length) {
                            const catalogCriterion = getEffectiveCatalogCriterionForRow(row, sources);
                            const { catalogId, items, detected, itemId: effectiveItemId, catalogName } = catalogCriterion;
                            const effectiveCriterion = getEffectiveLimitCriterionForRow(row);
                            return (
                              <div className="criterionStack">
                                {catalogSources.length ? (
                                  <>
                                    <div className="fixedCriterionSource" title="Fuente definida en la configuración de límites">
                                      <small>Fuente del límite</small>
                                      <strong>{catalogName}</strong>
                                    </div>
                                    <select
                                      value={effectiveItemId}
                                      onChange={(e) => {
                                        updateRowFields(row.key, {
                                          criterio_limite_catalogo: row.criterio_limite_catalogo || catalogId,
                                          criterio_limite_item: e.target.value,
                                        });
                                      }}
                                      title="Item objetivo para evaluar los campos por catalogo"
                                    >
                                      <option value="">{detected?.mixed ? `Elija ${catalogName}` : `Seleccione ${catalogName}`}</option>
                                      {items.map((item) => (
                                        <option key={item.id} value={item.id}>{item.nombre}</option>
                                      ))}
                                    </select>
                                  </>
                                ) : null}
                                {assignmentFields.length ? (
                                  <button
                                    type="button"
                                    className={`criterionModalButton ${isEmptyCriterionForFields(effectiveCriterion.criterio_limite_valor, assignmentFields) ? 'empty' : ''}`}
                                    onClick={() => openCriterionModal(row)}
                                    title="Ajustar limites configurados para esta muestra"
                                  >
                                    <span>{getManualCriterionSummary(row)}</span>
                                    <small>{assignmentFields.length} campo(s) ajustables</small>
                                  </button>
                                ) : null}
                                {catalogSources.length ? (
                                  <small className={detected?.missing || detected?.mixed ? 'criterionHint warn' : 'criterionHint'}>
                                    {detected?.label || `Seleccione ${catalogName}`}
                                  </small>
                                ) : null}
                              </div>
                            );
                          }

                          if ((scaleFields.length || manualValueFields.length) && !catalogSources.length) {
                            return (
                              <div className="criterionStack">
                                {scaleFields.length ? (
                                  <>
                                    <select
                                      value={scaleId}
                                      onChange={(e) => updateRow(row.key, 'criterio_limite_escala', e.target.value)}
                                      title="Escala de criterio de limite"
                                    >
                                      {scaleFields.map((field) => (
                                        <option key={field.id} value={getScaleIdFromField(field)}>
                                          {field.escala_comparacion_info?.nombre || scaleName}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={row.criterio_limite_escala_item}
                                      onChange={(e) => {
                                        if (!row.criterio_limite_escala && scaleId) updateRow(row.key, 'criterio_limite_escala', scaleId);
                                        updateRow(row.key, 'criterio_limite_escala_item', e.target.value);
                                      }}
                                      title={`${getLimitFieldPartLabel(selectedScaleField)} configurado para esta prueba`}
                                    >
                                      <option value="">{getScaleLimitPrompt(selectedScaleField)}</option>
                                      {!scaleItems.length ? <option value="" disabled>La escala no tiene items activos</option> : null}
                                      {scaleItems.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {getLimitFieldPartLabel(selectedScaleField)}: {labelScaleItem(item)}
                                        </option>
                                      ))}
                                    </select>
                                  </>
                                ) : null}
                                {manualValueFields.length ? (
                                  <button
                                    type="button"
                                    className={`criterionModalButton ${isEmptyCriterionForFields(getEffectiveLimitCriterionForRow(row).criterio_limite_valor, manualValueFields) ? 'empty' : ''}`}
                                    onClick={() => openCriterionModal(row)}
                                    title="Configurar limites manuales para esta muestra"
                                  >
                                    <span>{getManualCriterionSummary(row)}</span>
                                    <small>{manualValueFields.length} campo(s)</small>
                                  </button>
                                ) : null}
                              </div>
                            );
                          }
                          if (globalSources.length && !catalogSources.length) {
                            const fixedField = globalSources.flatMap((source) => limitFields.filter((field) => String(getFieldSourceId(field)) === String(source.id)))[0];
                            if (fixedField && [null, undefined, ''].includes(fixedField.valor_global)) {
                              return (
                                <input
                                  value={row.criterio_limite_valor}
                                  onChange={(e) => updateRow(row.key, 'criterio_limite_valor', e.target.value)}
                                  placeholder="Límite para esta muestra"
                                  title="Este límite se elige al asignar la prueba."
                                />
                              );
                            }
                              return <span className="criterionEmpty">Definido en límites</span>;
                          }
                          if (!sources.length) {
                            return <span className="criterionEmpty">No aplica</span>;
                          }
                          if (!catalogSources.length) {
                            return <span className="criterionEmpty">Sin criterio seleccionable</span>;
                          }

                          const selectedSource = catalogSources.find((source) => String(getSourceCatalogId(source)) === String(row.criterio_limite_catalogo)) || catalogSources[0];
                          const catalogId = row.criterio_limite_catalogo || getSourceCatalogId(selectedSource) || '';
                          const items = limitItems.filter((item) => String(getItemCatalogId(item)) === String(catalogId));
                          const detected = selectedSource ? getDetectedCriterionForSource(selectedSource) : {};
                          const effectiveItemId = row.criterio_limite_item || (!detected?.mixed ? detected?.itemId : '') || '';
                          const catalogName = selectedSource?.campo_tecnico_info?.nombre_visible
                            || selectedSource?.catalogo_info?.nombre
                            || selectedSource?.catalogo_resuelto?.nombre
                            || selectedSource?.catalogo_fuente_nombre
                            || selectedSource?.catalogo_nombre
                            || 'Catálogo';
                          return (
                            <div className="criterionStack">
                              <div className="fixedCriterionSource" title="Fuente definida en la configuración de límites">
                                <small>Fuente del límite</small>
                                <strong>{catalogName}</strong>
                              </div>
                              <select
                                value={effectiveItemId}
                                onChange={(e) => {
                                  updateRowFields(row.key, {
                                    criterio_limite_catalogo: row.criterio_limite_catalogo || catalogId,
                                    criterio_limite_item: e.target.value,
                                  });
                                }}
                                title="Item objetivo para evaluar esta prueba"
                              >
                                <option value="">{detected?.mixed ? `Elija ${catalogName}` : `Seleccione ${catalogName}`}</option>
                                {items.map((item) => (
                                  <option key={item.id} value={item.id}>{item.nombre}</option>
                                ))}
                              </select>
                              <small className={detected?.missing || detected?.mixed ? 'criterionHint warn' : 'criterionHint'}>
                                {detected?.label || `Seleccione ${catalogName}`}
                              </small>
                            </div>
                          );
                        })()}
                      </div>

                      <button
                        type="button"
                        className="resultConfigButton"
                        onClick={() => setResultConfigRowKey(row.key)}
                        title="Revisar unidad y condición por resultado"
                      >
                        <strong>{row.unidad || 'Sin unidad'}</strong>
                        <small>
                          {Object.keys(row.configuracion_resultados || {}).length || 1} resultado(s)
                        </small>
                      </button>

                      <div className="rowActions">
                        <button
                          type="button"
                          title="Cómo se evaluará esta prueba"
                          className="iconInfo"
                          onClick={() => setInfoRowKey(row.key)}
                        >
                          <Info size={15} />
                        </button>
                        <button
                          type="button"
                          title="Quitar prueba"
                          className="iconDanger"
                          onClick={() => setRows((prev) => (
                            prev.length === 1 ? [createRow()] : prev.filter((item) => item.key !== row.key)
                          ))}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="underTableActions">
                <button type="button" className="btn red" onClick={() => setRows((prev) => [...prev, createRow()])}>
                  <Plus size={16} />
                  Agregar prueba
                </button>
                <button type="button" className="btn secondary" onClick={() => setRows([createRow()])}>
                  <Wand2 size={16} />
                  Limpiar
                </button>
              </div>
            </section>

            <section className="flowPanel">
              <div className="flowTitle">
                <span>3</span>
                <div>
                <h2>Aplicación a muestras del lote</h2>
                <p>Seleccione el alcance de la asignación.</p>
                </div>
              </div>

              <div className="applyLine">
                <label>
                  <input
                    type="radio"
                    name="applyMode"
                    checked={applyMode === 'all'}
                    onChange={() => {
                      setApplyMode('all');
                      setSelectedSamples([]);
                    }}
                  />
                  Aplicar a todas las muestras
                </label>
                <label>
                  <input
                    type="radio"
                    name="applyMode"
                    checked={applyMode === 'selected'}
                    onChange={() => {
                      setApplyMode('selected');
                      setSelectedSamples([]);
                    }}
                  />
                  Seleccionar muestras
                </label>
                <span>{assignmentPayload.sample_ids.length} muestra(s) seleccionada(s)</span>
              </div>

              <div className="samplesTableWrap">
                <table className="samplesTable">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedSamples.length === sampleList.length && sampleList.length > 0}
                          disabled={applyMode === 'all'}
                          onChange={(e) => setSelectedSamples(e.target.checked ? sampleList.map(entityKey) : [])}
                        />
                      </th>
                      <th>Código muestra</th>
                      <th>Tipo</th>
                      <th>Caracteristicas tecnicas</th>
                      <th>Descripción</th>
                      <th>Fecha de toma</th>
                      <th>Estado</th>
                      <th>Asignadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBatch ? (
                      <tr><td colSpan={8}>Cargando lote...</td></tr>
                    ) : sampleList.length ? sampleList.map((sample) => {
                      const count = assignmentsBySample.get(sample.id)?.length || 0;
                      return (
                        <tr key={sample.id}>
                          <td>
                            <input
                              type="checkbox"
                              disabled={applyMode === 'all'}
                              checked={applyMode === 'all' || selectedSamples.includes(entityKey(sample))}
                              onChange={() => toggleSample(sample.id)}
                            />
                          </td>
                          <td className="mono">{sample.id}</td>
                          <td>{sample.tipo_muestra || '-'}</td>
                          <td className="techAttrs" title={formatTechnicalAttributes(sample)}>{formatTechnicalAttributes(sample)}</td>
                          <td>{sample.referencia_marca || sample.referencia_equipo_nombre || sample.equipo_placa || 'Sin descripción'}</td>
                          <td>{formatDate(sample.fecha_toma)}</td>
                          <td><span className="statusPill">{sample.is_ingresado ? 'En laboratorio' : 'Pendiente'}</span></td>
                          <td>
                            <button
                              type="button"
                              className="assignedTestsButton"
                              onClick={() => setAssignmentSampleId(sample.id)}
                            >
                              {count} {count === 1 ? 'prueba' : 'pruebas'}
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={8}>Este lote no trae muestras en el detalle.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {showTemplateForm ? (
              <div className="modalBackdrop" role="presentation" onMouseDown={() => setShowTemplateForm(false)}>
              <section className="criterionModal templateModal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <div className="criterionModalHeader">
                <div className="flowTitle">
                  <span>+</span>
                  <div>
                    <h2>Crear lote predefinido desde esta selección</h2>
                    <p>Registre una plantilla con las pruebas configuradas.</p>
                  </div>
                </div>
                <button type="button" className="iconButton" aria-label="Cerrar" onClick={() => setShowTemplateForm(false)}>×</button>
                </div>

                <div className="criterionModalBody templateGrid">
                  <Field label="Nombre">
                    <input value={templateForm.nombre} onChange={(e) => setTemplateForm({ ...templateForm, nombre: e.target.value })} />
                  </Field>
                  <Field label="Tipo">
                    <select value={templateForm.tipo_lote} onChange={(e) => setTemplateForm({ ...templateForm, tipo_lote: e.target.value })}>
                      <option value="gestion">Por gestión</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </Field>
                  {templateForm.tipo_lote === 'gestion' ? (
                    <Field label="Tipo de gestión">
                      <input value={getBatchManagement(selectedBatch)} readOnly />
                    </Field>
                  ) : null}
                  <Field label="Descripción">
                    <input value={templateForm.descripcion} onChange={(e) => setTemplateForm({ ...templateForm, descripcion: e.target.value })} />
                  </Field>

                <label className="checkLine compactCheck">
                  <input
                    type="checkbox"
                    checked={templateForm.es_default}
                    onChange={(e) => setTemplateForm({ ...templateForm, es_default: e.target.checked })}
                  />
                  Marcar como predeterminado para este contexto
                </label>
                </div>

                <div className="criterionModalFooter">
                  <button type="button" className="btn secondary" onClick={() => setShowTemplateForm(false)}>Cancelar</button>
                  <button type="button" className="btn red" disabled={savingTemplate} onClick={saveAsTemplate}>
                    <Layers size={16} />
                    Guardar lote predefinido
                  </button>
                </div>
              </section>
              </div>
            ) : null}
          </main>

          <aside className="rightPanel">
            <section className="miniBox">
              <h3>Resumen</h3>
              <div className="miniStat"><span>Muestras</span><strong>{stats.samples}</strong></div>
              <div className="miniStat"><span>Asignaciones</span><strong>{stats.assigned}</strong></div>
              <div className="miniStat"><span>Borradores</span><strong>{stats.draft}</strong></div>
              <div className="miniStat"><span>Confirmadas</span><strong>{stats.confirmed}</strong></div>
            </section>

            <section className="miniBox">
              <h3>Asignaciones actuales</h3>
              <div className="assignmentList">
                {currentAssignments.length ? currentAssignments.slice(0, 9).map((item) => (
                  <div key={item.id} className="assignmentItem">
                    <strong>{item.prueba?.acronimo || item.prueba?.nombre_variable || item.prueba}</strong>
                        <span>{item.muestra_id || item.muestra} · {item.estado_asignacion || '-'}</span>
                  </div>
                )) : (
                <p className="muted">Aún no hay pruebas asignadas al lote.</p>
                )}
              </div>
            </section>
          </aside>
        </div>

        {resultConfigRowKey ? (() => {
          const row = rows.find((item) => item.key === resultConfigRowKey);
          const test = tests.find((item) => String(item.id) === String(row?.prueba));
          const configuredResults = Object.entries(
            Object.keys(row?.configuracion_resultados || {}).length
              ? row.configuracion_resultados
              : buildResultConfiguration(test),
          );
          return (
            <div className="modalBackdrop" role="presentation" onMouseDown={() => setResultConfigRowKey(null)}>
              <section className="criterionModal resultConfigModal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <div className="criterionModalHeader">
                  <div>
                    <h2>Unidades por resultado</h2>
                    <p>{test?.acronimo} · {test?.nombre_variable}</p>
                  </div>
                  <button type="button" className="modalClose" onClick={() => setResultConfigRowKey(null)}>×</button>
                </div>
                <div className="criterionModalBody resultConfigList">
                  {configuredResults.map(([resultKey, config]) => (
                    <div className="resultConfigRow" key={resultKey}>
                      <strong>{config.resultado || 'Resultado'}</strong>
                      <label>
                        <span>Unidad</span>
                        <select
                          value={config.unidad || ''}
                          onChange={(event) => updateResultConfiguration(resultConfigRowKey, resultKey, { unidad: event.target.value })}
                        >
                          <option value="">Sin unidad</option>
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.simbolo}>{unit.nombre} ({unit.simbolo})</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                  <div className="inlineUnitCreator">
                    <strong>Crear una unidad</strong>
                    <input
                      value={unitForm.nombre}
                      placeholder="Nombre"
                      onChange={(event) => setUnitForm((current) => ({ ...current, nombre: event.target.value }))}
                    />
                    <input
                      value={unitForm.simbolo}
                      placeholder="Símbolo"
                      onChange={(event) => setUnitForm((current) => ({ ...current, simbolo: event.target.value }))}
                    />
                    <input
                      value={unitForm.magnitud}
                      placeholder="Magnitud (opcional)"
                      onChange={(event) => setUnitForm((current) => ({ ...current, magnitud: event.target.value }))}
                    />
                    <button type="button" className="btn secondary" disabled={creatingUnit} onClick={createUnitInline}>
                      <Plus size={15} />
                      Crear
                    </button>
                  </div>
                </div>
                <div className="criterionModalFooter splitFooter">
                  <button type="button" className="btn secondary" onClick={() => router.push('/configuracion-tecnica/unidades-condiciones')}>
                    Administrar unidades
                  </button>
                  <button type="button" className="btn red" onClick={() => setResultConfigRowKey(null)}>Aplicar</button>
                </div>
              </section>
            </div>
          );
        })() : null}

        {assignmentSampleId ? (() => {
          const sample = sampleList.find((item) => String(item.id) === String(assignmentSampleId));
          const assignments = assignmentsBySample.get(assignmentSampleId) || [];
          return (
            <div className="modalBackdrop" role="presentation" onMouseDown={() => setAssignmentSampleId(null)}>
              <section className="criterionModal sampleAssignmentsModal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <div className="criterionModalHeader">
                  <div>
                    <h2>Pruebas de {sample?.id}</h2>
                    <p>{assignments.length} asignación(es) vigentes</p>
                  </div>
                  <button type="button" className="modalClose" onClick={() => setAssignmentSampleId(null)}>×</button>
                </div>
                <div className="criterionModalBody sampleAssignmentList">
                  {assignments.length ? assignments.map((assignment) => (
                    <div key={assignment.id} className="sampleAssignmentRow">
                      <div>
                        <strong>{assignment.prueba?.acronimo || assignment.prueba?.nombre_variable || assignment.prueba}</strong>
                        <span>{assignment.prueba?.nombre_variable || ''}</span>
                      </div>
                      <span className="statusPill">{assignment.estado_asignacion || 'asignada'}</span>
                    </div>
                  )) : <p className="muted">La muestra todavía no tiene pruebas asignadas.</p>}
                </div>
                <div className="criterionModalFooter">
                  <button type="button" className="btn secondary" onClick={() => setAssignmentSampleId(null)}>Cerrar</button>
                  <button type="button" className="btn red" onClick={() => editAssignmentsForSample(assignmentSampleId)}>
                    Editar conjunto de esta muestra
                  </button>
                </div>
              </section>
            </div>
          );
        })() : null}

        {infoRowKey ? (() => {
          const row = rows.find((item) => item.key === infoRowKey);
          const test = tests.find((item) => String(item.id) === String(row?.prueba));
          const sources = getSourcesForTest(row?.prueba);
          const fields = sources.flatMap((source) => (
            limitFields
              .filter((field) => String(getFieldSourceId(field)) === String(source.id))
              .map((field) => ({ ...field, source }))
          ));
          const groupedFields = fields.reduce((groups, field) => {
            const resultId = getEntityId(field.resultado || field.resultado_id || field.resultado_info);
            const resultName = field.resultado_info?.nombre || field.resultado_nombre || 'Resultado';
            const resultConfig = Object.values(row?.configuracion_resultados || {}).find((config) => (
              String(config?.resultado_id || '') === String(resultId || '')
              || String(config?.resultado || '').trim().toLowerCase() === String(resultName).trim().toLowerCase()
            ));
            const configuredValue = getConfiguredValueForField(field, field.source);
            const bands = presentLimitBands({
              operator: field.operador || field.tipo_comparacion,
              limit_value: configuredValue,
              limit_value_label: configuredValue,
              unit: resultConfig?.unidad || '',
            });
            const key = String(resultId || resultName);
            if (!groups[key]) groups[key] = { name: resultName, unit: resultConfig?.unidad || '', fields: [] };
            groups[key].fields.push({ ...field, bands });
            return groups;
          }, {});
          return (
            <div className="modalBackdrop" role="presentation" onMouseDown={() => setInfoRowKey(null)}>
              <section className="criterionModal limitInfoModal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <div className="criterionModalHeader">
                  <div>
                    <h2>Cómo se evalúa {test?.acronimo}</h2>
                    <p>{test?.nombre_variable}</p>
                  </div>
                  <button type="button" className="modalClose" onClick={() => setInfoRowKey(null)}>×</button>
                </div>
                <div className="criterionModalBody">
                  {fields.length ? (
                    <div className="limitInfoGroups">
                      {Object.values(groupedFields).map((group) => (
                        <section className="limitInfoGroup" key={group.name}>
                          <header>
                            <div>
                              <strong>{group.name}</strong>
                              <span>{group.fields.length} campo(s)</span>
                            </div>
                            <small>{group.unit || 'Sin unidad'}</small>
                          </header>
                          <div className="limitInfoList">
                            {group.fields.map((field) => (
                              <div className="limitInfoRow" key={field.id}>
                                <div>
                                  <strong>{getLimitFieldPartLabel(field)}</strong>
                                  <small>
                                    {getLimitSourceType(field.source) === 'global'
                                      ? 'Definido en límites'
                                      : field.source?.campo_tecnico_info?.nombre_visible
                                        || field.source?.catalogo_info?.nombre
                                        || 'Catálogo técnico'}
                                  </small>
                                </div>
                                <div className="limitBandsCompact">
                                  <span className="bandAcceptable"><i />Aceptable: {field.bands.acceptable}</span>
                                  {field.bands.warning ? <span className="bandWarning"><i />Alerta: {field.bands.warning}</span> : null}
                                  {field.bands.critical ? <span className="bandCritical"><i />Crítico: {field.bands.critical}</span> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : <p className="emptyModal">Esta prueba es informativa o no tiene límites evaluables.</p>}
                </div>
                <div className="criterionModalFooter">
                  <button type="button" className="btn red" onClick={() => setInfoRowKey(null)}>Entendido</button>
                </div>
              </section>
            </div>
          );
        })() : null}

        {criterionModalEffectiveRow ? (
          <div className="modalBackdrop" role="presentation" onMouseDown={cancelCriterionModal}>
            <section className="criterionModal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
              <div className="criterionModalHeader">
                <div>
                  <h2>Configurar criterio límite</h2>
                  <p>
                    {tests.find((item) => String(item.id) === String(criterionModalEffectiveRow.prueba))?.nombre_variable || 'Prueba seleccionada'}
                  </p>
                </div>
                <button type="button" className="modalClose" onClick={cancelCriterionModal}>×</button>
              </div>

              <div className="criterionModalBody">
                {criterionModalGroups.length ? criterionModalGroups.map((group) => (
                  <section key={group.key} className="modalCriterionGroup">
                    <h3>{group.title}</h3>
                    <div className="modalCriterionGrid">
                      {group.fields.map((field) => {
                        const scaleId = getScaleIdFromField(field);
                        const scaleOptions = ['escala', 'escala_ordinal'].includes(field.tipo_comparacion)
                          ? sortScaleItems(comparisonScaleItems.filter((item) => String(getScaleIdFromItem(item)) === String(scaleId)))
                            .map((item) => ({ value: item.valor_normalizado || item.etiqueta || String(item.id), label: labelScaleItem(item) }))
                          : [];
                        const options = scaleOptions.length ? scaleOptions : getEvaluationOptions(field);
                        const fieldValue = getCriterionFieldValue(criterionModalEffectiveRow, field);
                        const rule = normalizeConfiguredRuleForAssignment(field, fieldValue);
                        const operator = normalizeLimitOperator(field);
                        const boundaryKeys = requiredAssignmentBoundaryKeys(field, rule);
                        const canUseYellow = ['min', 'max', 'between'].includes(operator);
                        const semaphoreParts = operator === 'min'
                          ? ['critical', ...(rule.usar_amarillo ? ['warning'] : []), 'acceptable']
                          : operator === 'max'
                            ? ['acceptable', ...(rule.usar_amarillo ? ['warning'] : []), 'critical']
                            : operator === 'between'
                              ? ['critical', ...(rule.usar_amarillo ? ['warning'] : []), 'acceptable', ...(rule.usar_amarillo ? ['warning'] : []), 'critical']
                              : [];
                        return (
                          <div key={field.id} className="assignmentRuleBlock">
                            <div className="assignmentRuleHeader">
                              <div>
                                <strong>{getLimitFieldPartLabel(field)}</strong>
                                <span>{ASSIGNMENT_OPERATOR_LABELS[operator]}</span>
                              </div>
                              {canUseYellow ? (
                                <label className="assignmentYellowToggle">
                                  <input
                                    type="checkbox"
                                    checked={rule.usar_amarillo}
                                    onChange={(event) => updateRowCriterionRule(
                                      criterionModalEffectiveRow.key,
                                      field,
                                      (current) => {
                                        const next = { ...current, usar_amarillo: event.target.checked };
                                        if (!event.target.checked) {
                                          delete next.min_critico;
                                          delete next.max_critico;
                                        }
                                        return next;
                                      }
                                    )}
                                  />
                                  Zona amarilla
                                </label>
                              ) : null}
                            </div>

                            {semaphoreParts.length ? (
                              <div className="assignmentSemaphore" aria-label="Bandas del semáforo">
                                {semaphoreParts.map((part, index) => (
                                  <span key={`${part}-${index}`} className={`semaphore-${part}`}>
                                    {part === 'acceptable' ? 'Aceptable' : part === 'warning' ? 'Alerta' : 'Crítico'}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            <div className="assignmentBoundaryGrid">
                              {boundaryKeys.map((boundaryKey) => (
                                <label key={boundaryKey} className="assignmentBoundaryField">
                                  <span>{ASSIGNMENT_BOUNDARY_LABELS[boundaryKey]}</span>
                                  {options.length ? (
                                    <select
                                      value={rule[boundaryKey] ?? ''}
                                      onChange={(event) => updateRowCriterionRule(
                                        criterionModalEffectiveRow.key,
                                        field,
                                        (current) => ({ ...current, [boundaryKey]: event.target.value })
                                      )}
                                    >
                                      <option value="">Seleccione valor</option>
                                      {options.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={['numerica', 'numerico'].includes(field.tipo_comparacion) ? 'number' : 'text'}
                                      step="any"
                                      value={rule[boundaryKey] ?? ''}
                                      onChange={(event) => updateRowCriterionRule(
                                        criterionModalEffectiveRow.key,
                                        field,
                                        (current) => ({ ...current, [boundaryKey]: event.target.value })
                                      )}
                                      placeholder={getLimitFieldPlaceholder(field)}
                                    />
                                  )}
                                </label>
                              ))}
                            </div>

                            <p className="assignmentRuleSummary">{formatAssignmentRuleSummary(field, rule)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )) : (
                  <p className="muted">Esta prueba no tiene campos manuales pendientes de configurar.</p>
                )}
              </div>

              <div className="criterionModalFooter">
                <button type="button" className="btn secondary" onClick={cancelCriterionModal}>Cancelar</button>
                <button type="button" className="btn red" onClick={applyCriterionModal}>
                  <CheckCircle2 size={17} />
                  Aplicar criterio
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <footer className="footerBar">
          <button type="button" className="btn secondary big" disabled={saving} onClick={() => saveAssignment('borrador')}>
            <Save size={18} />
            Guardar borrador
          </button>
          <button type="button" className="btn red big" disabled={saving} onClick={() => saveAssignment('confirmada')}>
            <CheckCircle2 size={18} />
            Confirmar asignación
          </button>
        </footer>
      </div>

      <style jsx global>{`
        .assignPage {
          min-height: auto;
          background: transparent;
          color: white;
          padding: 0 0 18px;
        }

        .assignShell {
          width: 100%;
          max-width: none;
          margin: 0;
        }

        .topBar {
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 10px;
        }

        .titleBlock {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .backBtn,
        .iconBox {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: 1px solid #444;
          background: #121212;
          color: white;
          display: grid;
          place-items: center;
        }

        .backBtn {
          cursor: pointer;
        }

        .titleBlock h1 {
          margin: 0;
          font-size: 26px;
          line-height: 1.1;
        }

        .titleBlock p {
          margin: 4px 0 0;
          color: #c9c9c9;
          font-size: 14px;
        }

        .topActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #444;
          background: #222;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          font-weight: 800;
          cursor: pointer;
          transition: .16s ease;
        }

        .btn:hover {
          filter: brightness(1.1);
        }

        .btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .btn.red {
          background: #ef232a;
          border-color: #ef232a;
          box-shadow: 0 10px 24px rgba(239,35,42,.18);
        }

        .btn.secondary {
          background: #141414;
          border-color: #4a4a4a;
        }

        .btn.linkish {
          background: transparent;
          border-color: transparent;
          color: #ff575d;
          text-decoration: underline;
        }

        .btn.big {
          min-height: 52px;
          padding: 0 24px;
          font-size: 16px;
        }

        .lotHeader {
          display: grid;
          grid-template-columns: 62px minmax(360px, 1.3fr) repeat(6, minmax(120px, 1fr));
          gap: 14px;
          align-items: center;
          border: 1px solid #3a3a3a;
          background: linear-gradient(180deg, rgba(27,27,27,.96), rgba(19,19,19,.96));
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 10px;
        }

        .lotIcon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(239,35,42,.14);
          border: 1px solid rgba(239,35,42,.45);
          color: #ff6369;
        }

        .lotSelectWrap label,
        .lotInfo label,
        .field span {
          display: block;
          color: #aeb6c1;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .09em;
          margin-bottom: 7px;
        }

        .lotSelectorLine {
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr);
          gap: 8px;
        }

        .lotSelectorLine select,
        .searchMini,
        .field input,
        .field select,
        .editorRow input,
        .editorRow select,
        .templateGrid input,
        .templateGrid select {
          width: 100%;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #454545;
          background: #080808;
          color: white;
          padding: 0 10px;
          outline: none;
        }

        .lotSelectorLine select:focus,
        .field input:focus,
        .field select:focus,
        .editorRow input:focus,
        .editorRow select:focus {
          border-color: #ef232a;
          box-shadow: 0 0 0 2px rgba(239,35,42,.14);
        }

        .searchMini {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .searchMini input {
          border: 0;
          outline: 0;
          color: white;
          background: transparent;
          min-width: 0;
          width: 100%;
        }

        .lockedLot {
          min-height: 38px;
          border: 1px solid #454545;
          background: #080808;
          color: #fff;
          border-radius: 8px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          font-weight: 900;
        }

        .lockedLot.action {
          cursor: pointer;
          color: #fecaca;
          border-color: rgba(239,35,42,.45);
        }

        .lotInfo strong,
        .lotInfo .value {
          font-size: 16px;
          color: white;
        }

        .lotInfo .value.strong {
          font-weight: 900;
          font-size: 19px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          border: 1px solid #555;
          border-radius: 999px;
          padding: 4px 10px;
          background: #121212;
          text-transform: capitalize;
        }

        .workGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }

        .workMain {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .flowPanel,
        .rightPanel > section {
          border: 1px solid #3a3a3a;
          background: linear-gradient(180deg, rgba(27,27,27,.96), rgba(18,18,18,.96));
          border-radius: 12px;
        }

        .flowPanel {
          padding: 16px 18px;
        }

        .flowPanel.compact {
          padding: 14px 18px;
        }

        .flowTitle {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .flowTitle > span {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #ef232a;
          display: grid;
          place-items: center;
          font-weight: 950;
          flex-shrink: 0;
        }

        .flowTitle h2 {
          margin: 0;
          font-size: 21px;
        }

        .flowTitle p {
          margin: 3px 0 0;
          color: #bdbdbd;
          font-size: 13px;
        }

        .predefinedLine {
          display: grid;
          grid-template-columns: 250px minmax(280px, 1fr) 150px;
          gap: 14px;
          align-items: end;
        }

        .checkLine,
        .applyLine label {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #e9e9e9;
          font-weight: 700;
        }

        input[type="checkbox"],
        input[type="radio"] {
          accent-color: #ef232a;
        }

        .tableEditor {
          border: 1px solid #393939;
          border-radius: 10px;
          overflow: hidden;
          background: #111;
        }

        .editorRow {
          display: grid;
          grid-template-columns: minmax(190px, 1.25fr) minmax(150px, .9fr) minmax(230px, 1.35fr) minmax(86px, .55fr) 74px;
          gap: 0;
          align-items: center;
          border-top: 1px solid #333;
        }

        .editorRow:first-child {
          border-top: 0;
        }

        .editorHead {
          min-height: 38px;
          background: #242424;
          color: #bdbdbd;
          font-size: 13px;
          font-weight: 800;
        }

        .editorHead div {
          padding: 0 10px;
        }

        .editorRow select,
        .editorRow input {
          border-radius: 0;
          border-width: 0 1px 0 0;
          border-color: #333;
          height: 40px;
          background: #141414;
        }

        .editorRow > *:last-child {
          border-right: 0;
        }

        .criterionCell {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 4px;
          padding: 4px;
          border-right: 1px solid #333;
          min-width: 0;
        }

        .criterionCell select,
        .criterionCell input {
          height: 32px;
          min-height: 32px;
          border: 1px solid #333;
          border-radius: 7px;
          min-width: 0;
        }

        .criterionStack {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .fixedCriterionSource {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 34px;
          padding: 6px 10px;
          border: 1px solid #333;
          background: #191919;
          color: #f5f5f5;
        }

        .fixedCriterionSource small {
          color: #9ca3af;
          font-size: 10px;
          text-transform: uppercase;
        }

        .fixedCriterionSource strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .criterionHint {
          color: #9ed7b0;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.25;
          padding: 0 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .criterionHint.warn {
          color: #facc15;
        }

        .criterionModalButton {
          min-height: 40px;
          width: 100%;
          border: 1px solid #3f4a5f;
          border-radius: 8px;
          background: #151922;
          color: #fff;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          cursor: pointer;
          text-align: left;
        }

        .criterionModalButton.empty {
          border-color: rgba(239, 35, 42, .65);
        }

        .criterionModalButton span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .criterionModalButton small {
          color: #aeb6c1;
          font-size: 11px;
          font-weight: 800;
        }

        .criterionEmpty {
          min-height: 40px;
          display: grid;
          place-items: center;
          color: #8f98a8;
          font-size: 12px;
          font-weight: 800;
          background: #141414;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 22px;
          background: rgba(0, 0, 0, .68);
          backdrop-filter: blur(6px);
        }

        .criterionModal {
          width: min(920px, 100%);
          max-height: min(760px, calc(100vh - 44px));
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          border: 1px solid #404040;
          border-radius: 14px;
          background: #171717;
          color: #fff;
          box-shadow: 0 28px 90px rgba(0, 0, 0, .5);
          overflow: hidden;
        }

        .criterionModalHeader,
        .criterionModalFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 20px;
          border-bottom: 1px solid #333;
        }

        .criterionModalFooter {
          border-top: 1px solid #333;
          border-bottom: 0;
          justify-content: flex-end;
        }

        .criterionModalHeader h2 {
          margin: 0;
          font-size: 24px;
        }

        .criterionModalHeader p {
          margin: 4px 0 0;
          color: #bdbdbd;
        }

        .modalClose {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          border: 1px solid #444;
          background: #111;
          color: #fff;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
        }

        .criterionModalBody {
          overflow: auto;
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .modalCriterionGroup {
          border: 1px solid #333;
          border-radius: 12px;
          background: #111;
          padding: 14px;
          min-width: 0;
        }

        .modalCriterionGroup h3 {
          margin: 0 0 12px;
          font-size: 17px;
          color: #fff;
        }

        .modalCriterionGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .modalCriterionField {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .modalCriterionField span {
          color: #d9d9d9;
          font-size: 13px;
          font-weight: 900;
        }

        .modalCriterionField input,
        .modalCriterionField select {
          min-height: 44px;
          border-radius: 9px;
          border: 1px solid #424242;
          background: #090909;
          color: #fff;
          padding: 0 12px;
          min-width: 0;
        }

        .assignmentRuleBlock {
          display: grid;
          gap: 12px;
          min-width: 0;
          padding: 14px;
          border: 1px solid #303030;
          border-radius: 8px;
          background: #171717;
        }

        .assignmentRuleHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .assignmentRuleHeader > div {
          display: grid;
          gap: 3px;
        }

        .assignmentRuleHeader strong {
          font-size: 15px;
        }

        .assignmentRuleHeader span,
        .assignmentRuleSummary {
          color: #aeb2b9;
          font-size: 12px;
        }

        .assignmentYellowToggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #f4bf00;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .assignmentYellowToggle input {
          width: 16px;
          height: 16px;
          accent-color: #d69800;
        }

        .assignmentSemaphore {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          min-height: 30px;
          overflow: hidden;
          border-radius: 6px;
        }

        .assignmentSemaphore span {
          display: grid;
          place-items: center;
          padding: 6px 8px;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .semaphore-acceptable { background: #17833e; }
        .semaphore-warning { background: #c48a00; }
        .semaphore-critical { background: #c52228; }

        .assignmentBoundaryGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }

        .assignmentBoundaryField {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .assignmentBoundaryField span {
          color: #d9d9d9;
          font-size: 12px;
          font-weight: 800;
        }

        .assignmentBoundaryField input,
        .assignmentBoundaryField select {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          padding: 0 11px;
          border: 1px solid #424242;
          border-radius: 7px;
          background: #090909;
          color: #fff;
        }

        .assignmentRuleSummary {
          margin: 0;
          line-height: 1.45;
        }

        .rowActions {
          display: flex;
          justify-content: center;
          gap: 6px;
        }

        .iconDanger,
        .iconInfo {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid rgba(239,68,68,.35);
          color: #ff676d;
          background: rgba(127,29,29,.22);
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .iconInfo {
          border-color: #454545;
          color: #e5e7eb;
          background: #202020;
        }

        .resultConfigButton {
          min-height: 44px;
          width: 100%;
          display: grid;
          align-content: center;
          gap: 2px;
          padding: 6px 10px;
          border: 1px solid #3d4653;
          border-radius: 8px;
          background: #171b21;
          color: #fff;
          text-align: left;
          cursor: pointer;
        }

        .resultConfigButton strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .resultConfigButton small {
          color: #9ca3af;
          font-size: 10px;
        }

        .resultConfigList,
        .limitInfoList,
        .limitInfoGroups {
          display: grid;
          gap: 10px;
        }

        .resultConfigRow {
          display: grid;
          grid-template-columns: minmax(180px, .8fr) minmax(220px, 1fr);
          gap: 12px;
          align-items: end;
          padding: 12px;
          border: 1px solid #353535;
          border-radius: 8px;
          background: #121212;
        }

        .resultConfigRow label {
          display: grid;
          gap: 5px;
        }

        .resultConfigRow label span {
          color: #aeb4be;
          font-size: 11px;
          font-weight: 700;
        }

        .resultConfigRow select {
          min-height: 40px;
          border: 1px solid #404040;
          border-radius: 7px;
          background: #090909;
          color: #fff;
          padding: 0 9px;
        }

        .inlineUnitCreator {
          display: grid;
          grid-template-columns: minmax(150px, 1fr) repeat(3, minmax(130px, 1fr)) auto;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border: 1px dashed #4a4a4a;
          border-radius: 8px;
        }

        .inlineUnitCreator input {
          min-height: 40px;
          border: 1px solid #404040;
          border-radius: 7px;
          background: #090909;
          color: #fff;
          padding: 0 10px;
        }

        .assignedTestsButton {
          border: 0;
          background: transparent;
          color: #f0f0f0;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }

        .sampleAssignmentList {
          display: grid;
          gap: 8px;
        }

        .sampleAssignmentRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px;
          border: 1px solid #383838;
          border-radius: 7px;
        }

        .sampleAssignmentRow div {
          display: grid;
          gap: 3px;
        }

        .sampleAssignmentRow span {
          color: #aeb4be;
          font-size: 12px;
        }

        .splitFooter {
          justify-content: space-between;
        }

        .limitInfoRow {
          display: grid;
          grid-template-columns: minmax(170px, .7fr) minmax(260px, 1.3fr);
          gap: 12px;
          align-items: start;
          padding: 11px 12px;
          border-bottom: 1px solid #333;
        }

        .limitInfoRow:last-child {
          border-bottom: 0;
        }

        .limitInfoRow strong,
        .limitInfoRow small {
          display: block;
        }

        .limitInfoRow small,
        .limitInfoRow span {
          color: #aeb4be;
          font-size: 12px;
        }

        .limitInfoGroup {
          overflow: hidden;
          border: 1px solid #353535;
          border-radius: 8px;
          background: #121212;
        }

        .limitInfoGroup > header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 11px 12px;
          background: #242424;
        }

        .limitInfoGroup > header div {
          display: flex;
          align-items: baseline;
          gap: 9px;
        }

        .limitInfoGroup > header span,
        .limitInfoGroup > header small {
          color: #aeb4be;
          font-size: 11px;
        }

        .limitBandsCompact {
          display: grid;
          gap: 5px;
        }

        .limitBandsCompact span {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          line-height: 1.4;
        }

        .limitBandsCompact i {
          flex: 0 0 auto;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          margin-top: 4px;
          background: #22c55e;
        }

        .limitBandsCompact .bandWarning i { background: #eab308; }
        .limitBandsCompact .bandCritical i { background: #ef233c; }

        .underTableActions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .applyLine {
          display: flex;
          flex-wrap: wrap;
          gap: 22px;
          align-items: center;
          margin-bottom: 10px;
          color: #dcdcdc;
        }

        .applyLine span {
          color: #aeb6c1;
          font-size: 13px;
        }

        .samplesTableWrap {
          border: 1px solid #393939;
          border-radius: 10px;
          overflow: auto;
          max-height: 260px;
          background: #111;
        }

        .samplesTable {
          width: 100%;
          min-width: 980px;
          border-collapse: collapse;
        }

        .samplesTable th,
        .samplesTable td {
          padding: 10px 12px;
          border-top: 1px solid #333;
          text-align: left;
          vertical-align: middle;
        }

        .samplesTable th {
          background: #242424;
          color: #bdbdbd;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .samplesTable tr:first-child th,
        .samplesTable tbody tr:first-child td {
          border-top: 0;
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .techAttrs {
          max-width: 300px;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.35;
          white-space: normal;
        }

        .statusPill {
          display: inline-flex;
          align-items: center;
          border: 1px solid #555;
          border-radius: 999px;
          padding: 4px 9px;
          background: #141414;
          color: #e7e7e7;
          font-size: 12px;
        }

        .rightPanel {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          position: static;
        }

        .helpBox,
        .miniBox {
          padding: 16px;
        }

        .helpBox h3,
        .miniBox h3 {
          margin: 0 0 10px;
          font-size: 17px;
        }

        .helpBox p,
        .muted {
          color: #c0c0c0;
          line-height: 1.45;
          margin: 0;
        }

        .miniStat {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid #333;
          padding: 10px 0;
        }

        .miniStat:first-of-type {
          border-top: 0;
        }

        .miniStat span {
          color: #bdbdbd;
        }

        .assignmentList {
          display: grid;
          gap: 8px;
          max-height: 330px;
          overflow: auto;
        }

        .assignmentItem {
          border: 1px solid #333;
          background: #111;
          border-radius: 10px;
          padding: 10px;
          display: grid;
          gap: 3px;
        }

        .assignmentItem span {
          color: #aaa;
          font-size: 12px;
        }

        .templatePanel {
          border-color: rgba(59,130,246,.35);
        }

        .templateGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .compactCheck {
          margin-top: 10px;
        }

        .footerBar {
          position: sticky;
          bottom: 0;
          z-index: 20;
          border: 1px solid #3a3a3a;
          background: linear-gradient(180deg, rgba(34,34,34,.98), rgba(18,18,18,.98));
          min-height: 66px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          margin-top: 10px;
          border-radius: 12px;
          box-shadow: 0 -10px 28px rgba(0,0,0,.28);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1350px) {
          .lotHeader {
            grid-template-columns: 56px minmax(340px, 1.5fr) repeat(3, minmax(120px, 1fr));
          }

          .workGrid {
            grid-template-columns: 1fr;
          }

          .rightPanel {
            position: static;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1000px) {
          .assignPage {
            padding: 0 0 18px;
          }

          .topBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .lotHeader,
          .predefinedLine,
          .templateGrid {
            grid-template-columns: 1fr;
          }

          .lotSelectorLine {
            grid-template-columns: 1fr;
          }

          .rightPanel {
            grid-template-columns: 1fr;
          }

          .tableEditor,
          .samplesTableWrap { overflow-x: hidden; }

          .editorHead { display: none; }
          .editorRow {
            grid-template-columns: minmax(0, 1fr);
            gap: 8px;
            padding: 14px;
            border: 1px solid #333;
            border-radius: 9px;
            margin-bottom: 10px;
          }
          .editorRow select,
          .editorRow input,
          .criterionCell,
          .editorRow > * { width: 100%; min-width: 0; }

          .resultConfigRow,
          .limitInfoRow {
            grid-template-columns: 1fr;
          }

          .inlineUnitCreator {
            grid-template-columns: 1fr;
          }

          .splitFooter {
            align-items: stretch;
            flex-direction: column;
          }

          .footerBar {
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

const LotInfo = ({ label, value, strong = false, pill = false }) => (
  <div className="lotInfo">
    <label>{label}</label>
    <div className={`${pill ? 'pill' : 'value'} ${strong ? 'strong' : ''}`}>{value}</div>
  </div>
);
