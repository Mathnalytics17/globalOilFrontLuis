import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  BarChart3,
  Building2,
  Code2,
  Pencil as Edit3,
  Eye,
  Filter,
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
  const [filters, setFilters] = useState({
    search: '',
    company: '',
    location: '',
    code: '',
    serial: '',
    samplingPoints: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

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

  const locations = useMemo(() => (
    Array.from(new Set(
      machines
        .map((machine) => machine.ubicacion_activo)
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b))
  ), [machines]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    const emptyFilters = { search: '', company: '', location: '', code: '', serial: '', samplingPoints: '' };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const filtered = useMemo(() => {
    const term = appliedFilters.search.trim().toLowerCase();
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
      const matchesCompany = !appliedFilters.company || companyId === appliedFilters.company;
      const matchesLocation = !appliedFilters.location || machine.ubicacion_activo === appliedFilters.location;
      const matchesCode = !appliedFilters.code || String(machine.codigo_equipo || '').toLowerCase().includes(appliedFilters.code.toLowerCase());
      const matchesSerial = !appliedFilters.serial || String(machine.numero_serie || '').toLowerCase().includes(appliedFilters.serial.toLowerCase());
      const pointCount = Number(machine.puntos_muestreo_activos || 0);
      const matchesSamplingPoints = !appliedFilters.samplingPoints
        || (appliedFilters.samplingPoints === 'with' && pointCount > 0)
        || (appliedFilters.samplingPoints === 'without' && pointCount === 0);
      return matchesSearch && matchesCompany && matchesLocation && matchesCode && matchesSerial && matchesSamplingPoints;
    });
  }, [machines, appliedFilters]);

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

        <section className="go-filterbar machines-filterbar" aria-label="Filtros de máquinas">
          <label className="go-search">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Buscar por nombre, código, serie, ubicación o empresa..."
            />
          </label>
          <label className="go-field-inline">
            <span>Empresa</span>
            <select value={filters.company} onChange={(event) => updateFilter('company', event.target.value)}>
              <option value="">Todas</option>
              {companies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="go-field-inline">
            <span>Ubicación / draga</span>
            <select value={filters.location} onChange={(event) => updateFilter('location', event.target.value)}>
              <option value="">Todas</option>
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
          </label>
          <label className="go-field-inline">
            <span>Código</span>
            <input value={filters.code} onChange={(event) => updateFilter('code', event.target.value)} placeholder="Ej. EQ-001" />
          </label>
          <label className="go-field-inline">
            <span>Serie</span>
            <input value={filters.serial} onChange={(event) => updateFilter('serial', event.target.value)} placeholder="Número de serie" />
          </label>
          <label className="go-field-inline">
            <span>Puntos de medida</span>
            <select value={filters.samplingPoints} onChange={(event) => updateFilter('samplingPoints', event.target.value)}>
              <option value="">Todos</option>
              <option value="with">Con puntos activos</option>
              <option value="without">Sin puntos activos</option>
            </select>
          </label>
          <button type="button" className="go-primary" onClick={() => setAppliedFilters(filters)}>
            <Filter size={16} /> Filtrar
          </button>
          {Object.values(appliedFilters).some(Boolean) && (
            <button
              type="button"
              className="go-ghost"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          )}
        </section>

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
