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
import DataTable from '@shared/ui/DataTable';
import PageHeader from '@shared/ui/PageHeader';
import MetricStrip from '@shared/ui/MetricStrip';
import OverflowMenu from '@shared/ui/OverflowMenu';
import Modal from '@shared/ui/Modal';
import { useAuth } from '@features/auth/presentation/context/AuthContext';


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
  const { hasPermission } = useAuth();
  const [data, setData] = useState({ summary: {}, groups: [], results: [] });
  const [companies, setCompanies] = useState([]);
  const [machines, setMachines] = useState([]);
  const [samplingPoints, setSamplingPoints] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);
  const [reportPendingApproval, setReportPendingApproval] = useState(null);
  const [batchPendingSend, setBatchPendingSend] = useState(null);
  const [reportPendingAnnulment, setReportPendingAnnulment] = useState(null);
  const [annulmentReason, setAnnulmentReason] = useState('');
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
      // Las opciones proceden del mismo conjunto de reportes autorizado. No
      // exigimos permisos de administración de activos para consultar o
      // filtrar la biblioteca de reportes.
      const options = payload?.filter_options || {};
      setCompanies(options.companies || []);
      setMachines(options.machines || []);
      setSamplingPoints(options.sampling_points || []);
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

  const approveReport = async () => {
    const report = reportPendingApproval;
    if (!report) return;

    // Cierra inmediatamente para dar feedback visual al usuario.
    // Si la petición falla, restauramos el mismo reporte en el modal.
    setReportPendingApproval(null);
    setActionBusy({ id: report.id, message: `Aprobando el reporte de ${report.muestra_id}...` });

    try {
      await reportsService.approve(report.id);
      toast.success(`Reporte de ${report.muestra_id} aprobado.`);
      await loadReports();
    } catch (error) {
      console.error(error);
      setReportPendingApproval(report);
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

  const sendBatch = async () => {
    const { format, lotId } = batchPendingSend || {};
    if (!lotId || lotId === 'SIN-LOTE') return;
    try {
      const response = await reportsService.sendBatch(lotId, format);
      toast.success(`Lote enviado a ${(response.recipients || []).join(', ')}.`);
      setBatchPendingSend(null);
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
    setReportPendingAnnulment(report);
    setAnnulmentReason('');
  };

  const confirmAnnulment = async () => {
    const report = reportPendingAnnulment;
    if (!report) return;
    if (!annulmentReason.trim()) return toast.error('El motivo es obligatorio.');
    try {
      setActionBusy({ message: 'Anulando reporte...' });
      await reportsService.annul(report.id, annulmentReason.trim());
      toast.success('Reporte anulado. Su historial se conserva.');
      setReportPendingAnnulment(null);
      setAnnulmentReason('');
      await loadReports();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'No se pudo anular el reporte.');
    } finally {
      setActionBusy(null);
    }
  };

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
                hasPermission('reportes.descargar_pdf') ? { label: 'Descargar PDF consolidado', icon: Download, onClick: () => downloadBatch('pdf') } : null,
                hasPermission('reportes.descargar_pdf') ? { label: 'Descargar ZIP individual', icon: Download, onClick: () => downloadBatch('zip') } : null,
                hasPermission('reportes.descargar_pdf') && hasPermission('reportes.enviar_email') ? { separator: true } : null,
                hasPermission('reportes.enviar_email') ? { label: 'Enviar PDF', icon: Mail, onClick: () => setBatchPendingSend({ format: 'pdf', lotId: filters.lote }) } : null,
                hasPermission('reportes.enviar_email') ? { label: 'Enviar ZIP', icon: Mail, onClick: () => setBatchPendingSend({ format: 'zip', lotId: filters.lote }) } : null,
              ].filter(Boolean)}
            />
          </section>
        ) : null}

        <section className="go-card reports-table-card">
          <DataTable
            data={sortedRows}
            pagination
            initialRowsPerPage={12}
            pageSizeOptions={[12, 25, 50, 100]}
            resetPageKey={`${filters.search}|${filters.lote}|${filters.client_id}|${filters.machine_id}|${filters.sampling_point_id}|${filters.estado}|${filters.visible_cliente}|${filters.fecha_generacion_desde}|${filters.fecha_generacion_hasta}`}
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
                    hasPermission('reportes.descargar_pdf') ? { label: 'Vista previa', icon: Eye, onClick: () => previewReport(report.id) } : null,
                    hasPermission('reportes.descargar_pdf') ? { label: 'Descargar PDF', icon: Download, onClick: () => downloadReport(report.id, `${report.consecutivo}_v${report.version}`) } : null,
                    hasPermission('reportes.aprobar') && !report.fecha_aprobacion && !['aprobado', 'enviado', 'anulado'].includes(report.estatus) ? { label: 'Aprobar reporte', icon: CheckCircle2, onClick: () => setReportPendingApproval(report) } : null,
                    hasPermission('reportes.enviar_email') && (report.fecha_aprobacion || ['aprobado', 'enviado'].includes(report.estatus)) ? { label: 'Enviar por correo', icon: Mail, onClick: () => sendReport(report) } : null,
                    (report.fecha_aprobacion || ['aprobado', 'enviado'].includes(report.estatus)) && hasPermission(report.visible_cliente ? 'reportes.despublicar_cliente' : 'reportes.publicar_cliente') ? { label: report.visible_cliente ? 'Ocultar al cliente' : 'Mostrar al cliente', icon: report.visible_cliente ? EyeOff : Eye, onClick: () => togglePublish(report) } : null,
                    hasPermission('interpretacion.editar') ? { separator: true } : null,
                    hasPermission('interpretacion.editar') ? { label: 'Modificar desde interpretación', icon: Settings, onClick: () => router.push(`/muestras/interpretacion?lote=${report.lote_id}&muestra=${report.muestra_id}&fromReport=${report.id}`) } : null,
                    hasPermission('reportes.anular') && !report.fecha_envio && !report.visible_cliente && report.estatus !== 'anulado' ? { label: 'Anular reporte', icon: Trash2, danger: true, onClick: () => annulReport(report) } : null,
                  ].filter(Boolean);
                  return <div className="flex justify-end"><OverflowMenu items={menu} /></div>;
                },
              },
            ]}
          />

        </section>
      </div>

      <Modal
        open={Boolean(reportPendingApproval)}
        onClose={() => setReportPendingApproval(null)}
        title="Aprobar reporte"
        size="sm"
        footer={(
          <>
            <button type="button" className="go-button" onClick={() => setReportPendingApproval(null)}>Cancelar</button>
            <button type="button" className="go-button-primary" onClick={approveReport}>Aprobar reporte</button>
          </>
        )}
      >
        <div className="report-approval-dialog report-approval-dialog--confirm">
          <div className="report-approval-icon"><CheckCircle2 size={25} /></div>
          <div className="report-approval-content">
            <strong className="report-approval-heading">Confirmar aprobación</strong>
            <p>El reporte quedará aprobado y listo para publicación o envío al cliente.</p>
            <dl>
              <div><dt>Reporte</dt><dd>{reportPendingApproval?.consecutivo} <small>v{reportPendingApproval?.version}</small></dd></div>
              <div><dt>Muestra</dt><dd>{reportPendingApproval?.muestra_id}</dd></div>
              <div><dt>Lote</dt><dd>{reportPendingApproval?.lote_id || 'Sin lote'}</dd></div>
            </dl>
            <div className="report-approval-note">
              <CheckCircle2 size={15} />
              <span>Verifique la vista previa y la interpretación antes de continuar.</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(batchPendingSend)}
        onClose={() => setBatchPendingSend(null)}
        title="Enviar reportes al cliente"
        size="sm"
        footer={<><button type="button" className="go-button" onClick={() => setBatchPendingSend(null)}>Cancelar</button><button type="button" className="go-button-primary" onClick={sendBatch}>Enviar {batchPendingSend?.format?.toUpperCase()}</button></>}
      >
        <div className="report-approval-dialog">
          <div className="report-approval-icon"><Mail size={24} /></div>
          <div><p>Se enviará el lote <strong>{batchPendingSend?.lotId}</strong> al correo configurado del cliente.</p><p className="report-approval-note">Formato: {batchPendingSend?.format?.toUpperCase() === 'ZIP' ? 'un archivo ZIP con reportes individuales' : 'un PDF consolidado'}.</p></div>
        </div>
      </Modal>

      <Modal
        open={Boolean(reportPendingAnnulment)}
        onClose={() => setReportPendingAnnulment(null)}
        title="Anular reporte"
        size="sm"
        footer={<><button type="button" className="go-button" onClick={() => setReportPendingAnnulment(null)}>Cancelar</button><button type="button" className="go-button-primary" onClick={confirmAnnulment}>Anular reporte</button></>}
      >
        <div className="report-approval-dialog">
          <div className="report-approval-icon report-annul-icon"><Trash2 size={24} /></div>
          <div>
            <p>La anulación conserva el historial del reporte <strong>{reportPendingAnnulment?.consecutivo}</strong>, pero evita que siga disponible.</p>
            <label className="report-annul-reason"><span>Motivo de anulación</span><textarea autoFocus value={annulmentReason} onChange={(event) => setAnnulmentReason(event.target.value)} placeholder="Describa por qué se anula este reporte" /></label>
          </div>
        </div>
      </Modal>

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
        .report-approval-dialog{display:flex;gap:15px;align-items:flex-start;min-width:0}.report-approval-content{flex:1;min-width:0}.report-approval-icon{flex:0 0 auto;width:48px;height:48px;display:grid;place-items:center;border-radius:50%;color:#f5c86a;background:rgba(245,200,106,.11);border:1px solid rgba(245,200,106,.3)}.report-approval-heading{display:block;margin:1px 0 5px;color:#f1f3f5;font-size:14px}.report-approval-dialog p{margin:0;color:#aeb4bd;font-size:12.5px;line-height:1.55}.report-approval-dialog dl{margin:17px 0 14px;padding:9px 13px;border:1px solid var(--go-border-soft);border-radius:9px;background:#141619}.report-approval-dialog dl div{display:flex;justify-content:space-between;gap:14px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.045)}.report-approval-dialog dl div:last-child{border-bottom:0}.report-approval-dialog dt{color:#858b94;font-size:11.5px}.report-approval-dialog dd{margin:0;color:#f1f3f5;font-weight:700;font-size:12px;text-align:right}.report-approval-dialog dd small{color:#9aa0aa;font-weight:500}.report-approval-dialog .report-approval-note{display:flex;align-items:flex-start;gap:7px;color:#e5bd62;font-size:11.5px;line-height:1.45}.report-approval-note svg{flex:none;margin-top:1px}@media(max-width:520px){.report-approval-dialog{gap:11px}.report-approval-icon{width:40px;height:40px}.report-approval-dialog dl{margin-left:-51px;margin-top:16px}.report-approval-dialog .report-approval-note{margin-left:-51px}}
        .report-annul-icon{color:#fb7185;background:rgba(251,113,133,.12);border-color:rgba(251,113,133,.32)}.report-annul-reason{display:block;margin-top:14px}.report-annul-reason span{display:block;margin-bottom:6px;color:#c9cdd3;font-size:12px;font-weight:700}.report-annul-reason textarea{display:block;width:100%;min-height:82px;padding:9px 10px;resize:vertical;border:1px solid #42464e;border-radius:7px;background:#121316;color:#f1f3f5;font:inherit;font-size:12px}.report-annul-reason textarea:focus{outline:2px solid rgba(239,35,42,.4);border-color:#ef232a}
      `}</style>
    </div>
  );
}
