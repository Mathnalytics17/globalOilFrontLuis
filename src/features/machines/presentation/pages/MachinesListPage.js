import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  BarChart3,
  Building2,
  Code2,
  Pencil as Edit3,
  Eye,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  Wrench,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { machinesService } from '@features/machines/infrastructure/machinesService';
import DataTable from '@shared/ui/DataTable';
import MetricStrip from '@shared/ui/MetricStrip';
import OverflowMenu from '@shared/ui/OverflowMenu';
import PageHeader from '@shared/ui/PageHeader';


export default function MachinesPage() {
  const router = useRouter();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const loadMachines = async () => {
    setLoading(true);
    try {
      const data = await machinesService.list();
      setMachines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las máquinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const companies = useMemo(() => {
    const unique = new Map();
    machines.forEach((machine) => {
      const id = machine.empresa || machine.empresa_info?.id;
      const name = machine.empresa_info?.nombre;
      if (id && name) unique.set(String(id), name);
    });
    return Array.from(unique.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [machines]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return machines.filter((machine) => {
      const matchesSearch = !term || [
        machine.id,
        machine.nombre,
        machine.codigo_equipo,
        machine.numero_serie,
        machine.puntos_muestreo_activos,
        machine.ubicacion_activo,
        machine.empresa_info?.nombre,
      ].filter(Boolean).join(' ').toLowerCase().includes(term);

      const companyId = String(machine.empresa || machine.empresa_info?.id || '');
      const matchesCompany = !companyFilter || companyId === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [machines, search, companyFilter]);

  const companyCount = new Set(
    machines.map((item) => item.empresa || item.empresa_info?.id).filter(Boolean)
  ).size;

  return (
    <div className="go-page">
      <div className="go-shell">
        <PageHeader
          title="Máquinas"
          subtitle="Administre los equipos registrados y consulte su información técnica e historial."
          actions={
            <>
              <OverflowMenu
                items={[
                  { label: 'Histórico de máquinas', icon: BarChart3, onClick: () => router.push('/machines/historico') },
                  { label: 'Actualizar listado', icon: RefreshCcw, onClick: loadMachines },
                ]}
              />
              <button type="button" className="go-primary" onClick={() => router.push('/machines/create-machine')}>
                <Plus size={16} /> Nueva máquina
              </button>
            </>
          }
        />

        <MetricStrip
          items={[
            { label: 'Total máquinas', value: machines.length, icon: Wrench },
            { label: 'Con código', value: machines.filter((item) => item.codigo_equipo).length, icon: Code2 },
            { label: 'Empresas', value: companyCount, icon: Building2 },
          ]}
        />

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#34383f] bg-[#16181b] px-3 text-[#777d86] focus-within:border-[#4a4f57]">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, código, serie, ubicación o empresa..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#e7e9ec] outline-none placeholder:text-[#5f656e]"
            />
          </label>

          <select
            value={companyFilter}
            onChange={(event) => setCompanyFilter(event.target.value)}
            className="h-10 min-w-[190px] rounded-lg border border-[#34383f] bg-[#16181b] px-3 text-sm text-[#c9cdd2] outline-none"
          >
            <option value="">Todas las empresas</option>
            {companies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>

          {(search || companyFilter) && (
            <button
              type="button"
              className="go-ghost"
              onClick={() => { setSearch(''); setCompanyFilter(''); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="go-empty-state">Cargando máquinas...</div>
        ) : (
          <DataTable
            data={filtered}
            pagination
            defaultSort={{ field: 'id', order: 'desc' }}
            minWidth={880}
            emptyMessage="No hay máquinas que coincidan con los filtros."
            columns={[
              { id: 'id', label: 'ID', width: 70 },
              { id: 'nombre', label: 'Máquina', mobileTitle: true, minWidth: 180, render: (machine) => machine.nombre || '-' },
              { id: 'codigo_equipo', label: 'Código', minWidth: 120, render: (machine) => machine.codigo_equipo || '-' },
              { id: 'numero_serie', label: 'Serie', minWidth: 120, render: (machine) => machine.numero_serie || '-' },
              { id: 'puntos_muestreo_activos', label: 'Puntos', width: 80, render: (machine) => machine.puntos_muestreo_activos || 0 },
              { id: 'ubicacion_activo', label: 'Ubicación / Draga', minWidth: 160, render: (machine) => machine.ubicacion_activo || 'Sin ubicación' },
              { id: 'empresa', label: 'Empresa', minWidth: 150, render: (machine) => machine.empresa_info?.nombre || '-' },
              {
                id: 'acciones',
                label: 'Acciones',
                sortable: false,
                searchable: false,
                mobileHidden: true,
                width: 72,
                render: (machine) => <OverflowMenu items={[
                  { label: 'Ver detalle', icon: Eye, onClick: () => router.push(`/machines/detail-machine?id=${machine.id}`) },
                  { label: 'Editar máquina', icon: Edit3, onClick: () => router.push(`/machines/edit-machine?id=${machine.id}`) },
                  { label: 'Puntos de medida', icon: MapPin, onClick: () => router.push(`/machines/edit-machine?id=${machine.id}#puntos-medida`) },
                  { label: 'Ver histórico', icon: BarChart3, onClick: () => router.push(`/machines/historico?machine=${machine.id}`) },
                ]} />,
              },
            ]}
          />
        )}
        <div className="mt-2 text-xs text-[#737983]">Mostrando {filtered.length} de {machines.length} máquinas</div>
      </div>
    </div>
  );
}
