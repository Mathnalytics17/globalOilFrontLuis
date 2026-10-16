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
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  BarChart3,
  FileText,
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
    lab: !terminal && totalMuestras > 0 && ['borrador', 'registrado', 'recibido'].includes(estado),
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
};

const normalizeArrayResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const matchesLotFilters = (lote, filters) => {
  const search = String(filters.search || '').trim().toLocaleLowerCase('es');
  if (search) {
    const searchable = [
      lote.id, lote.codigo, lote.cliente_nombre, lote.cliente?.nombre,
      lote.contacto_nombre, lote.tipo_gestion_nombre, lote.tipo_gestion,
    ].filter(Boolean).join(' ').toLocaleLowerCase('es');
    if (!searchable.includes(search)) return false;
  }
  if (filters.estado && filters.estado !== 'todos' && String(lote.estado || '').toLowerCase() !== String(filters.estado).toLowerCase()) return false;
  if (filters.tipo_cliente && filters.tipo_cliente !== 'todos') {
    const type = lote.tipo_cliente || lote.cliente_tipo || lote.tipo_gestion || '';
    if (String(type).toLowerCase() !== String(filters.tipo_cliente).toLowerCase()) return false;
  }
  const dateValue = lote.fecha_recepcion || lote.fecha_envio || lote.created_at || lote.fecha_creacion;
  const date = dateValue ? String(dateValue).slice(0, 10) : '';
  if (filters.fecha_desde && (!date || date < filters.fecha_desde)) return false;
  if (filters.fecha_hasta && (!date || date > filters.fecha_hasta)) return false;
  return true;
};

const getMuestrasPreview = (loteDetalle, scope = {}) => {
  const list = Array.isArray(loteDetalle?.muestras) ? loteDetalle.muestras : [];
  return list.filter((sample) => {
    if (scope.machine_id && Number(sample.referencia_equipo) !== Number(scope.machine_id)) return false;
    if (scope.sampling_point_id && Number(sample.punto_muestreo?.id) !== Number(scope.sampling_point_id)) return false;
    return true;
  }).slice(0, 6);
};

