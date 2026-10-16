import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { BarChart3, Edit3, Eye, MapPin, MoreHorizontal, Plus, RefreshCcw, Search } from 'lucide-react';
import { toast } from 'react-toastify';

import { machinesService } from '@features/machines/infrastructure/machinesService';
import SortableTableHeader from '@shared/ui/SortableTableHeader';
import { useTableSort } from '@shared/hooks/useTableSort';

const MACHINE_SORT_COLUMNS = {
  id: { type: 'number' },
  nombre: {},
  codigo_equipo: {},
  numero_serie: {},
  puntos_muestreo_activos: { type: 'number' },
  ubicacion_activo: {},
  empresa: { accessor: (machine) => machine.empresa_info?.nombre },
};

export default function MachinesPage() {
  const router = useRouter();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await machinesService.list();
      setMachines(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las máquinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMachines(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return machines;
    return machines.filter((machine) => [
      machine.id,
      machine.nombre,
      machine.codigo_equipo,
      machine.numero_serie,
      machine.puntos_muestreo_activos,
      machine.ubicacion_activo,
      machine.empresa_info?.nombre,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [machines, search]);

  const { sortedRows, sort, requestSort } = useTableSort(filtered, {
    defaultKey: 'id',
    defaultDirection: 'desc',
    columns: MACHINE_SORT_COLUMNS,
  });

  const companyCount = new Set(machines.map((item) => item.empresa || item.empresa_info?.id).filter(Boolean)).size;
  const withCodeCount = machines.filter((item) => item.codigo_equipo).length;

  return (
    <main className="go-page-shell">
      <header className="go-page-header">
        <div>
          <h1>Máquinas</h1>
          <p>Administre equipos y consulte su histórico de muestras y pruebas.</p>
        </div>
        <div className="go-page-actions">
          <details className="relative">
            <summary className="go-button !w-10 !px-0 marker:hidden" aria-label="Más acciones"><MoreHorizontal size={18} /></summary>
            <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-md border border-go-border bg-go-surface shadow-xl">
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-go-text hover:bg-go-hover" onClick={() => router.push('/machines/historico')}><BarChart3 size={16} /> Histórico</button>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-go-text hover:bg-go-hover" onClick={loadMachines}><RefreshCcw size={16} /> Actualizar</button>
            </div>
          </details>
          <button type="button" className="go-button-primary" onClick={() => router.push('/machines/create-machine')}><Plus size={17} /> Nueva máquina</button>
        </div>
      </header>

      <section className="mb-5 flex flex-wrap items-stretch border-y border-go-border bg-go-surface/40">
        <div className="min-w-40 flex-1 px-5 py-4"><span className="block text-xs font-semibold uppercase tracking-wide text-go-muted">Máquinas</span><strong className="mt-1 block text-2xl font-semibold">{machines.length}</strong></div>
        <div className="min-w-40 flex-1 border-l border-go-border px-5 py-4"><span className="block text-xs font-semibold uppercase tracking-wide text-go-muted">Con código</span><strong className="mt-1 block text-2xl font-semibold">{withCodeCount}</strong></div>
        <div className="min-w-40 flex-1 border-l border-go-border px-5 py-4"><span className="block text-xs font-semibold uppercase tracking-wide text-go-muted">Empresas</span><strong className="mt-1 block text-2xl font-semibold">{companyCount}</strong></div>
      </section>

      <section className="go-panel overflow-hidden">
        <div className="go-panel-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-go-border bg-go-deep px-3 text-go-muted sm:max-w-2xl">
            <Search size={17} />
            <input className="min-w-0 flex-1 bg-transparent text-sm text-go-text outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, código, serie, ubicación o empresa" />
          </label>
          <span className="text-sm text-go-muted">{filtered.length} resultado(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="go-table">
            <thead>
              <tr>
                <SortableTableHeader columnKey="id" sort={sort} onSort={requestSort} preferredDirection="desc">ID</SortableTableHeader>
                <SortableTableHeader columnKey="nombre" sort={sort} onSort={requestSort}>Máquina</SortableTableHeader>
                <SortableTableHeader columnKey="codigo_equipo" sort={sort} onSort={requestSort}>Código</SortableTableHeader>
                <SortableTableHeader columnKey="numero_serie" sort={sort} onSort={requestSort}>Serie</SortableTableHeader>
                <SortableTableHeader columnKey="puntos_muestreo_activos" sort={sort} onSort={requestSort}>Puntos de medida</SortableTableHeader>
                <SortableTableHeader columnKey="ubicacion_activo" sort={sort} onSort={requestSort}>Draga / ubicación</SortableTableHeader>
                <SortableTableHeader columnKey="empresa" sort={sort} onSort={requestSort}>Empresa</SortableTableHeader>
                <th className="w-16">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="!py-10 text-center text-go-muted">Cargando máquinas...</td></tr>
              ) : sortedRows.length ? sortedRows.map((machine) => (
                <tr key={machine.id}>
                  <td><strong>{machine.id}</strong></td>
                  <td className="font-semibold text-white">{machine.nombre || '-'}</td>
                  <td>{machine.codigo_equipo || '-'}</td>
                  <td>{machine.numero_serie || '-'}</td>
                  <td>{machine.puntos_muestreo_activos || 0}</td>
                  <td>{machine.ubicacion_activo || 'Sin ubicación'}</td>
                  <td>{machine.empresa_info?.nombre || '-'}</td>
                  <td>
                    <details className="relative">
                      <summary className="go-button !min-h-8 !w-8 !px-0 marker:hidden" aria-label={`Acciones de ${machine.nombre || 'máquina'}`}><MoreHorizontal size={16} /></summary>
                      <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-md border border-go-border bg-go-surface shadow-xl">
                        <button type="button" className="menu-action" onClick={() => router.push(`/machines/detail-machine?id=${machine.id}`)}><Eye size={15} /> Ver detalle</button>
                        <button type="button" className="menu-action" onClick={() => router.push(`/machines/edit-machine?id=${machine.id}`)}><Edit3 size={15} /> Editar</button>
                        <button type="button" className="menu-action" onClick={() => router.push(`/machines/edit-machine?id=${machine.id}#puntos-medida`)}><MapPin size={15} /> Puntos de medida</button>
                        <button type="button" className="menu-action" onClick={() => router.push(`/machines/historico?machine=${machine.id}`)}><BarChart3 size={15} /> Histórico</button>
                      </div>
                    </details>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="!py-10 text-center text-go-muted">No hay máquinas que coincidan con la búsqueda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .menu-action { width: 100%; display: flex; align-items: center; gap: 9px; border: 0; background: transparent; color: var(--go-text); padding: 10px 12px; text-align: left; font-size: 13px; cursor: pointer; }
        .menu-action:hover { background: var(--go-surface-hover); }
      `}</style>
    </main>
  );
}
