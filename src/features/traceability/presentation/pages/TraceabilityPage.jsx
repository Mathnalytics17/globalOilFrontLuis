import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '@shared/ui/PageHeader';
import DataTable from '@shared/ui/DataTable';
import PaginationBar from '@shared/ui/PaginationBar';
import Modal from '@shared/ui/Modal';
import { traceabilityService } from '../../infrastructure/traceabilityService';

const dateText = (value) => value ? new Date(value).toLocaleString('es-CO') : '—';

const FIELD_LABELS = {
  referencia_equipo_id: 'Equipo', punto_muestreo: 'Punto de medida',
  periodo_servicio_aceite: 'Servicio del lubricante', periodo_servicio_equipo: 'Servicio del equipo',
  atributos_tecnicos: 'Datos técnicos', estado_operativo: 'Estado operativo',
  estado: 'Estado del resultado', estado_limite: 'Estado según límites',
  payload: 'Resultado registrado',
};
const fieldLabel = (key) => FIELD_LABELS[key] || String(key || '').replaceAll('_', ' ');
const SYSTEM_SNAPSHOT_FIELDS = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'saved_at', 'saved_by', 'idempotency_key', 'schema_version', 'mode']);
const comparable = (value) => JSON.stringify(value ?? null);
const valueText = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (Array.isArray(value)) return value.length ? `${value.length} elemento(s)` : 'Sin datos';
  if (typeof value === 'object') {
    if (value.nombre) return [value.codigo, value.nombre].filter(Boolean).join(' · ');
    if (value.label) return value.label;
    return Object.entries(value).map(([key, item]) => `${fieldLabel(key)}: ${valueText(item)}`).join(' · ');
  }
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
};

const resultEntries = (payload) => {
  if (!payload || typeof payload !== 'object') return [];
  const fields = new Map((Array.isArray(payload.fields) ? payload.fields : []).map((field) => [field.key, field]));
  return (Array.isArray(payload.values) ? payload.values : []).map((entry, index) => {
    const field = fields.get(entry?.key) || {};
    const raw = entry?.value_label ?? entry?.value;
    return {
      key: entry?.key || `resultado-${index}`,
      label: field.label || entry?.key || `Resultado ${index + 1}`,
      value: raw === null || raw === undefined || raw === '' ? 'Sin dato' : `${raw}${field.unidad ? ` ${field.unidad}` : ''}`,
      observacion: entry?.observacion || '',
    };
  });
};

const resultPayloadChanges = (before, after) => {
  const previous = new Map(resultEntries(before).map((entry) => [entry.key, entry]));
  const next = new Map(resultEntries(after).map((entry) => [entry.key, entry]));
  return [...new Set([...previous.keys(), ...next.keys()])].map((key) => {
    const oldEntry = previous.get(key);
    const newEntry = next.get(key);
    return {
      key,
      label: newEntry?.label || oldEntry?.label || key,
      before: oldEntry?.value || 'Sin dato',
      after: newEntry?.value || 'Sin dato',
      changed: oldEntry?.value !== newEntry?.value,
      beforeObservation: oldEntry?.observacion || '',
      afterObservation: newEntry?.observacion || '',
    };
  });
};

