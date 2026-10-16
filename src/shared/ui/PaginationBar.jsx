import Button from './Button';

export default function PaginationBar({ count = 0, page = 1, pageSize = 20, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50, 100] }) {
  const totalPages = Math.max(1, Math.ceil(Number(count || 0) / Number(pageSize || 20)));
  const current = Math.min(Math.max(1, Number(page || 1)), totalPages);
  return (
    <div className="go-pagination">
      <span>{count} registros · Página {current} de {totalPages}</span>
      <div className="go-pagination-actions">
        <select className="go-control go-pagination-size" value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))}>
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <Button size="sm" disabled={current <= 1} onClick={() => onPageChange?.(current - 1)}>Anterior</Button>
        <Button size="sm" disabled={current >= totalPages} onClick={() => onPageChange?.(current + 1)}>Siguiente</Button>
      </div>
    </div>
  );
}
