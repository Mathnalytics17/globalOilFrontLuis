
import { appDialog } from '@shared/ui/AppDialogProvider';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCcw as Refresh, Send, XCircle as Cancel } from 'lucide-react';
import { securityService } from '../../infrastructure/securityService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { useAuth } from '@features/auth/presentation/context/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import DataTable from '@shared/ui/DataTable';
import useTableSort from '@shared/hooks/useTableSort';
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
  const companyName = (item) => item.empresa_nombre || getName(item.empresa_info || item.company_info || item.empresa || item.company);
  const roleName = (item) => item.role_name || getName(item.role_info || item.security_role_info || item.role || {}, '-');
  const senderName = (item) => item.invited_by_email || getName(item.invited_by || item.enviado_por || item.created_by, 'Sistema');

  const load = async () => {
    setLoading(true);
    try {
      const [invites, companyList] = await Promise.all([
        securityService.invitations.list(filters),
        global ? companiesService.list({ include_internal: true }) : Promise.resolve([]),
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
      const text = `${item.email} ${companyName(item)} ${roleName(item)} ${senderName(item)} ${item.status || item.estado}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filters.estado && String(item.status || item.estado).toUpperCase() !== String(filters.estado).toUpperCase()) return false;
      if (filters.empresa && String(getId(company)) !== String(filters.empresa)) return false;
      return true;
    });
  }, [items, filters]);

  const invitationSortColumns = useMemo(() => ({
    email: (item) => item.email,
    company: companyName,
    role: roleName,
    status: (item) => item.status || item.estado,
    expires: (item) => item.expires_at || item.fecha_expiracion,
    sender: senderName,
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
    if (!await appDialog.confirm('¿Revocar esta invitación? El enlace anterior dejará de funcionar.')) return;
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

          <DataTable
            data={sortedRows}
            rowKey="id"
            pagination
            initialRowsPerPage={15}
            pageSizeOptions={[10, 15, 25, 50]}
            minWidth={1040}
            sort={sort ? { field: sort.key, direction: sort.direction } : null}
            onSort={requestSort}
            emptyMessage={loading ? 'Cargando invitaciones…' : 'No hay invitaciones para mostrar.'}
            columns={[
              { id: 'email', label: 'Correo', mobileTitle: true, minWidth: 220, render: (item) => { const delivery = item.metadata?.email_delivery || {}; return <><strong>{item.email}</strong><span className={s.small}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span><span className={s.small}>Correo: {delivery.status === 'sent' ? 'enviado' : delivery.status === 'failed' ? 'fallido' : 'pendiente'}</span></>; } },
              { id: 'company', label: 'Empresa', render: companyName },
              { id: 'role', label: 'Rol', render: roleName },
              { id: 'status', label: 'Estado', render: (item) => { const raw = String(item.status || item.estado || '').toUpperCase(); const effective = raw === 'PENDING' && item.expires_at && new Date(item.expires_at) < new Date() ? 'EXPIRED' : raw; return <StatusPill status={effective} />; } },
              { id: 'expires', label: 'Vence', minWidth: 170, render: (item) => item.expires_at || item.fecha_expiracion ? new Date(item.expires_at || item.fecha_expiracion).toLocaleString() : <span className={s.muted}>-</span> },
              { id: 'sender', label: 'Enviado por', render: senderName },
              {
                id: 'acciones', label: 'Acciones', sortable: false, mobileActions: true, minWidth: 120,
                render: (item) => {
                  const raw = String(item.status || item.estado || '').toUpperCase();
                  const effective = raw === 'PENDING' && item.expires_at && new Date(item.expires_at) < new Date() ? 'EXPIRED' : raw;
                  return <div className={s.actions}>{['PENDING', 'EXPIRED', 'REVOKED'].includes(effective) ? <button className={s.iconButton} title="Reenviar" type="button" onClick={() => resend(item.id)}><Send /></button> : null}{effective === 'PENDING' ? <button className={s.iconButton} title="Revocar" type="button" onClick={() => revoke(item.id)}><Cancel /></button> : null}{effective === 'ACCEPTED' ? <span className={s.muted}>Solo consulta</span> : null}</div>;
                },
              },
            ]}
          />
        </section>
      </div>
    </main>
  );
}