function Snapshot({ title, value }) {
  const entries = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
  return <section className="traceSnapshot"><h3>{title}</h3>{entries.length ? <dl>{entries.map(([key, item]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{valueText(item)}</dd></div>)}</dl> : <p>Sin información registrada.</p>}</section>;
}

function ResultPayloadChange({ before, after }) {
  const entries = resultPayloadChanges(before, after);
  if (!entries.length) return <span>Sin valores registrados.</span>;
  return <div className="traceResultValues">{entries.map((entry) => <div key={entry.key}><strong>{entry.label}</strong><span className={entry.changed ? 'changed' : ''}>Antes: {entry.before}</span><b className={entry.changed ? 'changed' : ''}>Después: {entry.after}</b>{entry.beforeObservation !== entry.afterObservation ? <em>Observación: {entry.beforeObservation || 'Sin dato'} → {entry.afterObservation || 'Sin dato'}</em> : <em>{entry.changed ? '' : 'Sin cambios en el valor'}</em>}</div>)}</div>;
}

function ChangeSummary({ before, after }) {
  const previous = before && typeof before === 'object' && !Array.isArray(before) ? before : {};
  const next = after && typeof after === 'object' && !Array.isArray(after) ? after : {};
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter((key) => !SYSTEM_SNAPSHOT_FIELDS.has(key))
    .filter((key) => comparable(previous[key]) !== comparable(next[key]));
  const technicalKeys = keys.filter((key) => key !== 'version');

  if (!keys.length) return <p className="traceNoChange">No se registraron cambios de datos; el evento solo documenta la acción realizada.</p>;
  if (!technicalKeys.length && keys.length === 1 && keys[0] === 'version') {
    return <p className="traceNoChange">Se creó la versión {valueText(next.version)} desde la versión {valueText(previous.version)} sin cambiar criterios ni configuración técnica.</p>;
  }
  return <section className="traceChanges"><h3>Cambios relevantes</h3><dl>{keys.map((key) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{key === 'payload' ? <ResultPayloadChange before={previous[key]} after={next[key]} /> : <><span>Antes: {valueText(previous[key])}</span><b>Después: {valueText(next[key])}</b></>}</dd></div>)}</dl></section>;
}

export default function TraceabilityPage() {
  const [filters, setFilters] = useState({ buscar: '', entidad: '', origen: '', criticos: false });
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, criticos: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [meta, setMeta] = useState({ next: null, previous: null });
  const [selectedEvent, setSelectedEvent] = useState(null);

  const params = { ...filters, criticos: filters.criticos || undefined, page, page_size: pageSize };
  const load = async () => {
    setLoading(true);
    try {
      const [list, totals] = await Promise.all([traceabilityService.page(params), traceabilityService.summary(params)]);
      setEvents(list.results || []);
      setMeta({ next: list.next, previous: list.previous });
      setSummary(totals);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo consultar la trazabilidad.');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, pageSize, filters.buscar, filters.entidad, filters.origen, filters.criticos]);
  const update = (key, value) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };

  return <main className="go-page go-shell traceabilityPage">
    <PageHeader eyebrow="Control administrativo" title="Trazabilidad y control" subtitle="Investigue qué cambió, quién lo hizo y qué contexto técnico puede verse afectado." />
    <section className="traceMetrics"><article><ShieldCheck size={19}/><span>Eventos encontrados</span><strong>{summary.total || 0}</strong></article><article className="critical"><AlertTriangle size={19}/><span>Cambios críticos</span><strong>{summary.criticos || 0}</strong></article></section>
    <section className="traceFilters"><label className="traceSearch"><span>Buscar</span><div><Search size={17}/><input value={filters.buscar} onChange={(event) => update('buscar', event.target.value)} placeholder="Lote, muestra, acción o motivo" /></div></label><label>Entidad<select value={filters.entidad} onChange={(event) => update('entidad', event.target.value)}><option value="">Todas</option><option value="lote">Lotes</option><option value="muestra">Muestras</option><option value="resultado">Resultados</option><option value="maquina">Máquinas</option><option value="punto_muestreo">Puntos de medición</option><option value="reporte">Reportes</option></select></label><label>Origen<select value={filters.origen} onChange={(event) => update('origen', event.target.value)}><option value="">Todos</option><option value="ui">Interfaz</option><option value="api">API</option><option value="importacion">Importación</option><option value="proceso">Proceso automático</option><option value="ia">Asistente IA</option></select></label><label className="traceCritical"><input type="checkbox" checked={filters.criticos} onChange={(event) => update('criticos', event.target.checked)} />Solo cambios críticos</label></section>
    <section className="go-panel traceTable"><DataTable data={loading ? [] : events} rowKey="id" pagination={false} minWidth={980} emptyMessage={loading ? 'Cargando trazabilidad…' : 'No hay eventos para los filtros seleccionados.'} columns={[{id:'creado_en',label:'Fecha',render:(row)=>dateText(row.creado_en)},{id:'accion',label:'Acción',mobileTitle:true,render:(row)=><><strong>{row.detalle || row.accion}</strong><small>{row.accion}</small></>},{id:'entidad',label:'Contexto',render:(row)=><>{row.empresa_nombre || 'Global'}<small>{row.maquina_nombre || row.punto_muestreo_nombre || row.lote_codigo || row.muestra_codigo || row.entidad_etiqueta}</small></>},{id:'actor',label:'Responsable',render:(row)=>row.actor_nombre || 'Sistema'},{id:'origen',label:'Origen'},{id:'motivo',label:'Motivo',render:(row)=>row.motivo || '—'},{id:'detail',label:'',width:72,sortable:false,searchable:false,render:(row)=><button type="button" className="traceDetailButton" onClick={()=>setSelectedEvent(row)}><Eye size={16}/> Ver</button>}]} /><PaginationBar count={summary.total || 0} page={page} pageSize={pageSize} pageSizeOptions={[15,30,50,100]} onPageChange={setPage} onPageSizeChange={(size)=>{setPage(1);setPageSize(size);}} compact /></section>
    <Modal open={Boolean(selectedEvent)} onClose={()=>setSelectedEvent(null)} title="Detalle del cambio" size="lg" footer={<button type="button" className="go-button" onClick={()=>setSelectedEvent(null)}>Cerrar</button>}><div className="traceDetail"><header><strong>{selectedEvent?.detalle || selectedEvent?.accion}</strong><span>{dateText(selectedEvent?.creado_en)} · {selectedEvent?.actor_nombre || 'Sistema'}</span></header><div className="traceContext"><div><span>Empresa</span>{selectedEvent?.empresa_nombre || 'Global'}</div><div><span>Entidad</span>{selectedEvent?.tipo_entidad || '—'}</div><div><span>Referencia</span>{selectedEvent?.maquina_nombre || selectedEvent?.punto_muestreo_nombre || selectedEvent?.lote_codigo || selectedEvent?.muestra_codigo || selectedEvent?.entidad_etiqueta || '—'}</div><div><span>Origen</span>{selectedEvent?.origen || '—'}</div>{selectedEvent?.motivo ? <div className="traceContextWide"><span>Motivo</span>{selectedEvent.motivo}</div> : null}</div><ChangeSummary before={selectedEvent?.estado_anterior} after={selectedEvent?.estado_nuevo}/>{selectedEvent?.metadata && Object.keys(selectedEvent.metadata).length ? <Snapshot title="Información adicional" value={selectedEvent.metadata}/> : null}</div></Modal>
    <style jsx global>{`.traceabilityPage{color:#fff}.traceMetrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}.traceMetrics article{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;align-items:center;padding:14px;border:1px solid var(--go-border-soft);border-radius:10px;background:#191b1e}.traceMetrics svg{grid-row:1/3;color:#75a9ea}.traceMetrics span{font-size:12px;color:#aeb4c0}.traceMetrics strong{font-size:24px}.traceMetrics .critical svg{color:#ef5661}.traceFilters{display:grid;grid-template-columns:minmax(240px,2fr) repeat(2,minmax(150px,1fr)) auto;gap:10px;padding:12px;border:1px solid var(--go-border-soft);border-radius:10px;background:#191b1e;margin-bottom:14px}.traceFilters label{display:grid;gap:5px;color:#aeb4c0;font-size:12px}.traceFilters select,.traceFilters input{height:38px;border:1px solid #383d45;border-radius:7px;background:#121316;color:#fff;padding:0 10px}.traceSearch div{display:flex;align-items:center;gap:8px;border:1px solid #383d45;border-radius:7px;background:#121316;padding:0 10px}.traceSearch input{border:0;flex:1;padding:0}.traceCritical{display:flex!important;align-items:end;grid-template-columns:auto 1fr;gap:7px!important;padding-bottom:10px}.traceCritical input{height:16px;width:16px;accent-color:#ef303d}.traceTable small{display:block;color:#9da5b0;font-size:11px;margin-top:3px}.traceDetailButton{display:inline-flex;align-items:center;gap:6px;min-height:31px;border:1px solid #3c414a;border-radius:6px;background:#1c1f23;color:#d9dde2;padding:0 8px;font-size:11px;font-weight:700;cursor:pointer}.traceDetailButton:hover{background:#292d33}.traceDetail header{border-bottom:1px solid var(--go-border-soft);padding-bottom:13px}.traceDetail header strong{display:block;font-size:15px}.traceDetail header span{display:block;margin-top:4px;color:#969da7;font-size:12px}.traceContext{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:14px 0}.traceContext div,.traceSnapshot,.traceChanges{border:1px solid var(--go-border-soft);border-radius:8px;background:#17191c;padding:10px}.traceContext span{display:block;color:#89909a;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}.traceContextWide{grid-column:1/-1}.traceSnapshot h3,.traceChanges h3{margin:0 0 9px;font-size:12px}.traceSnapshot p,.traceNoChange{margin:0;color:#9198a1;font-size:12px}.traceSnapshot dl,.traceChanges dl{margin:0;display:grid;gap:7px}.traceSnapshot dl div,.traceChanges dl div{display:grid;gap:2px}.traceSnapshot dt,.traceChanges dt{color:#8c939d;font-size:10px;text-transform:uppercase}.traceSnapshot dd,.traceChanges dd{margin:0;color:#e4e7eb;font-size:12px;line-height:1.4;overflow-wrap:anywhere}.traceChanges dd{display:grid;gap:3px}.traceChanges dd span{color:#f5b2b7}.traceChanges dd b{color:#acf0c6}.traceResultValues{display:grid;gap:8px}.traceResultValues>div{display:grid;gap:2px;border-left:2px solid #4b5563;padding-left:8px}.traceResultValues strong{color:#e4e7eb;font-size:12px}.traceResultValues em{color:#939aa4;font-size:11px;font-style:normal}.traceResultValues .changed{font-weight:700}@media(max-width:850px){.traceFilters{grid-template-columns:1fr 1fr}.traceMetrics{grid-template-columns:1fr}}@media(max-width:540px){.traceFilters,.traceContext{grid-template-columns:1fr}}`}</style>
  </main>;
}
