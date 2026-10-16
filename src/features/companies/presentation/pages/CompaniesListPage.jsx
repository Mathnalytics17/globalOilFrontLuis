import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Building2, Edit3, Eye, Filter, MoreHorizontal, Plus, RefreshCcw, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import RequirePermission from '@features/auth/presentation/RequirePermission';
import SortableTableHeader from '@shared/ui/SortableTableHeader';
import { useTableSort } from '@shared/hooks/useTableSort';

const COMPANY_SORT_COLUMNS = {
  id: { type: 'number' },
  nombre: {},
  direccion: {},
  telefono: {},
  is_active: {},
};

const CompanyTable = () => {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    activo: null,
  });

  // Obtener compañías
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await companiesService.list();
      setCompanies(data);
    } catch (error) {
      toast.error('Error al cargar compañías: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filtrar datos
  const filteredData = companies.filter(company => {
    const matchesSearch = !searchTerm ||
      (company.nombre && company.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.nit && company.nit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.direccion && company.direccion.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filters.activo === null || company.is_active === filters.activo;

    return matchesSearch && matchesStatus;
  });
  const { sortedRows, sort, requestSort } = useTableSort(filteredData, {
    defaultKey: 'id',
    defaultDirection: 'desc',
    columns: COMPANY_SORT_COLUMNS,
  });

  // Contadores para el resumen
  const activeCount = companies.filter(c => c.is_active).length;
  const inactiveCount = companies.filter(c => !c.is_active).length;

  // Limpiar filtros
  const clearFilters = () => {
    setFilters({ activo: null });
    setSearchTerm('');
  };

  // CORREGIDO: Manejar activación/desactivación
  const handleToggleCompanyStatus = async (company) => {
    if (window.confirm(`¿Estás seguro de ${company.is_active ? 'desactivar' : 'activar'} la compañía "${company.nombre}"?`)) {
      try {
        let updatedCompany;
        if (company.is_active) {
          await companiesService.remove(company.id);
          updatedCompany = { ...company, is_active: false, status: 'INACTIVE' };
        } else {
          updatedCompany = await companiesService.restoreActive(company.id);
        }
        
        // Actualizar el estado local con la respuesta del servidor
        setCompanies(prev => prev.map(comp => 
          comp.id === company.id ? updatedCompany : comp
        ));
        
        toast.success(`Compañía ${!company.is_active ? 'activada' : 'desactivada'} correctamente`);
      } catch (error) {
        toast.error('Error al modificar compañía: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleCompanyMode = async (company, mode) => {
    try {
      let updated;
      if (mode === 'block') {
        const reason = window.prompt(`Motivo para bloquear "${company.nombre}":`);
        if (reason === null) return;
        if (!reason.trim()) return toast.error('El motivo es obligatorio para auditoría.');
        updated = await companiesService.block(company.id, reason.trim());
      } else if (mode === 'readonly') {
        if (!window.confirm(`¿Poner "${company.nombre}" en modo solo lectura?`)) return;
        updated = await companiesService.readOnly(company.id);
      } else {
        updated = await companiesService.restoreActive(company.id);
      }
      setCompanies((prev) => prev.map((item) => item.id === company.id ? updated : item));
      toast.success('Estado de la compañía actualizado.');
    } catch (error) {
      toast.error('No se pudo cambiar el estado: ' + (error.response?.data?.detail || error.message));
    }
  };

  const statusLabel = (company) => {
    if (company.status === 'BLOCKED') return 'Bloqueada';
    if (company.status === 'READ_ONLY') return 'Solo lectura';
    return company.is_active ? 'Activa' : 'Inactiva';
  };

  const statusTone = (company) => (
    company.status === 'ACTIVE' && company.is_active ? 'success' : company.status === 'READ_ONLY' ? 'warning' : 'danger'
  );

  return (
    <main className="go-page-shell">
      <header className="go-page-header">
        <div>
          <h1>Empresas</h1>
          <p>Administre las compañías, sus datos y el estado de acceso al sistema.</p>
        </div>
        <div className="go-page-actions">
          <button type="button" className="go-button" onClick={fetchCompanies}><RefreshCcw size={16} /> Actualizar</button>
          <button type="button" className="go-button-primary" onClick={() => router.push('/managment-companies/create-companies')}><Plus size={17} /> Nueva empresa</button>
        </div>
      </header>

      <section className="mb-5 flex flex-wrap items-stretch border-y border-go-border bg-go-surface/40">
        <div className="min-w-40 flex-1 px-5 py-4"><span className="block text-xs font-semibold uppercase tracking-wide text-go-muted">Empresas</span><strong className="mt-1 block text-2xl font-semibold">{companies.length}</strong></div>
        <div className="min-w-40 flex-1 border-l border-go-border px-5 py-4"><span className="block text-xs font-semibold uppercase tracking-wide text-go-muted">Activas</span><strong className="mt-1 block text-2xl font-semibold">{activeCount}</strong></div>
        <div className="min-w-40 flex-1 border-l border-go-border px-5 py-4"><span className="block text-xs font-semibold uppercase tracking-wide text-go-muted">Inactivas</span><strong className="mt-1 block text-2xl font-semibold">{inactiveCount}</strong></div>
      </section>

      <section className="go-panel overflow-hidden">
        <div className="go-panel-header space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-go-border bg-go-deep px-3 text-go-muted">
              <Search size={17} />
              <input className="min-w-0 flex-1 bg-transparent text-sm text-go-text outline-none" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nombre, NIT o dirección" />
            </label>
            <button type="button" className="go-button" onClick={() => setShowFilters((value) => !value)}><Filter size={16} /> Filtros</button>
          </div>

          {showFilters ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-go-border pt-3">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-go-muted">Estado</span>
              {[{ label: 'Todas', value: null }, { label: 'Activas', value: true }, { label: 'Inactivas', value: false }].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  className={filters.activo === option.value ? 'go-button-primary !min-h-8 !px-3 !text-xs' : 'go-button !min-h-8 !px-3 !text-xs'}
                  onClick={() => setFilters({ ...filters, activo: option.value })}
                >
                  {option.label}
                </button>
              ))}
              <button type="button" className="ml-auto text-xs text-go-muted hover:text-go-text" onClick={clearFilters}>Limpiar filtros</button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="grid min-h-56 place-items-center text-go-muted">Cargando empresas...</div>
        ) : sortedRows.length === 0 ? (
          <div className="grid min-h-56 place-items-center px-5 text-center">
            <div><Building2 className="mx-auto mb-3 text-go-muted" size={28} /><strong>No se encontraron empresas</strong><p className="mt-1 text-sm text-go-muted">Ajuste la búsqueda o los filtros para ver resultados.</p></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="go-table">
              <thead>
                <tr>
                  <SortableTableHeader columnKey="id" sort={sort} onSort={requestSort} preferredDirection="desc">ID</SortableTableHeader>
                  <SortableTableHeader columnKey="nombre" sort={sort} onSort={requestSort}>Nombre</SortableTableHeader>
                  <SortableTableHeader columnKey="direccion" sort={sort} onSort={requestSort}>Dirección</SortableTableHeader>
                  <SortableTableHeader columnKey="telefono" sort={sort} onSort={requestSort}>Teléfono</SortableTableHeader>
                  <SortableTableHeader columnKey="is_active" sort={sort} onSort={requestSort}>Estado</SortableTableHeader>
                  <th className="w-16">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((company) => (
                  <tr key={company.id}>
                    <td><strong>{company.id}</strong></td>
                    <td className="font-semibold text-white">{company.nombre || '-'}</td>
                    <td>{company.direccion || '-'}</td>
                    <td>{company.telefono || '-'}</td>
                    <td><span className="go-status" data-tone={statusTone(company)}>{statusLabel(company)}</span></td>
                    <td>
                      <details className="relative">
                        <summary className="go-button !min-h-8 !w-8 !px-0 marker:hidden" aria-label={`Acciones de ${company.nombre || 'empresa'}`}><MoreHorizontal size={16} /></summary>
                        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-md border border-go-border bg-go-surface shadow-xl">
                          <button type="button" className="company-menu-action" onClick={() => router.push(`/managment-companies/detail-company/${company.id}`)}><Eye size={15} /> Ver detalle</button>
                          <button type="button" className="company-menu-action" onClick={() => router.push(`/managment-companies/edit-companies/${company.id}`)}><Edit3 size={15} /> Editar</button>
                          <div className="border-t border-go-border" />
                          <button type="button" className="company-menu-action" onClick={() => handleToggleCompanyStatus(company)}>{company.is_active ? 'Desactivar empresa' : 'Activar empresa'}</button>
                          {company.status === 'ACTIVE' ? <button type="button" className="company-menu-action" onClick={() => handleCompanyMode(company, 'readonly')}>Solo lectura</button> : null}
                          {company.status === 'ACTIVE' ? <button type="button" className="company-menu-action !text-red-300" onClick={() => handleCompanyMode(company, 'block')}>Bloquear</button> : null}
                          {['BLOCKED', 'READ_ONLY'].includes(company.status) ? <button type="button" className="company-menu-action" onClick={() => handleCompanyMode(company, 'restore')}>Restaurar estado activo</button> : null}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        .company-menu-action { width: 100%; display: flex; align-items: center; gap: 9px; border: 0; background: transparent; color: var(--go-text); padding: 10px 12px; text-align: left; font-size: 13px; cursor: pointer; }
        .company-menu-action:hover { background: var(--go-surface-hover); }
      `}</style>
    </main>
  );
};

export default function ProtectedCompanyTable() {
  return (
    <RequirePermission permissionsAny={['empresas.crear', 'empresas.bloquear', 'empresas.eliminar', 'empresas.ver_todo_global']}>
      <CompanyTable />
    </RequirePermission>
  );
}