const LotesMuestrasPage = () => {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [lotes, setLotes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [machines, setMachines] = useState([]);
  const [samplingPoints, setSamplingPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [selectedLoteDetail, setSelectedLoteDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
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

  useEffect(() => {
    if (selectedLoteId) {
      fetchLoteDetail(selectedLoteId);
    }
  }, [selectedLoteId]);

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
        // Los filtros también se aplican localmente. Así la vista mantiene el
        // contrato incluso ante una versión del API que ignore algún parámetro.
        sampleBatchesService.page({ ...params, page: 1, page_size: 1000 }),
        sampleBatchesService.resumen(params).catch(() => null),
      ]);
      if (requestId !== listRequestRef.current) return;
      const list = normalizeArrayResponse(listData.results || []);
      setLotes(list);
      setResumen(summaryData);
      if (list.length && !list.some((item) => item.id === selectedLoteId)) {
        setSelectedLoteId(list[0].id);
      }
      if (!list.length) {
        setSelectedLoteId(null);
        setSelectedLoteDetail(null);
      }
    } catch (error) {
      if (requestId !== listRequestRef.current) return;
      console.error(error);
      setLoadError(error);
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
    }
  };

  const fetchLoteDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const detail = await sampleBatchesService.getById(id);
      setSelectedLoteDetail(detail);
    } catch (error) {
      console.error(error);
      setSelectedLoteDetail(null);
    } finally {
      setLoadingDetail(false);
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
        if (!window.confirm(`¿Eliminar el borrador vacío ${lote.id}?`)) return;
        await sampleBatchesService.remove(lote.id);
        toast.success('Borrador vacío eliminado.');
      } else {
        const reason = window.prompt(`Motivo para cancelar el lote ${lote.id}:`);
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

  const filteredLotes = useMemo(
    () => lotes.filter((lote) => matchesLotFilters(lote, filters)),
    [lotes, filters]
  );
  const visibleLotes = useMemo(
    () => filteredLotes.slice((page - 1) * pageSize, page * pageSize),
    [filteredLotes, page, pageSize]
  );

  useEffect(() => {
    if (!selectedLoteId && filteredLotes.length) {
      setSelectedLoteId(filteredLotes[0].id);
    }
  }, [filteredLotes, selectedLoteId]);

  const stats = useMemo(() => {
    if (resumen) return resumen;
    return {
      total_lotes: filteredLotes.length,
      pendientes: filteredLotes.filter((l) => ['borrador', 'registrado'].includes(l.estado)).length,
      en_laboratorio: filteredLotes.filter((l) => ['en_laboratorio', 'en_analisis', 'parcial'].includes(l.estado)).length,
      reportados: filteredLotes.filter((l) => l.estado === 'reportado').length,
    };
  }, [filteredLotes, resumen]);

  const selectedListItem = filteredLotes.find((item) => item.id === selectedLoteId);
  const selectedInfo = selectedLoteDetail || selectedListItem;
  const muestrasPreview = getMuestrasPreview(selectedLoteDetail, assetScope);
  const selectedActions = selectedInfo ? getBatchActions(selectedInfo, hasPermission).filter((action) => action.visible && action.enabled) : [];
  const selectedPrimaryAction = selectedActions[0];
  const selectedSecondaryActions = selectedActions.slice(1);

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

        <section className={`batches-workspace ${selectedInfo ? 'with-detail' : ''}`}>
          <article className="go-card batches-list-card">
            <div className="go-section-head batches-section-head">
              <div>
                <h2>Listado de lotes</h2>
                <p>Seleccione una fila para consultar el detalle sin perder el contexto.</p>
              </div>
              <span className="go-pill"><ClipboardList size={14} /> {filteredLotes.length} lotes</span>
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
                pagination
                minWidth={900}
                sort={ordering}
                onSort={toggleOrdering}
                onRowClick={(row) => setSelectedLoteId(row.id)}
                rowClassName={(row) => row.id === selectedLoteId ? 'selected-row' : ''}
                columns={[
                  {
                    id: 'selector',
                    label: '',
                    sortable: false,
                    searchable: false,
                    mobileHidden: true,
                    width: 36,
                    render: (row) => <span className={`batch-radio ${row.id === selectedLoteId ? 'active' : ''}`} aria-hidden="true" />,
                  },
                  { id: 'equipo_resumen', label: 'Equipo', minWidth: 150, render: (row) => row.equipo_resumen || 'Sin equipo' },
                  { id: 'punto_muestreo_resumen', label: 'Punto de medida', minWidth: 180, render: (row) => row.punto_muestreo_resumen || 'Sin punto' },
                  {
                    id: 'id',
                    label: 'Código de lote',
                    mobileTitle: true,
                    minWidth: 130,
                    render: (row) => <button type="button" className="go-link-quiet batch-code" onClick={(event) => { event.stopPropagation(); setSelectedLoteId(row.id); }}>{row.id}</button>,
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
            <PaginationBar count={filteredLotes.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </article>

          {selectedInfo ? (
            <aside className="go-card batch-detail-panel">
              <div className="batch-detail-head">
                <div>
                  <span className="batch-detail-label">Información del lote</span>
                  <div className="batch-detail-title-row">
                    <h2>{selectedInfo.id}</h2>
                    <span className={`go-badge ${['en_laboratorio','en_analisis','parcial'].includes(selectedInfo.estado) ? 'go-badge-warning' : selectedInfo.estado === 'reportado' ? 'go-badge-success' : 'go-badge-neutral'}`}>
                      {estadoLabels[selectedInfo.estado] || selectedInfo.estado || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="batch-detail-actions">
                {selectedPrimaryAction ? (
                  <button type="button" className="go-primary flex-1" onClick={() => handleBatchAction(selectedInfo, selectedPrimaryAction)}>
                    {selectedPrimaryAction.label}
                  </button>
                ) : (
                  <button type="button" className="go-ghost flex-1" onClick={() => router.push(`/muestras/lotes/${selectedInfo.id}`)}>
                    Ver detalle <ChevronRight size={15} />
                  </button>
                )}
                <OverflowMenu
                  items={[
                    { label: 'Ver detalle', icon: Eye, onClick: () => router.push(`/muestras/lotes/${selectedInfo.id}`) },
                    ...selectedSecondaryActions.map((action) => ({
                      label: action.label,
                      icon: action.icon,
                      onClick: () => handleBatchAction(selectedInfo, action),
                    })),
                  ]}
                />
              </div>

              <dl className="batch-detail-list">
                <DetailLine label="Cliente" value={selectedInfo.cliente_nombre || selectedInfo.cliente_ocasional_nombre || '-'} />
                <DetailLine label="Tipo de gestión" value={selectedInfo.tipo_gestion_info?.nombre || selectedInfo.tipo_gestion || '-'} />
                <DetailLine label="Fecha recepción" value={formatDate(selectedInfo.fecha_recepcion || selectedInfo.updated_at, true)} />
                <DetailLine label="# de muestras" value={selectedInfo.total_muestras ?? selectedInfo.progreso?.total ?? selectedInfo.muestras?.length ?? 0} />
              </dl>

              <div className="batch-detail-divider" />
              <div>
                <span className="batch-detail-label">Muestras</span>
                {loadingDetail ? (
                  <div className="go-empty-state small">Cargando muestras...</div>
                ) : muestrasPreview.length ? (
                  <div className="batch-sample-preview">
                    {muestrasPreview.map((muestra) => (
                      <button key={muestra.id} type="button" className="batch-sample-item" onClick={() => router.push(`/muestras/lotes/${selectedInfo.id}/muestras/${muestra.id}`)}>
                        <span><strong>{muestra.id}</strong><small>{tipoMuestraLabel[muestra.tipo_muestra] || muestra.tipo_muestra || '-'}</small></span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="batch-detail-empty">No hay muestras disponibles.</p>
                )}
              </div>
            </aside>
          ) : null}
        </section>
      </div>
    </div>
  );
};

const DetailLine = ({ label, value }) => (
  <div className="batch-detail-row">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

export default LotesMuestrasPage;
