import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Mail,
  Package,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { reportsService } from '@features/reports/infrastructure/reportsService';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';

const REPORT_SORT_COLUMNS = {
  empresa: (row) => row.empresa_nombre,
  lote: (row) => row.lote_id,
  muestra: (row) => row.muestra_id,
  reporte: (row) => row.consecutivo,
  generado: (row) => row.fecha_generacion || row.fecha_emision,
  enviado: (row) => row.fecha_envio,
  cliente: (row) => row.visible_cliente,
  estado: (row) => row.estatus,
};

const fmt = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO');
};

const statusLabel = (value) => ({
  generado: 'Generado',
  aprobado: 'Aprobado',
  enviado: 'Enviado',
  anulado: 'Anulado',
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente',
}[value] || value || '-');

const statusClass = (value) => {
  if (value === 'enviado' || value === 'aprobado') return 'ok';
  if (value === 'generado') return 'warn';
  if (value === 'anulado') return 'bad';
  return 'neutral';
};

export default function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState({ summary: {}, groups: [], results: [] });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);
  const [expandedLots, setExpandedLots] = useState(() => new Set());
  const [filters, setFilters] = useState({
    lote: '',
    search: '',
    estado: '',
    visible_cliente: '',
    fecha_generacion_desde: '',
    fecha_generacion_hasta: '',
    fecha_envio_desde: '',
    fecha_envio_hasta: '',
  });

  const cleanFilters = useMemo(() => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') params[key] = value;
    });
    return params;
  }, [filters]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const payload = await reportsService.dashboard(cleanFilters);
      setData(payload);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (router.query?.lote) {
      const lotId = String(router.query.lote);
      setFilters((prev) => ({ ...prev, lote: lotId }));
      setExpandedLots((current) => new Set(current).add(lotId));
    }
  }, [router.query?.lote]);

  useEffect(() => {
    if (filters.lote) {
      setExpandedLots((current) => new Set(current).add(filters.lote));
      loadReports();
    }
  }, [filters.lote]);

  useEffect(() => {
    setPage(1);
  }, [filters.estado, filters.visible_cliente, filters.search, filters.fecha_generacion_desde, filters.fecha_generacion_hasta]);

  const updateFilter = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const pageSize = 10;
  const reportRows = data.results || [];
  const { sortedRows, sort, requestSort } = useTableSort(
    reportRows,
    REPORT_SORT_COLUMNS,
    { key: 'generado', direction: 'desc' }
  );
  const lotGroups = useMemo(() => {
    const groups = new Map();
    sortedRows.forEach((report) => {
      const lotId = report.lote_id || 'SIN-LOTE';
      if (!groups.has(lotId)) {
        groups.set(lotId, {
          id: lotId,
          empresa: report.empresa_nombre || '-',
          reports: [],
          samples: new Set(),
          sent: 0,
          latest: null,
        });
      }
      const group = groups.get(lotId);
      group.reports.push(report);
      if (report.muestra_id) group.samples.add(report.muestra_id);
      if (report.estatus === 'enviado' || report.fecha_envio) group.sent += 1;
      const generatedAt = report.fecha_generacion || report.fecha_emision;
      if (generatedAt && (!group.latest || new Date(generatedAt) > new Date(group.latest))) {
        group.latest = generatedAt;
      }
    });
    return Array.from(groups.values()).sort((a, b) => new Date(b.latest || 0) - new Date(a.latest || 0));
  }, [sortedRows]);
  const totalPages = Math.max(1, Math.ceil(lotGroups.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedLots = useMemo(
    () => lotGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [lotGroups, currentPage]
  );
  const toggleLot = (lotId) => setExpandedLots((current) => {
    const next = new Set(current);
    if (next.has(lotId)) next.delete(lotId);
    else next.add(lotId);
    return next;
  });

  const downloadReport = async (id, label) => {
    try {
      const response = await reportsService.print(id);
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${label || 'reporte'}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo descargar el PDF.');
    }
  };

  const previewReport = async (id) => {
    try {
      const response = await reportsService.print(id);
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo abrir la vista previa.');
    }
  };

  const sendReport = async (report) => {
    try {
      const response = await reportsService.sendEmail(report.id);
      const recipients = response?.recipients?.join(', ');
      toast.success(recipients ? `Reporte enviado a ${recipients}.` : 'Reporte enviado al correo del cliente.');
      await loadReports();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo enviar el reporte.');
    }
  };

  const approveReport = async (report) => {
    if (!window.confirm(`¿Aprobar el reporte ${report.consecutivo} de la muestra ${report.muestra_id}?`)) return;
    setActionBusy({ id: report.id, message: `Aprobando el reporte de ${report.muestra_id}...` });
    try {
      await reportsService.approve(report.id);
      toast.success(`Reporte de ${report.muestra_id} aprobado.`);
      await loadReports();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo aprobar el reporte.');
    } finally {
      setActionBusy(null);
    }
  };

  const downloadBatch = async (format, lotId = filters.lote) => {
    if (!lotId || lotId === 'SIN-LOTE') return;
    try {
      const response = await reportsService.downloadBatch(lotId, format);
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reportes_${lotId}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      let detail = error?.response?.data?.detail;
      if (error?.response?.data instanceof Blob) {
        try { detail = JSON.parse(await error.response.data.text())?.detail; } catch (_) { /* response is not JSON */ }
      }
      toast.error(detail || 'No se pudo descargar el lote. Todas las muestras deben tener reporte aprobado.');
    }
  };

  const sendBatch = async (format, lotId = filters.lote) => {
    if (!lotId || lotId === 'SIN-LOTE') return;
    if (!window.confirm(`¿Enviar al cliente el lote ${lotId} como ${format.toUpperCase()}?`)) return;
    try {
      const response = await reportsService.sendBatch(lotId, format);
      toast.success(`Lote enviado a ${(response.recipients || []).join(', ')}.`);
      await loadReports();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo enviar el lote. Todas las muestras deben tener reporte aprobado.');
    }
  };

  const togglePublish = async (report) => {
    try {
      if (report.visible_cliente) {
        await reportsService.unpublishClient(report.id);
        toast.success('Reporte oculto para el cliente.');
      } else {
        await reportsService.publishClient(report.id);
        toast.success('Reporte visible para el cliente.');
      }
      await loadReports();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cambiar la visibilidad.');
    }
  };

  return (
    <div className="reportsPage">
      {actionBusy ? (
        <div className="requestOverlay" role="status" aria-live="assertive" aria-busy="true">
          <div className="requestCard">
            <div className="requestSpinner" aria-hidden="true" />
            <strong>{actionBusy.message}</strong>
            <span>Espere un momento. No cierre ni actualice esta página.</span>
          </div>
        </div>
      ) : null}
      <header className="reportsHeader">
        <div className="titleBlock">
          <div className="iconBox"><FileText size={22} /></div>
          <div>
            <h1>Reportes</h1>
            <p>Biblioteca de informes generados. Ver, descargar, enviar y gestionar versiones.</p>
          </div>
        </div>
        <button className="btn secondary" onClick={loadReports} disabled={loading}><RefreshCw size={16} /> Recargar</button>
      </header>

      <section className="summary">
        <Metric label="Total reportes" value={data.summary?.total || 0} />
        <Metric label="Enviados" value={data.summary?.enviados || 0} />
        <Metric label="Pendientes envio" value={data.summary?.pendientes_envio || 0} />
        <Metric label="Visibles cliente" value={data.summary?.visibles_cliente || 0} />
      </section>

      <section className="filters">
        <div className="searchField">
          <Search size={16} />
          <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Buscar empresa, lote, muestra o consecutivo" />
        </div>
        <select value={filters.estado} onChange={(e) => updateFilter('estado', e.target.value)}>
          <option value="">Estado</option>
          <option value="generado">Generado</option>
          <option value="enviado">Enviado</option>
          <option value="anulado">Anulado</option>
        </select>
        <input value={filters.lote} onChange={(e) => updateFilter('lote', e.target.value)} placeholder="Lote (ej. L20260009)" />
        <select value={filters.visible_cliente} onChange={(e) => updateFilter('visible_cliente', e.target.value)}>
          <option value="">Visibilidad</option>
          <option value="true">Visible cliente</option>
          <option value="false">No visible</option>
        </select>
        <input type="date" value={filters.fecha_generacion_desde} onChange={(e) => updateFilter('fecha_generacion_desde', e.target.value)} />
        <input type="date" value={filters.fecha_generacion_hasta} onChange={(e) => updateFilter('fecha_generacion_hasta', e.target.value)} />
        <button className="btn red" onClick={loadReports}><Filter size={16} /> Filtrar</button>
      </section>

      {filters.lote ? (
        <section className="batchActions">
          <div><Package size={19} /><span><strong>Opciones del lote {filters.lote}</strong><small>Usan la última versión aprobada de cada muestra.</small></span></div>
          <button className="btn secondary" onClick={() => downloadBatch('pdf')}><Download size={16} /> PDF consolidado</button>
          <button className="btn secondary" onClick={() => downloadBatch('zip')}><Download size={16} /> ZIP individuales</button>
          <button className="btn secondary" onClick={() => sendBatch('pdf')}><Mail size={16} /> Enviar PDF</button>
          <button className="btn secondary" onClick={() => sendBatch('zip')}><Mail size={16} /> Enviar ZIP</button>
        </section>
      ) : null}

      <section className="lotGroups">
        {paginatedLots.length ? paginatedLots.map((group) => {
          const expanded = expandedLots.has(group.id);
          return (
            <article className="lotCard" key={group.id}>
              <button type="button" className="lotHeader" onClick={() => toggleLot(group.id)} aria-expanded={expanded}>
                <span className="lotIdentity">
                  {expanded ? <ChevronDown size={19} /> : <ChevronRight size={19} />}
                  <Package size={19} />
                  <strong>{group.id}</strong>
                </span>
                <span><small>Cliente</small><b>{group.empresa}</b></span>
                <span><small>Muestras</small><b>{group.samples.size}</b></span>
                <span><small>Reportes</small><b>{group.reports.length}</b></span>
                <span><small>Enviados</small><b>{group.sent}</b></span>
                <span><small>Último</small><b>{fmt(group.latest)}</b></span>
              </button>

              {expanded ? (
                <div className="lotContent">
                  <div className="lotActions">
                    <button className="btn secondary" onClick={() => downloadBatch('pdf', group.id)}><Download size={15} /> PDF consolidado</button>
                    <button className="btn secondary" onClick={() => downloadBatch('zip', group.id)}><Download size={15} /> ZIP</button>
                    <button className="btn secondary" onClick={() => sendBatch('pdf', group.id)}><Mail size={15} /> Enviar PDF</button>
                    <button className="btn secondary" onClick={() => sendBatch('zip', group.id)}><Mail size={15} /> Enviar ZIP</button>
                  </div>
                  <div className="tablePanel">
                    <table>
                      <thead>
                        <tr>
                          <SortableTableHeader columnKey="muestra" label="Muestra" sort={sort} onSort={requestSort} />
                          <SortableTableHeader columnKey="reporte" label="Reporte" sort={sort} onSort={requestSort} />
                          <SortableTableHeader columnKey="generado" label="Generado" sort={sort} onSort={requestSort} />
                          <SortableTableHeader columnKey="enviado" label="Enviado" sort={sort} onSort={requestSort} />
                          <SortableTableHeader columnKey="cliente" label="Cliente" sort={sort} onSort={requestSort} />
                          <SortableTableHeader columnKey="estado" label="Estado" sort={sort} onSort={requestSort} />
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.reports.map((report) => (
                          <tr key={report.id}>
                            <td data-label="Muestra"><strong>{report.muestra_id || '-'}</strong></td>
                            <td data-label="Reporte"><strong>{report.consecutivo}</strong><small>v{report.version}</small></td>
                            <td data-label="Generado">{fmt(report.fecha_generacion || report.fecha_emision)}</td>
                            <td data-label="Enviado">{fmt(report.fecha_envio)}</td>
                            <td data-label="Cliente">{report.visible_cliente ? 'Visible' : 'Oculto'}</td>
                            <td data-label="Estado"><span className={`badge ${statusClass(report.estatus)}`}>{statusLabel(report.estatus)}</span></td>
                            <td data-label="Acciones">
                              <div className="actions">
                                <button onClick={() => previewReport(report.id)} title="Vista previa"><Eye size={15} /></button>
                                <button onClick={() => downloadReport(report.id, `${report.consecutivo}_v${report.version}`)} title="Descargar"><Download size={15} /></button>
                                {!report.fecha_aprobacion && !['aprobado', 'enviado', 'anulado'].includes(report.estatus) ? (
                                  <button className="approveButton" onClick={() => approveReport(report)} title="Aprobar reporte">
                                    <CheckCircle2 size={15} /><span>Aprobar</span>
                                  </button>
                                ) : null}
                                {report.fecha_aprobacion || ['aprobado', 'enviado'].includes(report.estatus) ? (
                                  <>
                                    <button onClick={() => sendReport(report)} title="Enviar"><Mail size={15} /></button>
                                    <button onClick={() => togglePublish(report)} title={report.visible_cliente ? 'Ocultar al cliente' : 'Mostrar al cliente'}>
                                      {report.visible_cliente ? <Eye size={15} /> : <EyeOff size={15} />}
                                    </button>
                                  </>
                                ) : null}
                                <button onClick={() => router.push(`/muestras/interpretacion?lote=${report.lote_id}&muestra=${report.muestra_id}&fromReport=${report.id}`)} title="Modificar desde interpretación"><Settings size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </article>
          );
        }) : <div className="empty lotsEmpty">No hay reportes con los filtros actuales.</div>}
        {lotGroups.length > pageSize ? (
          <div className="pager">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
            <span>Página {currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</button>
          </div>
        ) : null}
      </section>

      <style jsx global>{`
        .reportsPage{width:100%;max-width:100%;overflow-x:hidden;background:transparent;color:#fff;padding:0 0 18px}
        .reportsHeader{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:10px;min-width:0}
        .titleBlock{display:flex;align-items:center;gap:12px;min-width:0}.titleBlock h1{margin:0;font-size:26px}.titleBlock p{margin:3px 0 0;color:#c8c8c8;overflow-wrap:anywhere}
        .iconBox{width:44px;height:44px;flex:0 0 44px;border:1px solid #444;background:#111;border-radius:9px;display:grid;place-items:center}
        .btn{min-height:38px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 13px;font-weight:800;cursor:pointer;max-width:100%;white-space:normal;text-align:center}.btn.red{background:#ef232a;border-color:#ef232a}
        .summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px}.metric{min-width:0;border:1px solid #383838;background:rgba(23,23,23,.72);border-radius:10px;padding:12px}.metric span{color:#aeb6c1;text-transform:uppercase;font-size:11px;letter-spacing:.08em}.metric strong{display:block;font-size:28px;margin-top:4px;overflow-wrap:anywhere}
        .filters{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(4,minmax(120px,150px)) minmax(96px,110px);gap:8px;border:1px solid #383838;background:rgba(21,21,21,.72);border-radius:10px;padding:10px;margin-bottom:10px;max-width:100%;overflow-x:hidden}.filters input,.filters select{width:100%;min-width:0;height:38px;border:1px solid #404040;background:#080808;color:#fff;border-radius:8px;padding:0 10px}.searchField{min-width:0;display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;align-items:center;border:1px solid #404040;background:#080808;border-radius:8px;padding:0 10px}.searchField input{border:0;padding:0}
        .lotGroups{display:grid;gap:9px}.lotCard{border:1px solid #383838;background:rgba(17,17,17,.78);border-radius:10px;overflow:hidden}.lotHeader{width:100%;min-height:64px;display:grid;grid-template-columns:minmax(170px,1.2fr) minmax(140px,1fr) repeat(3,minmax(80px,.55fr)) minmax(150px,1fr);gap:12px;align-items:center;border:0;background:#1d1e20;color:#fff;padding:11px 14px;text-align:left;cursor:pointer}.lotHeader:hover{background:#25272a}.lotHeader>span{min-width:0}.lotHeader small,.lotHeader b{display:block}.lotHeader small{color:#929baa;font-size:10px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}.lotHeader b{overflow-wrap:anywhere}.lotIdentity{display:flex;align-items:center;gap:8px}.lotIdentity strong{font-size:18px}.lotContent{border-top:1px solid #383838}.lotActions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;padding:9px 10px;background:#151515}.lotsEmpty{border:1px solid #383838;border-radius:10px;background:#151515}
        .tablePanel{max-width:100%;border:1px solid #383838;background:rgba(23,23,23,.72);border-radius:10px;overflow-x:hidden}.tablePanel table{width:100%;border-collapse:collapse;table-layout:fixed;min-width:0}.tablePanel th{background:#242424;color:#bdbdbd;text-transform:uppercase;font-size:12px;letter-spacing:.06em;text-align:left;padding:10px}.tablePanel td{padding:10px;border-top:1px solid #303030;vertical-align:middle;overflow-wrap:anywhere;word-break:break-word}.tablePanel small{display:block;color:#aaa;margin-top:2px}.badge{display:inline-flex;border-radius:999px;border:1px solid #444;background:#222;padding:4px 9px;font-size:12px;font-weight:900;white-space:normal}.badge.ok{color:#86efac;border-color:rgba(34,197,94,.45);background:rgba(22,101,52,.35)}.badge.warn{color:#fde68a;border-color:rgba(234,179,8,.45);background:rgba(113,63,18,.35)}.badge.bad{color:#fecaca;border-color:rgba(239,68,68,.45);background:rgba(127,29,29,.35)}
        .actions{display:flex;gap:6px;flex-wrap:wrap}.actions button{width:31px;height:31px;flex:0 0 31px;border:1px solid #444;background:#111;color:#fff;border-radius:7px;display:grid;place-items:center;cursor:pointer}.actions .approveButton{width:auto;min-width:92px;grid-template-columns:auto auto;gap:6px;padding:0 10px;border-color:#15803d;background:rgba(22,101,52,.32);color:#86efac;font-weight:900}.empty{text-align:center;color:#aaa;padding:24px!important}.pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:12px;border-top:1px solid #303030}.pager button{border:1px solid #444;background:#111;color:#fff;border-radius:8px;padding:8px 12px;font-weight:800}.pager button:disabled{opacity:.45;cursor:not-allowed}.pager span{color:#d1d5db;font-size:13px}
        .requestOverlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.78);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;cursor:wait}.requestCard{width:min(430px,92vw);min-height:210px;border:1px solid #494949;background:linear-gradient(180deg,#202020,#121212);border-radius:14px;box-shadow:0 30px 90px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;text-align:center;padding:26px}.requestCard strong{font-size:18px;line-height:1.35}.requestCard span{color:#b8b8b8;font-size:13px}.requestSpinner{width:54px;height:54px;border:6px solid #454545;border-top-color:#ef232a;border-right-color:#ef232a;border-radius:50%;animation:requestSpin .8s linear infinite}@keyframes requestSpin{to{transform:rotate(360deg)}}
        @media(max-width:1200px){.summary{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.lotHeader{grid-template-columns:repeat(3,minmax(0,1fr))}.reportsHeader{flex-direction:column;align-items:flex-start}.reportsHeader .btn{width:100%}}
        @media(max-width:760px){.titleBlock{align-items:flex-start}.summary,.filters{grid-template-columns:1fr}.lotHeader{grid-template-columns:1fr 1fr}.lotIdentity{grid-column:1/3}.lotActions .btn{width:100%}.tablePanel{border:0;background:transparent}.tablePanel table,.tablePanel thead,.tablePanel tbody,.tablePanel tr,.tablePanel td{display:block;width:100%}.tablePanel thead{display:none}.tablePanel tr{border:1px solid #383838;background:rgba(23,23,23,.72);border-radius:10px;margin-bottom:10px;padding:8px}.tablePanel td{display:grid;grid-template-columns:minmax(96px,38%) minmax(0,1fr);gap:10px;border-top:0;padding:8px 6px}.tablePanel td::before{content:attr(data-label);color:#aeb6c1;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.tablePanel td.empty{display:block}.actions{justify-content:flex-start}.actions button{width:36px;height:36px;flex-basis:36px}}
        @media(max-width:460px){.tablePanel td{grid-template-columns:1fr;gap:4px}.btn{width:100%}.metric strong{font-size:24px}}
        .batchActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1px solid #3d3d3d;background:rgba(17,17,17,.8);border-radius:10px;padding:10px;margin-bottom:10px}.batchActions>div{display:flex;align-items:center;gap:9px;margin-right:auto}.batchActions span strong,.batchActions span small{display:block}.batchActions span small{color:#aaa;margin-top:2px}
      `}</style>
    </div>
  );
}

const Metric = ({ label, value }) => (
  <div className="metric">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
