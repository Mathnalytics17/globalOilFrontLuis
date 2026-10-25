import { appDialog } from '@shared/ui/AppDialogProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil as Edit,
  Trash2,
  FlaskConical,
  PackageCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  ClipboardList,
  FileSpreadsheet,
  BarChart3,
  FileText,
  CalendarClock,
} from 'lucide-react';

import { sampleBatchesService } from '@features/samples/infrastructure/sampleBatchesService';
import PaginationBar from '@shared/ui/PaginationBar';
import PageHeader from '@shared/ui/PageHeader';
import MetricStrip from '@shared/ui/MetricStrip';
import OverflowMenu from '@shared/ui/OverflowMenu';
import DataTable from '@shared/ui/DataTable';
import AppErrorState from '@shared/ui/AppErrorState';
import { notifyApiError } from '@shared/ui/notifications';
import { useAuth } from '@features/auth/presentation/context/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { assetTreeService } from '@features/asset-tree/infrastructure/assetTreeService';

const estadoOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'registrado', label: 'Registrado' },
  { value: 'en_laboratorio', label: 'En laboratorio' },
  { value: 'en_analisis', label: 'En análisis' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'resultados_completos', label: 'Resultados completos' },
  { value: 'revisado', label: 'Revisado' },
  { value: 'reportado', label: 'Reportado' },
  { value: 'cancelado', label: 'Cancelado' },
];
const estadoLabels = estadoOptions.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {});
const estadoClasses = {
  borrador: 'status-gray',
  registrado: 'status-blue',
  recibido: 'status-blue',
  en_laboratorio: 'status-yellow',
  en_analisis: 'status-yellow',
  parcial: 'status-purple',
  resultados_completos: 'status-green',
  revisado: 'status-green',
  reportado: 'status-slate',
  cancelado: 'status-red',
};
const tipoMuestraLabel = { aceite: 'Aceite', grasa: 'Grasa' };

const actionRules = {
  lab: {
    label: 'Ingreso laboratorio',
    path: (id) => `/muestras/laboratorio?lote=${id}`,
    icon: FlaskConical,
    className: 'warning',
    allowed: ['borrador', 'registrado', 'recibido'],
  },
  assign: {
    label: 'Asignar pruebas',
    path: (id) => `/muestras/asignacion-pruebas?lote=${id}`,
    icon: ClipboardList,
    className: 'info',
    allowed: ['en_laboratorio'],
  },
  results: {
    label: 'Ingresar resultados',
    path: (id) => `/muestras/resultados?lote=${id}`,
    icon: FileSpreadsheet,
    className: 'success',
    allowed: ['en_laboratorio', 'en_analisis', 'parcial'],
  },
  review: {
    label: 'Revisar resultados',
    path: (id) => `/muestras/revision-resultados?lote=${id}`,
    icon: ClipboardList,
    className: 'purple',
    allowed: ['resultados_completos'],
  },
  interpretation: {
    label: 'Interpretación',
    path: (id) => `/muestras/interpretacion?lote=${id}`,
    icon: BarChart3,
    className: 'teal',
    allowed: ['revisado', 'interpretado'],
  },
  reports: {
    label: 'Ver reportes',
    path: (id) => `/reportes?lote=${id}`,
    icon: FileText,
    className: 'slate',
    allowed: ['reportado'],
  },
};

const actionPermissions = {
  lab: ['laboratorio.ver', 'laboratorio.ver_lotes_disponibles', 'laboratorio.ingresar_lote'],
  assign: ['pruebas_muestra.ver', 'pruebas_muestra.asignar_lote'],
  results: ['resultados.ver', 'resultados.cargar'],
  review: ['revision.ver'],
  interpretation: ['interpretacion.ver'],
  reports: ['reportes.ver'],
};

