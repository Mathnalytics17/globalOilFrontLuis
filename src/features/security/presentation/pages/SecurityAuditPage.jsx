
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Eye, RefreshCcw as Refresh } from 'lucide-react';
import { securityService } from '../../infrastructure/securityService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { useAuth } from '@features/auth/presentation/context/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import DataTable from '@shared/ui/DataTable';
import Modal from '@shared/ui/Modal';
import useTableSort from '@shared/hooks/useTableSort';
import s from '../components/Security.module.css';
import { BackLink, SearchBox, getErrorMessage, getId, getList, getName } from '../components/securityUi';

export default function SecurityAuditPage() {
  const { user } = useAuth();
  const global = isGlobalUser(user);
  const [logs, setLogs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({ search: '', empresa: '', action: '', date_from: '', date_to: '' });
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [auditData, companyData] = await Promise.all([
        securityService.audit.list(filters),
        global ? companiesService.list({ include_internal: true }) : Promise.resolve([]),
      ]);
      setLogs(getList(auditData));
      setCompanies(getList(companyData));
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo cargar la auditoría.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return logs.filter((log) => {
      const actor = log.actor || log.user || log.usuario || {};
      const companyId = log.empresa_efectiva_id || getId(log.empresa_info || log.company_info || log.empresa || {});
      const companyName = log.empresa_efectiva_nombre || getName(log.empresa_info || log.company_info || log.empresa || {});
      const text = `${log.actor_nombre || getName(actor)} ${log.actor_email || ''} ${companyName} ${log.action || log.accion} ${log.module || log.modulo} ${log.detail || log.detalle}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filters.empresa && String(companyId) !== String(filters.empresa)) return false;
      if (filters.action && !String(log.action || log.accion || '').toLowerCase().includes(filters.action.toLowerCase())) return false;
      return true;
    });
  }, [logs, filters]);

  const auditSortColumns = useMemo(() => ({
    date: (log) => log.created_at || log.fecha,
    actor: (log) => log.actor_nombre || log.actor_email || '-',
    company: (log) => log.empresa_efectiva_nombre || getName(log.empresa_info || log.company_info || log.empresa || {}, '-'),
    module: (log) => log.module || log.modulo,
    action: (log) => log.action || log.accion,
    detail: (log) => log.detail || log.detalle || log.message,
  }), []);
  const { sortedRows, sort, requestSort } = useTableSort(filtered, auditSortColumns, {
    key: 'date',
    direction: 'desc',
  });

  return (
    <main className={s.page}>
      <div className={s.scroll}>
        <section className={s.shell}>
          <BackLink href="/seguridad">Volver a seguridad</BackLink>

          <header className={s.header}>
            <div>
              <div className={s.kicker}>Seguridad</div>
              <h1 className={s.title}>Auditoría</h1>
              <p className={s.subtitle}>Bitácora de accesos, usuarios, permisos y empresas. Para cambios operativos de muestras, resultados y límites use Trazabilidad y control.</p>
            </div>
            <button className={s.buttonSecondary} type="button" onClick={load} disabled={loading}><Refresh /> Actualizar</button>
          </header>

          <div className={s.toolbar}>
            <SearchBox value={filters.search} onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))} placeholder="Buscar actor, empresa, acción o detalle..." />
            <div className={s.filters}>
              {global ? (
                <select className={s.select} value={filters.empresa} onChange={(e) => setFilters((p) => ({ ...p, empresa: e.target.value }))}>
                  <option value="">Todas las empresas</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{getName(company)}</option>)}
                </select>
              ) : null}
              <input className={s.input} value={filters.action} onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))} placeholder="Acción" />
              <button className={s.buttonSecondary} type="button" onClick={load}>Filtrar</button>
            </div>
          </div>

          <DataTable
            data={sortedRows}
            rowKey={(log) => log.id || `${log.created_at || log.fecha}-${log.action || log.accion}`}
            pagination
            initialRowsPerPage={25}
            pageSizeOptions={[10, 25, 50, 100]}
            minWidth={1040}
            sort={sort ? { field: sort.key, direction: sort.direction } : null}
            onSort={requestSort}
            emptyMessage={loading ? 'Cargando auditoría…' : 'No hay eventos de auditoría para mostrar.'}
            columns={[
              { id: 'date', label: 'Fecha', minWidth: 170, render: (log) => log.created_at || log.fecha ? new Date(log.created_at || log.fecha).toLocaleString() : '-' },
              { id: 'actor', label: 'Actor', mobileTitle: true, render: (log) => <><strong>{log.actor_nombre || log.actor_email || 'Sistema'}</strong><span className={s.small}>{log.actor_email || log.target_user_email || ''}</span></> },
              { id: 'company', label: 'Empresa', render: (log) => log.empresa_efectiva_nombre || 'Global / sin empresa asignada' },
              { id: 'module', label: 'Módulo', render: (log) => log.module || log.modulo || '-' },
              { id: 'action', label: 'Acción', render: (log) => log.action || log.accion || '-' },
              { id: 'detail', label: 'Detalle', minWidth: 260, render: (log) => log.detail || log.detalle || log.message || '-' },
              { id: 'more', label: '', width: 62, sortable: false, searchable: false, render: (log) => <button type="button" className={s.buttonSecondary} onClick={() => setSelectedLog(log)} title="Ver detalle del evento"><Eye size={16} /></button> },
            ]}
          />

          <Modal open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} title="Detalle del evento de seguridad" size="md" footer={<button type="button" className="go-button" onClick={() => setSelectedLog(null)}>Cerrar</button>}>
            <div className={s.auditDetail}>
              <div><span>Acción</span><strong>{selectedLog?.action || selectedLog?.accion || '-'}</strong></div>
              <div><span>Actor</span><strong>{selectedLog?.actor_nombre || selectedLog?.actor_email || 'Sistema'}</strong></div>
              <div><span>Empresa</span><strong>{selectedLog?.empresa_efectiva_nombre || 'Global / sin empresa asignada'}</strong></div>
              <div><span>Usuario afectado</span><strong>{selectedLog?.target_user_nombre || selectedLog?.target_user_email || '—'}</strong></div>
              <div><span>Dirección IP</span><strong>{selectedLog?.ip_address || 'No registrada'}</strong></div>
              <div className={s.auditDetailWide}><span>Detalle</span><strong>{selectedLog?.detail || selectedLog?.detalle || 'Sin detalle adicional.'}</strong></div>
              {selectedLog?.metadata && Object.keys(selectedLog.metadata).length ? <div className={s.auditDetailWide}><span>Datos registrados</span><div className={s.auditMetadata}>{Object.entries(selectedLog.metadata).map(([key, value]) => <div key={key}><b>{key.replaceAll('_', ' ')}</b><em>{typeof value === 'object' ? Object.values(value || {}).join(' · ') : String(value)}</em></div>)}</div></div> : null}
            </div>
          </Modal>
        </section>
      </div>
    </main>
  );
}
