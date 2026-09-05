import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { BarChart3, Edit3, Eye, Plus, RefreshCcw, Search, Wrench } from 'lucide-react';
import { toast } from 'react-toastify';

import { machinesService } from '@features/machines/infrastructure/machinesService';
import SortableTableHeader from '@components/SortableTableHeader';
import { useTableSort } from '@hooks/useTableSort';

const MACHINE_SORT_COLUMNS = {
  id: { type: 'number' },
  nombre: {},
  codigo_equipo: {},
  numero_serie: {},
  componente: {},
  tipoAceite: {},
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
      toast.error('No se pudieron cargar las maquinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return machines;
    return machines.filter((machine) => [
      machine.id,
      machine.nombre,
      machine.codigo_equipo,
      machine.numero_serie,
      machine.componente,
      machine.tipoAceite,
      machine.empresa_info?.nombre,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [machines, search]);
  const { sortedRows, sort, requestSort } = useTableSort(filtered, {
    defaultKey: 'id',
    defaultDirection: 'desc',
    columns: MACHINE_SORT_COLUMNS,
  });

  const companyCount = new Set(machines.map((item) => item.empresa || item.empresa_info?.id).filter(Boolean)).size;

  return (
    <main className="page">
      <header className="header">
        <div>
          <span className="eyebrow">Maquinas</span>
          <h1>Maquinas</h1>
          <p>Administre equipos y consulte su historico de muestras y pruebas.</p>
        </div>
        <div className="actions">
          <button type="button" className="ghost" onClick={() => router.push('/machines/historico')}><BarChart3 size={17} /> Historico</button>
          <button type="button" className="ghost" onClick={loadMachines}><RefreshCcw size={17} /> Recargar</button>
          <button type="button" className="red" onClick={() => router.push('/machines/create-machine')}><Plus size={17} /> Nueva maquina</button>
        </div>
      </header>

      <section className="summary">
        <article><Wrench size={20} /><span>Total maquinas</span><strong>{machines.length}</strong></article>
        <article><BarChart3 size={20} /><span>Con codigo</span><strong>{machines.filter((item) => item.codigo_equipo).length}</strong></article>
        <article><Search size={20} /><span>Empresas</span><strong>{companyCount}</strong></article>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label>
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, codigo, serie, componente o empresa" />
          </label>
          <span>{filtered.length} resultado(s)</span>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <SortableTableHeader columnKey="id" sort={sort} onSort={requestSort} preferredDirection="desc">ID</SortableTableHeader>
                <SortableTableHeader columnKey="nombre" sort={sort} onSort={requestSort}>Maquina</SortableTableHeader>
                <SortableTableHeader columnKey="codigo_equipo" sort={sort} onSort={requestSort}>Codigo</SortableTableHeader>
                <SortableTableHeader columnKey="numero_serie" sort={sort} onSort={requestSort}>Serie</SortableTableHeader>
                <SortableTableHeader columnKey="componente" sort={sort} onSort={requestSort}>Componente</SortableTableHeader>
                <SortableTableHeader columnKey="tipoAceite" sort={sort} onSort={requestSort}>Aceite</SortableTableHeader>
                <th>Frecuencias</th>
                <SortableTableHeader columnKey="empresa" sort={sort} onSort={requestSort}>Empresa</SortableTableHeader>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="empty">Cargando maquinas...</td></tr>
              ) : sortedRows.length ? sortedRows.map((machine) => (
                <tr key={machine.id}>
                  <td><strong>{machine.id}</strong></td>
                  <td>{machine.nombre || '-'}</td>
                  <td>{machine.codigo_equipo || '-'}</td>
                  <td>{machine.numero_serie || '-'}</td>
                  <td>{machine.componente || '-'}</td>
                  <td>{machine.tipoAceite || '-'}</td>
                  <td>
                    <span>Cambio: {machine.frecuenciaCambio || '-'}</span>
                    <span>Analisis: {machine.frecuenciaAnalisis || '-'}</span>
                  </td>
                  <td>{machine.empresa_info?.nombre || '-'}</td>
                  <td>
                    <div className="rowActions">
                      <button type="button" onClick={() => router.push(`/machines/detail-machine?id=${machine.id}`)} title="Ver detalle"><Eye size={17} /></button>
                      <button type="button" onClick={() => router.push(`/machines/edit-machine?id=${machine.id}`)} title="Editar"><Edit3 size={17} /></button>
                      <button type="button" onClick={() => router.push(`/machines/historico?machine=${machine.id}`)} title="Historico"><BarChart3 size={17} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="empty">No hay maquinas que coincidan con la busqueda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .page { min-height: 100vh; background: #171717; color: #fff; padding: 42px 56px; }
        .header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 20px; }
        .eyebrow { color: #ff3045; font-size: 12px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
        h1 { font-size: 42px; font-weight: 600; margin: 8px 0; }
        p { color: #c3c8d1; margin: 0; font-size: 17px; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        button { font: inherit; cursor: pointer; }
        .ghost, .red { height: 44px; border: 1px solid #3a3d45; border-radius: 7px; color: #fff; background: #22242a; display: inline-flex; gap: 8px; align-items: center; padding: 0 14px; font-weight: 800; }
        .red { background: #ff283d; border-color: #ff283d; }
        .summary { display: grid; grid-template-columns: repeat(3, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; }
        .summary article { border: 1px solid #31343c; background: #1f2025; border-radius: 8px; padding: 16px; display: grid; gap: 8px; }
        .summary span { color: #aeb4c0; }
        .summary strong { font-size: 32px; }
        .panel { border: 1px solid #31343c; border-radius: 8px; background: #1d1e23; padding: 16px; }
        .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .toolbar label { flex: 1; display: flex; align-items: center; gap: 10px; background: #0f1014; border: 1px solid #3a3d45; border-radius: 7px; padding: 0 12px; height: 44px; }
        input { flex: 1; border: 0; outline: 0; background: transparent; color: #fff; }
        .toolbar span { color: #aeb4c0; white-space: nowrap; }
        .tableWrap { overflow: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 1050px; }
        th { text-align: left; background: #26272c; color: #c8ced8; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; padding: 13px; }
        td { border-top: 1px solid #31343c; padding: 13px; vertical-align: middle; color: #e8ebf1; }
        td span { display: block; color: #aeb4c0; }
        .rowActions { display: flex; gap: 8px; }
        .rowActions button { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid #3a3d45; border-radius: 7px; background: #22242a; color: #fff; }
        .empty { text-align: center; color: #aeb4c0; padding: 28px; }
        @media (max-width: 980px) {
          .page { padding: 28px 18px; }
          .header { display: block; }
          .actions { justify-content: flex-start; margin-top: 16px; }
          .summary { grid-template-columns: 1fr; }
          h1 { font-size: 34px; }
        }
      `}</style>
    </main>
  );
}