const getBatchActions = (lote = {}, hasPermission = () => false) => {
  const estado = lote.estado || '';
  const terminal = ['reportado', 'cancelado'].includes(estado);
  const pruebas = lote.progreso_pruebas || {};
  const totalMuestras = Number(lote.total_muestras ?? lote.progreso?.total ?? 0);
  const asignadas = Number(pruebas.asignadas || 0);
  const completadas = Number(pruebas.completadas || 0);
  const revisadas = Number(pruebas.revisadas || 0);
  const enabledByKey = {
    lab: !terminal && totalMuestras > 0 && ['registrado', 'recibido'].includes(estado),
    assign: !terminal && completadas === 0 && ['en_laboratorio', 'en_analisis', 'parcial'].includes(estado),
    results: !terminal && asignadas > 0 && ['en_laboratorio', 'en_analisis', 'parcial'].includes(estado),
    review: !terminal && asignadas > 0 && completadas >= asignadas,
    interpretation: !terminal && asignadas > 0 && revisadas >= asignadas,
    reports: estado === 'reportado',
  };
  return Object.entries(actionRules).map(([key, action]) => ({
    ...action,
    key,
    visible: (actionPermissions[key] || []).every((permission) => hasPermission(permission)),
    enabled: Boolean(enabledByKey[key]),
  }));
};

const formatDate = (value, withTime = false) => {
  if (!value) return '-';
  // ISO dates without a time are calendar dates, not UTC instants. Parsing
  // them as UTC shifts the displayed deadline one day back in Colombia.
  const date = !withTime && /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
};

const normalizeArrayResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const LotesMuestrasPage = () => {
  const router = useRouter();
  const { hasPermission, user } = useAuth();
  const canViewOperationalDeadlines = isGlobalUser(user);
  const [lotes, setLotes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [machines, setMachines] = useState([]);
  const [samplingPoints, setSamplingPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [expandedLotIds, setExpandedLotIds] = useState([]);
  const [lotSamples, setLotSamples] = useState({});
  const [totalLotes, setTotalLotes] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [ordering, setOrdering] = useState({ field: 'fecha_recepcion', direction: 'desc' });
  const [assetScope, setAssetScope] = useState({ machine_id: '', sampling_point_id: '' });
  const listRequestRef = useRef(0);
  const [filters, setFilters] = useState({
    search: '',
    estado: 'todos',
    tipo_cliente: 'todos',
    client_id: '',
    machine_id: '',
    sampling_point_id: '',
    fecha_desde: '',
    fecha_hasta: '',
  });

  useEffect(() => {
    if (!router.isReady) return;
    const scope = { machine_id: router.query.machine_id || '', sampling_point_id: router.query.sampling_point_id || '' };
    setAssetScope(scope);
    setFilters((previous) => ({ ...previous, ...scope }));
  }, [router.isReady, router.query.machine_id, router.query.sampling_point_id]);

  useEffect(() => {
    Promise.all([companiesService.list({ page_size: 1000 }), machinesService.list({ activo: true }), assetTreeService.listSamplingPoints({ activo: true, page_size: 1000 })])
      .then(([companyData, machineData, pointData]) => {
        setCompanies(normalizeArrayResponse(companyData));
        setMachines(machineData || []);
        setSamplingPoints(pointData || []);
      }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    fetchData();
  }, [page, pageSize, ordering, assetScope, router.isReady]);

  const buildParams = () => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'todos') params[key] = value;
    });
    if (assetScope.machine_id) params.machine_id = assetScope.machine_id;
    if (assetScope.sampling_point_id) params.sampling_point_id = assetScope.sampling_point_id;
    params.ordering = `${ordering.direction === 'desc' ? '-' : ''}${ordering.field}`;
    return params;
  };

  const toggleOrdering = (field) => {
    setPage(1);
    setOrdering((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };


  const fetchData = async () => {
    const requestId = ++listRequestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const params = buildParams();
      const [listData, summaryData] = await Promise.all([
        sampleBatchesService.page({ ...params, page, page_size: pageSize }),
        sampleBatchesService.resumen(params).catch(() => null),
      ]);
      if (requestId !== listRequestRef.current) return;
      const list = normalizeArrayResponse(listData.results || []);
      setLotes(list);
      setTotalLotes(Number(listData.count ?? list.length));
      setExpandedLotIds([]);
      setLotSamples({});
      setResumen(summaryData);
    } catch (error) {
      if (requestId !== listRequestRef.current) return;
      console.error(error);
      setLoadError(error);
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
    }
  };

  const fetchLotSamples = async (loteId, samplePage = 1) => {
    setLotSamples((current) => ({
      ...current,
      [loteId]: { ...(current[loteId] || {}), loading: true, error: null },
    }));
    try {
      const data = await sampleBatchesService.samples(loteId, {
        page: samplePage,
        page_size: 10,
        machine_id: filters.machine_id || undefined,
        sampling_point_id: filters.sampling_point_id || undefined,
      });
      setLotSamples((current) => ({
        ...current,
        [loteId]: {
          results: data.results || [],
          count: Number(data.count || 0),
          page: samplePage,
          pageSize: 10,
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      setLotSamples((current) => ({
        ...current,
        [loteId]: { ...(current[loteId] || {}), loading: false, error },
      }));
    }
  };

  const toggleLotSamples = (lote, isExpanding) => {
    setExpandedLotIds((current) => (
      isExpanding ? [...new Set([...current, lote.id])] : current.filter((id) => id !== lote.id)
    ));
    if (isExpanding && !lotSamples[lote.id]?.results && !lotSamples[lote.id]?.loading) {
      fetchLotSamples(lote.id);
    }
  };

  const updateFilter = (field, value) => {
    setPage(1);
    if (field === 'machine_id') setAssetScope({ machine_id: '', sampling_point_id: '' });
    if (field === 'sampling_point_id') setAssetScope((scope) => ({ ...scope, sampling_point_id: '' }));
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelete = async (lote) => {
    try {
      const total = Number(lote.total_muestras ?? lote.progreso?.total ?? 0);
      if (lote.estado === 'borrador' && total === 0) {
        if (!await appDialog.confirm(`¿Eliminar el borrador vacío ${lote.id}?`)) return;
        await sampleBatchesService.remove(lote.id);
        toast.success('Borrador vacío eliminado.');
      } else {
        const reason = await appDialog.prompt(`Motivo para cancelar el lote ${lote.id}:`);
        if (reason === null) return;
        if (!reason.trim()) return toast.error('El motivo es obligatorio para conservar la trazabilidad.');
        await sampleBatchesService.cancel(lote.id, reason.trim());
        toast.success('Lote cancelado; su historial fue conservado.');
      }
      fetchData();
    } catch (error) {
      console.error(error);
      notifyApiError(error, 'No se pudo actualizar el lote.', { scope: 'sample-lots-delete' });
    }
  };

  const handleIngresoLaboratorio = (lote) => {
    const total = Number(lote.total_muestras || lote.progreso?.total || 0);
    if (total <= 0) {
      toast.warning('El lote debe tener al menos una muestra para ingresar a laboratorio');
      return;
    }
    router.push(`/muestras/laboratorio?lote=${lote.id}`);
  };

  const handleBatchAction = (lote, action) => {
    if (!action.visible) return;
    if (!action.enabled) {
      toast.info('Accion no disponible en este punto del flujo.');
      return;
    }
    if (action.key === 'lab') {
      handleIngresoLaboratorio(lote);
      return;
    }
    router.push(action.path(lote.id));
  };

  const handleRegisterDraft = async (lote) => {
    if (!await appDialog.confirm(`¿Registrar el lote ${lote.id}? Después estará disponible para ingreso al laboratorio.`)) return;
    try {
      await sampleBatchesService.registerDraft(lote.id);
      toast.success('Lote registrado correctamente.');
      await fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'No se pudo registrar el borrador.');
    }
  };

  // The API filters by the actual samples, including their equipment and
  // measurement points. Do not re-filter the page in the browser: doing so
  // would hide batches whose matching sample is not part of a summary field.
  const filteredLotes = lotes;
  const visibleLotes = lotes;

  const stats = useMemo(() => {
    if (resumen) return resumen;
    return {
      total_lotes: totalLotes,
      pendientes: filteredLotes.filter((l) => ['borrador', 'registrado'].includes(l.estado)).length,
      en_laboratorio: filteredLotes.filter((l) => ['en_laboratorio', 'en_analisis', 'parcial'].includes(l.estado)).length,
      reportados: filteredLotes.filter((l) => l.estado === 'reportado').length,
    };
  }, [filteredLotes, resumen, totalLotes]);

  if (loadError) {
    return (
      <div className="go-page">
        <div className="go-shell">
          <AppErrorState
            error={loadError}
            fallback="No fue posible cargar los lotes."
            onRetry={fetchData}
            onBack={() => router.push('/dashboard')}
            backLabel="Ir al inicio"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="go-page batches-v2">
      <div className="go-shell">
        <PageHeader
          title="Lotes de muestras"
          subtitle="Administre la recepción de muestras en lotes y consulte su estado."
          actions={(
            <button type="button" onClick={() => router.push('/muestras/nuevo-lote')} className="go-primary">
              <Plus size={16} /> Nuevo lote
            </button>
          )}
        />

        <MetricStrip
          items={[
            { icon: PackageCheck, label: 'Total lotes', value: stats.total_lotes || 0 },
            { icon: Clock, label: 'Pendientes', value: stats.pendientes || 0 },
            { icon: FlaskConical, label: 'En laboratorio', value: stats.en_laboratorio || 0 },
            { icon: CheckCircle, label: 'Reportados', value: stats.reportados || 0 },
          ]}
        />

        <section className="go-filterbar batches-filters">
          <label className="go-search">
            <Search size={16} />
            <input
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Lote, cliente, equipo, placa o punto de medida..."
            />
          </label>

          <label className="go-field-inline"><span>Cliente</span><select value={filters.client_id} onChange={(e) => updateFilter('client_id', e.target.value)}><option value="">Todos</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
          <label className="go-field-inline"><span>Equipo</span><select value={filters.machine_id} onChange={(e) => { updateFilter('machine_id', e.target.value); updateFilter('sampling_point_id', ''); }}><option value="">Todos</option>{machines.map((item) => <option key={item.id} value={item.id}>{item.codigo_equipo ? `${item.codigo_equipo} · ` : ''}{item.nombre}</option>)}</select></label>
          <label className="go-field-inline"><span>Punto de medida</span><select value={filters.sampling_point_id} onChange={(e) => updateFilter('sampling_point_id', e.target.value)}><option value="">Todos</option>{samplingPoints.filter((item) => !filters.machine_id || String(item.maquina || item.maquina_id) === String(filters.machine_id)).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>

          <label className="go-field-inline">
            <span>Estado</span>
            <select value={filters.estado} onChange={(e) => updateFilter('estado', e.target.value)}>
              {estadoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="go-field-inline">
            <span>Tipo cliente</span>
            <select value={filters.tipo_cliente} onChange={(e) => updateFilter('tipo_cliente', e.target.value)}>
              <option value="todos">Todos</option>
              <option value="registrado">Registrado</option>
              <option value="ocasional">Ocasional</option>
            </select>
          </label>

          <label className="go-field-inline date-filter">
            <span>Desde</span>
            <input type="date" value={filters.fecha_desde} onChange={(e) => updateFilter('fecha_desde', e.target.value)} />
          </label>

          <label className="go-field-inline date-filter">
            <span>Hasta</span>
            <input type="date" value={filters.fecha_hasta} onChange={(e) => updateFilter('fecha_hasta', e.target.value)} />
          </label>

          <button type="button" onClick={fetchData} disabled={loading} className="go-primary">
            <Filter size={16} /> Filtrar
          </button>
          <button type="button" onClick={fetchData} disabled={loading} className="go-mini icon-only" aria-label="Actualizar">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </section>

        <section className="batches-workspace">
          <article className="go-card batches-list-card">
            <div className="go-section-head batches-section-head">
              <div>
                <h2>Lotes y muestras</h2>
                <p>Despliegue un lote para ver sus muestras reales, su equipo, punto de medida y plazo de informe.</p>
              </div>
              <span className="go-pill"><ClipboardList size={14} /> {totalLotes} lotes</span>
            </div>

            {loading ? (
              <div className="go-empty-state">Cargando lotes...</div>
            ) : filteredLotes.length === 0 ? (
              <div className="go-empty-state">
                <AlertTriangle size={28} />
                <span>No hay lotes para los filtros seleccionados.</span>
                <button type="button" onClick={() => router.push('/muestras/nuevo-lote')} className="go-primary">Crear primer lote</button>
              </div>
            ) : (
              <DataTable
                data={visibleLotes}
                nestedDataKey="muestras"
                pagination={false}
                minWidth={760}
                sort={ordering}
                onSort={toggleOrdering}
                expandedRows={expandedLotIds}
                onNestedToggle={toggleLotSamples}
                renderExpandedRow={(row) => (
                  <LotSamplesPanel
                    lote={row}
                    data={lotSamples[row.id]}
                    showDeadline={canViewOperationalDeadlines}
                    onPageChange={(nextPage) => fetchLotSamples(row.id, nextPage)}
                    onOpenSample={(sample) => router.push(`/muestras/lotes/${row.id}/muestras/${sample.id}`)}
                  />
                )}
                columns={[
                  {
                    id: 'id',
                    label: 'Código de lote',
                    mobileTitle: true,
                    minWidth: 130,
                    render: (row) => <button type="button" className="go-link-quiet batch-code" onClick={(event) => { event.stopPropagation(); router.push(`/muestras/lotes/${row.id}`); }}>{row.id}</button>,
                  },
                  {
                    id: 'cliente_empresa__nombre',
                    label: 'Cliente',
                    minWidth: 170,
                    render: (row) => <strong>{row.cliente_nombre || row.cliente_ocasional_nombre || '-'}</strong>,
                  },
                  { id: 'tipo_gestion__nombre', label: 'Tipo de gestión', minWidth: 150, render: (row) => row.tipo_gestion_info?.nombre || row.tipo_gestion || '-' },
                  { id: 'fecha_recepcion', label: 'Fecha recepción', minWidth: 145, render: (row) => formatDate(row.fecha_recepcion || row.updated_at, true) },
                  {
                    id: 'total_muestras_db',
                    label: '# muestras',
                    width: 100,
                    render: (row) => <div><span className="go-pill compact-count">{row.total_muestras ?? row.progreso?.total ?? 0}</span>{row.muestras_coincidentes != null && <small>{row.muestras_coincidentes} coinciden</small>}</div>,
                  },
                  {
                    id: 'estado',
                    label: 'Estado',
                    minWidth: 130,
                    render: (row) => <span className={`go-badge ${row.estado === 'reportado' ? 'go-badge-success' : row.estado === 'cancelado' ? 'go-badge-danger' : ['en_laboratorio','en_analisis','parcial'].includes(row.estado) ? 'go-badge-warning' : 'go-badge-neutral'}`}>{estadoLabels[row.estado] || row.estado || '-'}</span>,
                  },
                  {
                    id: 'acciones',
                    label: 'Acciones',
                    sortable: false,
                    searchable: false,
                    mobileHidden: true,
                    width: 72,
                    render: (row) => {
                      const rowActions = getBatchActions(row, hasPermission).filter((action) => action.visible);
                      const locked = ['reportado', 'cancelado'].includes(row.estado);
                      const menuItems = [
                        { label: 'Ver detalle', icon: Eye, onClick: () => router.push(`/muestras/lotes/${row.id}`) },
                        { label: 'Editar lote', icon: Edit, disabled: locked, onClick: () => router.push(`/muestras/lotes/${row.id}/editar`) },
                        ...(row.estado === 'borrador' && hasPermission('lotes.editar') ? [{ label: 'Registrar borrador', icon: CheckCircle, onClick: () => handleRegisterDraft(row) }] : []),
                        { separator: true },
                        ...rowActions.map((action) => ({ label: action.label, icon: action.icon, disabled: !action.enabled, onClick: () => handleBatchAction(row, action) })),
                        { separator: true },
                        { label: row.estado === 'borrador' && Number(row.total_muestras || 0) === 0 ? 'Eliminar borrador' : 'Cancelar lote', icon: Trash2, danger: true, disabled: locked || row.estado === 'cancelado', onClick: () => handleDelete(row) },
                      ];
                      return <div className="flex justify-end" onClick={(event) => event.stopPropagation()}><OverflowMenu items={menuItems} /></div>;
                    },
                  },
                ]}
              />
            )}
            <PaginationBar count={totalLotes} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </article>
        </section>
      </div>
    </div>
  );
};

const sampleStateClass = (code) => ({
  reportada: 'go-badge-success',
  revisada: 'go-badge-success',
  resultados_completos: 'go-badge-success',
  en_laboratorio: 'go-badge-warning',
  invalidada: 'go-badge-danger',
}[code] || 'go-badge-neutral');

const deadlineClass = (status) => ({
  vencida: 'bg-red-950/50 text-red-200 border-red-800',
  vence_hoy: 'bg-amber-950/50 text-amber-200 border-amber-800',
  entregada: 'bg-emerald-950/40 text-emerald-200 border-emerald-800',
  pendiente_recepcion: 'bg-slate-800/70 text-slate-200 border-slate-600',
}[status] || 'bg-slate-900 text-slate-200 border-slate-700');

const LotSamplesPanel = ({ lote, data, showDeadline = false, onPageChange, onOpenSample }) => {
  if (!data?.results && data?.loading) {
    return <div className="p-5 text-sm text-gray-400">Cargando muestras de {lote.id}…</div>;
  }
  if (data?.error) {
    return <div className="p-5 text-sm text-red-300">No fue posible cargar las muestras. Cierre y vuelva a desplegar el lote.</div>;
  }
  if (!data?.results) {
    return <div className="p-5 text-sm text-gray-400">Preparando el detalle de muestras…</div>;
  }
  if (!data.results.length) {
    return <div className="p-5 text-sm text-gray-400">No hay muestras que coincidan con los filtros activos.</div>;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="m-0 text-sm font-semibold text-white">Muestras del lote {lote.id}</p>
          <p className="m-0 mt-1 text-xs text-gray-400">Cada fila conserva su propio equipo, punto de medida y estado del flujo.</p>
        </div>
        <span className="go-pill compact-count">{data.count} muestra(s)</span>
      </div>
      <div className="go-table-scroll">
        <table className={`w-full ${showDeadline ? 'min-w-[850px]' : 'min-w-[640px]'} text-left text-sm`}>
          <thead className="text-xs uppercase tracking-wide text-gray-400">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2">Muestra</th>
              <th className="px-3 py-2">Equipo</th>
              <th className="px-3 py-2">Punto de medida</th>
              <th className="px-3 py-2">Toma</th>
              <th className="px-3 py-2">Flujo</th>
              {showDeadline ? <th className="px-3 py-2">Entrega de informe</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.results.map((sample) => {
              const deadline = sample.plazo_entrega || {};
              const progress = Number(deadline.progress_percent || 0);
              return (
                <tr key={sample.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3 py-3 align-top">
                    <button type="button" onClick={() => onOpenSample(sample)} className="go-link-quiet font-semibold">{sample.id}</button>
                    <small className="mt-1 block text-gray-500">{tipoMuestraLabel[sample.tipo_muestra] || sample.tipo_muestra} · {sample.condicion}</small>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span>{sample.equipo?.label || 'Sin equipo'}</span>
                    {sample.equipo?.manual && <small className="mt-1 block text-gray-500">Identificación manual</small>}
                  </td>
                  <td className="px-3 py-3 align-top">{sample.punto_muestreo?.nombre || 'Sin punto de medida'}</td>
                  <td className="px-3 py-3 align-top">{formatDate(sample.fecha_toma, true)}</td>
                  <td className="px-3 py-3 align-top"><span className={`go-badge ${sampleStateClass(sample.estado_flujo?.code)}`}>{sample.estado_flujo?.label || '—'}</span></td>
                  {showDeadline ? <td className="px-3 py-3 align-top min-w-[220px]">
                    {deadline.configured ? deadline.waiting_reception ? <>
                      <span className={`rounded border px-2 py-1 text-xs font-semibold ${deadlineClass(deadline.status)}`}>{deadline.label}</span>
                      <small className="mt-2 flex items-center gap-1 text-gray-500"><CalendarClock size={12} /> El conteo se activa al registrar el ingreso al laboratorio.</small>
                    </> : <>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded border px-2 py-1 text-xs font-semibold ${deadlineClass(deadline.status)}`}>{deadline.label}</span>
                        <span className="text-xs text-gray-400">{deadline.due_date ? formatDate(deadline.due_date) : '—'}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/10" aria-label={`Plazo de entrega: ${progress}% transcurrido`}>
                        <div className={`h-full rounded ${deadline.status === 'vencida' ? 'bg-red-500' : deadline.status === 'entregada' ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <small className="mt-1 flex items-center gap-1 text-gray-500"><CalendarClock size={12} /> {deadline.basis === 'habiles' ? 'Días hábiles' : 'Días calendario'} · {deadline.total_days} configurado(s)</small>
                    </> : <span className="text-xs text-gray-500">Sin plazo en el tipo de gestión</span>}
                  </td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar
        count={data.count}
        page={data.page || 1}
        pageSize={data.pageSize || 10}
        pageSizeOptions={[10]}
        onPageChange={onPageChange}
        onPageSizeChange={() => {}}
        compact
        className="mt-3"
      />
    </div>
  );
};

export default LotesMuestrasPage;
