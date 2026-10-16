import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock3, FlaskConical } from 'lucide-react';
import { toast } from 'react-toastify';

import operationalDashboardService from '@features/dashboard/infrastructure/operationalDashboardService';
import DataTable from '@shared/ui/DataTable';
import PageHeader from '@shared/ui/PageHeader';

const STAGE_TONES = { shipping: 'neutral', received: 'info', analysis: 'warning', approval: 'danger' };
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO') : 'Sin fecha';

function StageKpi({ stage, onClick }) {
  return <button type="button" className={`operational-stage stage-${STAGE_TONES[stage.key] || 'neutral'}`} onClick={onClick}>
    <span>{stage.label}</span><strong>{stage.count}</strong>
    <small>{stage.time_label}: {stage.average_days === null ? 'Sin fecha' : `${stage.average_days} d`}</small>
  </button>;
}

export default function OperationalDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cliente: '', tipo_gestion: '', periodo: 'todos' });
  const [stageFilter, setStageFilter] = useState('');

  const load = async (activeFilters = filters) => {
    setLoading(true);
    try { setData(await operationalDashboardService.getCenter(activeFilters)); }
    catch (error) { console.error(error); toast.error('No se pudo cargar el dashboard operativo.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.cliente, filters.tipo_gestion, filters.periodo]);
  const operational = data?.operational || {};
  const stages = operational.stages || [];
  const delayed = useMemo(() => (operational.delayed_samples || []).filter((row) => !stageFilter || row.stage === stageFilter), [operational.delayed_samples, stageFilter]);
  const updateFilter = (name, value) => { setStageFilter(''); setFilters((current) => ({ ...current, [name]: value })); };
  const columns = [
    { id: 'id', label: 'Lote', mobileTitle: true, render: (row) => <button className="go-link-quiet" type="button" onClick={() => router.push(row.action)}>{row.id}</button> },
    { id: 'client', label: 'Cliente', minWidth: 150 },
    { id: 'sample_count', label: 'Muestras', minWidth: 110, render: (row) => `${row.sample_count} muestra${row.sample_count === 1 ? '' : 's'}` },
    { id: 'stage_label', label: 'Etapa' },
    { id: 'stage_date', label: 'Fecha de referencia', render: (row) => formatDate(row.stage_date) },
    { id: 'days_in_stage', label: 'Tiempo', render: (row) => `${row.days_in_stage ?? '—'} d` },
    { id: 'severity', label: 'Prioridad', render: (row) => <span className={`go-badge go-badge-${row.severity === 'alta' ? 'danger' : row.severity === 'media' ? 'warning' : 'neutral'}`}>{row.severity}</span> },
  ];

  return <main className="go-page go-shell operationalDashboard">
    <PageHeader eyebrow="Operación interna" title="Dashboard operativo" subtitle="Monitoree el flujo real desde el envío hasta la aprobación." />
    <section className="operationalFilters" aria-label="Filtros del dashboard">
      <label>Cliente<select value={filters.cliente} onChange={(event) => updateFilter('cliente', event.target.value)}><option value="">Todos los clientes</option>{(data?.filters?.clients || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Tipo de gestión<select value={filters.tipo_gestion} onChange={(event) => updateFilter('tipo_gestion', event.target.value)}><option value="">Todos los tipos</option>{(data?.filters?.management_types || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Período<select value={filters.periodo} onChange={(event) => updateFilter('periodo', event.target.value)}><option value="dia">Hoy</option><option value="mes">Mes actual</option><option value="ano">Año actual</option><option value="todos">Todo el historial</option></select></label>
    </section>
    <section className="operationalStageGrid">
      {stages.map((stage) => <StageKpi key={stage.key} stage={stage} onClick={() => setStageFilter((current) => current === stage.key ? '' : stage.key)} />)}
      <article className="operational-metric"><Clock3 size={18} /><span>{operational.average_process_label || 'Promedio desde recepción'}</span><strong>{operational.average_process_days ?? '—'} d</strong></article>
      <article className="operational-metric"><FlaskConical size={18} /><span>{operational.analysis_label || 'Análisis realizados'}</span><strong>{operational.analysis_count ?? 0}</strong></article>
    </section>
    <p className="operationalNote">{operational.time_note}</p>
    <section className="operationalCharts">
      <article className="panel"><h2>Acumulación por etapa</h2><ResponsiveContainer width="100%" height={260}><BarChart data={stages}><CartesianGrid stroke="#30343a" vertical={false} /><XAxis dataKey="label" stroke="#aeb4be" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} stroke="#aeb4be" /><Tooltip contentStyle={{ background: '#191b1e', border: '1px solid #363b43' }} /><Bar dataKey="count" fill="#ef303d" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></article>
      <article className="panel"><h2>Promedio de tiempo</h2><ResponsiveContainer width="100%" height={260}><BarChart data={stages}><CartesianGrid stroke="#30343a" vertical={false} /><XAxis dataKey="label" stroke="#aeb4be" tick={{ fontSize: 12 }} /><YAxis stroke="#aeb4be" /><Tooltip contentStyle={{ background: '#191b1e', border: '1px solid #363b43' }} /><Bar dataKey="average_days" fill="#d9a441" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></article>
    </section>
    <section className="panel operationalDelays"><div className="panelTitle"><div><h2>Muestras con mayor tiempo operativo</h2><p>{stageFilter ? `Filtrado por ${stages.find((item) => item.key === stageFilter)?.label || ''}` : 'Ordenadas por mayor tiempo en la etapa actual.'}</p></div><span>{delayed.length} lote(s)</span></div><DataTable columns={columns} data={loading ? [] : delayed} rowKey="id" pagination initialRowsPerPage={15} minWidth={760} emptyMessage={loading ? 'Cargando operación…' : 'No hay lotes para estos filtros.'} /></section>
    <style jsx global>{`
      .operationalFilters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px;border:1px solid var(--go-border-soft);background:#191b1e;border-radius:10px;margin-bottom:14px}.operationalFilters label{display:grid;gap:5px;color:#aeb4be;font-size:12px}.operationalFilters select{height:38px;border:1px solid #383d45;border-radius:7px;background:#121316;color:#fff;padding:0 10px}.operationalStageGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}.operational-stage,.operational-metric{min-height:104px;border:1px solid #30353c;border-radius:9px;background:#191b1e;padding:14px;text-align:left;color:#fff}.operational-stage{cursor:pointer}.operational-stage:hover{border-color:#6f7680}.operational-stage span,.operational-metric span{display:block;font-size:12px;color:#aeb4be}.operational-stage strong,.operational-metric strong{display:block;font-size:26px;margin:7px 0 3px}.operational-stage small{font-size:11px;color:#858d98}.stage-danger{border-color:rgba(239,48,61,.45)}.stage-warning{border-color:rgba(217,164,65,.45)}.stage-info{border-color:rgba(93,142,198,.45)}.operational-metric svg{color:#aeb4be}.operationalNote{margin:0 0 14px;color:#929aa6;font-size:12px}.operationalCharts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px}.panel{border:1px solid var(--go-border-soft);border-radius:10px;background:#191b1e;padding:16px}.panel h2{font-size:16px;margin:0 0 12px}.panelTitle{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}.panelTitle p{margin:5px 0 0;color:#9ba3ae;font-size:12px}.panelTitle>span{color:#aeb4be;font-size:12px}@media(max-width:820px){.operationalFilters,.operationalStageGrid,.operationalCharts{grid-template-columns:1fr}.operationalStageGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.operationalStageGrid{grid-template-columns:1fr}.panel{padding:12px}}
    `}</style>
  </main>;
}
