import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit,
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import { sampleBatchesService } from '@features/samples/infrastructure/sampleBatchesService';
import PaginationBar from '../../../src/components/pagination/PaginationBar';

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

const getBatchActions = (lote = {}) => {
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
  const [lotes, setLotes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [selectedLoteDetail, setSelectedLoteDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [ordering, setOrdering] = useState({ field: 'fecha_recepcion', direction: 'desc' });
  const [assetScope, setAssetScope] = useState({ machine_id: '', sampling_point_id: '' });
  const [filters, setFilters] = useState({
    search: '',
    estado: 'todos',
    tipo_cliente: 'todos',
    fecha_desde: '',
    fecha_hasta: '',
  });

  useEffect(() => {
    if (!router.isReady) return;
    setAssetScope({
      machine_id: router.query.machine_id || '',
      sampling_point_id: router.query.sampling_point_id || '',
    });
  }, [router.isReady, router.query.machine_id, router.query.sampling_point_id]);

  useEffect(() => {
    if (!router.isReady) return;
    fetchData();
  }, [page, pageSize, ordering, assetScope, router.isReady]);

  useEffect(() => {
    if (!selectedLoteId && lotes.length) {
      setSelectedLoteId(lotes[0].id);
    }
  }, [lotes, selectedLoteId]);

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

  const sortHeader = (field, label) => {
    const active = ordering.field === field;
    const Icon = active ? (ordering.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button type="button" className={`sort-header ${active ? 'active' : ''}`} onClick={() => toggleOrdering(field)}>
        <span>{label}</span>
        <Icon size={14} aria-hidden="true" />
      </button>
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = buildParams();
      const [listData, summaryData] = await Promise.all([
        sampleBatchesService.page({ ...params, page, page_size: pageSize }),
        sampleBatchesService.resumen(params).catch(() => null),
      ]);
      const list = normalizeArrayResponse(listData.results || []);
      setLotes(list);
      setTotalCount(listData.count || 0);
      setResumen(summaryData);
      if (list.length && !list.some((item) => item.id === selectedLoteId)) {
        setSelectedLoteId(list[0].id);
      }
      if (!list.length) {
        setSelectedLoteId(null);
        setSelectedLoteDetail(null);
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la lista de lotes');
    } finally {
      setLoading(false);
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

  const updateFilter = (field, value) => { setPage(1); setFilters((prev) => ({ ...prev, [field]: value })); };

  const handleDelete = async (lote) => {
    const confirmed = window.confirm(`¿Eliminar el lote ${lote.id}? Esta acción eliminará también sus muestras si el backend lo permite.`);
    if (!confirmed) return;
    try {
      await sampleBatchesService.remove(lote.id);
      toast.success('Lote eliminado');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo eliminar el lote');
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

  const stats = useMemo(() => {
    if (resumen) return resumen;
    return {
      total_lotes: lotes.length,
      pendientes: lotes.filter((l) => ['borrador', 'registrado'].includes(l.estado)).length,
      en_laboratorio: lotes.filter((l) => ['en_laboratorio', 'en_analisis', 'parcial'].includes(l.estado)).length,
      reportados: lotes.filter((l) => l.estado === 'reportado').length,
    };
  }, [lotes, resumen]);

  const selectedListItem = lotes.find((item) => item.id === selectedLoteId);
  const selectedInfo = selectedLoteDetail || selectedListItem;
  const muestrasPreview = getMuestrasPreview(selectedLoteDetail, assetScope);

  return (
    <div className="batches-page">
      <div className="batches-container">
        <header className="hero-card">
          <div>
            <p className="eyebrow">Muestras</p>
            <h1>Lotes de muestras</h1>
            <p className="hero-text">Administra la recepción en lotes con una vista más clara: resumen, tabla operativa y panel de detalle lateral.</p>
          </div>
          <div className="hero-actions">
            <button onClick={() => router.push('/muestras/nuevo-lote')} className="primary-btn">
              <Plus size={18} /> Nuevo lote
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <SummaryCard icon={PackageCheck} title="Total lotes" value={stats.total_lotes || 0} />
          <SummaryCard icon={Clock} title="Pendientes" value={stats.pendientes || 0} />
          <SummaryCard icon={FlaskConical} title="En laboratorio" value={stats.en_laboratorio || 0} />
          <SummaryCard icon={CheckCircle} title="Reportados" value={stats.reportados || 0} />
        </section>

        <section className="filters-card">
          <div className="filter-field large">
            <label>Buscar lote</label>
            <div className="search-wrap">
              <Search size={17} />
              <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Buscar por código de lote, cliente o contacto..." />
            </div>
          </div>
          <div className="filter-field">
            <label>Estado</label>
            <select value={filters.estado} onChange={(e) => updateFilter('estado', e.target.value)}>
              {estadoOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label>Tipo cliente</label>
            <select value={filters.tipo_cliente} onChange={(e) => updateFilter('tipo_cliente', e.target.value)}>
              <option value="todos">Todos</option>
              <option value="registrado">Registrado</option>
              <option value="ocasional">Ocasional</option>
            </select>
          </div>
          <div className="filter-field">
            <label>Fecha desde</label>
            <input type="date" value={filters.fecha_desde} onChange={(e) => updateFilter('fecha_desde', e.target.value)} />
          </div>
          <div className="filter-field">
            <label>Fecha hasta</label>
            <input type="date" value={filters.fecha_hasta} onChange={(e) => updateFilter('fecha_hasta', e.target.value)} />
          </div>
          <div className="filter-actions">
            <button onClick={fetchData} disabled={loading} className="primary-btn"><Filter size={17} /> {loading ? 'Cargando...' : 'Filtrar'}</button>
            <button onClick={fetchData} disabled={loading} className="icon-refresh"><RefreshCw size={17} className={loading ? 'spin' : ''} /></button>
          </div>
        </section>

        <section className="content-grid">
          <article className="table-card">
            <div className="table-head">
              <div>
                <h2>Listado de lotes</h2>
                <p>Selecciona un lote para ver el detalle a la derecha y actuar más rápido.</p>
              </div>
              <div className="table-head-chip"><ClipboardList size={16} /> {lotes.length} lotes</div>
            </div>

            {loading ? (
              <div className="table-empty">Cargando lotes...</div>
            ) : lotes.length === 0 ? (
              <div className="table-empty">
                <AlertTriangle size={34} className="empty-icon" />
                <p>No hay lotes para los filtros seleccionados.</p>
                <button onClick={() => router.push('/muestras/nuevo-lote')} className="primary-btn">Crear primer lote</button>
              </div>
            ) : (
              <div className="table-shell">
                <div className="table-row table-row-head">
                  <span></span>
                  <span>{sortHeader('id', 'Código de lote')}</span>
                  <span>{sortHeader('cliente_empresa__nombre', 'Cliente')}</span>
                  <span>{sortHeader('tipo_gestion__nombre', 'Tipo de gestión')}</span>
                  <span>{sortHeader('fecha_recepcion', 'Fecha recepción')}</span>
                  <span>{sortHeader('total_muestras_db', '# muestras')}</span>
                  <span>{sortHeader('estado', 'Estado')}</span>
                  <span>Acciones</span>
                </div>
                {lotes.map((row) => {
                  const active = row.id === selectedLoteId;
                  const rowActions = getBatchActions(row);
                  const locked = ['reportado', 'cancelado'].includes(row.estado);
                  return (
                    <div key={row.id} className={`table-row ${active ? 'active-row' : ''}`}>
                      <span>
                        <button className={`radio-select ${active ? 'radio-active' : ''}`} onClick={() => setSelectedLoteId(row.id)} aria-label={`Seleccionar ${row.id}`} />
                      </span>
                      <span className="mono strong">{row.id}</span>
                      <span>
                        <strong>{row.cliente_nombre || row.cliente_ocasional_nombre || '-'}</strong>
                        <small>{row.tipo_cliente === 'ocasional' ? 'Ocasional' : 'Registrado'}</small>
                      </span>
                      <span>{row.tipo_gestion_info?.nombre || row.tipo_gestion || '-'}</span>
                      <span>{formatDate(row.fecha_recepcion || row.updated_at, true)}</span>
                      <span>
                        <span className="count-pill">{row.total_muestras ?? row.progreso?.total ?? 0}</span>
                        {row.muestras_coincidentes != null && <small>{row.muestras_coincidentes} coinciden con el activo</small>}
                      </span>
                      <span><span className={`status-chip ${estadoClasses[row.estado] || 'status-gray'}`}>{estadoLabels[row.estado] || row.estado || '-'}</span></span>
                      <span>
                        <div className="inline-actions">
                          <button onClick={() => router.push(`/muestras/lotes/${row.id}`)} className="mini-action" title="Ver detalle"><Eye size={15} /></button>
                          <button disabled={locked} onClick={() => router.push(`/muestras/lotes/${row.id}/editar`)} className="mini-action" title={locked ? 'Edición bloqueada por estado' : 'Editar lote'}><Edit size={15} /></button>
                          {rowActions.map((action) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.key}
                                disabled={!action.enabled}
                                onClick={() => handleBatchAction(row, action)}
                                className={`mini-action ${action.className}`}
                                title={action.enabled ? action.label : `${action.label} no disponible`}
                              >
                                <Icon size={15} />
                              </button>
                            );
                          })}
                          <button disabled={locked} onClick={() => handleDelete(row)} className="mini-action danger" title={locked ? 'Eliminación bloqueada por estado' : 'Eliminar lote'}><Trash2 size={15} /></button>
                        </div>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <PaginationBar count={totalCount} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </article>

          <aside className="detail-column">
            <article className="side-card">
              <div className="table-head compact">
                <div>
                  <h2>Información del lote</h2>
                  <p>Resumen operativo del lote seleccionado.</p>
                </div>
                {selectedInfo?.id ? (
                  <div className="detail-actions">
                    <button className="ghost-inline" onClick={() => router.push(`/muestras/lotes/${selectedInfo.id}`)}>
                      Ver detalle <ChevronRight size={15} />
                    </button>
                    {getBatchActions(selectedInfo).filter((action) => action.enabled).map((action) => {
                      const Icon = action.icon;
                      return (
                        <button key={action.key} className={`ghost-inline ${action.className}`} onClick={() => handleBatchAction(selectedInfo, action)}>
                          {action.label} <Icon size={15} />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {selectedInfo ? (
                <div className="detail-grid">
                  <DetailItem label="Código de lote" value={selectedInfo.id} mono />
                  <DetailItem label="Cliente" value={selectedInfo.cliente_nombre || selectedInfo.cliente_ocasional_nombre || '-'} />
                  <DetailItem label="Tipo de gestión" value={selectedInfo.tipo_gestion_info?.nombre || selectedInfo.tipo_gestion || '-'} />
                  <DetailItem label="Fecha recepción" value={formatDate(selectedInfo.fecha_recepcion || selectedInfo.updated_at, true)} />
                  <DetailItem label="# muestras" value={selectedInfo.total_muestras ?? selectedInfo.progreso?.total ?? selectedInfo.muestras?.length ?? 0} />
                  <DetailItem label="Estado" value={<span className={`status-chip ${estadoClasses[selectedInfo.estado] || 'status-gray'}`}>{estadoLabels[selectedInfo.estado] || selectedInfo.estado || '-'}</span>} />
                </div>
              ) : (
                <div className="table-empty small">Selecciona un lote para ver su resumen.</div>
              )}
            </article>

            <article className="side-card">
              <div className="table-head compact">
                <div>
                  <h2>Muestras del lote</h2>
                  <p>Vista rápida de las muestras contenidas.</p>
                </div>
              </div>
              {loadingDetail ? (
                <div className="table-empty small">Cargando muestras...</div>
              ) : muestrasPreview.length ? (
                <div className="sample-list">
                  {muestrasPreview.map((muestra) => (
                    <div key={muestra.id} className="sample-row">
                      <div>
                        <strong>{muestra.id}</strong>
                        <p>{tipoMuestraLabel[muestra.tipo_muestra] || muestra.tipo_muestra || '-'} · {muestra.referencia_equipo_nombre || muestra.referencia_equipo?.nombre || muestra.equipo_placa || 'Sin equipo'}</p>
                      </div>
                      <div className="sample-side">
                        <span>{muestra.fabricante || '-'}</span>
                        <span className={`status-chip ${muestra.condicion === 'nueva' ? 'status-blue' : 'status-green'}`}>{muestra.condicion === 'nueva' ? 'Nueva' : 'Usada'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="table-empty small">Aún no hay muestras cargadas o el lote no tiene detalle disponible.</div>
              )}
            </article>

            <article className="suggestion-card">
              <div className="kicker-box">Sugerencia</div>
              <p>
                Esta tabla ahora se comporta más como una lista operativa: seleccionas el lote a la izquierda,
                y a la derecha mantienes el contexto sin abrir otra pantalla a cada rato.
              </p>
            </article>
          </aside>
        </section>
      </div>

      <style jsx global>{`
        .batches-page { min-height: auto; background: transparent; color: white; padding: 0; }
        .batches-container { width: 100%; max-width: none; margin: 0; display: grid; gap: 10px; }
        .hero-card, .filters-card, .table-card, .side-card, .suggestion-card, .summary-card {
          background: linear-gradient(180deg, rgba(26,26,26,.98), rgba(20,20,20,.98));
          border: 1px solid #333; border-radius: 12px; box-shadow: none;
        }
        .hero-card { padding: 14px 16px; display: flex; justify-content: space-between; gap: 10px; align-items: flex-end; }
        .eyebrow { margin: 0 0 8px; color: #f87171; letter-spacing: .16em; text-transform: uppercase; font-size: 12px; font-weight: 900; }
        h1 { font-size: clamp(30px, 4vw, 42px); margin: 0; }
        .hero-text { color: #c6c6c6; margin: 10px 0 0; max-width: 760px; }
        .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
        .primary-btn, .ghost-btn, .ghost-inline, .icon-refresh, .mini-action { border: 1px solid #444; color: white; cursor: pointer; transition: .18s ease; }
        .primary-btn { display: inline-flex; gap: 8px; align-items: center; justify-content: center; border-radius: 14px; background: #ef232a; border-color: #ef232a; padding: 12px 18px; font-weight: 800; }
        .primary-btn:hover { filter: brightness(1.08); }
        .ghost-btn { display: inline-flex; gap: 8px; align-items: center; justify-content: center; border-radius: 14px; background: #1f2937; padding: 12px 18px; font-weight: 700; }
        .ghost-btn.yellow { background: #5b4a0f; border-color: #7c6416; }
        .ghost-btn.blue { background: rgba(30,64,175,.65); border-color: rgba(59,130,246,.35); }
        .ghost-btn.green { background: rgba(22,101,52,.75); border-color: rgba(34,197,94,.35); }
        .ghost-btn.purple { background: rgba(88,28,135,.75); border-color: rgba(168,85,247,.35); }
        .ghost-btn.teal { background: rgba(15,118,110,.72); border-color: rgba(45,212,191,.35); }
        .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
        .summary-card { padding: 12px 14px; display: flex; gap: 14px; align-items: center; }
        .summary-icon { width: 48px; height: 48px; border-radius: 15px; background: rgba(239,35,42,.14); border: 1px solid rgba(239,35,42,.34); display: grid; place-items: center; color: #f87171; }
        .summary-card p { margin: 0; color: #a3a3a3; font-size: 14px; }
        .summary-card h3 { margin: 4px 0 0; font-size: 32px; }
        .filters-card { padding: 12px 14px; display: grid; grid-template-columns: 2fr repeat(4, minmax(0,1fr)) auto; gap: 14px; align-items: end; }
        .filter-field { display: grid; gap: 8px; }
        .filter-field label { font-size: 13px; color: #cfcfcf; font-weight: 700; }
        .filter-field input, .filter-field select { width: 100%; background: #111; border: 1px solid #404040; color: white; border-radius: 14px; min-height: 48px; padding: 0 14px; outline: none; }
        .filter-field input:focus, .filter-field select:focus { border-color: #ef232a; }
        .search-wrap { display: flex; align-items: center; gap: 10px; padding: 0 14px; min-height: 48px; border-radius: 14px; border: 1px solid #404040; background: #111; }
        .search-wrap input { border: 0; background: transparent; padding: 0; min-height: auto; }
        .filter-actions { display: flex; gap: 10px; }
        .icon-refresh { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: #1f2937; }
        .spin { animation: spin 1s linear infinite; }
        .content-grid { display: grid; grid-template-columns: minmax(0, 2fr) 390px; gap: 10px; align-items: start; }
        .table-card, .side-card { padding: 14px; }
        .table-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
        .table-head.compact { margin-bottom: 12px; }
        .table-head h2 { margin: 0; font-size: 28px; }
        .table-head p { margin: 6px 0 0; color: #a3a3a3; }
        .table-head-chip { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 9px 12px; background: rgba(255,255,255,.03); border: 1px solid #3f3f46; color: #ddd; }
        .table-shell { overflow: hidden; border: 1px solid #353535; border-radius: 18px; }
        .table-row { display: grid; grid-template-columns: 40px 1.2fr 1.5fr 1fr 1.1fr .8fr 1fr 1.2fr; gap: 12px; align-items: center; padding: 14px 16px; border-top: 1px solid #303030; }
        .table-row:first-child { border-top: 0; }
        .table-row-head { background: #202020; color: #a3a3a3; font-size: 12px; letter-spacing: .05em; text-transform: uppercase; font-weight: 800; }
        .sort-header { width: 100%; display: inline-flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; text-align: left; }
        .sort-header:hover, .sort-header.active { color: #fff; }
        .active-row { background: rgba(239,35,42,.08); box-shadow: inset 0 0 0 1px rgba(239,35,42,.28); }
        .radio-select { width: 18px; height: 18px; border-radius: 999px; border: 2px solid #6b7280; background: transparent; }
        .radio-active { border-color: #ef232a; box-shadow: inset 0 0 0 4px #ef232a; }
        .strong { color: #fca5a5; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
        .table-row strong { display: block; }
        .table-row small { display: block; color: #a3a3a3; margin-top: 4px; }
        .count-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 42px; height: 32px; border-radius: 999px; padding: 0 10px; background: #111; border: 1px solid #454545; font-weight: 800; }
        .status-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: 7px 10px; border: 1px solid transparent; font-size: 12px; font-weight: 800; }
        .status-gray { background: rgba(107,114,128,.16); border-color: rgba(107,114,128,.35); color: #e5e7eb; }
        .status-blue { background: rgba(59,130,246,.16); border-color: rgba(59,130,246,.35); color: #bfdbfe; }
        .status-yellow { background: rgba(234,179,8,.16); border-color: rgba(234,179,8,.35); color: #fde68a; }
        .status-purple { background: rgba(168,85,247,.16); border-color: rgba(168,85,247,.35); color: #e9d5ff; }
        .status-green { background: rgba(34,197,94,.14); border-color: rgba(34,197,94,.35); color: #bbf7d0; }
        .status-slate { background: rgba(148,163,184,.16); border-color: rgba(148,163,184,.35); color: #e2e8f0; }
        .status-red { background: rgba(239,68,68,.16); border-color: rgba(239,68,68,.35); color: #fecaca; }
        .inline-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .mini-action { width: 34px; height: 34px; border-radius: 10px; background: #1f2937; display: grid; place-items: center; }
        .mini-action.warning { background: #5b4a0f; }
        .mini-action.info { background: rgba(30,64,175,.65); }
        .mini-action.success { background: rgba(22,101,52,.78); }
        .mini-action.purple { background: rgba(88,28,135,.75); }
        .mini-action.teal { background: rgba(15,118,110,.75); }
        .mini-action.slate { background: rgba(71,85,105,.78); }
        .mini-action.danger { background: rgba(127,29,29,.55); border-color: rgba(239,68,68,.35); }
        .mini-action:disabled { opacity: .35; cursor: not-allowed; }
        .detail-column { display: grid; gap: 10px; }
        .detail-grid { display: grid; gap: 12px; }
        .detail-item { border: 1px solid #313131; background: rgba(255,255,255,.02); border-radius: 14px; padding: 12px 14px; }
        .detail-item label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .05em; }
        .ghost-inline { display: inline-flex; align-items: center; gap: 4px; border-radius: 12px; background: #1f2937; padding: 8px 12px; }
        .ghost-inline.green { background: rgba(22,101,52,.78); border-color: rgba(34,197,94,.35); }
        .ghost-inline.purple { background: rgba(88,28,135,.75); border-color: rgba(168,85,247,.35); }
        .ghost-inline.teal { background: rgba(15,118,110,.75); border-color: rgba(45,212,191,.35); }
        .ghost-inline.warning { background: #5b4a0f; border-color: #7c6416; }
        .ghost-inline.info { background: rgba(30,64,175,.65); border-color: rgba(59,130,246,.35); }
        .ghost-inline.success { background: rgba(22,101,52,.78); border-color: rgba(34,197,94,.35); }
        .ghost-inline.slate { background: rgba(71,85,105,.78); border-color: rgba(148,163,184,.35); }
        .detail-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .sample-list { display: grid; gap: 10px; }
        .sample-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 14px; border: 1px solid #313131; background: rgba(255,255,255,.02); }
        .sample-row strong { display: block; }
        .sample-row p { margin: 5px 0 0; color: #a3a3a3; }
        .sample-side { display: grid; gap: 8px; justify-items: end; text-align: right; color: #c5c5c5; }
        .suggestion-card { padding: 18px; background: linear-gradient(180deg, rgba(10,34,63,.85), rgba(12,25,41,.85)); border-color: rgba(59,130,246,.28); }
        .kicker-box { display: inline-flex; padding: 6px 10px; border-radius: 999px; background: rgba(59,130,246,.18); color: #bfdbfe; font-size: 12px; font-weight: 800; margin-bottom: 10px; }
        .table-empty { min-height: 220px; display: grid; place-items: center; gap: 10px; padding: 24px; color: #c5c5c5; text-align: center; }
        .table-empty.small { min-height: 120px; }
        .empty-icon { color: #666; }
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @media (max-width: 1300px) {
          .content-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 1100px) {
          .stats-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .filters-card { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .hero-card { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 900px) {
          .batches-page { padding: 14px; }
          .stats-grid, .filters-card { grid-template-columns: 1fr; }
          .table-shell { overflow-x: hidden; }
          .table-row.table-head { display: none; }
          .table-row { grid-template-columns: 1fr; gap: 8px; margin: 10px; border: 1px solid #343434; border-radius: 10px; }
          .table-row > * { min-width: 0; overflow-wrap: anywhere; }
          .sample-row { flex-direction: column; }
          .sample-side { justify-items: start; text-align: left; }
        }
      `}</style>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, title, value }) => (
  <div className="summary-card">
    <div className="summary-icon"><Icon size={22} /></div>
    <div>
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  </div>
);

const DetailItem = ({ label, value, mono = false }) => (
  <div className="detail-item">
    <label>{label}</label>
    <div className={mono ? 'mono' : ''}>{value}</div>
  </div>
);

export default LotesMuestrasPage;
