
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Block,
  Edit,
  LockOpen,
  Mail,
  RemoveRedEye,
  Security,
  VisibilityOff,
} from '@mui/icons-material';
import { securityService } from '../../infrastructure/securityService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { useAuth } from '@features/auth/application/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import s from '../components/Security.module.css';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';
import {
  BackLink,
  Drawer,
  SearchBox,
  StatusPill,
  getErrorMessage,
  getId,
  getList,
  getName,
  normalizeUser,
} from '../components/securityUi';

const emptyInvite = {
  email: '',
  empresa: '',
  role: '',
  first_name: '',
  last_name: '',
};

const getNumericId = (...values) => {
  for (const value of values) {
    const id = getId(value);
    if (id !== '' && !Number.isNaN(Number(id))) {
      return String(id);
    }
  }
  return '';
};

export default function SecurityUsersPage() {
  const { user, hasPermission } = useAuth();
  const global = isGlobalUser(user);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({ search: '', empresa: '', role: '', status: '' });
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [drawer, setDrawer] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const companyId = getNumericId(user?.empresa_id, user?.profile?.empresa_id, user?.profile?.empresa, user?.empresa);
  const canInvite = global || hasPermission('usuarios.invitar');
  const canBlock = global || hasPermission('usuarios.bloquear');
  const canUnblock = global || hasPermission('usuarios.desbloquear');

  const load = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, companiesData] = await Promise.all([
        securityService.users.list(filters),
        securityService.roles.assignable({ scope: global ? '' : 'COMPANY' }),
        global ? companiesService.list() : Promise.resolve([]),
      ]);
      setUsers(getList(usersData).map(normalizeUser));
      setRoles(getList(rolesData));
      setCompanies(getList(companiesData));
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleRoles = useMemo(() => {
    if (global) return roles;
    return roles.filter((role) => String(role.scope || role.tipo || '').toUpperCase() !== 'GLOBAL');
  }, [roles, global]);

  const filteredUsers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return users.filter((item) => {
      if (q && !`${item.displayName} ${item.displayEmail} ${item.companyName} ${item.roleName}`.toLowerCase().includes(q)) return false;
      if (filters.empresa && String(getId(item.empresa || item.company || item.profile?.empresa)) !== String(filters.empresa)) return false;
      if (filters.status && String(item.accessStatus).toUpperCase() !== String(filters.status).toUpperCase()) return false;
      if (filters.role && String(getId(item.profile?.role || item.security_role)) !== String(filters.role)) return false;
      return true;
    });
  }, [users, filters]);
  const { sortedRows, sort, requestSort } = useTableSort(
    filteredUsers,
    {
      usuario: (row) => row.displayName || row.displayEmail,
      empresa: (row) => row.companyName,
      rol: (row) => row.roleName,
      acceso: (row) => row.accessStatus,
      ultimo_acceso: (row) => row.last_login || row.ultimo_acceso,
    },
    { key: 'usuario', direction: 'asc' }
  );

  const openInvite = () => {
    setInviteForm({
      ...emptyInvite,
      empresa: global ? '' : companyId,
    });
    setDrawer('invite');
  };

  const submitInvite = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        email: inviteForm.email,
        role: inviteForm.role,
        security_role: inviteForm.role,
        first_name: inviteForm.first_name,
        last_name: inviteForm.last_name,
      };
      if (inviteForm.empresa && !Number.isNaN(Number(inviteForm.empresa))) {
        payload.empresa = inviteForm.empresa;
        payload.company = inviteForm.empresa;
      }
      await securityService.invitations.create(payload);
      toast.success('Invitación enviada.');
      setDrawer(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo enviar la invitación.'));
    }
  };

  const performAction = async (action) => {
    if (!selectedUser) return;
    try {
      if (action === 'block') await securityService.users.block(selectedUser.id, reason);
      if (action === 'unblock') await securityService.users.unblock(selectedUser.id);
      if (action === 'readonly') await securityService.users.readOnly(selectedUser.id, reason);
      if (action === 'restore') await securityService.users.restoreWrite(selectedUser.id);
      toast.success('Acción aplicada.');
      setDrawer(null);
      setSelectedUser(null);
      setReason('');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo aplicar la acción.'));
    }
  };

  const openAction = (item, action) => {
    setSelectedUser(item);
    setReason('');
    setDrawer(action);
  };

  const isBlocked = (item) => String(item?.accessStatus || '').toUpperCase() === 'BLOCKED';
  const isReadOnly = (item) => Boolean(item?.is_read_only) || String(item?.accessStatus || '').toUpperCase() === 'READ_ONLY';
  const isPending = (item) => ['PENDING_INVITATION', 'PENDING_ACTIVATION', 'PENDING'].includes(String(item?.accessStatus || '').toUpperCase());

  return (
    <main className={s.page}>
      <div className={s.scroll}>
        <section className={s.shell}>
          <BackLink href={global ? '/seguridad' : '/dashboard'}>
            {global ? 'Volver a seguridad' : 'Volver al panel'}
          </BackLink>

          <header className={s.header}>
            <div>
              <div className={s.kicker}>{global ? 'Seguridad' : 'Empresa'}</div>
              <h1 className={s.title}>{global ? 'Usuarios' : 'Usuarios de mi empresa'}</h1>
              <p className={s.subtitle}>
                {global
                  ? 'Gestiona usuarios, roles, bloqueos y acceso por empresa.'
                  : 'Invita y administra usuarios externos dentro de tu empresa.'}
              </p>
            </div>
            {canInvite ? (
              <button className={s.buttonPrimary} type="button" onClick={openInvite}>
                <Mail /> Invitar usuario
              </button>
            ) : null}
          </header>

          <div className={s.toolbar}>
            <SearchBox value={filters.search} onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))} placeholder="Buscar usuario, correo o empresa..." />
            <div className={s.filters}>
              {global ? (
                <select className={s.select} value={filters.empresa} onChange={(e) => setFilters((prev) => ({ ...prev, empresa: e.target.value }))}>
                  <option value="">Todas las empresas</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{getName(company)}</option>)}
                </select>
              ) : null}
              <select className={s.select} value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="PENDING_ACTIVATION">Pendiente</option>
                <option value="BLOCKED">Bloqueado</option>
                <option value="DISABLED">Inactivo</option>
              </select>
              <button type="button" className={s.buttonSecondary} onClick={load} disabled={loading}>Actualizar</button>
            </div>
          </div>

          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <SortableTableHeader columnKey="usuario" label="Usuario" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="empresa" label="Empresa" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="rol" label="Rol" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="acceso" label="Acceso" sort={sort} onSort={requestSort} />
                  <SortableTableHeader columnKey="ultimo_acceso" label="Último acceso" sort={sort} onSort={requestSort} />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.displayName}</strong>
                      <span className={s.small}>{item.displayEmail}</span>
                    </td>
                    <td>{item.companyName}</td>
                    <td>{item.roleName}</td>
                    <td>
                      <StatusPill status={item.accessStatus} />
                      {item.is_read_only ? <span className={s.small}>Solo lectura</span> : null}
                      {item.block_scope && item.block_scope !== 'NONE' ? <span className={s.small}>Bloqueo: {item.block_scope}</span> : null}
                    </td>
                    <td>{item.last_login ? new Date(item.last_login).toLocaleString() : <span className={s.muted}>Sin registro</span>}</td>
                    <td>
                      <div className={s.actions}>
                        <button className={s.iconButton} title="Ver detalle" type="button" onClick={() => { setSelectedUser(item); setDrawer('detail'); }}><RemoveRedEye fontSize="small" /></button>
                        {canBlock && !isBlocked(item) && !isPending(item) ? <button className={s.iconButton} title="Bloquear acceso" type="button" onClick={() => openAction(item, 'block')}><Block fontSize="small" /></button> : null}
                        {canUnblock && isBlocked(item) ? <button className={s.iconButton} title="Desbloquear acceso" type="button" onClick={() => openAction(item, 'unblock')}><LockOpen fontSize="small" /></button> : null}
                        {canBlock && !isReadOnly(item) && !isBlocked(item) && !isPending(item) ? <button className={s.iconButton} title="Pasar a solo lectura" type="button" onClick={() => openAction(item, 'readonly')}><VisibilityOff fontSize="small" /></button> : null}
                        {canUnblock && isReadOnly(item) ? <button className={s.iconButton} title="Restaurar escritura" type="button" onClick={() => openAction(item, 'restore')}><Edit fontSize="small" /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredUsers.length ? (
                  <tr><td colSpan="6"><div className={s.message}>No hay usuarios para mostrar.</div></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {drawer === 'invite' ? (
        <Drawer
          title="Invitar usuario"
          onClose={() => setDrawer(null)}
          footer={(
            <>
              <button className={s.buttonSecondary} type="button" onClick={() => setDrawer(null)}>Cancelar</button>
              <button className={s.buttonPrimary} type="submit" form="invite-user-form">Enviar invitación</button>
            </>
          )}
        >
          <form id="invite-user-form" className={s.form} onSubmit={submitInvite}>
            <div className={s.field}>
              <label>Correo <b>*</b></label>
              <input className={s.input} type="email" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} required />
              <span className={s.help}>El usuario recibirá un enlace de activación.</span>
            </div>
            {global ? (
              <div className={s.field}>
                <label>Empresa <b>*</b></label>
                <select className={s.select} value={inviteForm.empresa} onChange={(e) => setInviteForm((p) => ({ ...p, empresa: e.target.value }))} required>
                  <option value="">Seleccione empresa</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{getName(company)}</option>)}
                </select>
              </div>
            ) : null}
            <div className={s.field}>
              <label>Rol <b>*</b></label>
              <select className={s.select} value={inviteForm.role} onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))} required>
                <option value="">Seleccione rol</option>
                {visibleRoles.map((role) => <option key={role.id} value={role.id}>{role.nombre || role.name || role.code}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label>Nombre opcional</label>
              <input className={s.input} value={inviteForm.first_name} onChange={(e) => setInviteForm((p) => ({ ...p, first_name: e.target.value }))} />
            </div>
            <div className={s.field}>
              <label>Apellido opcional</label>
              <input className={s.input} value={inviteForm.last_name} onChange={(e) => setInviteForm((p) => ({ ...p, last_name: e.target.value }))} />
            </div>
          </form>
        </Drawer>
      ) : null}

      {['block', 'readonly'].includes(drawer) ? (
        <Drawer
          title={drawer === 'block' ? 'Bloquear usuario' : 'Pasar a solo lectura'}
          onClose={() => setDrawer(null)}
          footer={(
            <>
              <button className={s.buttonSecondary} type="button" onClick={() => setDrawer(null)}>Cancelar</button>
              <button className={s.buttonDanger} type="button" onClick={() => performAction(drawer)}>Confirmar</button>
            </>
          )}
        >
          <div className={s.form}>
            <p className={s.subtitle} style={{ fontSize: 15 }}>Usuario: {selectedUser?.displayEmail}</p>
            <div className={s.field}>
              <label>Motivo</label>
              <textarea className={s.textarea} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explique el motivo para auditoría." />
            </div>
          </div>
        </Drawer>
      ) : null}

      {['unblock', 'restore'].includes(drawer) ? (
        <Drawer
          title={drawer === 'unblock' ? 'Desbloquear usuario' : 'Restaurar escritura'}
          onClose={() => setDrawer(null)}
          footer={(
            <>
              <button className={s.buttonSecondary} type="button" onClick={() => setDrawer(null)}>Cancelar</button>
              <button className={s.buttonPrimary} type="button" onClick={() => performAction(drawer)}>Confirmar</button>
            </>
          )}
        >
          <p className={s.subtitle} style={{ fontSize: 15 }}>Se aplicará la acción sobre {selectedUser?.displayEmail}.</p>
        </Drawer>
      ) : null}

      {drawer === 'detail' ? (
        <Drawer title="Detalle de usuario" onClose={() => setDrawer(null)}>
          <div className={s.detailPanel}>
            <h3 style={{ marginTop: 0 }}>{selectedUser?.displayName}</h3>
            <p className={s.muted}>{selectedUser?.displayEmail}</p>
            <div className={s.detailGrid} style={{ gridTemplateColumns: '1fr' }}>
              <div className={s.detailItem}><span>Empresa</span>{selectedUser?.companyName}</div>
              <div className={s.detailItem}><span>Rol</span>{selectedUser?.roleName}</div>
              <div className={s.detailItem}><span>Estado</span><StatusPill status={selectedUser?.accessStatus} /></div>
              <div className={s.detailItem}><span>Permisos</span>{selectedUser?.permissions?.length || 0}</div>
            </div>
          </div>
        </Drawer>
      ) : null}
    </main>
  );
}
