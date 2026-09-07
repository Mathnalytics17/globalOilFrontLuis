
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Cancel, Refresh, Send } from '@mui/icons-material';
import { securityService } from '../../infrastructure/securityService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { useAuth } from '@features/auth/application/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';
import s from '../components/Security.module.css';
import {
  BackLink,
  SearchBox,
  StatusPill,
  getErrorMessage,
  getId,
  getList,
  getName,
} from '../components/securityUi';

export default function SecurityInvitationsPage() {
  const { user } = useAuth();
  const global = isGlobalUser(user);
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({ search: '', estado: '', empresa: '' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [invites, companyList] = await Promise.all([
        securityService.invitations.list(filters),
        global ? companiesService.list() : Promise.resolve([]),
      ]);
      setItems(getList(invites));
      setCompanies(getList(companyList));
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar las invitaciones.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return items.filter((item) => {
      const company = item.empresa_info || item.company_info || item.empresa || item.company;
      const role = item.role_info || item.security_role_info || item.role || {};
      const text = `${item.email} ${getName(company)} ${getName(role)} ${item.status || item.estado}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filters.estado && String(item.status || item.estado).toUpperCase() !== String(filters.estado).toUpperCase()) return false;
      if (filters.empresa && String(getId(company)) !== String(filters.empresa)) return false;
      return true;
    });
  }, [items, filters]);

  const invitationSortColumns = useMemo(() => ({
    email: (item) => item.email,
    company: (item) => getName(item.empresa_info || item.company_info || item.empresa || item.company),
    role: (item) => getName(item.role_info || item.security_role_info || item.role || {}, item.role_name || '-'),
    status: (item) => item.status || item.estado,
    expires: (item) => item.expires_at || item.fecha_expiracion,
    sender: (item) => getName(item.invited_by || item.enviado_por || item.created_by, '-'),
  }), []);
  const { sortedRows, sort, requestSort } = useTableSort(filtered, invitationSortColumns, {
    key: 'expires',
    direction: 'desc',
  });

  const resend = async (id) => {
    try {
      await securityService.invitations.resend(id);
      toast.success('Invitación reenviada.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo reenviar la invitación.'));
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('¿Revocar esta invitación? El enlace anterior dejará de funcionar.')) return;
    try {
      await securityService.invitations.revoke(id);
      toast.success('Invitación revocada.');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo revocar la invitación.'));
    }
  };

  return (
    <main className={s.page}>
      <div className={s.scroll}>
        <section className={s.shell}>
          <BackLink href="/seguridad">Volver a seguridad</BackLink>

          <header className={s.header}>
            <div>
              <div className={s.kicker}>Seguridad</div>
              <h1 className={s.title}>Invitaciones</h1>
              <p className={s.subtitle}>Revisa invitaciones pendientes, expiradas, aceptadas o revocadas.</p>
            </div>
            <button className={s.buttonSecondary} type="button" onClick={load} disabled={loading}>
              <Refresh /> Actualizar
            </button>
          </header>

          <div className={s.toolbar}>
            <SearchBox value={filters.search} onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))} placeholder="Buscar correo, empresa o rol..." />
            <div className={s.filters}>
              {global ? (
                <select className={s.select} value={filters.empresa} onChange={(e) => setFilters((p) => ({ ...p, empresa: e.target.value }))}>
                  <option value="">Todas las empresas</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{getName(company)}</option>)}
                </select>
              ) : null}
              <select className={s.select} value={filters.estado} onChange={(e) => setFilters((p) => ({ ...p, estado: e.target.value }))}>
                <option value="">Todos los estados</option>
                <option value="PENDING">Pendiente</option>
                <option value="ACCEPTED">Aceptada</option>
                <option value="EXPIRED">Expirada</option>
                <option value="REVOKED">Revocada</option>
              </select>
            </div>
          </div>

          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <SortableTableHeader column="email" label="Correo" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="company" label="Empresa" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="role" label="Rol" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="status" label="Estado" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="expires" label="Vence" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="sender" label="Enviado por" sort={sort} onSort={requestSort} />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((item) => {
                  const company = item.empresa_info || item.company_info || item.empresa || item.company;
                  const role = item.role_info || item.security_role_info || item.role || {};
                  const rawStatus = String(item.status || item.estado || '').toUpperCase();
                  const effectiveStatus = rawStatus === 'PENDING' && item.expires_at && new Date(item.expires_at) < new Date() ? 'EXPIRED' : rawStatus;
                  const delivery = item.metadata?.email_delivery || {};
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.email}</strong><span className={s.small}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span><span className={s.small}>Correo: {delivery.status === 'sent' ? 'enviado' : delivery.status === 'failed' ? 'fallido' : 'pendiente'}</span></td>
                      <td>{getName(company)}</td>
                      <td>{getName(role, item.role_name || '-')}</td>
                      <td><StatusPill status={effectiveStatus} /></td>
                      <td>{item.expires_at || item.fecha_expiracion ? new Date(item.expires_at || item.fecha_expiracion).toLocaleString() : <span className={s.muted}>-</span>}</td>
                      <td>{getName(item.invited_by || item.enviado_por || item.created_by, '-')}</td>
                      <td>
                        <div className={s.actions}>
                          {['PENDING', 'EXPIRED', 'REVOKED'].includes(effectiveStatus) ? <button className={s.iconButton} title="Reenviar" type="button" onClick={() => resend(item.id)}><Send fontSize="small" /></button> : null}
                          {effectiveStatus === 'PENDING' ? <button className={s.iconButton} title="Revocar" type="button" onClick={() => revoke(item.id)}><Cancel fontSize="small" /></button> : null}
                          {effectiveStatus === 'ACCEPTED' ? <span className={s.muted}>Solo consulta</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr><td colSpan="7"><div className={s.message}>No hay invitaciones para mostrar.</div></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
