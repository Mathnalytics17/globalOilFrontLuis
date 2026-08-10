
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pencil, Plus, Save, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { dynamicTechnicalConfigService as api } from '../../infrastructure/dynamicTechnicalConfigService';
import { normalizeList, slugify, buildErrorMessage } from '../components/technicalConfigUtils';
import styles from './TechnicalLimitsFinalPage.module.css';

const STEPS = ['Prueba', 'Estructura', 'Origen', 'Matriz y semaforo', 'Resumen'];
const OPERATORS = [
  ['max', 'Maximo (<=)'], ['min', 'Minimo (>=)'], ['between', 'Rango'], ['eq', 'Igual'], ['neq', 'Diferente'],
];
const SEMAPHORE_OPERATORS = new Set(['max', 'min', 'between']);
const SOURCE_LABELS = {
  catalogo: 'Catalogo tecnico',
  directo: 'Valor fijo',
  asignacion: 'Editable al asignar',
  escala: 'Escala del campo',
  booleano: 'Valor esperado',
  informativo: 'Informativo',
};

const idOf = (value) => value?.id ?? value?.pk ?? value ?? '';
const labelOf = (value) => value?.nombre_visible || value?.nombre_variable || value?.nombre || value?.etiqueta || value?.label || value?.titulo || value?.value || value?.valor || value?.codigo || value?.acronimo || '';
const list = (value) => normalizeList(value).filter((item) => item?.activo !== false && !item?.deleted_at);
const isCommentType = (field) => ['comentario', 'texto_largo', 'informativo'].includes(String(field?.tipo || field?.tipo_comparacion || '').toLowerCase());
const firstNonEmpty = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== '');
const fieldOptionList = (field) => list(
  field?.opciones_resultado
  || field?.opciones
  || field?.options
  || field?.items
  || field?.escala_comparacion_info?.items
  || field?.escala_info?.items
);
const optionValue = (option) => option?.value ?? option?.valor ?? option?.valor_normalizado ?? option?.etiqueta ?? option?.label ?? option?.nombre ?? option;
const optionLabel = (option) => option?.label ?? option?.etiqueta ?? option?.nombre ?? option?.valor ?? option?.value ?? option;
const getTrueLabel = (field) => firstNonEmpty(
  optionLabel(fieldOptionList(field)[0]),
  field.trueLabel,
  field.etiqueta_verdadero,
  field.componente_info?.etiqueta_verdadero,
  field.opciones_booleanas?.verdadero,
  field.opciones_booleanas?.true,
  field.opciones_resultado?.verdadero,
  field.opciones_resultado?.true,
  'Si'
);
const getFalseLabel = (field) => firstNonEmpty(
  optionLabel(fieldOptionList(field)[1]),
  field.falseLabel,
  field.etiqueta_falso,
  field.componente_info?.etiqueta_falso,
  field.opciones_booleanas?.falso,
  field.opciones_booleanas?.false,
  field.opciones_resultado?.falso,
  field.opciones_resultado?.false,
  'No'
);
const booleanOptions = (field) => ([
  { value: 'true', label: getTrueLabel(field) },
  { value: 'false', label: getFalseLabel(field) },
]);
const scaleIdOf = (value) => String(idOf(
  value?.escala_comparacion
  || value?.escala_comparacion_id
  || value?.escala
  || value?.escala_id
  || value?.escala_info
  || value?.escala_comparacion_info
  || ''
));
const scaleItemsForField = (field, scaleItemsByScale) => {
  const scaleId = scaleIdOf(field);
  const configuredItems = scaleId ? (scaleItemsByScale.get(scaleId) || []) : [];
  if (configuredItems.length) return configuredItems;
  return fieldOptionList(field).map((item, index) => ({
    id: item?.id ?? `${field.codigo || 'field'}_${index}`,
    etiqueta: optionLabel(item),
    valor_normalizado: optionValue(item),
    activo: item?.activo,
  }));
};
const normalizeBoolText = (value) => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalizeBooleanLimitValue = (field, value) => {
  if (field?.tipo_comparacion !== 'booleano' || value === null || value === undefined || value === '') return value || '';
  const options = booleanOptions(field);
  const text = normalizeBoolText(value);
  if (['true', '1', 'si', 'yes', 'presente', 'hay', normalizeBoolText(options[0].label)].includes(text)) return 'true';
  if (['false', '0', 'no', 'ausente', 'no hay', normalizeBoolText(options[1].label)].includes(text)) return 'false';
  return value;
};

