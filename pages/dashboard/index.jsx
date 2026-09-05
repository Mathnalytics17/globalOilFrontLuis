import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Mail,
  RefreshCcw,
  Send,
} from 'lucide-react';
import { toast } from 'react-toastify';

import operationalDashboardService from '@features/dashboard/infrastructure/operationalDashboardService';

const tabs = [
  ['hoy', 'Hoy'],
  ['pendientes', 'Pendientes'],
  ['vencimientos', 'Vencimientos'],
  ['alertas', 'Alertas'],
  ['historico', 'Historico'],
];

const urgencyClass = {
  vencido: 'danger',
  vence_hoy: 'warning',
  proximo: 'soon',
  normal: 'ok',
  sin_sla: 'muted',
  cerrado: 'muted',
};

const severityClass = {
  alta: 'danger',
  media: 'warning',
  baja: 'ok',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatCard({ icon: Icon, label, value, tone = 'neutral', onClick }) {
  return (
    <button type="button" className={`statCard ${tone}`} onClick={onClick}>
      <span className="statIcon"><Icon size={19} /></span>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </button>
  );
}

function QueueTable({ rows, router }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Lote</th>
            <th>Cliente</th>
            <th>Gestion</th>
            <th>Entrega</th>
            <th>Estado</th>
            <th>Progreso</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((item) => (
            <tr key={item.id}>
              <td><button type="button" className="linkBtn" onClick={() => router.push(`/muestras/lotes/${item.id}`)}>{item.id}</button></td>
              <td><strong>{item.client}</strong><span>{item.contact_email || item.contact_name || '-'}</span></td>
              <td>{item.management_type}</td>
              <td>
                <span className={`pill ${urgencyClass[item.due?.urgency] || 'muted'}`}>{item.due?.label || 'Sin SLA'}</span>
                <small>{formatDate(item.due?.due_date)}</small>
              </td>
              <td>{item.status_label}</td>
              <td>
                <div className="progressLine"><i style={{ width: `${item.progress?.percentage || 0}%` }} /></div>
                <small>{item.progress?.label}</small>
              </td>
              <td><button type="button" className="actionBtn" onClick={() => router.push(item.action?.href || `/muestras/lotes/${item.id}`)}>{item.action?.label || 'Ver lote'}</button></td>
            </tr>
          )) : (
            <tr><td colSpan={7} className="empty">No hay lotes en esta vista.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AlertList({ alerts, router }) {
  return (
    <div className="alertList">
      {alerts.length ? alerts.map((alert, index) => (
        <button key={`${alert.kind}-${alert.batch?.id}-${index}`} type="button" className={`alertItem ${severityClass[alert.severity] || 'ok'}`} onClick={() => router.push(alert.action?.href || `/muestras/lotes/${alert.batch?.id}`)}>
          <AlertTriangle size={18} />
          <span>
            <strong>{alert.title}</strong>
            <small>{alert.detail}</small>
          </span>
          <em>{alert.action?.label || 'Abrir'}</em>
        </button>
      )) : <p className="emptyPanel">Sin alertas activas.</p>}
    </div>
  );
}

export default function OperationalDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hoy');

  const load = async () => {
    setLoading(true);
    try {
      const center = await operationalDashboardService.getCenter();
      setData(center);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el Centro Operativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendDigest = async () => {
    try {
      const result = await operationalDashboardService.sendDailyDigest();
      if (result.sent) toast.success(`Resumen enviado a ${result.recipients?.length || 0} destinatario(s).`);
      else toast.warning(result.reason === 'no_recipients' ? 'No hay destinatarios configurados para el resumen.' : 'El resumen no se envio porque la lista esta inactiva.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo enviar el resumen operativo.');
    }
  };

  const summary = data?.summary || {};
  const queues = data?.queues || {};
  const alerts = data?.alerts || [];

  const currentRows = useMemo(() => {
    if (activeTab === 'vencimientos') return [...(queues.overdue || []), ...(queues.due_today || []), ...(queues.due_soon || [])];
    if (activeTab === 'pendientes') return queues.priority || [];
    if (activeTab === 'hoy') return [...(queues.due_today || []), ...(queues.due_soon || []), ...(queues.ready || [])];
    return queues.priority || [];
  }, [activeTab, queues]);

  return (
    <main className="opPage">
      <header className="hero">
        <div>
          <span className="eyebrow">Centro Operativo</span>
          <h1>Operacion de laboratorio</h1>
          <p>Lotes pendientes, vencimientos, alertas y actividad historica en una sola cola de trabajo.</p>
        </div>
        <div className="heroActions">
          <button type="button" className="ghostBtn" onClick={load} disabled={loading}><RefreshCcw size={17} /> Recargar</button>
          <button type="button" className="ghostBtn" onClick={() => router.push('/configuracion-tecnica/notificaciones')}><Bell size={17} /> Mail lists</button>
          <button type="button" className="redBtn" onClick={sendDigest}><Send size={17} /> Enviar resumen</button>
        </div>
      </header>

      <section className="statsGrid">
        <StatCard icon={Gauge} label="Activos" value={summary.active_batches} onClick={() => setActiveTab('pendientes')} />
        <StatCard icon={Clock} label="Vencidos" value={summary.overdue} tone="danger" onClick={() => setActiveTab('vencimientos')} />
        <StatCard icon={CalendarClock} label="Vencen hoy" value={summary.due_today} tone="warning" onClick={() => setActiveTab('vencimientos')} />
        <StatCard icon={AlertTriangle} label="Proximos" value={summary.due_soon} tone="soon" onClick={() => setActiveTab('vencimientos')} />
        <StatCard icon={CheckCircle2} label="Listos" value={summary.ready} tone="ok" onClick={() => setActiveTab('hoy')} />
        <StatCard icon={FileText} label="Informes enviados hoy" value={summary.reports_sent_today} />
        <StatCard icon={AlertTriangle} label="No deseados" value={summary.undesired_results} tone="danger" onClick={() => setActiveTab('alertas')} />
        <StatCard icon={Mail} label="Informes por enviar" value={summary.report_ready} tone="soon" />
      </section>

      <nav className="tabs">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </nav>

      {loading ? (
        <section className="panel"><p className="emptyPanel">Cargando operacion...</p></section>
      ) : activeTab === 'alertas' ? (
        <section className="panel"><AlertList alerts={alerts} router={router} /></section>
      ) : activeTab === 'historico' ? (
        <section className="historyGrid">
          <article className="panel">
            <h2>Por estado</h2>
            {(data?.history?.by_status || []).map((item) => (
              <div key={item.label} className="barRow"><span>{item.label}</span><strong>{item.value}</strong></div>
            ))}
          </article>
          <article className="panel">
            <h2>Por tipo de gestion</h2>
            {(data?.history?.by_management || []).map((item) => (
              <div key={item.label} className="barRow"><span>{item.label}</span><strong>{item.value}</strong></div>
            ))}
          </article>
          <article className="panel wide">
            <h2>Ultimos meses</h2>
            <div className="monthGrid">
              {(data?.history?.monthly || []).map((item) => (
                <div key={item.month} className="monthItem">
                  <span>{item.month}</span>
                  <strong>{item.created}</strong>
                  <small>{item.reported} reportados</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : (
        <section className="panel">
          <div className="panelTitle">
            <h2>{activeTab === 'vencimientos' ? 'Agenda de vencimientos' : activeTab === 'pendientes' ? 'Cola operativa' : 'Trabajo del dia'}</h2>
            <span>{currentRows.length} lote(s)</span>
          </div>
          <QueueTable rows={currentRows} router={router} />
        </section>
      )}

      <style jsx global>{`
        .opPage { min-height: 100vh; padding: 34px 44px; color: #fff; background: #171717; }
        .hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid #30333b; padding-bottom: 18px; }
        .eyebrow { color: #ff3045; text-transform: uppercase; letter-spacing: .18em; font-weight: 800; font-size: 12px; }
        .opPage h1 { font-size: 34px; margin: 8px 0 6px; font-weight: 600; }
        .opPage p { color: #c7cbd4; margin: 0; font-size: 16px; max-width: 720px; }
        .heroActions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        .opPage button { font: inherit; }
        .ghostBtn, .redBtn, .actionBtn { border: 1px solid #3a3d45; color: #fff; background: #202228; border-radius: 7px; padding: 12px 16px; display: inline-flex; align-items: center; gap: 8px; font-weight: 800; cursor: pointer; }
        .redBtn { background: #ff283d; border-color: #ff283d; }
        .statsGrid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 12px; margin-bottom: 14px; }
        .statCard { text-align: left; min-height: 94px; border: 1px solid #30333b; background: #202126; color: #fff; border-radius: 8px; padding: 14px; cursor: pointer; display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 12px; }
        .statCard span:not(.statIcon) { color: #c7cbd4; font-weight: 700; }
        .statCard strong { font-size: 30px; justify-self: end; }
        .statIcon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 8px; background: #2b2e35; }
        .statCard.danger .statIcon, .pill.danger { background: rgba(255, 40, 61, .18); color: #ff6170; }
        .statCard.warning .statIcon, .pill.warning { background: rgba(255, 181, 71, .16); color: #ffbd61; }
        .statCard.soon .statIcon, .pill.soon { background: rgba(79, 156, 255, .16); color: #8abaff; }
        .statCard.ok .statIcon, .pill.ok { background: rgba(34, 197, 94, .16); color: #64d98d; }
        .tabs { display: flex; gap: 8px; border-bottom: 1px solid #2f3238; margin: 18px 0; }
        .tabs button { background: transparent; color: #aeb4c0; border: 0; padding: 14px 18px; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 800; }
        .tabs button.active { color: #fff; border-color: #ff283d; }
        .panel { border: 1px solid #30333b; border-radius: 8px; background: #1d1e23; padding: 18px; }
        .panelTitle { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .panelTitle h2, .panel h2 { margin: 0; font-size: 22px; font-weight: 600; }
        .tableWrap { overflow: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 920px; }
        th { text-align: left; color: #c4cad5; background: #27282d; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; padding: 13px; white-space: nowrap; }
        td { border-top: 1px solid #30333b; padding: 14px 13px; vertical-align: middle; }
        td span, small { display: block; color: #aeb4c0; margin-top: 4px; }
        .linkBtn { background: none; border: 0; color: #fff; font-weight: 900; cursor: pointer; padding: 0; }
        .pill { display: inline-flex; border-radius: 999px; padding: 6px 10px; font-weight: 900; }
        .pill.muted { background: #2b2d33; color: #b8bec8; }
        .progressLine { height: 8px; background: #111216; border-radius: 999px; overflow: hidden; width: 130px; }
        .progressLine i { display: block; height: 100%; background: #ff3045; }
        .actionBtn { padding: 9px 12px; }
        .alertList { display: grid; gap: 10px; }
        .alertItem { width: 100%; border: 1px solid #333741; background: #202126; color: #fff; border-radius: 8px; padding: 14px; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; text-align: left; cursor: pointer; }
        .alertItem.danger { border-color: rgba(255, 40, 61, .6); }
        .alertItem.warning { border-color: rgba(255, 181, 71, .6); }
        .alertItem em { color: #cfd5de; font-style: normal; font-weight: 800; }
        .historyGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .historyGrid .wide { grid-column: 1 / -1; }
        .barRow { display: flex; justify-content: space-between; border-top: 1px solid #30333b; padding: 12px 0; }
        .monthGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 14px; }
        .monthItem { border: 1px solid #30333b; border-radius: 8px; padding: 12px; background: #202126; }
        .monthItem strong { font-size: 28px; display: block; margin: 6px 0; }
        .empty, .emptyPanel { color: #aeb4c0; text-align: center; padding: 26px; }
        @media (max-width: 1050px) {
          .opPage { padding: 28px 18px; }
          .hero { display: block; }
          .heroActions { justify-content: flex-start; margin-top: 16px; }
          .statsGrid { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
          .historyGrid { grid-template-columns: 1fr; }
          .opPage h1 { font-size: 32px; }
        }
      `}</style>
    </main>
  );
}
