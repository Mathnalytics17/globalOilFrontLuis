import { AlertTriangle } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-[#444] bg-[#292929] p-3 text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 disabled:cursor-not-allowed disabled:opacity-60';

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const isUnknownValue = (value) =>
  ['desconocido', 'desconocida', 'n/a', 'na', 'no aplica', 'sin dato'].includes(
    normalizeText(value)
  );

const UNKNOWN_VALUE = '__unknown_without_catalog__';

const definitionFromCatalog = (catalog) => ({
  code: catalog?.sample_field?.codigo || catalog?.codigo || String(catalog?.id || ''),
  label: catalog?.sample_field?.nombre_visible || catalog?.nombre || 'Campo técnico',
  catalog,
  dynamic: true,
});

const getActiveItems = (catalog) =>
  (catalog?.items || []).filter((item) => item.activo !== false && !item.deleted_at);

const catalogAllowsUnknown = (catalog) => catalog?.permite_desconocido !== false;

const shouldForceUnknown = (catalog) => Boolean(catalog?.id) && catalogAllowsUnknown(catalog) && getActiveItems(catalog).length === 0;

const shouldForceUnknownForField = (catalog, sampleType, definition) =>
  shouldForceUnknown(catalog);

const resolveStoredValue = (values, key) => {
  const value = values?.[key] || values?.[String(key)] || {};
  return value && typeof value === 'object' ? value : {};
};

const appliesToSampleType = (catalog, sampleType) => {
  const type = normalizeText(catalog?.tipo_muestra || catalog?.tipoMuestra || 'ambos');
  const sample = normalizeText(sampleType || 'aceite');
  return catalog?.activo !== false && !catalog?.deleted_at && (type === 'ambos' || type === sample);
};

const findCatalogForField = (catalogs = [], sampleType, definition) => {
  if (definition?.catalog) {
    return appliesToSampleType(definition.catalog, sampleType) ? definition.catalog : null;
  }

  const aliases = [definition.code, definition.label, ...(definition.aliases || [])].map(normalizeText);

  return catalogs.find((catalog) => {
    if (!appliesToSampleType(catalog, sampleType)) return false;
    const candidates = [catalog?.codigo, catalog?.nombre, catalog?.slug, catalog?.key]
      .map(normalizeText)
      .filter(Boolean);

    return candidates.some((candidate) =>
      aliases.some((alias) => candidate === alias || candidate.includes(alias) || alias.includes(candidate))
    );
  });
};

const findCatalogItem = (catalog, rawValue) => {
  if (!catalog || rawValue === undefined || rawValue === null || rawValue === '') return null;
  const rawText = normalizeText(rawValue);
  const items = getActiveItems(catalog);

  return (
    items.find((item) => String(item.id) === String(rawValue)) ||
    items.find((item) =>
      [item?.codigo, item?.nombre, item?.valor, item?.label].some(
        (candidate) => normalizeText(candidate) === rawText
      )
    ) ||
    items.find((item) =>
      [item?.codigo, item?.nombre, item?.valor, item?.label].some((candidate) => {
        const candidateText = normalizeText(candidate);
        return candidateText && rawText && (candidateText.includes(rawText) || rawText.includes(candidateText));
      })
    ) ||
    null
  );
};

const getLegacyRawValue = (sample, definition) => {
  const code = definition.code;
  return (
    sample?.[code] ??
    sample?.[`${code}_id`] ??
    sample?.[`${code}Id`] ??
    sample?.campos_adicionales?.[code] ??
    ''
  );
};

const resolveEffectiveValue = (sample, catalog, definition, sampleType) => {
  const key = catalog?.sample_field_id || catalog?.id || definition.code;
  const stored = resolveStoredValue(sample?.atributos_tecnicos || {}, key);

  if (stored.item || stored.desconocido) {
    return {
      item: stored.desconocido ? '' : stored.item,
      desconocido: Boolean(stored.desconocido),
      observacion: stored.observacion || '',
    };
  }

  const raw = getLegacyRawValue(sample, definition);
  const markedUnknown = Boolean(sample?.[`${definition.code}_desconocido`]) || isUnknownValue(raw);

  if (markedUnknown || shouldForceUnknownForField(catalog, sampleType, definition)) {
    return {
      item: '',
      desconocido: true,
      observacion: '',
    };
  }

  const item = findCatalogItem(catalog, raw);
  if (item?.id) {
    return {
      item: item.id,
      desconocido: false,
      observacion: '',
    };
  }

  return {
    item: '',
    desconocido: false,
    observacion: stored.observacion || '',
  };
};


export const getTechnicalFieldDefinitions = (sampleType = 'aceite', catalogs = []) => {
  const dynamicCatalogs = catalogs
    .filter((catalog) => catalog?.sample_field_id && appliesToSampleType(catalog, sampleType))
    .sort((a, b) => {
      const orderA = Number(a?.orden ?? 999999);
      const orderB = Number(b?.orden ?? 999999);
      if (orderA !== orderB) return orderA - orderB;
      return String(a?.nombre || '').localeCompare(String(b?.nombre || ''));
    });

  return dynamicCatalogs.map(definitionFromCatalog);
};

export const createDynamicAttributes = () => ({});

export const buildDynamicAttributesPayload = (sample, catalogs = []) => {
  const sampleType = sample?.tipo_muestra === 'grasa' ? 'grasa' : 'aceite';

  return getTechnicalFieldDefinitions(sampleType, catalogs)
    .map((definition) => {
      const catalog = findCatalogForField(catalogs, sampleType, definition);
      if (!catalog?.id) return null;

      const value = resolveEffectiveValue(sample, catalog, definition, sampleType);
      const isUnknown = Boolean(value.desconocido) || shouldForceUnknownForField(catalog, sampleType, definition);

      return {
        campo_tecnico: catalog.sample_field_id || null,
        catalogo: catalog.id,
        item: isUnknown ? null : value.item || null,
        desconocido: isUnknown,
        observacion: value.observacion || null,
      };
    })
    .filter(Boolean);
};

export const validateDynamicAttributes = (sample, catalogs = []) => {
  const errors = {};
  const sampleType = sample?.tipo_muestra === 'grasa' ? 'grasa' : 'aceite';

  getTechnicalFieldDefinitions(sampleType, catalogs).forEach((definition) => {
    const catalog = findCatalogForField(catalogs, sampleType, definition);
    const key = catalog?.sample_field_id || catalog?.id || definition.code;

    if (!catalog?.id) {

      const value = resolveEffectiveValue(sample, catalog, definition, sampleType);
      if (!value.desconocido) {
        errors[key] = `${definition.label}: catálogo no disponible. Marque desconocido para continuar.`;
      }
      return;
    }

    const value = resolveEffectiveValue(sample, catalog, definition, sampleType);

    if (shouldForceUnknownForField(catalog, sampleType, definition)) {
      return;
    }

    if (!value.item && !value.desconocido) {
      errors[key] = `Seleccione ${definition.label} o marque desconocido.`;
    }
  });

  return errors;
};

export default function DynamicSampleTechnicalFields({
  catalogs = [],
  muestra,
  index,
  errors = {},
  updateMuestra,
  disabled = false,
}) {
  const sampleType = muestra?.tipo_muestra === 'grasa' ? 'grasa' : 'aceite';
  const definitions = getTechnicalFieldDefinitions(sampleType, catalogs);
  const values = muestra.atributos_tecnicos || {};
  const hasConfiguredFields = definitions.length > 0;
  const hasMissingRequired = Object.keys(validateDynamicAttributes(muestra, catalogs)).length > 0;

  const updateAttribute = (key, patch) => {
    updateMuestra(index, 'atributos_tecnicos', {
      ...values,
      [key]: {
        ...(values[key] || {}),
        ...patch,
      },
    });
  };

  return (
    <div className="md:col-span-4 border-t border-[#333] pt-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-300">
            Configuración técnica de {sampleType === 'grasa' ? 'grasa' : 'aceite'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Estos campos se generan desde Configuración técnica / Campos de muestra.
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs ${
          !hasConfiguredFields || hasMissingRequired
            ? 'border-yellow-700 bg-yellow-950/50 text-yellow-300'
            : 'border-green-700 bg-green-950/50 text-green-300'
        }`}>
          {(!hasConfiguredFields || hasMissingRequired) && <AlertTriangle size={14} />}
          {!hasConfiguredFields
            ? 'Sin campos configurados'
            : hasMissingRequired
              ? 'Información técnica incompleta'
              : 'Información técnica completa'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {definitions.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-200">
            No hay campos técnicos configurados para este tipo de muestra.
          </div>
        )}
        {definitions.map((definition) => {
          const catalog = findCatalogForField(catalogs, sampleType, definition);
          const key = catalog?.sample_field_id || catalog?.id || definition.code;
          const items = getActiveItems(catalog);
          const forceUnknown = shouldForceUnknownForField(catalog, sampleType, definition);
          const value = resolveEffectiveValue(muestra, catalog, definition, sampleType);
          const error =
            errors[`muestras.${index}.atributos_tecnicos.${key}`] ||
            errors[`muestras.${index}.atributos_tecnicos.${definition.code}`];

          return (
            <label key={`${definition.code}-${key}`} className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-300">
                {definition.label} *
              </span>
              <select
                value={value.desconocido || forceUnknown ? UNKNOWN_VALUE : value.item || ''}
                onChange={(event) => {
                  const selected = event.target.value;
                  updateAttribute(key, {
                    item: selected === UNKNOWN_VALUE ? '' : selected,
                    desconocido: selected === UNKNOWN_VALUE,
                    observacion: selected === UNKNOWN_VALUE ? value.observacion || '' : value.observacion,
                  });
                }}
                className={inputClass}
                disabled={disabled}
              >
                <option value="">Seleccione una opción</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
                <option value={UNKNOWN_VALUE}>DESCONOCIDO</option>
              </select>
              {items.length === 0 && (
                <span className="mt-2 block text-xs text-yellow-300">
                  No hay opciones activas para este catálogo. Se usará DESCONOCIDO.
                </span>
              )}
              {error && <span className="mt-2 block text-xs text-red-400">{error}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
