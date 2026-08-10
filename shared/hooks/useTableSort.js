import { useMemo, useState } from 'react';

const collator = new Intl.Collator('es', {
  numeric: true,
  sensitivity: 'base',
});

const readPath = (row, path) => String(path || '')
  .split('.')
  .filter(Boolean)
  .reduce((value, key) => value?.[key], row);

const normalizeValue = (value, type) => {
  if (value === null || value === undefined || value === '') return null;
  if (type === 'date') {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  if (type === 'number') {
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return String(value).trim();
};

export function useTableSort(rows, configOrColumns = {}, legacyInitialSort = null) {
  const modernConfig = configOrColumns && (
    Object.prototype.hasOwnProperty.call(configOrColumns, 'columns')
    || Object.prototype.hasOwnProperty.call(configOrColumns, 'defaultKey')
    || Object.prototype.hasOwnProperty.call(configOrColumns, 'defaultDirection')
  );
  const columns = modernConfig ? (configOrColumns.columns || {}) : configOrColumns;
  const defaultKey = modernConfig ? configOrColumns.defaultKey : legacyInitialSort?.key;
  const defaultDirection = modernConfig
    ? (configOrColumns.defaultDirection || 'asc')
    : (legacyInitialSort?.direction || 'asc');
  const [sort, setSort] = useState(
    defaultKey ? { key: defaultKey, direction: defaultDirection } : null,
  );

  const sortedRows = useMemo(() => {
    const source = Array.isArray(rows) ? rows : [];
    if (!sort?.key) return source;

    const definition = columns[sort.key] || {};
    const accessor = typeof definition === 'function'
      ? definition
      : (definition.accessor || sort.key);
    const readValue = typeof accessor === 'function'
      ? accessor
      : (row) => readPath(row, accessor);
    const direction = sort.direction === 'desc' ? -1 : 1;

    return source
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const type = typeof definition === 'function' ? undefined : definition.type;
        const leftValue = normalizeValue(readValue(left.row), type);
        const rightValue = normalizeValue(readValue(right.row), type);
        if (leftValue === null && rightValue === null) return left.index - right.index;
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;

        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : collator.compare(leftValue, rightValue);
        return comparison === 0 ? left.index - right.index : comparison * direction;
      })
      .map(({ row }) => row);
  }, [columns, rows, sort]);

  const requestSort = (key, preferredDirection = 'asc') => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: preferredDirection };
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  return { sortedRows, sort, requestSort };
}

export default useTableSort;