function flattenTest(test) {
  const rows = [];
  list(test?.resultados || test?.results).forEach((result) => {
    const divisions = list(result.divisiones || result.divisions);
    const containers = divisions.length ? divisions : [{ id: null, nombre: '', componentes: result.componentes || [] }];
    containers.forEach((division) => {
      const components = list(division.componentes || division.components || division.campos || division.fields);
      if (!components.length) {
        rows.push({
          resultado: idOf(result),
          resultadoNombre: labelOf(result) || 'Resultado principal',
          division: idOf(division),
          divisionNombre: labelOf(division),
          componente: null,
          nombre: labelOf(result) || 'Resultado',
          codigo: slugify(labelOf(result) || 'resultado'),
          tipo: result.tipo_resultado || result.tipo_dato || 'numerico',
          unidad: result.unidad_medida || '',
          escala: scaleIdOf(result),
          opciones_resultado: result.opciones_resultado || result.opciones || result.options || [],
          trueLabel: getTrueLabel(result),
          falseLabel: getFalseLabel(result),
          etiqueta_verdadero: getTrueLabel(result),
          etiqueta_falso: getFalseLabel(result),
        });
      }
      components.forEach((component) => rows.push({
        resultado: idOf(result), resultadoNombre: labelOf(result) || 'Resultado principal', division: idOf(division), divisionNombre: labelOf(division),
        componente: idOf(component), nombre: labelOf(component) || labelOf(result), codigo: slugify(`${labelOf(result)}_${labelOf(division)}_${labelOf(component)}`),
        tipo: component.tipo_dato || component.tipo_resultado || 'numerico',
        unidad: result.unidad_catalogo_info?.simbolo || result.unidad_medida || '',
        escala: scaleIdOf(component),
        opciones_resultado: component.opciones_resultado || component.opciones || component.options || component.escala_comparacion_info?.items || component.escala_info?.items || [],
        trueLabel: getTrueLabel(component), falseLabel: getFalseLabel(component),
        etiqueta_verdadero: getTrueLabel(component), etiqueta_falso: getFalseLabel(component),
      }));
    });
  });
  return rows;
}

function defaultSourceForType(type) {
  if (['comentario', 'texto_largo', 'informativo'].includes(type)) return 'informativo';
  if (type === 'escala' || type === 'escala_ordinal') return 'escala';
  if (type === 'booleano') return 'booleano';
  return 'catalogo';
}

function defaultField(row) {
  const rawType = String(row.tipo || '').toLowerCase();
  const type = rawType === 'escala_ordinal' ? 'escala' : rawType;
  const comment = ['comentario', 'texto_largo', 'informativo'].includes(type);
  const source = defaultSourceForType(type);
  return {
    ...row,
    tipo_comparacion: type === 'booleano' ? 'booleano' : type === 'escala' ? 'escala' : comment ? 'comentario' : 'numerica',
    operador: type === 'booleano' ? 'eq' : type === 'escala' ? 'max' : 'max',
    escala_comparacion: row.escala || '',
    origen_limite: source,
    participa: !comment,
    evalua: !comment,
    informativo: comment,
    valor_global: source === 'booleano' ? { valor_esperado: 'false' } : {},
  };
}

function normalizeLimitRule(value, operator = 'max') {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : { valor_esperado: value, limite: value };
  const yellow = raw.usar_amarillo ?? SEMAPHORE_OPERATORS.has(operator);

  if (operator === 'eq' || operator === 'neq') {
    return {
      valor_esperado: firstNonEmpty(raw.valor_esperado, raw.limite, ''),
      usar_amarillo: false,
    };
  }
  if (operator === 'min') {
    return {
      min_critico: firstNonEmpty(raw.min_critico, ''),
      min_aceptable: firstNonEmpty(raw.min_aceptable, raw.min, raw.limite, raw.valor_esperado, ''),
      usar_amarillo: yellow,
    };
  }
  if (operator === 'between') {
    return {
      min_critico: firstNonEmpty(raw.min_critico, ''),
      min_aceptable: firstNonEmpty(raw.min_aceptable, raw.min, ''),
      max_aceptable: firstNonEmpty(raw.max_aceptable, raw.max, ''),
      max_critico: firstNonEmpty(raw.max_critico, ''),
      usar_amarillo: yellow,
    };
  }
  return {
    max_aceptable: firstNonEmpty(raw.max_aceptable, raw.max, raw.limite, raw.valor_esperado, ''),
    max_critico: firstNonEmpty(raw.max_critico, ''),
    usar_amarillo: yellow,
  };
}

function operatorsForField(field) {
  if (field.tipo_comparacion === 'booleano') return OPERATORS.filter(([value]) => ['eq', 'neq'].includes(value));
  return OPERATORS;
}

function requiredBoundaryKeys(operator, yellow) {
  if (operator === 'min') return yellow ? ['min_critico', 'min_aceptable'] : ['min_aceptable'];
  if (operator === 'between') return yellow
    ? ['min_critico', 'min_aceptable', 'max_aceptable', 'max_critico']
    : ['min_aceptable', 'max_aceptable'];
  if (operator === 'max') return yellow ? ['max_aceptable', 'max_critico'] : ['max_aceptable'];
  return ['valor_esperado'];
}

