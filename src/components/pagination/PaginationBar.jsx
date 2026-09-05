export default function PaginationBar({ count = 0, page = 1, pageSize = 20, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(Number(count || 0) / Number(pageSize || 20)));
  const current = Math.min(Math.max(1, Number(page || 1)), totalPages);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 0', color: '#cfcfcf', flexWrap: 'wrap' }}>
      <span>{count} registros · Página {current} de {totalPages}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          style={{ minHeight: 38, background: 'rgba(0,0,0,.45)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '0 10px' }}
        >
          {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <button type="button" disabled={current <= 1} onClick={() => onPageChange?.(current - 1)} style={{...btnStyle, opacity: current <= 1 ? .5 : 1}}>Anterior</button>
        <button type="button" disabled={current >= totalPages} onClick={() => onPageChange?.(current + 1)} style={{...btnStyle, opacity: current >= totalPages ? .5 : 1}}>Siguiente</button>
      </div>
    </div>
  );
}

const btnStyle = {
  minHeight: 38,
  border: '1px solid rgba(255,255,255,.2)',
  borderRadius: 8,
  padding: '0 12px',
  background: 'rgba(255,255,255,.04)',
  color: '#fff',
  cursor: 'pointer',
};
