import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Building2, Eye, Pencil, Plus, Power, RefreshCcw, Search, ShieldOff } from 'lucide-react';
import { toast } from 'react-toastify';

import RequirePermission from '@features/auth/presentation/RequirePermission';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import DataTable from '@shared/ui/DataTable';
import MetricStrip from '@shared/ui/MetricStrip';
import OverflowMenu from '@shared/ui/OverflowMenu';
import PageHeader from '@shared/ui/PageHeader';


function statusLabel(company) {
  if (company.status === 'BLOCKED') return 'Bloqueada';
  if (company.status === 'READ_ONLY') return 'Solo lectura';
  return company.is_active ? 'Activa' : 'Inactiva';
}

function statusClass(company) {
  if (company.status === 'ACTIVE' && company.is_active) return 'go-status-on';
  if (company.status === 'READ_ONLY') return 'go-badge go-badge-warning';
  return 'go-status-off';
}

function CompanyTable() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await companiesService.list();
      setCompanies(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      toast.error('Error al cargar compañías: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const filteredData = useMemo(() => companies.filter((company) => {
    const needle = searchTerm.trim().toLowerCase();
    const matchesSearch = !needle || [company.nombre, company.nit, company.direccion, company.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && company.is_active && company.status !== 'BLOCKED')
      || (statusFilter === 'inactive' && !company.is_active)
      || (statusFilter === 'blocked' && company.status === 'BLOCKED')
      || (statusFilter === 'readonly' && company.status === 'READ_ONLY');
    return matchesSearch && matchesStatus;
  }), [companies, searchTerm, statusFilter]);

  const counts = useMemo(() => ({
    total: companies.length,
    active: companies.filter((item) => item.is_active && item.status !== 'BLOCKED').length,
    restricted: companies.filter((item) => ['BLOCKED', 'READ_ONLY'].includes(item.status)).length,
  }), [companies]);

  const handleToggleCompanyStatus = async (company) => {
    if (!window.confirm(`¿${company.is_active ? 'Desactivar' : 'activar'} la compañía “${company.nombre}”?`)) return;
    try {
      let updatedCompany;
      if (company.is_active) {
        await companiesService.remove(company.id);
        updatedCompany = { ...company, is_active: false, status: 'INACTIVE' };
      } else {
        updatedCompany = await companiesService.restoreActive(company.id);
      }
      setCompanies((prev) => prev.map((item) => item.id === company.id ? updatedCompany : item));
      toast.success(`Compañía ${company.is_active ? 'desactivada' : 'activada'} correctamente.`);
    } catch (error) {
      toast.error('Error al modificar compañía: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCompanyMode = async (company, mode) => {
    try {
      let updated;
      if (mode === 'block') {
        const reason = window.prompt(`Motivo para bloquear “${company.nombre}”:`);
        if (reason === null) return;
        if (!reason.trim()) return toast.error('El motivo es obligatorio para auditoría.');
        updated = await companiesService.block(company.id, reason.trim());
      } else if (mode === 'readonly') {
        if (!window.confirm(`¿Poner “${company.nombre}” en modo solo lectura?`)) return;
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

  return (
    <main className="go-page">
      <div className="go-shell">
        <PageHeader
          title="Gestión de empresas"
          subtitle="Administre clientes, acceso operativo y estados de las empresas registradas."
          actions={(
            <button className="go-primary" type="button" onClick={() => router.push('/managment-companies/create-companies')}>
              <Plus className="h-4 w-4" /> Nueva empresa
            </button>
          )}
        />

        <MetricStrip items={[
          { label: 'Empresas', value: counts.total, icon: Building2 },
          { label: 'Activas', value: counts.active },
          { label: 'Con restricciones', value: counts.restricted },
        ]} />

        <section className="go-filterbar">
          <label className="go-search">
            <Search className="h-4 w-4" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nombre, NIT, dirección o correo..." />
          </label>
          <label className="go-field-inline">
            <span>Estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
              <option value="readonly">Solo lectura</option>
              <option value="blocked">Bloqueadas</option>
            </select>
          </label>
        </section>

        <section className="go-card p-0 overflow-visible">
          <div className="go-section-head px-4 pt-4">
            <div>
              <h2>Empresas registradas</h2>
              <p>{filteredData.length} resultado(s)</p>
            </div>
          </div>
          {loading ? (
            <div className="go-empty">Cargando empresas...</div>
          ) : (
            <DataTable
              data={filteredData}
              pagination
              defaultSort={{ field: 'id', order: 'desc' }}
              minWidth={850}
              emptyMessage="No hay empresas que coincidan con los filtros actuales."
              columns={[
                { id: 'id', label: 'ID', width: 70 },
                {
                  id: 'nombre',
                  label: 'Empresa',
                  mobileTitle: true,
                  minWidth: 190,
                  render: (company) => (
                    <div>
                      <strong className="block text-[#e9ebee]">{company.nombre || '-'}</strong>
                      <small className="mt-1 block text-[#747a83]">{company.email || 'Sin correo registrado'}</small>
                    </div>
                  ),
                },
                { id: 'nit', label: 'NIT', minWidth: 120, render: (company) => company.nit || '-' },
                { id: 'direccion', label: 'Dirección', minWidth: 160, render: (company) => company.direccion || '-' },
                { id: 'telefono', label: 'Contacto', minWidth: 120, render: (company) => company.telefono || '-' },
                { id: 'is_active', label: 'Estado', width: 120, render: (company) => <span className={statusClass(company)}>{statusLabel(company)}</span> },
                {
                  id: 'acciones',
                  label: 'Acciones',
                  sortable: false,
                  searchable: false,
                  mobileHidden: true,
                  width: 72,
                  render: (company) => <OverflowMenu items={[
                    { label: 'Ver detalle', icon: Eye, onClick: () => router.push(`/managment-companies/detail-company/${company.id}`) },
                    { label: 'Editar', icon: Pencil, onClick: () => router.push(`/managment-companies/edit-companies/${company.id}`) },
                    company.status === 'ACTIVE' ? { label: 'Solo lectura', onClick: () => handleCompanyMode(company, 'readonly') } : null,
                    company.status === 'ACTIVE' ? { label: 'Bloquear', icon: ShieldOff, danger: true, onClick: () => handleCompanyMode(company, 'block') } : null,
                    ['BLOCKED', 'READ_ONLY'].includes(company.status) ? { label: 'Restaurar acceso', icon: Power, onClick: () => handleCompanyMode(company, 'restore') } : null,
                    { separator: true },
                    { label: company.is_active ? 'Desactivar empresa' : 'Activar empresa', icon: Power, danger: company.is_active, onClick: () => handleToggleCompanyStatus(company) },
                  ]} />,
                },
              ]}
            />
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProtectedCompanyTable() {
  return (
    <RequirePermission permissionsAny={['empresas.crear', 'empresas.bloquear', 'empresas.eliminar', 'empresas.ver_todo_global']}>
      <CompanyTable />
    </RequirePermission>
  );
}