function validateRule(field, rawRule, context, scaleItems = []) {
  if (field.origen_limite === 'asignacion' || field.origen_limite === 'informativo') return '';
  const rule = normalizeLimitRule(rawRule, field.operador);
  const missing = requiredBoundaryKeys(field.operador, rule.usar_amarillo)
    .find((key) => rule[key] === '' || rule[key] === null || rule[key] === undefined);
  if (missing) return `${context}: complete todos los valores visibles del limite.`;

  if (field.tipo_comparacion === 'escala') {
    const position = (value) => scaleItems.findIndex((item) => String(optionValue(item)) === String(value));
    if (requiredBoundaryKeys(field.operador, rule.usar_amarillo).some((key) => position(rule[key]) < 0)) {
      return `${context}: seleccione valores vigentes de la escala.`;
    }
    const minCritical = position(rule.min_critico);
    const minAcceptable = position(rule.min_aceptable);
    const maxAcceptable = position(rule.max_aceptable);
    const maxCritical = position(rule.max_critico);
    if (field.operador === 'between' && minAcceptable > maxAcceptable) {
      return `${context}: el minimo aceptable debe aparecer antes del maximo aceptable en la escala.`;
    }
    if (rule.usar_amarillo && ['min', 'between'].includes(field.operador) && minCritical > minAcceptable) {
      return `${context}: el minimo critico debe aparecer antes del minimo aceptable en la escala.`;
    }
    if (rule.usar_amarillo && ['max', 'between'].includes(field.operador) && maxAcceptable > maxCritical) {
      return `${context}: el maximo aceptable debe aparecer antes del maximo critico en la escala.`;
    }
    return '';
  }

  const numeric = ['numerica', 'numero', 'numeric'].includes(field.tipo_comparacion);
  if (!numeric || ['eq', 'neq'].includes(field.operador)) return '';
  const number = (value) => value === '' || value === null || value === undefined ? null : Number(value);
  const minCritical = number(rule.min_critico);
  const minAcceptable = number(rule.min_aceptable);
  const maxAcceptable = number(rule.max_aceptable);
  const maxCritical = number(rule.max_critico);
  if ([minCritical, minAcceptable, maxAcceptable, maxCritical].some((value) => value !== null && !Number.isFinite(value))) {
    return `${context}: todos los limites deben ser numericos.`;
  }
  if (minAcceptable !== null && maxAcceptable !== null && minAcceptable > maxAcceptable) {
    return `${context}: el minimo aceptable no puede superar el maximo aceptable.`;
  }
  if (rule.usar_amarillo && minCritical !== null && minAcceptable !== null && minCritical > minAcceptable) {
    return `${context}: el minimo critico no puede superar el minimo aceptable.`;
  }
  if (rule.usar_amarillo && maxAcceptable !== null && maxCritical !== null && maxAcceptable > maxCritical) {
    return `${context}: el maximo aceptable no puede superar el maximo critico.`;
  }
  return '';
}

function sourceOptionsForField(field) {
  if (isCommentType(field)) return ['informativo'];
  if (field.tipo_comparacion === 'escala') return ['escala', 'directo', 'asignacion', 'informativo'];
  if (field.tipo_comparacion === 'booleano') return ['booleano', 'asignacion', 'informativo'];
  return ['catalogo', 'directo', 'asignacion', 'informativo'];
}

function groupByResult(fields) {
  const groups = [];
  fields.forEach((field) => {
    const key = String(field.resultado || 'principal');
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, title: field.resultadoNombre || 'Resultado principal', fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  });
  return groups;
}

function buildCatalogCombinations(selectedCatalogs, catalogs, items) {
  const selected = selectedCatalogs.map((id) => catalogs.find((catalog) => String(catalog.id) === String(id))).filter(Boolean);
  if (!selected.length) return [];
  const optionGroups = selected.map((catalog) => ({ catalog, items: items.filter((item) => String(idOf(item.catalogo)) === String(catalog.id) || String(item.catalogo_info?.id) === String(catalog.id)) })).filter((group) => group.items.length);
  if (!optionGroups.length) return [];
  const combine = (index, acc) => {
    if (index >= optionGroups.length) return [acc];
    return optionGroups[index].items.flatMap((item) => combine(index + 1, [...acc, { catalogo: optionGroups[index].catalog.id, catalogo_nombre: labelOf(optionGroups[index].catalog), item: item.id, item_nombre: labelOf(item) }]));
  };
  return combine(0, []).map((selecciones, index) => ({ key: `catalog-${selecciones.map((s) => s.item).join('-')}`, nombre: selecciones.map((s) => s.item_nombre).join(' / '), tipo_criterio: 'catalogo_item', catalogo_item: selecciones.length === 1 ? selecciones[0].item : null, selecciones_catalogo: selecciones, valores: {}, orden: index + 1 }));
}

function mergeExistingCriteria(rows, criteria) {
  return rows.map((row) => {
    const old = criteria.find((item) => (
      (item.key && row.key && item.key === row.key)
      || (item.nombre && row.nombre && item.nombre === row.nombre)
      || (item.codigo && row.codigo && item.codigo === row.codigo)
    ));
    return { ...row, valores: old?.valores || old?.valores_limite || row.valores || {} };
  });
}

