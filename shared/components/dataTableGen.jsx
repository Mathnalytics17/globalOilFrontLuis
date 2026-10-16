import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';

function valueFor(row, column) {
  const value = row?.[column.id];
  return value === undefined || value === null ? '' : value;
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
}) {
  const inferredSort = useMemo(() => {
    if (defaultSort?.field) return defaultSort;
    const dateColumn = columns.find((column) => /fecha|date|created|updated/i.test(column.id));
    return dateColumn ? { field: dateColumn.id, order: 'desc' } : { field: columns[0]?.id || 'id', order: 'asc' };
  }, [columns, defaultSort]);
  const [order, setOrder] = useState(inferredSort.order);
  const [orderBy, setOrderBy] = useState(inferredSort.field);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState([]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) => columns.some((column) => String(valueFor(row, column)).toLowerCase().includes(term)));
  }, [data, columns, searchTerm]);

  const sortedData = useMemo(() => [...filteredData].sort((a, b) => {
    const av = valueFor(a, { id: orderBy });
    const bv = valueFor(b, { id: orderBy });
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), 'es', { numeric: true, sensitivity: 'base' });
    return order === 'asc' ? cmp : -cmp;
  }), [filteredData, orderBy, order]);

  const pages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safePage = Math.min(page, pages - 1);
  const rows = pagination ? sortedData.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage) : sortedData;
  const toggleSort = (id) => { setOrder((current) => orderBy === id && current === 'asc' ? 'desc' : 'asc'); setOrderBy(id); };
  const toggleRow = (id) => setExpandedRows((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const allSelected = data.length > 0 && selected.length === data.length;

  return (
    <div className="w-full bg-[#17191c] text-[#d7dade]">
      {searchable ? <div className="border-b border-white/[0.06] p-3"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f7680]" /><input className="h-10 w-full rounded-lg border border-white/[0.08] bg-[#141518] pl-10 pr-3 text-sm text-white outline-none focus:border-white/[0.2]" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} placeholder="Buscar…" /></label></div> : null}
      <div className="go-scrollbar overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead><tr className="bg-[#1c1e22] text-[11px] uppercase tracking-[0.045em] text-[#8d939c]">
            {nestedDataKey ? <th className="w-10 border-b border-white/[0.06] px-3 py-3" /> : null}
            {selectable ? <th className="w-10 border-b border-white/[0.06] px-3 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : data.map((row) => row.id))} /></th> : null}
            {columns.map((column) => <th key={column.id} className="border-b border-white/[0.06] px-3 py-3 text-left font-semibold" style={{ minWidth: column.minWidth }}><button type="button" className="inline-flex items-center gap-1 bg-transparent text-inherit" onClick={() => toggleSort(column.id)}>{column.label}{orderBy === column.id ? order === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : null}</button></th>)}
            {actions.length ? <th className="w-24 border-b border-white/[0.06] px-3 py-3 text-right font-semibold">Acciones</th> : null}
          </tr></thead>
          <tbody>
            {!rows.length ? <tr><td colSpan={columns.length + (nestedDataKey ? 1 : 0) + (selectable ? 1 : 0) + (actions.length ? 1 : 0)} className="px-4 py-10 text-center text-sm text-[#747a83]">{emptyMessage}</td></tr> : rows.map((row) => {
              const expanded = expandedRows.includes(row.id);
              return <React.Fragment key={row.id}>
                <tr className="border-t border-white/[0.05] transition hover:bg-white/[0.025]">
                  {nestedDataKey ? <td className="px-3 py-3"><button type="button" className="go-mini h-7 w-7 p-0" onClick={() => toggleRow(row.id)}>{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button></td> : null}
                  {selectable ? <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)} /></td> : null}
                  {columns.map((column) => <td key={column.id} className="px-3 py-3 align-middle text-[#d7dade]">{column.render ? column.render(row) : valueFor(row, column)}</td>)}
                  {actions.length ? <td className="px-3 py-3 text-right"><div className="flex justify-end gap-1">{actions.map((action) => { const disabled = Boolean(action.disabled?.(row)); return <button key={action.id} type="button" className={`go-mini h-8 w-8 p-0 ${action.color === 'error' ? '!border-red-500/20 !bg-red-500/[0.05] !text-[#e9898f]' : ''}`} disabled={disabled} onClick={() => !disabled && action.handler?.(row)} title={disabled ? 'Acción no disponible' : action.tooltip}>{action.icon}</button>; })}</div></td> : null}
                </tr>
                {nestedDataKey && expanded && Array.isArray(row[nestedDataKey]) ? <tr className="border-t border-white/[0.05] bg-[#141518]"><td colSpan={columns.length + 2} className="p-4"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#747a83]">Detalles</div><table className="w-full border-collapse text-xs"><thead><tr>{nestedColumns.map((column) => <th key={column.id} className="border-b border-white/[0.06] px-2 py-2 text-left text-[#858b94]">{column.label}</th>)}</tr></thead><tbody>{row[nestedDataKey].map((nested, index) => <tr key={nested.id || index}>{nestedColumns.map((column) => <td key={column.id} className="border-b border-white/[0.04] px-2 py-2">{column.render ? column.render(nested) : nested[column.id]}</td>)}</tr>)}</tbody></table></td></tr> : null}
              </React.Fragment>;
            })}
          </tbody>
        </table>
      </div>
      {pagination && filteredData.length ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-3 text-xs text-[#858b94]"><span>Mostrando {safePage * rowsPerPage + 1}–{Math.min((safePage + 1) * rowsPerPage, filteredData.length)} de {filteredData.length}</span><div className="flex items-center gap-2"><select className="h-8 rounded-md border border-white/[0.08] bg-[#141518] px-2 text-xs text-[#c6cad0]" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>{[5,10,25].map((value) => <option key={value} value={value}>{value}</option>)}</select><button type="button" className="go-mini h-8 w-8 p-0" disabled={safePage <= 0} onClick={() => setPage((current) => Math.max(0,current-1))}><ChevronLeft className="h-4 w-4" /></button><span className="min-w-8 text-center text-[#c6cad0]">{safePage + 1}</span><button type="button" className="go-mini h-8 w-8 p-0" disabled={safePage >= pages-1} onClick={() => setPage((current) => Math.min(pages-1,current+1))}><ChevronRight className="h-4 w-4" /></button></div></div> : null}
    </div>
  );
}
