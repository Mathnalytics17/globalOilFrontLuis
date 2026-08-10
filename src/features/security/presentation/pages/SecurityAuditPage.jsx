
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Refresh } from '@mui/icons-material';
import { securityService } from '../../infrastructure/securityService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { useAuth } from '@features/auth/application/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';
import s from '../components/Security.module.css';
import { BackLink, SearchBox, getErrorMessage, getId, getList, getName } from '../components/securityUi';

export default function SecurityAuditPage() {
  const { user } = useAuth();
  const global = isGlobalUser(user);
  const [logs, setLogs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({ search: '', empresa: '', action: '', date_from: '', date_to: '' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [auditData, companyData] = await Promise.all([
        securityService.audit.list(filters),
        global ? companiesService.list() : Promise.resolve([]),
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
      const company = log.empresa_info || log.company_info || log.empresa || {};
      const text = `${getName(actor)} ${actor.email || ''} ${getName(company)} ${log.action || log.accion} ${log.module || log.modulo} ${log.detail || log.detalle}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filters.empresa && String(getId(company)) !== String(filters.empresa)) return false;
      if (filters.action && !String(log.action || log.accion || '').toLowerCase().includes(filters.action.toLowerCase())) return false;
      return true;
    });
  }, [logs, filters]);

  const auditSortColumns = useMemo(() => ({
    date: (log) => log.created_at || log.fecha,
    actor: (log) => {
      const actor = log.actor || log.user || log.usuario || {};
      return getName(actor, actor.email || '-');
    },
    company: (log) => getName(log.empresa_info || log.company_info || log.empresa || {}, '-'),
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
              <p className={s.subtitle}>Consulta acciones de usuarios, empresas, roles, reportes y seguridad.</p>
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

          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <SortableTableHeader column="date" label="Fecha" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="actor" label="Actor" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="company" label="Empresa" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="module" label="Modulo" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="action" label="Accion" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="detail" label="Detalle" sort={sort} onSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((log) => {
                  const actor = log.actor || log.user || log.usuario || {};
                  const company = log.empresa_info || log.company_info || log.empresa || {};
                  return (
                    <tr key={log.id || `${log.created_at}-${log.action}`}>
                      <td>{log.created_at || log.fecha ? new Date(log.created_at || log.fecha).toLocaleString() : '-'}</td>
                      <td>
                        <strong>{getName(actor, actor.email || '-')}</strong>
                        <span className={s.small}>{actor.email || log.actor_email || ''}</span>
                      </td>
                      <td>{getName(company, '-')}</td>
                      <td>{log.module || log.modulo || '-'}</td>
                      <td>{log.action || log.accion || '-'}</td>
                      <td>{log.detail || log.detalle || log.message || '-'}</td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr><td colSpan="6"><div className={s.message}>No hay eventos de auditoría para mostrar.</div></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
