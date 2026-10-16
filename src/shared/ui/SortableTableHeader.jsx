import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export default function SortableTableHeader({
  columnKey: explicitColumnKey,
  column,
  sort,
  onSort,
  children,
  label,
  className = '',
  preferredDirection = 'asc',
}) {
  const columnKey = explicitColumnKey || column;
  const content = children ?? label;
  const active = sort?.key === columnKey;
  const direction = active ? sort.direction : null;
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <th
      className={className}
      aria-sort={!active ? 'none' : direction === 'asc' ? 'ascending' : 'descending'}
    >
      <button
        type="button"
        className="sortable-table-header"
        onClick={() => onSort(columnKey, preferredDirection)}
        title={`Ordenar por ${typeof content === 'string' ? content : 'columna'}`}
      >
        <span>{content}</span>
        <Icon size={14} aria-hidden="true" />
      </button>
      <style jsx>{`
        .sortable-table-header {
          width: 100%;
          min-height: 30px;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          text-align: left;
          cursor: pointer;
        }
        .sortable-table-header:hover { color: #fff; }
        .sortable-table-header:focus-visible {
          outline: 2px solid #ff3045;
          outline-offset: 3px;
          border-radius: 3px;
        }
      `}</style>
    </th>
  );
}
