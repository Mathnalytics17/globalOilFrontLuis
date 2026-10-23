
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Ban as Block, Eye as RemoveRedEye, EyeOff as VisibilityOff, Mail, Pencil as Edit, Trash2 as DeleteOutline, Unlock as LockOpen, UserPlus as PersonAddAlt } from 'lucide-react';
import { securityService } from '../../infrastructure/securityService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { useAuth } from '@features/auth/presentation/context/AuthContext';
import { isGlobalUser } from '@features/auth/application/sessionAccess';
import { HOME_OPTIONS } from '@features/auth/application/homeRoute';
import s from '../components/Security.module.css';
import DataTable from '@shared/ui/DataTable';
import useTableSort from '@shared/hooks/useTableSort';
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
  transfer_existing: false,
};

const DATA_SCOPE_OPTIONS = [
  { value: '', label: 'Heredar del rol' },
  { value: 'OWN_COMPANY', label: 'Solo su empresa' },
  { value: 'ALL_COMPANIES', label: 'Todas las empresas' },
  { value: 'ASSIGNED_COMPANIES', label: 'Empresas asignadas' },
  { value: 'GLOBAL_OIL_ONLY', label: 'Solo Global Oil' },
];

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
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', empresa: '', role: '', home_path: '', data_scope_override: '' });
  const [scopeAssignments, setScopeAssignments] = useState([]);
  const [assignedCompanyIds, setAssignedCompanyIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const companyId = getNumericId(user?.empresa_id, user?.profile?.empresa_id, user?.profile?.empresa, user?.empresa);
  const canInvite = global || hasPermission('usuarios.invitar');
  const canBlock = global || hasPermission('usuarios.bloquear');
  const canUnblock = global || hasPermission('usuarios.desbloquear');
  const canEdit = global || hasPermission('usuarios.editar');
  const canDeactivate = global || hasPermission('usuarios.eliminar');
  const canReinvite = global || hasPermission('usuarios.reenviar_invitacion');

  const load = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, companiesData] = await Promise.all([
        securityService.users.list(filters),
        securityService.roles.assignable({ scope: global ? '' : 'COMPANY' }),
        global ? companiesService.list({ include_internal: true }) : Promise.resolve([]),
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
  const selectedInviteCompany = useMemo(
    () => companies.find((company) => String(company.id) === String(inviteForm.empresa)),
    [companies, inviteForm.empresa]
  );
  const inviteRoles = useMemo(() => {
    if (!global) return visibleRoles.filter((role) => String(role.scope || role.tipo || '').toUpperCase() === 'COMPANY');
    if (!selectedInviteCompany) return [];
    const requiredScope = selectedInviteCompany.is_internal ? 'INTERNAL' : 'COMPANY';
    return visibleRoles.filter((role) => String(role.scope || role.tipo || '').toUpperCase() === requiredScope);
  }, [global, visibleRoles, selectedInviteCompany]);
  const editRoles = useMemo(() => {
    const selectedCompany = companies.find((company) => String(company.id) === String(editForm.empresa));
    const requiredScope = selectedCompany?.is_internal ? 'INTERNAL' : 'COMPANY';
    const scoped = global && selectedCompany
      ? visibleRoles.filter((role) => String(role.scope || role.tipo || '').toUpperCase() === requiredScope)
      : visibleRoles;
    const currentRoleId = getNumericId(selectedUser?.profile?.role, selectedUser?.profile?.role_id, selectedUser?.security_role);
    if (currentRoleId && !scoped.some((role) => String(role.id) === currentRoleId)) {
      return [{
        id: currentRoleId,
        name: selectedUser?.profile?.role_name || selectedUser?.roleName || 'Rol actual',
        scope: selectedUser?.profile?.role_scope,
      }, ...scoped];
    }
    return scoped;
  }, [companies, editForm.empresa, global, selectedUser, visibleRoles]);

  const filteredUsers = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return users.filter((item) => {
      if (q && !`${item.displayName} ${item.displayEmail} ${item.companyName} ${item.roleName}`.toLowerCase().includes(q)) return false;
      if (filters.empresa && String(getNumericId(item.empresa_id, item.empresa, item.company, item.profile?.empresa_id, item.profile?.empresa)) !== String(filters.empresa)) return false;
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
        transfer_existing: Boolean(global && inviteForm.transfer_existing),
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
      if (action === 'deactivate') await securityService.users.deactivate(selectedUser.id, reason);
      if (action === 'reactivate') await securityService.users.reactivate(selectedUser.id);
      if (action === 'reinvite') {
        await securityService.users.reinvite(selectedUser.id, {
          empresa: getNumericId(selectedUser.empresa_id, selectedUser.empresa, selectedUser.profile?.empresa_id, selectedUser.profile?.empresa),
          role: getNumericId(selectedUser.profile?.role, selectedUser.profile?.role_id, selectedUser.security_role),
          is_company_admin: Boolean(selectedUser.profile?.is_company_admin),
        });
      }
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
  const isDisabled = (item) => String(item?.accessStatus || '').toUpperCase() === 'DISABLED';

  const openEdit = (item) => {
    setSelectedUser(item);
    const override = item.data_scope_override || '';
    setEditForm({
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      phone: item.phone || '',
      empresa: getNumericId(item.empresa_id, item.empresa, item.company, item.profile?.empresa_id, item.profile?.empresa),
      role: getNumericId(item.profile?.role, item.profile?.role_id, item.security_role),
      home_path: item.home_path || '',
      data_scope_override: override,
    });
    setScopeAssignments([]);
    setAssignedCompanyIds((item.assigned_company_ids || []).map(String));
    if (global) {
      securityService.dataScopeCompanies.list({ user: item.id })
        .then((rows) => {
          const normalized = getList(rows);
          setScopeAssignments(normalized);
          setAssignedCompanyIds(normalized.map((row) => String(row.empresa_id || row.empresa?.id || row.empresa)));
        })
        .catch(() => toast.error('No se pudieron cargar las empresas asignadas.'));
    }
    setDrawer('edit');
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;
    try {
      await securityService.users.update(selectedUser.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        home_path: editForm.home_path,
        ...(global ? { data_scope_override: editForm.data_scope_override } : {}),
      });
      if (global) {
        const currentByCompany = new Map(scopeAssignments.map((row) => [String(row.empresa_id || row.empresa?.id || row.empresa), row]));
        const desired = new Set(assignedCompanyIds.map(String));
        await Promise.all([
          ...scopeAssignments.filter((row) => !desired.has(String(row.empresa_id || row.empresa?.id || row.empresa))).map((row) => securityService.dataScopeCompanies.remove(row.id)),
          ...assignedCompanyIds.filter((companyId) => !currentByCompany.has(String(companyId))).map((empresa) => securityService.dataScopeCompanies.create({ user: selectedUser.id, empresa })),
        ]);
      }
      const previousCompany = getNumericId(selectedUser.empresa_id, selectedUser.empresa, selectedUser.company, selectedUser.profile?.empresa_id, selectedUser.profile?.empresa);
      if (global && editForm.empresa && editForm.empresa !== previousCompany) {
        await securityService.users.reinvite(selectedUser.id, {
          empresa: editForm.empresa,
          role: editForm.role,
          is_company_admin: Boolean(selectedUser.profile?.is_company_admin),
        });
        toast.success('Datos actualizados. El cambio de empresa quedará activo cuando el usuario acepte la invitación.');
      } else {
        const profileId = getNumericId(selectedUser.profile?.id, selectedUser.company_profile?.id);
        if (profileId && editForm.role) await securityService.userProfiles.update(profileId, { role: editForm.role });
        toast.success('Usuario actualizado.');
      }
      setDrawer(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el usuario.'));
    }
  };

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

          <DataTable
            data={sortedRows}
            rowKey="id"
            pagination
            initialRowsPerPage={15}
            pageSizeOptions={[10, 15, 25, 50]}
            minWidth={980}
            sort={sort ? { field: sort.key, direction: sort.direction } : null}
            onSort={requestSort}
            emptyMessage={loading ? 'Cargando usuarios…' : 'No hay usuarios para mostrar.'}
            columns={[
              { id: 'usuario', label: 'Usuario', mobileTitle: true, render: (item) => <><strong>{item.displayName}</strong><span className={s.small}>{item.displayEmail}</span></> },
              { id: 'empresa', label: 'Empresa', render: (item) => item.companyName },
              { id: 'rol', label: 'Rol', render: (item) => item.roleName },
              { id: 'acceso', label: 'Acceso', render: (item) => <><StatusPill status={item.accessStatus} />{item.is_read_only ? <span className={s.small}>Solo lectura</span> : null}{item.block_scope && item.block_scope !== 'NONE' ? <span className={s.small}>Bloqueo: {item.block_scope}</span> : null}</> },
              { id: 'ultimo_acceso', label: 'Último acceso', minWidth: 170, render: (item) => item.last_login ? new Date(item.last_login).toLocaleString() : <span className={s.muted}>Sin registro</span> },
              {
                id: 'acciones',
                label: 'Acciones',
                sortable: false,
                mobileActions: true,
                minWidth: 250,
                render: (item) => (
                  <div className={s.actions}>
                    <button className={s.iconButton} title="Ver detalle" type="button" onClick={() => { setSelectedUser(item); setDrawer('detail'); }}><RemoveRedEye /></button>
                    {canEdit ? <button className={s.iconButton} title="Editar usuario" type="button" onClick={() => openEdit(item)}><Edit /></button> : null}
                    {canReinvite && (isPending(item) || isDisabled(item)) ? <button className={s.iconButton} title="Reinvitar usuario" type="button" onClick={() => openAction(item, 'reinvite')}><PersonAddAlt /></button> : null}
                    {canDeactivate && !isDisabled(item) && item.id !== user?.id ? <button className={s.iconButton} title="Desactivar cuenta" type="button" onClick={() => openAction(item, 'deactivate')}><DeleteOutline /></button> : null}
                    {canUnblock && isDisabled(item) ? <button className={s.iconButton} title="Reactivar cuenta" type="button" onClick={() => openAction(item, 'reactivate')}><LockOpen /></button> : null}
                    {canBlock && !isBlocked(item) && !isPending(item) ? <button className={s.iconButton} title="Bloquear acceso" type="button" onClick={() => openAction(item, 'block')}><Block /></button> : null}
                    {canUnblock && isBlocked(item) ? <button className={s.iconButton} title="Desbloquear acceso" type="button" onClick={() => openAction(item, 'unblock')}><LockOpen /></button> : null}
                    {canBlock && !isReadOnly(item) && !isBlocked(item) && !isPending(item) ? <button className={s.iconButton} title="Pasar a solo lectura" type="button" onClick={() => openAction(item, 'readonly')}><VisibilityOff /></button> : null}
                    {canUnblock && isReadOnly(item) ? <button className={s.iconButton} title="Restaurar escritura" type="button" onClick={() => openAction(item, 'restore')}><Edit /></button> : null}
                  </div>
                ),
              },
            ]}
          />
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
              <>
                <div className={s.field}>
                  <label>Empresa <b>*</b></label>
                  <select className={s.select} value={inviteForm.empresa} onChange={(e) => setInviteForm((p) => ({ ...p, empresa: e.target.value, role: '' }))} required>
                    <option value="">Seleccione empresa</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{getName(company)}{company.is_internal ? ' · interna' : ''}</option>)}
                  </select>
                  <span className={s.help}>{selectedInviteCompany?.is_internal ? 'Global Oil: aquí se asignan roles internos, como Laboratorista o Revisor.' : 'Empresa cliente: aquí se asignan únicamente roles de empresa.'}</span>
                </div>
                <label className={s.field}>
                  <span><input type="checkbox" checked={inviteForm.transfer_existing} onChange={(e) => setInviteForm((p) => ({ ...p, transfer_existing: e.target.checked }))} /> Reinvitar y transferir si ya existe</span>
                  <span className={s.help}>El cambio de empresa solo se aplicará cuando la persona acepte la invitación.</span>
                </label>
              </>
            ) : null}
            <div className={s.field}>
              <label>Rol <b>*</b></label>
              <select className={s.select} value={inviteForm.role} onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))} required disabled={global && !selectedInviteCompany}>
                <option value="">{global && !selectedInviteCompany ? 'Seleccione primero la empresa' : 'Seleccione rol'}</option>
                {inviteRoles.map((role) => <option key={role.id} value={role.id}>{role.nombre || role.name || role.code}</option>)}
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

      {drawer === 'edit' ? (
        <Drawer
          title="Editar usuario"
          onClose={() => setDrawer(null)}
          footer={(
            <>
              <button className={s.buttonSecondary} type="button" onClick={() => setDrawer(null)}>Cancelar</button>
              <button className={s.buttonPrimary} type="submit" form="edit-user-form">Guardar cambios</button>
            </>
          )}
        >
          <form id="edit-user-form" className={s.form} onSubmit={submitEdit}>
            <div className={s.field}><label>Nombre</label><input className={s.input} value={editForm.first_name} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} /></div>
            <div className={s.field}><label>Apellido</label><input className={s.input} value={editForm.last_name} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} /></div>
            <div className={s.field}><label>Teléfono</label><input className={s.input} value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            {global ? <div className={s.field}><label>Empresa</label><select className={s.select} value={editForm.empresa} onChange={(e) => setEditForm((p) => ({ ...p, empresa: e.target.value }))}>{companies.map((company) => <option key={company.id} value={company.id}>{getName(company)}</option>)}</select><span className={s.help}>Cambiar la empresa genera una invitación y solo se aplica cuando el usuario la acepta.</span></div> : null}
            <div className={s.field}><label>Rol</label><select className={s.select} value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}><option value="">Seleccione rol</option>{editRoles.map((role) => <option key={role.id} value={role.id}>{role.nombre || role.name || role.code}</option>)}</select><span className={s.help}>Se muestran los roles compatibles con la empresa actual del usuario.</span></div>
            {global ? <div className={s.field}><label>Alcance de datos</label><select className={s.select} value={editForm.data_scope_override} onChange={(e) => setEditForm((p) => ({ ...p, data_scope_override: e.target.value }))}>{DATA_SCOPE_OPTIONS.map((option) => <option key={option.value || 'inherit'} value={option.value}>{option.value ? option.label : `Heredar del rol (${selectedUser?.effective_data_scope || selectedUser?.profile?.role_data_scope || 'OWN_COMPANY'})`}</option>)}</select><span className={s.help}>Una excepción por usuario tiene prioridad sobre el alcance definido en su rol.</span></div> : null}
            {global && (editForm.data_scope_override === 'ASSIGNED_COMPANIES' || (!editForm.data_scope_override && selectedUser?.profile?.role_data_scope === 'ASSIGNED_COMPANIES')) ? <div className={s.field}><label>Empresas autorizadas</label><div className={s.checkList}>{companies.map((company) => { const companyId = String(company.id); return <label key={companyId} className={s.checkRow}><input type="checkbox" checked={assignedCompanyIds.includes(companyId)} onChange={(e) => setAssignedCompanyIds((current) => e.target.checked ? [...new Set([...current, companyId])] : current.filter((id) => id !== companyId))} />{getName(company)}</label>; })}</div><span className={s.help}>Puede asignar una o varias empresas sin alterar la empresa contractual del usuario.</span></div> : null}
            <div className={s.field}><label>Página de inicio</label><select className={s.select} value={editForm.home_path} onChange={(e) => setEditForm((p) => ({ ...p, home_path: e.target.value }))}>{HOME_OPTIONS.filter((option) => !option.globalOnly || isGlobalUser(selectedUser)).map((option) => <option key={option.value || 'automatic'} value={option.value}>{option.label}</option>)}</select><span className={s.help}>Si la página deja de estar permitida para el usuario, se aplicará el inicio automático de su rol.</span></div>
          </form>
        </Drawer>
      ) : null}

      {['block', 'readonly', 'deactivate'].includes(drawer) ? (
        <Drawer
          title={drawer === 'block' ? 'Bloquear usuario' : drawer === 'readonly' ? 'Pasar a solo lectura' : 'Desactivar cuenta'}
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

      {['unblock', 'restore', 'reactivate', 'reinvite'].includes(drawer) ? (
        <Drawer
          title={drawer === 'unblock' ? 'Desbloquear usuario' : drawer === 'restore' ? 'Restaurar escritura' : drawer === 'reactivate' ? 'Reactivar cuenta' : 'Reinvitar usuario'}
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