function valueInputForField(field, value, onChange, scaleItems = []) {
  const rule = normalizeLimitRule(value, field.operador);
  const patch = (changes) => onChange({ ...rule, ...changes });
  if (field.origen_limite === 'asignacion') return <span className={styles.inlineNote}>Se captura al asignar</span>;
  if (field.tipo_comparacion === 'booleano') return <select value={normalizeBooleanLimitValue(field, rule.valor_esperado)} onChange={(event) => patch({ valor_esperado: event.target.value, usar_amarillo: false })}>{booleanOptions(field).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  const isScale = field.tipo_comparacion === 'escala';
  if (['eq', 'neq'].includes(field.operador)) {
    if (isScale) return <BoundaryInput field={field} boundary="valor_esperado" value={rule.valor_esperado} onChange={(next) => patch({ valor_esperado: next, usar_amarillo: false })} scaleItems={scaleItems} />;
    return <input value={rule.valor_esperado || ''} placeholder="Valor esperado" onChange={(event) => patch({ valor_esperado: event.target.value, usar_amarillo: false })} />;
  }
  return <SemaphoreRuleEditor field={field} rule={rule} patch={patch} scaleItems={scaleItems} />;
}

const BOUNDARY_LABELS = {
  min_critico: 'Min. critico',
  min_aceptable: 'Min. aceptable',
  max_aceptable: 'Max. aceptable',
  max_critico: 'Max. critico',
  valor_esperado: 'Valor esperado',
};

function BoundaryInput({ field, boundary, value, onChange, scaleItems }) {
  if (field.tipo_comparacion === 'escala') {
    return (
      <label className={styles.boundaryField}>
        <span>{BOUNDARY_LABELS[boundary]}</span>
        <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">{scaleItems.length ? 'Seleccione' : 'Escala sin valores'}</option>
          {scaleItems.map((item) => <option key={item.id} value={optionValue(item)}>{optionLabel(item)}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className={styles.boundaryField}>
      <span>{BOUNDARY_LABELS[boundary]}</span>
      <input type="number" value={value ?? ''} onChange={(event) => onChange(event.target.value)} placeholder="Valor" />
    </label>
  );
}

function SemaphoreRuleEditor({ field, rule, patch, scaleItems }) {
  const yellow = !!rule.usar_amarillo;
  const boundaries = field.operador === 'between'
    ? (yellow ? ['min_critico', 'min_aceptable', 'max_aceptable', 'max_critico'] : ['min_aceptable', 'max_aceptable'])
    : field.operador === 'min'
      ? (yellow ? ['min_critico', 'min_aceptable'] : ['min_aceptable'])
      : (yellow ? ['max_aceptable', 'max_critico'] : ['max_aceptable']);
  const bandClass = field.operador === 'between'
    ? (yellow ? styles.bandRange : styles.bandRangeSimple)
    : field.operador === 'min'
      ? (yellow ? styles.bandMinimum : styles.bandMinimumSimple)
      : (yellow ? styles.bandMaximum : styles.bandMaximumSimple);

  return (
    <div className={styles.semaphoreEditor}>
      <div className={`${styles.semaphoreBand} ${bandClass}`} aria-label="Vista del semaforo">
        {(field.operador === 'between' || field.operador === 'min') && <i className={styles.redZone}>Critico</i>}
        {yellow && (field.operador === 'between' || field.operador === 'min') && <i className={styles.yellowZone}>Alerta</i>}
        <i className={styles.greenZone}>Aceptable</i>
        {yellow && (field.operador === 'between' || field.operador === 'max') && <i className={styles.yellowZone}>Alerta</i>}
        {(field.operador === 'between' || field.operador === 'max') && <i className={styles.redZone}>Critico</i>}
      </div>
      <div className={styles.boundaryGrid} style={{ gridTemplateColumns: `repeat(${boundaries.length}, minmax(110px, 1fr))` }}>
        {boundaries.map((boundary) => (
          <BoundaryInput
            key={boundary}
            field={field}
            boundary={boundary}
            value={rule[boundary]}
            onChange={(next) => patch({ [boundary]: next })}
            scaleItems={scaleItems}
          />
        ))}
      </div>
      <label className={styles.yellowToggle}>
        <input type="checkbox" checked={yellow} onChange={(event) => patch({ usar_amarillo: event.target.checked })} />
        <span>Zona amarilla</span>
        <small>{yellow ? 'Advierte antes de llegar a critico' : 'Fuera de aceptable pasa directo a critico'}</small>
      </label>
    </div>
  );
}

function LimitValueInput({ field, value, onChange, scaleItemsByScale }) {
  const scaleItems = scaleItemsForField(field, scaleItemsByScale);
  return valueInputForField(field, value, onChange, scaleItems);
}

async function loadTestDetail(testLike) {
  const testId = idOf(testLike);
  if (!testId) return testLike;
  const hasCompleteStructure = list(testLike?.resultados || testLike?.results).every((result) => (
    list(result?.divisiones || result?.divisions).length > 0
  ));
  if (hasCompleteStructure && list(testLike?.resultados || testLike?.results).length) return testLike;
  return api.tests.get(testId);
}

function mergeConfiguredField(field, saved) {
  if (!saved) return field;

  const allowedOperators = new Set(operatorsForField(field).map(([value]) => value));
  const operator = allowedOperators.has(saved.operador) ? saved.operador : field.operador;
  const source = saved.origen_limite || field.origen_limite;
  const informative = source === 'informativo' || field.tipo_comparacion === 'comentario';

  return {
    ...field,
    operador: operator,
    origen_limite: informative ? 'informativo' : source,
    participa: informative ? false : (saved.participa ?? field.participa),
    evalua: informative ? false : (saved.evalua ?? field.evalua),
    informativo: informative ? true : (saved.informativo ?? field.informativo),
    valor_global: normalizeLimitRule(
      saved.valor_global ?? saved.limite ?? field.valor_global,
      operator,
    ),
    evaluacion_booleano: saved.evaluacion_booleano ?? field.evaluacion_booleano,
  };
}

export default function TechnicalLimitsFinalPage({ initialMode = 'list', initialSourceId = '' }) {
  const router = useRouter();
  const editing = initialMode === 'edit';
  const listing = initialMode === 'list';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [tests, setTests] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [items, setItems] = useState([]);
  const [scales, setScales] = useState([]);
  const [scaleItems, setScaleItems] = useState([]);
  const [sources, setSources] = useState([]);
  const [test, setTest] = useState(null);
  const [fields, setFields] = useState([]);
  const [selectedCatalogs, setSelectedCatalogs] = useState([]);
  const [criteria, setCriteria] = useState([]);

  const reload = async () => {
    setLoading(true);
    try {
      const [testData, catalogData, itemData, scaleData, scaleItemData, sourceData] = await Promise.all([
        api.listTests({ page_size: 1000 }),
        api.listCatalogs({ page_size: 1000 }),
        api.listCatalogItems({ page_size: 1000 }),
        api.listComparisonScales({ page_size: 1000 }),
        api.listComparisonScaleItems({ page_size: 1000 }),
        api.listLimitSources({ page_size: 1000 }),
      ]);
      setTests(list(testData));
      setCatalogs(list(catalogData));
      setItems(list(itemData));
      setScales(list(scaleData));
      setScaleItems(list(scaleItemData));
      setSources(list(sourceData));
    } catch (error) {
      toast.error(buildErrorMessage(error, 'No fue posible cargar la configuracion.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const pruebaId = router.query.prueba;
    if (!pruebaId || !tests.length || test) return;
    const found = tests.find((item) => String(item.id) === String(pruebaId));
    if (found) selectTest(found);
  }, [router.query.prueba, tests, test]);

  useEffect(() => {
    if (!editing || !sources.length || !tests.length) return;
    const sourceId = initialSourceId || router.query.id;
    const source = sources.find((item) => String(item.id) === String(sourceId));
    if (!source) return;
    let cancelled = false;
    const hydrate = async () => {
      try {
        const sourceTestId = idOf(source.prueba) || idOf(source.prueba_info);
        const sourceTest = await loadTestDetail(tests.find((item) => String(item.id) === String(sourceTestId)) || source.prueba_info || source.prueba);
        if (cancelled) return;
        const baseFields = flattenTest(sourceTest).map(defaultField);
        const configFields = Array.isArray(source.configuracion_regla?.campos) ? source.configuracion_regla.campos : [];
        const hydrated = baseFields.map((field) => {
          const old = configFields.find((item) => String(item.codigo) === String(field.codigo) || (String(item.resultado || '') === String(field.resultado || '') && String(item.componente || '') === String(field.componente || '')));
          return mergeConfiguredField(field, old);
        });
        setTest(sourceTest);
        setFields(hydrated);
        const existingCriteria = list(source.criterios || source.criterios_limite);
        const savedCatalogs = list(source.catalogos_limite || source.catalogos_configurados)
          .map((item) => String(idOf(item.catalogo || item)))
          .filter(Boolean);
        const inferredCatalogs = existingCriteria.flatMap((criterion) =>
          list(criterion.selecciones_catalogo).map((selection) => String(idOf(selection.catalogo || selection.catalogo_info)))
        ).filter(Boolean);
        setSelectedCatalogs([...new Set(savedCatalogs.length ? savedCatalogs : inferredCatalogs)]);
        setCriteria(existingCriteria);
      } catch (error) {
        toast.error(buildErrorMessage(error, 'No fue posible cargar la estructura de la prueba.'));
      }
    };
    hydrate();
    return () => { cancelled = true; };
  }, [editing, sources, tests, initialSourceId, router.query.id]);

  const selectTest = async (selected) => {
    try {
      const detail = await loadTestDetail(selected);
      setTest(detail);
      setFields(flattenTest(detail).map(defaultField));
      setSelectedCatalogs([]);
      setCriteria([]);
    } catch (error) {
      toast.error(buildErrorMessage(error, 'No fue posible cargar la estructura de la prueba.'));
    }
  };

  const catalogFields = useMemo(() => fields.filter((field) => field.participa && field.origen_limite === 'catalogo'), [fields]);
  const directFields = useMemo(() => fields.filter((field) => field.participa && ['directo', 'escala', 'booleano', 'asignacion'].includes(field.origen_limite)), [fields]);
  const evaluableFields = useMemo(() => fields.filter((field) => field.participa && field.origen_limite !== 'informativo'), [fields]);
  const compound = evaluableFields.length > 1 || new Set(evaluableFields.map((field) => field.resultado)).size > 1;
  const allCommentOnly = fields.length > 0 && !evaluableFields.length;
  const generatedCatalogCriteria = useMemo(() => buildCatalogCombinations(selectedCatalogs, catalogs, items), [selectedCatalogs, catalogs, items]);
  const catalogCriteria = useMemo(() => mergeExistingCriteria(generatedCatalogCriteria, criteria), [generatedCatalogCriteria, criteria]);
  const scaleItemsByScale = useMemo(() => {
    const map = new Map();
    const allItems = [
      ...scaleItems,
      ...scales.flatMap((scale) => list(scale.items).map((item) => ({ ...item, escala: scale.id, escala_info: scale }))),
    ];
    allItems.forEach((item) => {
      const scaleId = scaleIdOf(item);
      if (!scaleId) return;
      if (!map.has(scaleId)) map.set(scaleId, []);
      map.get(scaleId).push(item);
    });
    return map;
  }, [scaleItems, scales]);
  const scaleFieldsWithoutItems = useMemo(() => fields.filter((field) => (
    field.participa
    && field.origen_limite !== 'informativo'
    && field.tipo_comparacion === 'escala'
    && !scaleItemsForField(field, scaleItemsByScale).length
  )), [fields, scaleItemsByScale]);

  const updateField = (code, patch) => setFields((current) => current.map((field) => {
    if (field.codigo !== code) return field;
    const next = { ...field, ...patch };
    if (patch.origen_limite === 'informativo') Object.assign(next, { participa: false, evalua: false, informativo: true });
    if (patch.origen_limite && patch.origen_limite !== 'informativo') Object.assign(next, { participa: true, evalua: true, informativo: false });
    if (patch.origen_limite === 'booleano' && !next.valor_global) next.valor_global = 'false';
    return next;
  }));

  const setCriterionValue = (criterionKey, fieldCode, value) => setCriteria((current) => {
    const rows = catalogCriteria.map((row) => ({ ...row, valores: { ...(row.valores || {}) } }));
    const index = rows.findIndex((row) => row.key === criterionKey);
    if (index >= 0) rows[index].valores[fieldCode] = value;
    return rows;
  });

  const nextError = () => {
    if (step === 0 && !test) return 'Seleccione una prueba.';
    if (step === 2 && catalogFields.length && !selectedCatalogs.length) return 'Seleccione al menos un catalogo para los campos que dependen de catalogo.';
    if (step === 3 && scaleFieldsWithoutItems.length) return `La prueba tiene campos de escala sin escala asociada: ${scaleFieldsWithoutItems.map((field) => field.nombre).join(', ')}. Edite la prueba y asigne la escala en su estructura.`;
    if (step === 3 && catalogFields.length && !catalogCriteria.length) return 'El catalogo seleccionado no tiene valores disponibles.';
    if (step === 3) {
      for (const field of directFields) {
        const error = validateRule(field, field.valor_global, field.nombre, scaleItemsForField(field, scaleItemsByScale));
        if (error) return error;
      }
      for (const criterion of catalogCriteria) {
        for (const field of catalogFields) {
          const error = validateRule(
            field,
            criterion.valores?.[field.codigo],
            `${criterion.nombre} / ${field.nombre}`,
            scaleItemsForField(field, scaleItemsByScale),
          );
          if (error) return error;
        }
      }
    }
    return '';
  };

  const next = () => {
    const error = nextError();
    if (error) return toast.warn(error);
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const save = async () => {
    const error = nextError();
    if (error) return toast.warn(error);
    setSaving(true);
    try {
      const hasCatalog = catalogFields.length > 0;
      const payload = {
        prueba: idOf(test),
        fuente: hasCatalog ? 'catalogos' : 'global',
        catalogos: hasCatalog ? selectedCatalogs.map((catalogo, index) => ({ catalogo, orden: index + 1 })) : [],
        campos: fields.map((field) => ({
          codigo: field.codigo,
          resultado: field.resultado,
          division: field.division,
          componente: field.componente,
          nombre: field.nombre,
          tipo_comparacion: field.tipo_comparacion,
          escala_comparacion: field.escala_comparacion,
          operador: field.operador,
          participa: !!field.participa,
          evalua: !!field.evalua,
          informativo: !!field.informativo,
          origen_limite: field.origen_limite,
          valor_global: normalizeLimitRule(field.valor_global, field.operador),
        })),
        criterios: hasCatalog ? catalogCriteria.map((row) => ({
          ...row,
          valores: Object.fromEntries(catalogFields.map((field) => [
            field.codigo,
            normalizeLimitRule(row.valores?.[field.codigo], field.operador),
          ])),
        })) : [],
        decision: {
          modo: 'semaforo',
          version: 3,
          informativos: fields.filter((field) => field.informativo || field.origen_limite === 'informativo').map((field) => field.codigo),
          campos: fields,
        },
        reglas_resultados: {},
      };
      await api.limitSources.configure(payload);
      toast.success('Configuracion de limites guardada.');
      router.push('/configuracion-tecnica/limites');
    } catch (error) {
      toast.error(buildErrorMessage(error, 'No fue posible guardar los limites.'));
    } finally {
      setSaving(false);
    }
  };

  if (listing) return <ListPage loading={loading} sources={sources} onReload={reload} />;

  return (
    <main className={styles.page}>
      <Link href="/configuracion-tecnica/limites" className={styles.back}><ArrowLeft size={18} /> Límites por prueba</Link>
      <header className={styles.header}><div><h1>{editing ? 'Editar configuración de límites' : 'Nueva configuración de límites'}</h1></div><p>La estructura viene de la prueba. Cada campo define su propio origen de límite.</p></header>
      <nav className={styles.steps} style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>{STEPS.map((name, index) => <button key={name} className={index === step ? styles.activeStep : index < step ? styles.doneStep : ''} onClick={() => setStep(index)}><span>{index < step ? <Check size={16} /> : index + 1}</span>{name}</button>)}</nav>
      <section className={styles.panel}>
        {loading && <p>Cargando...</p>}
        {!loading && step === 0 && <TestStep tests={tests} selected={test} onSelect={selectTest} />}
        {!loading && step === 1 && <StructureTable fields={fields} />}
        {!loading && step === 2 && <SourceMapStep fields={fields} catalogs={catalogs} selectedCatalogs={selectedCatalogs} setSelectedCatalogs={setSelectedCatalogs} updateField={updateField} />}
        {!loading && step === 3 && <MatrixStep fields={fields} catalogFields={catalogFields} directFields={directFields} selectedCatalogs={selectedCatalogs} catalogs={catalogs} criteria={catalogCriteria} setCriterionValue={setCriterionValue} updateField={updateField} scaleItemsByScale={scaleItemsByScale} />}
        {!loading && step === 4 && <Preview test={test} fields={fields} catalogFields={catalogFields} directFields={directFields} criteria={catalogCriteria} selectedCatalogs={selectedCatalogs} />}
      </section>
      <footer className={styles.footer}>{step > 0 && <button className={styles.secondary} onClick={() => setStep((value) => value - 1)}>Anterior</button>}{step < STEPS.length - 1 ? <button onClick={next}>Siguiente <ChevronRight size={18} /></button> : <button onClick={save} disabled={saving}><Save size={18} /> {saving ? 'Guardando...' : 'Guardar configuración'}</button>}</footer>
    </main>
  );
}

function ListPage({ loading, sources, onReload }) {
  const sourceTestLabel = (source) => {
    const prueba = source.prueba_info || source.prueba || source.test_info || source.test;
    const acronym = prueba?.acronimo || source.prueba_acronimo || source.acronimo;
    const name = prueba?.nombre_variable || prueba?.nombre || source.prueba_nombre || source.nombre_prueba || source.nombre;
    if (acronym && name) return `${acronym} · ${name}`;
    return acronym || name || 'Prueba sin nombre';
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><Link href="/configuracion-tecnica" className={styles.back}><ArrowLeft size={18} /> Configuración técnica</Link><h1>Límites por prueba</h1></div><Link href="/configuracion-tecnica/limites/create" className={styles.primary}><Plus size={18} /> Nueva configuración</Link></header>
      <section className={styles.panel}>
        <div className={styles.toolbar}><p>Configure operadores, orígenes y decisión técnica por prueba.</p><button className={styles.secondary} onClick={onReload}>Recargar</button></div>
        {loading ? <p>Cargando...</p> : <div className={styles.cards}>{sources.map((source) => <article key={source.id} className={styles.card}><div><h2>{sourceTestLabel(source)}</h2><p>{source.tipo_limite === 'catalogo' ? 'Con catálogo técnico' : 'Límites globales / directos'}</p></div><div className={styles.cardActions}><Link href={`/configuracion-tecnica/limites/edit/${source.id}`}><Pencil size={16} /> Editar</Link></div></article>)}</div>}
      </section>
    </main>
  );
}

function TestStep({ tests, selected, onSelect }) {
  const pageSize = 12;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tests;
    return tests.filter((test) => [
      test.acronimo,
      test.codigo,
      test.nombre_variable,
      test.nombre,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [tests, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleTests = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!selected || query) return;
    const selectedIndex = filtered.findIndex((test) => String(idOf(test)) === String(idOf(selected)));
    if (selectedIndex >= 0) setPage(Math.floor(selectedIndex / pageSize) + 1);
  }, [selected, filtered, query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div>
      <h2>1. Prueba</h2>
      <p className={styles.muted}>Seleccione la prueba cuya estructura se usara como contrato de limites.</p>
      <div className={styles.testFinder}>
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o acronimo"
          aria-label="Buscar prueba"
        />
        <span>{filtered.length} prueba(s)</span>
      </div>
      {visibleTests.length
        ? <div className={styles.cards}>{visibleTests.map((test) => <button key={test.id} className={`${styles.selectCard} ${String(idOf(selected)) === String(test.id) ? styles.selected : ''}`} onClick={() => onSelect(test)}><strong>{test.acronimo || test.codigo || labelOf(test)}</strong><span>{labelOf(test)}</span></button>)}</div>
        : <p className={styles.emptyState}>No hay pruebas que coincidan con la busqueda.</p>}
      {totalPages > 1 && (
        <div className={styles.testPagination}>
          <button type="button" title="Pagina anterior" aria-label="Pagina anterior" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={18} /></button>
          <span>Pagina {page} de {totalPages}</span>
          <button type="button" title="Pagina siguiente" aria-label="Pagina siguiente" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={18} /></button>
        </div>
      )}
    </div>
  );
}

function StructureTable({ fields }) {
  const groups = groupByResult(fields);
  return (
    <div>
      <h2>2. Estructura de la prueba</h2>
      <p className={styles.muted}>Revise resultados y campos. Los comentarios quedan informativos por defecto.</p>
      <div className={styles.tableWrap}><table><thead><tr><th>Resultado</th><th>Unidad</th><th>Campo</th><th>Tipo</th><th>Evalua</th></tr></thead><tbody>{groups.flatMap((group) => group.fields.map((field, index) => <tr key={field.codigo}>{index === 0 && <td rowSpan={group.fields.length}><strong>{group.title}</strong></td>}{index === 0 && <td rowSpan={group.fields.length}>{field.unidad || '-'}</td>}<td><strong>{field.nombre}</strong>{field.divisionNombre && <small>{field.divisionNombre}</small>}</td><td>{field.tipo_comparacion}</td><td>{field.participa ? 'Si' : 'No'}</td></tr>))}</tbody></table></div>
    </div>
  );
}

function SourceMapStep({ fields, catalogs, selectedCatalogs, setSelectedCatalogs, updateField }) {
  const groups = groupByResult(fields);
  const usesCatalog = fields.some((field) => field.participa && field.origen_limite === 'catalogo');
  const toggleCatalog = (id) => setSelectedCatalogs((current) => current.includes(String(id)) ? current.filter((item) => item !== String(id)) : [...current, String(id)]);
  return (
    <div>
      <h2>3. Origen de limites por campo</h2>
      <p className={styles.muted}>Cada campo usa solo los origenes compatibles con su tipo. Una prueba mixta puede combinar catalogo, escala, valores directos e informativos.</p>
      <div className={styles.sourceMap}>{groups.map((group) => <section key={group.key} className={styles.sourceGroup}><h3>{group.title}</h3>{group.fields.map((field) => <div key={field.codigo} className={styles.sourceRow}><div><strong>{field.nombre}</strong><small>{field.tipo_comparacion}{field.unidad ? ` · ${field.unidad}` : ''}</small></div><select value={field.origen_limite} onChange={(event) => updateField(field.codigo, { origen_limite: event.target.value })}>{sourceOptionsForField(field).map((option) => <option key={option} value={option}>{SOURCE_LABELS[option]}</option>)}</select><span className={styles.inlineNote}>{field.origen_limite === 'catalogo' ? 'Depende de valores tecnicos de la muestra' : field.origen_limite === 'escala' ? 'Usa la escala asignada al campo' : field.origen_limite === 'booleano' ? 'Compara contra una etiqueta esperada' : field.origen_limite === 'asignacion' ? 'Se captura al asignar pruebas' : field.origen_limite === 'directo' ? 'Mismo limite para todas las muestras' : 'No decide estado tecnico'}</span></div>)}</section>)}</div>
      {usesCatalog && <section className={styles.catalogPicker}><h3>Catalogos usados por los campos con origen catalogo</h3><div className={styles.checkGrid}>{catalogs.map((catalog) => <label key={catalog.id}><input type="checkbox" checked={selectedCatalogs.includes(String(catalog.id))} onChange={() => toggleCatalog(catalog.id)} /> {labelOf(catalog)}</label>)}</div></section>}
    </div>
  );
}

function MatrixStep({ catalogFields, directFields, criteria, setCriterionValue, updateField, scaleItemsByScale }) {
  const changeOperator = (field, operator) => {
    updateField(field.codigo, {
      operador: operator,
      valor_global: normalizeLimitRule(field.valor_global, operator),
    });
    criteria.forEach((criterion) => {
      setCriterionValue(
        criterion.key,
        field.codigo,
        normalizeLimitRule(criterion.valores?.[field.codigo], operator),
      );
    });
  };
  return (
    <div>
      <h2>4. Matriz de limites</h2>
      <p className={styles.muted}>Defina las fronteras siguiendo la banda de color. La zona amarilla viene activa y puede deshabilitarse por campo.</p>
      {!!catalogFields.length && <section className={styles.limitSection}><h3>Campos dependientes de catalogo</h3><div className={styles.tableWrap}><table><thead><tr><th>Combinacion</th>{catalogFields.map((field) => <th key={field.codigo}><strong>{field.nombre}</strong><select value={field.operador} onChange={(event) => changeOperator(field, event.target.value)}>{operatorsForField(field).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></th>)}</tr></thead><tbody>{criteria.map((criterion) => <tr key={criterion.key}><td><strong>{criterion.nombre}</strong></td>{catalogFields.map((field) => <td key={field.codigo}><LimitValueInput field={field} value={criterion.valores?.[field.codigo]} onChange={(value) => setCriterionValue(criterion.key, field.codigo, value)} scaleItemsByScale={scaleItemsByScale} /></td>)}</tr>)}</tbody></table></div></section>}
      {!!directFields.length && <section className={styles.limitSection}><h3>Campos con limite directo, escala o esperado</h3><div className={styles.directGrid}>{directFields.map((field) => <div key={field.codigo} className={styles.directField}><strong>{field.nombre}</strong><small>{SOURCE_LABELS[field.origen_limite]}</small><select value={field.operador} onChange={(event) => changeOperator(field, event.target.value)}>{operatorsForField(field).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><LimitValueInput field={field} value={field.valor_global} onChange={(value) => updateField(field.codigo, { valor_global: value })} scaleItemsByScale={scaleItemsByScale} /></div>)}</div></section>}
    </div>
  );
}

function Preview({
  test,
  fields,
  catalogFields,
  directFields,
  criteria,
  selectedCatalogs,
}) {
  return (
    <div>
      <h2>5. Resumen</h2>
      <p className={styles.muted}>Resumen del contrato que se guardará para asignación, resultados, revisión e interpretación.</p>
      <div className={styles.previewGrid}>
        <article><h3>Prueba</h3><p>{labelOf(test)}</p><small>{fields.length} campo(s), {fields.filter((field) => field.participa).length} evaluable(s)</small></article>
        <article><h3>Orígenes</h3><p>{catalogFields.length} catálogo · {directFields.length} directo/escala/booleano · {fields.filter((field) => field.origen_limite === 'informativo').length} informativo</p><small>{selectedCatalogs.length} catálogo(s) seleccionado(s)</small></article>
        <article><h3>Semáforo</h3><p>Rojo domina; amarillo advierte; verde es aceptable.</p><small>La decisión se calcula campo → resultado → prueba.</small></article>
      </div>
      <section className={styles.limitSection}>
        <h3>Regla de decisión</h3>
        <p>Un campo crítico vuelve crítico su resultado y la prueba. Si no hay críticos, un campo en alerta vuelve amarillo su resultado y la prueba. Solo queda verde cuando todos los campos evaluables están aceptables.</p>
      </section>
      {!!criteria.length && <section className={styles.limitSection}><h3>Filas de catalogo</h3><p>{criteria.length} combinacion(es) generadas para los campos que dependen de catalogo.</p></section>}
    </div>
  );
}
