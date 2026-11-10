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
    point: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [resolvedPointMachineIds, setResolvedPointMachineIds] = useState([]);
  const [resolvedSearchMachineIds, setResolvedSearchMachineIds] = useState([]);

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

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const clearFilters = () => {
    const emptyFilters = { search: '', company: '', point: '' };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setResolvedPointMachineIds([]);
    setResolvedSearchMachineIds([]);
  };

  const applyFilters = async () => {
    const pointQuery = filters.point.trim();
    const searchTerm = filters.search.trim();
    try {
      const [pointMatches, searchMatches] = await Promise.all([
        pointQuery ? machinesService.resolvePointCode(pointQuery) : Promise.resolve([]),
        searchTerm ? machinesService.resolvePointCode(searchTerm) : Promise.resolve([]),
      ]);
      setResolvedPointMachineIds([...new Set(pointMatches.map((point) => String(point.maquina?.id || '')).filter(Boolean))]);
      setResolvedSearchMachineIds([...new Set(searchMatches.map((point) => String(point.maquina?.id || '')).filter(Boolean))]);
    } catch (error) {
      // Local matching remains available if the optional resolver is offline.
      console.error(error);
      setResolvedPointMachineIds([]);
      setResolvedSearchMachineIds([]);
    }
    setAppliedFilters(filters);
  };

  const filtered = useMemo(() => {
    const term = appliedFilters.search.trim().toLowerCase();
    return machines.filter((machine) => {
      const pointIdentities = Array.isArray(machine.puntos_muestreo) ? machine.puntos_muestreo : [];
      const matchesSearch = !term || [
        machine.id,
        machine.nombre,
        machine.codigo_equipo,
        machine.numero_serie,
        machine.puntos_muestreo_activos,
        machine.ubicacion_activo,
        machine.empresa_info?.nombre,
        ...pointIdentities.flatMap((point) => [point.nombre, point.codigo]),
      ].filter(Boolean).join(' ').toLowerCase().includes(term)
        || resolvedSearchMachineIds.includes(String(machine.id));

      const companyId = String(machine.empresa || machine.empresa_info?.id || '');
      const matchesCompany = !appliedFilters.company || companyId === appliedFilters.company;
      const pointTerm = appliedFilters.point.trim().toLowerCase();
      const matchesPoint = !pointTerm || pointIdentities.some((point) => (
        `${point.nombre || ''} ${point.codigo || ''}`.toLowerCase().includes(pointTerm)
      )) || resolvedPointMachineIds.includes(String(machine.id));
      return matchesSearch && matchesCompany && matchesPoint;
    });
  }, [machines, appliedFilters, resolvedPointMachineIds, resolvedSearchMachineIds]);

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
          <label className="go-field-inline go-machine-search">
            <span>Máquina o código</span>
            <span className="go-search">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder="Nombre de máquina o código de máquina"
              />
            </span>
          </label>
          <label className="go-field-inline">
            <span>Empresa</span>
            <select value={filters.company} onChange={(event) => updateFilter('company', event.target.value)}>
              <option value="">Todas</option>
              {companies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="go-field-inline">
            <span>Punto de medida</span>
            <input value={filters.point} onChange={(event) => updateFilter('point', event.target.value)} placeholder="Nombre o código del punto" />
          </label>
          <button type="button" className="go-primary" onClick={applyFilters}>
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
