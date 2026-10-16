import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { reportsService } from '@features/reports/infrastructure/reportsService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { assetTreeService } from '@features/asset-tree/infrastructure/assetTreeService';
import DataTable from '@shared/ui/DataTable';
import PageHeader from '@shared/ui/PageHeader';
import MetricStrip from '@shared/ui/MetricStrip';
import OverflowMenu from '@shared/ui/OverflowMenu';


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
  const [companies, setCompanies] = useState([]);
  const [machines, setMachines] = useState([]);
  const [samplingPoints, setSamplingPoints] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);
  const [expandedLots, setExpandedLots] = useState(() => new Set());
  const [filters, setFilters] = useState({
    lote: '',
    search: '',
    client_id: '',
    machine_id: '',
    sampling_point_id: '',
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
    Promise.all([
      companiesService.list({ page_size: 1000 }),
      machinesService.list({ activo: true }),
      assetTreeService.listSamplingPoints({ activo: true, page_size: 1000 }),
    ]).then(([companyData, machineData, pointData]) => {
      setCompanies(Array.isArray(companyData) ? companyData : companyData?.results || []);
      setMachines(Array.isArray(machineData) ? machineData : machineData?.results || []);
      setSamplingPoints(Array.isArray(pointData) ? pointData : pointData?.results || []);
    }).catch(() => toast.error('No se pudieron cargar los filtros de activos.'));
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
  }, [filters.estado, filters.visible_cliente, filters.search, filters.client_id, filters.machine_id, filters.sampling_point_id, filters.fecha_generacion_desde, filters.fecha_generacion_hasta]);

  const updateFilter = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const pageSize = 10;
  const reportRows = data.results || [];
  const sortedRows = useMemo(() => [...reportRows].sort((a, b) => {
    const aDate = new Date(a.fecha_generacion || a.fecha_emision || 0).getTime();
    const bDate = new Date(b.fecha_generacion || b.fecha_emision || 0).getTime();
    return bDate - aDate;
  }), [reportRows]);
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

  const annulReport = async (report) => {
    const reason = window.prompt(`Motivo para anular ${report.consecutivo} v${report.version}:`);
    if (reason === null) return;
    if (!reason.trim()) return toast.error('El motivo es obligatorio.');
    try {
      setActionBusy({ message: 'Anulando reporte...' });
      await reportsService.annul(report.id, reason.trim());
      toast.success('Reporte anulado. Su historial se conserva.');
      await loadReports();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'No se pudo anular el reporte.');
    } finally {
      setActionBusy(null);
    }
  };

  const reportPageSize = 12;
  const reportTotalPages = Math.max(1, Math.ceil(sortedRows.length / reportPageSize));
  const reportCurrentPage = Math.min(page, reportTotalPages);
  const paginatedReports = sortedRows.slice((reportCurrentPage - 1) * reportPageSize, reportCurrentPage * reportPageSize);

  return (
    <div className="go-page reports-v2">
      {actionBusy ? (
        <div className="requestOverlay" role="status" aria-live="assertive" aria-busy="true">
          <div className="requestCard">
            <div className="requestSpinner" aria-hidden="true" />
            <strong>{actionBusy.message}</strong>
            <span>Espere un momento. No cierre ni actualice esta página.</span>
          </div>
        </div>
      ) : null}

      <div className="go-shell">
        <PageHeader
          title="Reportes"
          subtitle="Biblioteca de informes generados. Ver, descargar, enviar y gestionar versiones."
          actions={null}
        />

        <MetricStrip
          items={[
            { icon: FileText, label: 'Total reportes', value: data.summary?.total || 0 },
            { icon: Mail, label: 'Enviados', value: data.summary?.enviados || 0 },
            { icon: RefreshCw, label: 'Pendientes envío', value: data.summary?.pendientes_envio || 0 },
            { icon: Eye, label: 'Visibles cliente', value: data.summary?.visibles_cliente || 0 },
          ]}
        />

        <section className="go-filterbar reports-filterbar">
          <label className="go-search">
            <Search size={16} />
            <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Empresa, lote, muestra, equipo o consecutivo..." />
          </label>
          <label className="go-field-inline">
            <span>Cliente</span>
            <select value={filters.client_id} onChange={(e) => updateFilter('client_id', e.target.value)}>
              <option value="">Todos</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.nombre}</option>)}
            </select>
          </label>
          <label className="go-field-inline">
            <span>Equipo</span>
            <select value={filters.machine_id} onChange={(e) => { updateFilter('machine_id', e.target.value); updateFilter('sampling_point_id', ''); }}>
              <option value="">Todos</option>
              {machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.nombre || machine.codigo_equipo || `Equipo ${machine.id}`}</option>)}
            </select>
          </label>
          <label className="go-field-inline">
            <span>Punto de medida</span>
            <select value={filters.sampling_point_id} onChange={(e) => updateFilter('sampling_point_id', e.target.value)}>
              <option value="">Todos</option>
              {samplingPoints.filter((point) => !filters.machine_id || Number(point.maquina || point.maquina_id) === Number(filters.machine_id)).map((point) => <option key={point.id} value={point.id}>{point.nombre}</option>)}
            </select>
          </label>
          <label className="go-field-inline">
            <span>Estado</span>
            <select value={filters.estado} onChange={(e) => updateFilter('estado', e.target.value)}>
              <option value="">Todos</option>
              <option value="generado">Generado</option>
              <option value="aprobado">Aprobado</option>
              <option value="enviado">Enviado</option>
              <option value="anulado">Anulado</option>
            </select>
          </label>
          <label className="go-field-inline">
            <span>Lote</span>
            <input value={filters.lote} onChange={(e) => updateFilter('lote', e.target.value)} placeholder="Ej. L20260009" />
          </label>
          <label className="go-field-inline">
            <span>Visibilidad</span>
            <select value={filters.visible_cliente} onChange={(e) => updateFilter('visible_cliente', e.target.value)}>
              <option value="">Todos</option>
              <option value="true">Visible cliente</option>
              <option value="false">No visible</option>
            </select>
          </label>
          <label className="go-field-inline report-date">
            <span>Desde</span>
            <input type="date" value={filters.fecha_generacion_desde} onChange={(e) => updateFilter('fecha_generacion_desde', e.target.value)} />
          </label>
          <label className="go-field-inline report-date">
            <span>Hasta</span>
            <input type="date" value={filters.fecha_generacion_hasta} onChange={(e) => updateFilter('fecha_generacion_hasta', e.target.value)} />
          </label>
          <button type="button" className="go-primary" onClick={loadReports}><Filter size={16} /> Filtrar</button>
        </section>

        {filters.lote ? (
          <section className="report-lot-actions">
            <div className="min-w-0">
              <strong>Opciones del lote {filters.lote}</strong>
              <span>Usan la última versión aprobada de cada muestra.</span>
            </div>
            <OverflowMenu
              label="Opciones del lote"
              items={[
                { label: 'Descargar PDF consolidado', icon: Download, onClick: () => downloadBatch('pdf') },
                { label: 'Descargar ZIP individual', icon: Download, onClick: () => downloadBatch('zip') },
                { separator: true },
                { label: 'Enviar PDF', icon: Mail, onClick: () => sendBatch('pdf') },
                { label: 'Enviar ZIP', icon: Mail, onClick: () => sendBatch('zip') },
              ]}
            />
          </section>
        ) : null}

        <section className="go-card reports-table-card">
          <DataTable
            data={paginatedReports}
            pagination
            minWidth={920}
            defaultSort={{ field: 'fecha_generacion', order: 'desc' }}
            emptyMessage="No hay reportes con los filtros actuales."
            columns={[
              { id: 'consecutivo', label: 'Consecutivo', mobileTitle: true, minWidth: 145, render: (report) => <div><strong>{report.consecutivo}</strong><small>v{report.version}</small></div> },
              { id: 'empresa_nombre', label: 'Empresa', minWidth: 150, render: (report) => report.empresa_nombre || '-' },
              { id: 'lote_id', label: 'Lote', minWidth: 120, render: (report) => report.lote_id || '-' },
              { id: 'muestra_id', label: 'Muestra', minWidth: 105, render: (report) => report.muestra_id || '-' },
              { id: 'estatus', label: 'Estado', width: 110, render: (report) => <span className={`go-badge ${statusClass(report.estatus) === 'ok' ? 'go-badge-success' : statusClass(report.estatus) === 'warn' ? 'go-badge-warning' : statusClass(report.estatus) === 'bad' ? 'go-badge-danger' : 'go-badge-neutral'}`}>{statusLabel(report.estatus)}</span> },
              { id: 'fecha_generacion', label: 'Fecha', minWidth: 155, render: (report) => fmt(report.fecha_generacion || report.fecha_emision) },
              { id: 'visible_cliente', label: 'Visibilidad', width: 115, render: (report) => report.visible_cliente ? <span className="go-badge go-badge-success">Visible</span> : <span className="go-badge go-badge-neutral">Oculto</span> },
              {
                id: 'acciones',
                label: 'Acciones',
                sortable: false,
                searchable: false,
                mobileHidden: true,
                width: 72,
                render: (report) => {
                  const menu = [
                    { label: 'Vista previa', icon: Eye, onClick: () => previewReport(report.id) },
                    { label: 'Descargar PDF', icon: Download, onClick: () => downloadReport(report.id, `${report.consecutivo}_v${report.version}`) },
                    !report.fecha_aprobacion && !['aprobado', 'enviado', 'anulado'].includes(report.estatus) ? { label: 'Aprobar reporte', icon: CheckCircle2, onClick: () => approveReport(report) } : null,
                    report.fecha_aprobacion || ['aprobado', 'enviado'].includes(report.estatus) ? { label: 'Enviar por correo', icon: Mail, onClick: () => sendReport(report) } : null,
                    report.fecha_aprobacion || ['aprobado', 'enviado'].includes(report.estatus) ? { label: report.visible_cliente ? 'Ocultar al cliente' : 'Mostrar al cliente', icon: report.visible_cliente ? EyeOff : Eye, onClick: () => togglePublish(report) } : null,
                    { separator: true },
                    { label: 'Modificar desde interpretación', icon: Settings, onClick: () => router.push(`/muestras/interpretacion?lote=${report.lote_id}&muestra=${report.muestra_id}&fromReport=${report.id}`) },
                    !report.fecha_envio && !report.visible_cliente && report.estatus !== 'anulado' ? { label: 'Anular reporte', icon: Trash2, danger: true, onClick: () => annulReport(report) } : null,
                  ];
                  return <div className="flex justify-end"><OverflowMenu items={menu} /></div>;
                },
              },
            ]}
          />

          {sortedRows.length > reportPageSize ? (
            <div className="reports-pagination">
              <span>Mostrando {(reportCurrentPage - 1) * reportPageSize + 1}-{Math.min(reportCurrentPage * reportPageSize, sortedRows.length)} de {sortedRows.length}</span>
              <div>
                <button type="button" className="go-mini" disabled={reportCurrentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
                <span className="go-pill">{reportCurrentPage} / {reportTotalPages}</span>
                <button type="button" className="go-mini" disabled={reportCurrentPage >= reportTotalPages} onClick={() => setPage((value) => Math.min(reportTotalPages, value + 1))}>Siguiente</button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <style jsx global>{`
        .reports-v2 .reports-filterbar{flex-wrap:wrap}
        .reports-v2 .report-date{flex:0 1 145px}
        .reports-table-card{padding:0;overflow:hidden}
        .reports-flat-table{min-width:980px}
        .reports-flat-table th:last-child,.reports-flat-table td:last-child{text-align:right;width:70px}
        .reports-flat-table small{display:block;color:#747a83;font-size:10px;margin-top:3px}
        .report-lot-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:10px 12px;border:1px solid var(--go-border-soft);border-radius:var(--go-radius);background:#17191c}
        .report-lot-actions strong,.report-lot-actions span{display:block}.report-lot-actions strong{font-size:12px;color:#d9dce0}.report-lot-actions span{margin-top:2px;font-size:11px;color:#777d86}
        .reports-empty{min-height:270px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#777d86}
        .reports-empty-icon{width:54px;height:54px;display:grid;place-items:center;margin-bottom:13px;border-radius:50%;background:#202329;color:#8f959e}
        .reports-empty strong{color:#dadddf;font-size:15px}.reports-empty p{margin:7px 0 0;font-size:12px}
        .reports-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;color:#777d86;font-size:11px}
        .reports-pagination>div{display:flex;align-items:center;gap:7px}
        .requestOverlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;cursor:wait}
        .requestCard{width:min(420px,92vw);min-height:190px;border:1px solid var(--go-border-soft);background:#191b1e;border-radius:var(--go-radius-lg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px}
        .requestCard strong{font-size:16px}.requestCard span{color:#858b94;font-size:12px}.requestSpinner{width:46px;height:46px;border:4px solid #34383f;border-top-color:var(--go-red);border-radius:50%;animation:requestSpin .8s linear infinite}@keyframes requestSpin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
