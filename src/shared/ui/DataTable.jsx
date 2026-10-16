import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';
import Button from './Button';

function valueFor(row, column) {
  const value = row?.[column.id];
  return value === undefined || value === null ? '' : value;
}

function renderCell(row, column) {
  return column.render ? column.render(row) : valueFor(row, column);
}

export default function DataTable({
  columns = [],
  data = [],
  nestedDataKey = null,
  nestedColumns = [],
  actions = [],
  selectable = false,
  pagination = true,
  searchable = false,
  defaultSort = null,
  emptyMessage = 'No hay registros para mostrar.',
  rowKey = 'id',
  minWidth = 760,
  density = 'compact',
  mobileCards = true,
  onRowClick,
  rowClassName,
  sort = null,
  onSort = null,
  preserveOrder = false,
  initialRowsPerPage = 10,
  pageSizeOptions = [5, 10, 15, 25],
}) {
  const getRowId = (row, index) => typeof rowKey === 'function' ? rowKey(row, index) : row?.[rowKey] ?? index;
  const inferredSort = useMemo(() => {
    if (defaultSort?.field) return defaultSort;
    const dateColumn = columns.find((column) => /fecha|date|created|updated/i.test(column.id));
    return dateColumn ? { field: dateColumn.id, order: 'desc' } : { field: columns[0]?.id || 'id', order: 'asc' };
  }, [columns, defaultSort]);

  const [order, setOrder] = useState(inferredSort.order);
  const [orderBy, setOrderBy] = useState(inferredSort.field);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [selected, setSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState([]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) => columns.some((column) => {
      if (column.searchable === false) return false;
      const raw = valueFor(row, column);
      return String(raw).toLowerCase().includes(term);
    }));
  }, [data, columns, searchTerm]);

  const activeOrderBy = sort?.field || orderBy;
  const activeOrder = sort?.direction || order;
  const sortedData = useMemo(() => {
    if (onSort || preserveOrder) return filteredData;
    return [...filteredData].sort((a, b) => {
      const av = valueFor(a, { id: activeOrderBy });
      const bv = valueFor(b, { id: activeOrderBy });
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' });
      return activeOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, activeOrderBy, activeOrder, onSort, preserveOrder]);

  const pages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(page, pages - 1);
  const rows = pagination ? sortedData.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage) : sortedData;
  const visibleIds = filteredData.map((row, index) => getRowId(row, index));
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleSort = (id) => {
    if (onSort) {
      onSort(id);
      return;
    }
    setOrder((current) => orderBy === id && current === 'asc' ? 'desc' : 'asc');
    setOrderBy(id);
  };
  const toggleRow = (id) => setExpandedRows((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = () => setSelected((current) => allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]);

  const primaryColumn = columns.find((column) => column.mobileTitle) || columns[0];
  const actionColumn = columns.find((column) => column.mobileActions || column.id === 'acciones');
  const secondaryColumns = columns.filter((column) => column !== primaryColumn && column !== actionColumn && column.mobileHidden !== true);

  const renderActions = (row) => actions.length ? (
    <div className="go-data-actions">
      {actions.map((action) => {
        const disabled = Boolean(action.disabled?.(row));
        return (
          <Button
            key={action.id}
            size="sm"
            iconOnly
            variant={action.color === 'error' ? 'danger' : 'secondary'}
            disabled={disabled}
            onClick={(event) => {
              event?.stopPropagation?.();
              if (!disabled) action.handler?.(row);
            }}
            title={disabled ? 'Acción no disponible' : action.tooltip}
          >
            {action.icon}
          </Button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={`go-data-table ${density === 'comfortable' ? 'go-data-table--comfortable' : ''}`}>
      {searchable ? (
        <div className="go-data-searchbar">
          <label className="go-data-search">
            <Search aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              placeholder="Buscar…"
            />
          </label>
        </div>
      ) : null}

      <div className={`${mobileCards ? 'hidden md:block' : 'block'} go-table-scroll`}>
        <table className="go-data-table-element" style={{ minWidth }}>
          <thead>
            <tr>
              {nestedDataKey ? <th className="go-data-cell-control" /> : null}
              {selectable ? <th className="go-data-cell-control"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th> : null}
              {columns.map((column) => (
                <th key={column.id} style={{ minWidth: column.minWidth, width: column.width }}>
                  {column.sortable === false || preserveOrder ? column.label : (
                    <button type="button" className="go-data-sort" onClick={() => toggleSort(column.id)}>
                      <span>{column.label}</span>
                      {activeOrderBy === column.id ? activeOrder === 'asc' ? <ChevronUp /> : <ChevronDown /> : null}
                    </button>
                  )}
                </th>
              ))}
              {actions.length ? <th className="go-data-actions-head">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr><td colSpan={columns.length + (nestedDataKey ? 1 : 0) + (selectable ? 1 : 0) + (actions.length ? 1 : 0)} className="go-data-empty">{emptyMessage}</td></tr>
            ) : rows.map((row, index) => {
              const id = getRowId(row, index);
              const expanded = expandedRows.includes(id);
              return (
                <React.Fragment key={id}>
                  <tr className={`${onRowClick ? 'go-data-row-clickable' : ''} ${rowClassName?.(row) || ''}`} onClick={() => onRowClick?.(row)}>
                    {nestedDataKey ? (
                      <td className="go-data-cell-control"><Button size="sm" iconOnly onClick={(event) => { event.stopPropagation(); toggleRow(id); }}>{expanded ? <ChevronUp /> : <ChevronDown />}</Button></td>
                    ) : null}
                    {selectable ? <td className="go-data-cell-control"><input type="checkbox" checked={selected.includes(id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(id)} /></td> : null}
                    {columns.map((column) => <td key={column.id} className={column.cellClassName || ''}>{renderCell(row, column)}</td>)}
                    {actions.length ? <td className="go-data-actions-cell">{renderActions(row)}</td> : null}
                  </tr>
                  {nestedDataKey && expanded && Array.isArray(row[nestedDataKey]) ? (
                    <tr className="go-data-nested-row">
                      <td colSpan={columns.length + (selectable ? 1 : 0) + 2}>
                        <div className="go-data-nested-title">Detalles</div>
                        <div className="go-table-scroll">
                          <table className="go-data-nested-table">
                            <thead><tr>{nestedColumns.map((column) => <th key={column.id}>{column.label}</th>)}</tr></thead>
                            <tbody>{row[nestedDataKey].map((nested, nestedIndex) => <tr key={nested.id || nestedIndex}>{nestedColumns.map((column) => <td key={column.id}>{renderCell(nested, column)}</td>)}</tr>)}</tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {mobileCards ? (
        <div className="go-data-mobile md:hidden">
          {!rows.length ? <div className="go-data-empty">{emptyMessage}</div> : rows.map((row, index) => {
            const id = getRowId(row, index);
            const expanded = expandedRows.includes(id);
            return (
              <article key={id} className={`go-data-card ${rowClassName?.(row) || ''}`} onClick={() => onRowClick?.(row)}>
                <div className="go-data-card-head">
                  <div className="min-w-0">
                    <div className="go-data-card-title">{primaryColumn ? renderCell(row, primaryColumn) : id}</div>
                    {primaryColumn?.mobileSubtitle ? <div className="go-data-card-subtitle">{primaryColumn.mobileSubtitle(row)}</div> : null}
                  </div>
                  <div className="go-data-card-head-actions">
                    {selectable ? <input type="checkbox" checked={selected.includes(id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(id)} /> : null}
                    {actionColumn ? <div onClick={(event) => event.stopPropagation()}>{renderCell(row, actionColumn)}</div> : null}
                    {renderActions(row)}
                  </div>
                </div>
                <dl className="go-data-card-grid">
                  {secondaryColumns.map((column) => (
                    <div key={column.id} className="go-data-card-field">
                      <dt>{column.mobileLabel || column.label}</dt>
                      <dd>{renderCell(row, column) || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {nestedDataKey && Array.isArray(row[nestedDataKey]) ? (
                  <div className="go-data-card-nested">
                    <Button size="sm" onClick={(event) => { event.stopPropagation(); toggleRow(id); }}>{expanded ? 'Ocultar detalles' : `Ver detalles (${row[nestedDataKey].length})`}</Button>
                    {expanded ? <div className="go-data-mobile-nested">{row[nestedDataKey].map((nested, nestedIndex) => <div key={nested.id || nestedIndex} className="go-data-mobile-nested-item">{nestedColumns.map((column) => <div key={column.id}><span>{column.label}</span><strong>{renderCell(nested, column) || '—'}</strong></div>)}</div>)}</div> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {pagination && filteredData.length ? (
        <div className="go-data-pagination">
          <span>Mostrando {safePage * rowsPerPage + 1}–{Math.min((safePage + 1) * rowsPerPage, filteredData.length)} de {filteredData.length}</span>
          <div className="go-data-pagination-actions">
            <select className="go-control" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>
              {pageSizeOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <Button size="sm" iconOnly disabled={safePage <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}><ChevronLeft /></Button>
            <span className="go-data-page-number">{safePage + 1}</span>
            <Button size="sm" iconOnly disabled={safePage >= pages - 1} onClick={() => setPage((current) => Math.min(pages - 1, current + 1))}><ChevronRight /></Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
