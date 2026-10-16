const hasValue = (value) => value !== undefined && value !== null && value !== '';

const withUnit = (value, unit = '') => `${value}${unit ? ` ${unit}` : ''}`;

const parseRule = (detail = {}) => {
  const value = detail.limit_value;
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.includes('{')) {
    const serializedRule = value.slice(value.indexOf('{')).trim();
    try {
      return JSON.parse(serializedRule);
    } catch {
      // Algunas configuraciones antiguas llegaron serializadas por Python
      // (comillas simples y True/False). No las exponemos como un diccionario
      // técnico: recuperamos sus pares para presentarlos como bandas.
      const pairs = [...serializedRule.matchAll(/['\"]?([^:'\",{}]+)['\"]?\s*:\s*(?:['\"]([^'\"]*)['\"]|(True|False|true|false)|([^,}]+))/g)];
      if (!pairs.length) return null;
      return pairs.reduce((rule, [, key, quoted, booleanValue, plainValue]) => {
        const rawValue = quoted ?? booleanValue ?? plainValue?.trim();
        rule[key.trim()] = rawValue === 'True' || rawValue === 'true'
          ? true
          : rawValue === 'False' || rawValue === 'false'
            ? false
            : rawValue;
        return rule;
      }, {});
    }
  }
  return null;
};

const isOrderedGap = (start, end) => {
  if (!hasValue(start) || !hasValue(end)) return false;
  const numericStart = Number(start);
  const numericEnd = Number(end);
  if (Number.isFinite(numericStart) && Number.isFinite(numericEnd)) return numericStart < numericEnd;
  return String(start) !== String(end);
};

const simpleRule = (detail, unit) => {
  const value = detail.limit_value_label ?? detail.limit_value;
  if (!hasValue(value)) return 'No aplica';
  const formatted = withUnit(value, unit);
  const operator = String(detail.operator || '').toLowerCase();
  if (['max', 'warn_max', 'scale_max'].includes(operator)) return `Hasta ${formatted}`;
  if (['min', 'warn_min', 'scale_min'].includes(operator)) return `Desde ${formatted}`;
  if (operator === 'eq') return `Debe ser ${formatted}`;
  if (operator === 'neq') return `Distinto de ${formatted}`;
  return formatted;
};

export const presentLimitBands = (detail = {}) => {
  const unit = detail.unit || '';
  const rule = parseRule(detail);
  if (!rule) return { acceptable: simpleRule(detail, unit), warning: '', critical: '' };

  // Las versiones tempranas persistieron algunos nombres en inglés. Ambas
  // variantes describen la misma banda y deben verse igual en la interfaz.
  const minimum = rule.min_aceptable ?? rule.min_acceptable;
  const maximum = rule.max_aceptable ?? rule.max_acceptable;
  const minimumCritical = rule.min_critico ?? rule.min_critical;
  const maximumCritical = rule.max_critico ?? rule.max_critical;
  let acceptable = 'Regla configurada';

  if (hasValue(minimum) && hasValue(maximum)) {
    acceptable = `Entre ${withUnit(minimum, unit)} y ${withUnit(maximum, unit)}`;
  } else if (hasValue(minimum)) {
    acceptable = `Desde ${withUnit(minimum, unit)}`;
  } else if (hasValue(maximum)) {
    acceptable = `Hasta ${withUnit(maximum, unit)}`;
  } else if (hasValue(rule.valor_esperado)) {
    acceptable = `Debe ser ${withUnit(rule.valor_esperado, unit)}`;
  }

  const warnings = [];
  const useWarning = rule.usar_amarillo ?? rule.use_warning ?? rule.use_yellow;
  if (useWarning && isOrderedGap(minimumCritical, minimum)) {
    warnings.push(`De ${withUnit(minimumCritical, unit)} hasta antes de ${withUnit(minimum, unit)}`);
  }
  if (useWarning && isOrderedGap(maximum, maximumCritical)) {
    warnings.push(`Más de ${withUnit(maximum, unit)} y hasta ${withUnit(maximumCritical, unit)}`);
  }

  const critical = [];
  if (hasValue(minimumCritical)) critical.push(`Menor que ${withUnit(minimumCritical, unit)}`);
  if (hasValue(maximumCritical)) critical.push(`Mayor que ${withUnit(maximumCritical, unit)}`);

  return {
    acceptable,
    warning: warnings.join('; o '),
    critical: critical.join('; o '),
  };
};
