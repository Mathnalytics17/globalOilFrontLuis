import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FilePlus2, FileText, Loader2, Mail, Pencil, RefreshCw, Send, X } from 'lucide-react';

import { useAuth } from '@features/auth/presentation/context/AuthContext';
import { samplesService } from '@features/samples/infrastructure/samplesService';
import { reportsService } from '@features/reports/infrastructure/reportsService';
import { isCompanyAdmin, isGlobalUser } from '@features/auth/application/sessionAccess';
import PageHeader from '@shared/ui/PageHeader';
import MetricStrip from '@shared/ui/MetricStrip';
import OverflowMenu from '@shared/ui/OverflowMenu';
import DataTable from '@shared/ui/DataTable';

const reportSampleId = (report) => typeof report?.muestra === 'object' ? report.muestra?.id : report?.muestra;
const statusClass = (status) => status === 'aprobado' ? 'go-status-on' : status === 'pendiente_aprobacion' ? 'go-pill' : 'go-status-off';

export default function DocumentsList() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [approvedSamples, setApprovedSamples] = useState([]);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [sendingReport, setSendingReport] = useState(false);
  const canSendReport = Boolean(user) && isGlobalUser(user);

  const load = async () => {
    setLoading(true);
    try {
      const [samples, reports] = await Promise.all([samplesService.list(), reportsService.list()]);
      setApprovedSamples((samples || []).filter((sample) => sample.is_revisado === true));
      setGeneratedReports(reports || []);
    } catch (error) {
      console.error(error);
      setApprovedSamples([]);
      setGeneratedReports([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const reportIds = useMemo(() => new Set(generatedReports.map(reportSampleId)), [generatedReports]);
  const samplesWithoutReport = useMemo(() => approvedSamples.filter((sample) => !reportIds.has(sample.id)), [approvedSamples, reportIds]);
  const samplesWithReport = useMemo(() => approvedSamples.filter((sample) => reportIds.has(sample.id)), [approvedSamples, reportIds]);
  const sampleById = useMemo(() => new Map(approvedSamples.map((sample) => [sample.id, sample])), [approvedSamples]);

  const handleSendReport = async (report) => {
    if (!canSendReport) return;
    const sample = sampleById.get(reportSampleId(report));
    const users = sample?.referencia_equipo_info?.empresa_info?.usuarios || [];
    const recipients = users.filter((candidate) => isCompanyAdmin(candidate) || isGlobalUser(candidate));
    if (!recipients.length) { window.alert('No se encontraron administradores de la empresa para enviar el reporte.'); return; }
    setSendingReport(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      window.alert(`Reporte preparado para ${recipients.length} usuario(s).`);
    } finally { setSendingReport(false); }
  };

  return (
    <div className="go-page"><div className="go-shell">
      <PageHeader
        eyebrow="Reportes"
        title="Biblioteca de documentos"
        subtitle="Genere reportes a partir de muestras revisadas y consulte los documentos existentes."
        actions={null}
      />

      <MetricStrip items={[
        { label: 'Muestras revisadas', value: approvedSamples.length, icon: FileText },
        { label: 'Pendientes de reporte', value: samplesWithoutReport.length, icon: FilePlus2 },
        { label: 'Reportes generados', value: generatedReports.length, icon: FileText },
      ]} />

      <div className="mb-5 flex gap-6 border-b border-white/[0.06]">
        <button type="button" className={`relative pb-3 text-sm ${activeTab === 'pending' ? 'font-semibold text-white' : 'text-[#858b94] hover:text-white'}`} onClick={() => setActiveTab('pending')}>Por generar{activeTab === 'pending' ? <span className="absolute inset-x-0 bottom-0 h-[2px] bg-go-red" /> : null}</button>
        <button type="button" className={`relative pb-3 text-sm ${activeTab === 'generated' ? 'font-semibold text-white' : 'text-[#858b94] hover:text-white'}`} onClick={() => setActiveTab('generated')}>Generados{activeTab === 'generated' ? <span className="absolute inset-x-0 bottom-0 h-[2px] bg-go-red" /> : null}</button>
      </div>

      <section className="go-card !p-0 overflow-hidden">
        <div className="go-section-head m-0 border-b border-white/[0.06] px-5 py-4">
          <div><h2>{activeTab === 'pending' ? 'Muestras listas para reporte' : 'Reportes generados'}</h2><p>{activeTab === 'pending' ? 'Muestras revisadas que aún no tienen un documento generado.' : 'Documentos creados y disponibles para consulta.'}</p></div>
        </div>

        {loading ? <div className="grid min-h-[280px] place-items-center text-sm text-[#858b94]"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cargando documentos…</span></div> : activeTab === 'pending' ? (
          samplesWithoutReport.length ? (
            <DataTable
              data={samplesWithoutReport}
              rowKey="id"
              pagination
              minWidth={680}
              columns={[
                { id:'id', label:'Muestra', mobileTitle:true, render:(sample) => <strong className="text-[#eef0f3]">{sample.id}</strong> },
                { id:'referencia_marca', label:'Lubricante', render:(sample) => sample.referencia_marca || 'No especificado' },
                { id:'equipo', label:'Equipo', sortable:false, render:(sample) => sample.referencia_equipo_info?.nombre || 'No especificado' },
                { id:'fecha_toma', label:'Fecha de toma', render:(sample) => sample.fecha_toma ? new Date(sample.fecha_toma).toLocaleDateString() : 'No especificada' },
                { id:'acciones', label:'Acción', sortable:false, mobileActions:true, render:(sample) => <button type="button" className="go-primary" onClick={(event) => { event.stopPropagation(); router.push(`/documents-list/template-report?muestra=${sample.id}`); }}><FilePlus2 className="h-4 w-4" /> Generar</button> },
              ]}
            />
          ) : <Empty icon={FilePlus2} title="No hay muestras pendientes" text="Todas las muestras revisadas ya cuentan con reporte." />
        ) : generatedReports.length ? (
          <DataTable
            data={generatedReports}
            rowKey="id"
            pagination
            minWidth={680}
            defaultSort={{ field:'fecha_emision', order:'desc' }}
            columns={[
              { id:'consecutivo', label:'Consecutivo', mobileTitle:true, render:(report) => <strong className="text-[#eef0f3]">{report.consecutivo || `Reporte ${report.id}`}</strong> },
              { id:'muestra', label:'Muestra', sortable:false, render:(report) => { const sampleId = reportSampleId(report); const sample = sampleById.get(sampleId); return <div><div className="text-[#d7dade]">#{sampleId}</div><small className="text-[#747a83]">{sample?.referencia_marca || 'Sin referencia'}{sample?.referencia_equipo_info?.nombre ? ` · ${sample.referencia_equipo_info.nombre}` : ''}</small></div>; } },
              { id:'fecha_emision', label:'Fecha de emisión', render:(report) => report.fecha_emision ? new Date(report.fecha_emision).toLocaleDateString() : 'No especificada' },
              { id:'estatus', label:'Estado', render:(report) => <span className={statusClass(report.estatus)}>{report.estatus || 'borrador'}</span> },
              { id:'acciones', label:'Acciones', sortable:false, mobileActions:true, render:(report) => { const sampleId = reportSampleId(report); return <OverflowMenu items={[
                { label:'Ver detalles', icon:FileText, onClick:() => setSelectedReport(report) },
                { label:'Editar reporte', icon:Pencil, onClick:() => router.push(`/documents-list/template-report?muestra=${sampleId}`) },
                canSendReport && { label:sendingReport ? 'Enviando…' : 'Enviar reporte', icon:Send, disabled:sendingReport, onClick:() => handleSendReport(report) },
              ]} />; } },
            ]}
          />
        ) : <Empty icon={FileText} title="No hay reportes generados" text="Los documentos aparecerán aquí cuando se creen desde una muestra revisada." />}
      </section>

      {selectedReport ? <ReportModal report={selectedReport} canSend={canSendReport} sending={sendingReport} onClose={() => setSelectedReport(null)} onSend={() => handleSendReport(selectedReport)} /> : null}
    </div></div>
  );
}

function Empty({ icon: Icon, title, text }) {
  return <div className="grid min-h-[300px] place-items-center p-8 text-center"><div><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-[#1e2024] text-[#6f7680]"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-base font-semibold text-[#dfe2e5]">{title}</h3><p className="mt-1 text-sm text-[#747a83]">{text}</p></div></div>;
}

function ReportModal({ report, canSend, sending, onClose, onSend }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-white/[0.09] bg-[#191b1e] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5"><div><p className="go-kicker">Reporte</p><h2 className="m-0 text-xl font-semibold text-white">{report.consecutivo || `Reporte ${report.id}`}</h2></div><button type="button" className="go-mini h-8 w-8 p-0" onClick={onClose}><X className="h-4 w-4" /></button></header><div className="p-5"><div className="grid gap-4 sm:grid-cols-2">{[
    ['Estado', report.estatus || 'borrador'], ['Fecha de emisión', report.fecha_emision ? new Date(report.fecha_emision).toLocaleDateString() : 'No especificada'], ['Muestra', reportSampleId(report) || '-'], ['Responsable', report.responsable || '-'], ['Empresa', report.empresa || '-']
  ].map(([label,value]) => <div key={label} className="border-b border-white/[0.055] pb-3"><span className="text-[11px] uppercase tracking-wide text-[#6f7680]">{label}</span><p className="mt-1 text-sm text-[#d9dce0]">{value}</p></div>)}</div>{report.comentarios ? <RichBlock title="Comentarios" html={report.comentarios} /> : null}{report.conclusiones ? <RichBlock title="Conclusiones" html={report.conclusiones} /> : null}<div className="mt-6 flex justify-end gap-2 border-t border-white/[0.06] pt-4">{canSend ? <button type="button" className="go-primary" disabled={sending} onClick={onSend}><Mail className="h-4 w-4" /> {sending ? 'Enviando…' : 'Enviar reporte'}</button> : null}<button type="button" className="go-ghost" onClick={onClose}>Cerrar</button></div></div></section></div>;
}
function RichBlock({ title, html }) { return <div className="mt-5"><h3 className="text-xs font-semibold uppercase tracking-wide text-[#7f858e]">{title}</h3><div className="mt-2 whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-[#15171a] p-4 text-sm leading-6 text-[#c9cdd3]">{html}</div></div>; }
