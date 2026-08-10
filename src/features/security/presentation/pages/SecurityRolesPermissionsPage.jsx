import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Add, Edit, KeyboardArrowLeft, KeyboardArrowRight, Refresh, RestartAlt, Save, Search } from '@mui/icons-material';
import RequirePermission from '@features/auth/presentation/RequirePermission';
import { securityService } from '../../infrastructure/securityService';
import s from '../components/Security.module.css';
import { BackLink, getErrorMessage, getList, getName } from '../components/securityUi';

const getCode = (permission) => permission.code || permission.codigo || permission.codename || permission.name;

const groupByModule = (permissions) =>
  permissions.reduce((groups, permission) => {
    const code = getCode(permission) || '';
    const module = permission.module || permission.modulo || code.split('.')[0] || 'general';
    if (!groups[module]) groups[module] = [];
    groups[module].push(permission);
    return groups;
  }, {});

const roleIsLocked = (role) =>
  role?.editable === false || role?.is_protected === true || role?.protected === true;

function SecurityRolesPermissionsContent() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [originalCodes, setOriginalCodes] = useState([]);
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rolesCollapsed, setRolesCollapsed] = useState(false);
  const [roleEditor, setRoleEditor] = useState(null);
  const [roleSaving, setRoleSaving] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === String(selectedRoleId)),
    [roles, selectedRoleId]
  );

  const modules = useMemo(() => {
    const unique = new Set(permissions.map((permission) => permission.module || getCode(permission)?.split('.')[0] || 'general'));
    return Array.from(unique).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return permissions.filter((permission) => {
      const code = getCode(permission) || '';
      const module = permission.module || code.split('.')[0] || 'general';
      const text = `${code} ${permission.description || ''} ${permission.name || ''} ${permission.nombre || ''} ${module}`.toLowerCase();
      if (moduleFilter && module !== moduleFilter) return false;
      if (needle && !text.includes(needle)) return false;
      return true;
    });
  }, [moduleFilter, permissions, query]);

  const grouped = useMemo(() => groupByModule(filteredPermissions), [filteredPermissions]);
  const changed = useMemo(
    () => selectedCodes.slice().sort().join('|') !== originalCodes.slice().sort().join('|'),
    [originalCodes, selectedCodes]
  );
  const locked = roleIsLocked(selectedRole);

  const load = async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        securityService.roles.list(),
        securityService.permissions.list(),
      ]);
      const roleList = getList(rolesData);
      setRoles(roleList);
      setPermissions(getList(permissionsData));
      if (!selectedRoleId && roleList.length) setSelectedRoleId(String(roleList[0].id));
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo cargar la matriz de permisos.'));
    } finally {
      setLoading(false);
    }
  };

  const loadRoleMatrix = async (roleId) => {
    if (!roleId) {
      setSelectedCodes([]);
      setOriginalCodes([]);
      return;
    }
    try {
      const matrix = await securityService.roles.roleMatrix(roleId);
      const codes =
        matrix.permission_codes ||
        matrix.permissions?.map((item) => (typeof item === 'string' ? item : getCode(item))) ||
        matrix.codes ||
        [];
      const clean = codes.filter(Boolean);
      setSelectedCodes(clean);
      setOriginalCodes(clean);
    } catch {
      const role = roles.find((item) => String(item.id) === String(roleId));
      const fallback =
        role?.permission_codes ||
        role?.permissions?.map((item) => (typeof item === 'string' ? item : getCode(item))) ||
        [];
      const clean = fallback.filter(Boolean);
      setSelectedCodes(clean);
      setOriginalCodes(clean);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadRoleMatrix(selectedRoleId); }, [selectedRoleId]);

  const togglePermission = (code) => {
    if (locked) return;
    setSelectedCodes((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code]
    );
  };

  const togglePermissionSet = (codes) => {
    if (locked || !selectedRoleId) return;
    const validCodes = codes.filter(Boolean);
    setSelectedCodes((current) => {
      const next = new Set(current);
      const allSelected = validCodes.every((code) => next.has(code));
      validCodes.forEach((code) => {
        if (allSelected) next.delete(code);
        else next.add(code);
      });
      return Array.from(next);
    });
  };

  const save = async () => {
    if (!selectedRoleId || locked) return;
    setSaving(true);
    try {
      await securityService.roles.updateMatrix(selectedRoleId, selectedCodes);
      toast.success('Matriz de permisos actualizada.');
      await loadRoleMatrix(selectedRoleId);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar la matriz.'));
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    try {
      await securityService.permissions.seedDefaults();
      toast.success('Permisos base sincronizados.');
      await load();
      if (selectedRoleId) await loadRoleMatrix(selectedRoleId);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron sincronizar los permisos.'));
    }
  };

  const openRoleEditor = (role = null) => setRoleEditor({
    id: role?.id || null,
    name: role?.name || role?.nombre || '',
    code: role?.code || role?.codigo || '',
    scope: role?.scope || 'COMPANY',
    description: role?.description || role?.descripcion || '',
    active: role?.active !== false,
  });

  const saveRole = async () => {
    if (!roleEditor?.name?.trim() || !roleEditor?.code?.trim()) {
      toast.warn('Nombre y código son obligatorios.');
      return;
    }
    setRoleSaving(true);
    try {
      const payload = {
        name: roleEditor.name.trim(),
        code: roleEditor.code.trim().toLowerCase().replace(/\s+/g, '-'),
        scope: roleEditor.scope,
        description: roleEditor.description.trim(),
        active: roleEditor.active,
        editable: true,
      };
      const saved = roleEditor.id
        ? await securityService.roles.update(roleEditor.id, payload)
        : await securityService.roles.create(payload);
      toast.success(roleEditor.id ? 'Rol actualizado.' : 'Rol creado.');
      setRoleEditor(null);
      await load();
      setSelectedRoleId(String(saved.id));
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el rol.'));
    } finally {
      setRoleSaving(false);
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
              <h1 className={s.title}>Roles y permisos</h1>
              <p className={s.subtitle}>Administra permisos por rol sin mezclar usuarios internos, empresas y Global Oil.</p>
            </div>
            <div className={s.actions}>
              <button className={s.buttonPrimary} type="button" onClick={() => openRoleEditor()}>
                <Add /> Nuevo rol
              </button>
              <button className={s.buttonSecondary} type="button" onClick={seed} disabled={loading}>
                <Refresh /> Sincronizar
              </button>
              <button className={s.buttonSecondary} type="button" onClick={() => setSelectedCodes(originalCodes)} disabled={!changed || locked}>
                <RestartAlt /> Restaurar
              </button>
              <button className={s.buttonPrimary} type="button" onClick={save} disabled={!selectedRoleId || locked || !changed || saving}>
                <Save /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </header>

          <div className={`${s.roleMatrixLayout} ${rolesCollapsed ? s.roleMatrixLayoutCollapsed : ""}`}>
            {!rolesCollapsed ? (
              <aside className={s.rolePanel}>
                <div className={s.panelTitleRow}>
                  <h2>Roles</h2>
                  <div className={s.panelTitleActions}>
                    <span>{roles.length}</span>
                    {selectedRole && !locked ? (
                      <button type="button" className={s.collapseButton} onClick={() => openRoleEditor(selectedRole)} title="Editar rol">
                        <Edit fontSize="small" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={s.collapseButton}
                      onClick={() => setRolesCollapsed(true)}
                      title="Ocultar roles"
                    >
                      <KeyboardArrowLeft fontSize="small" />
                    </button>
                  </div>
                </div>
                <div className={s.sideList}>
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      className={`${s.sideRow} ${String(selectedRoleId) === String(role.id) ? s.sideRowActive : ''}`}
                      type="button"
                      onClick={() => setSelectedRoleId(String(role.id))}
                    >
                      <span>
                        <strong>{role.nombre || role.name || role.code}</strong>
                        <span className={s.small}>{role.scope || role.tipo || 'COMPANY'} - {roleIsLocked(role) ? 'Protegido' : 'Editable'}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}

            <section className={s.permissionsPanel}>
              <div className={s.matrixSummary}>
                <div className={s.matrixSummaryText}>
                  {rolesCollapsed ? (
                    <button
                      type="button"
                      className={s.showRolesButton}
                      onClick={() => setRolesCollapsed(false)}
                    >
                      <KeyboardArrowRight fontSize="small" />
                      Mostrar roles
                    </button>
                  ) : null}
                  <h2>{getName(selectedRole, 'Seleccione un rol')}</h2>
                  <p>{selectedRole?.descripcion || selectedRole?.description || 'Seleccione los permisos efectivos para este rol.'}</p>
                </div>
                <div className={s.summaryPills}>
                  <span>{selectedCodes.length} activos</span>
                  <span>{permissions.length} disponibles</span>
                  {locked ? <span>Rol protegido</span> : changed ? <span>Cambios pendientes</span> : <span>Sin cambios</span>}
                </div>
              </div>

              <div className={s.matrixToolbar}>
                <label className={s.matrixSearch}>
                  <Search fontSize="small" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar permiso o código..." />
                </label>
                <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                  <option value="">Todos los módulos</option>
                  {modules.map((module) => <option value={module} key={module}>{module}</option>)}
                </select>
                <button
                  className={s.buttonSecondary}
                  type="button"
                  onClick={() => togglePermissionSet(filteredPermissions.map(getCode))}
                  disabled={!selectedRoleId || locked || !filteredPermissions.length}
                >
                  {filteredPermissions.every((permission) => selectedCodes.includes(getCode(permission)))
                    ? 'Quitar visibles'
                    : 'Seleccionar visibles'}
                </button>
              </div>

              <div className={s.matrix}>
                {Object.entries(grouped).map(([module, items]) => (
                  <div className={s.moduleGroup} key={module}>
                    <div className={s.moduleHeading}>
                      <h3 className={s.moduleTitle}>{module}</h3>
                      <button
                        className={s.moduleToggle}
                        type="button"
                        onClick={() => togglePermissionSet(items.map(getCode))}
                        disabled={!selectedRoleId || locked}
                      >
                        {items.every((permission) => selectedCodes.includes(getCode(permission)))
                          ? 'Quitar módulo'
                          : 'Seleccionar módulo'}
                      </button>
                    </div>
                    <div className={s.permissionGrid}>
                      {items.map((permission) => {
                        const code = getCode(permission);
                        return (
                          <label className={s.checkLabel} key={code}>
                            <input
                              type="checkbox"
                              checked={selectedCodes.includes(code)}
                              onChange={() => togglePermission(code)}
                              disabled={!selectedRoleId || locked}
                            />
                            <span>
                              <strong>{permission.nombre || permission.name || permission.description || code}</strong>
                              <span className={s.small}>{code}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!filteredPermissions.length ? (
                  <div className={s.message}>No hay permisos para los filtros actuales.</div>
                ) : null}
              </div>
            </section>
          </div>
          {roleEditor ? (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(0,0,0,.72)', display: 'grid', placeItems: 'center', padding: 20 }}>
              <section style={{ width: 'min(560px, 100%)', padding: 24, border: '1px solid rgba(255,255,255,.18)', borderRadius: 8, background: '#171717', boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
                <div className={s.panelTitleRow}>
                  <h2>{roleEditor.id ? 'Editar rol' : 'Nuevo rol'}</h2>
                  <button className={s.buttonGhost} type="button" onClick={() => setRoleEditor(null)}>Cerrar</button>
                </div>
                <div style={{ display: 'grid', gap: 14, margin: '18px 0' }}>
                  <label className={s.field}><b>Nombre</b><input className={s.input} value={roleEditor.name} onChange={(event) => setRoleEditor((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className={s.field}><b>Código</b><input className={s.input} value={roleEditor.code} onChange={(event) => setRoleEditor((current) => ({ ...current, code: event.target.value }))} /></label>
                  <label className={s.field}><b>Alcance</b><select className={s.select} value={roleEditor.scope} onChange={(event) => setRoleEditor((current) => ({ ...current, scope: event.target.value }))}><option value="COMPANY">Empresa</option><option value="INTERNAL">Interno</option><option value="GLOBAL">GlobalOil</option></select></label>
                  <label className={s.field}><b>Descripción</b><textarea className={s.textarea} value={roleEditor.description} onChange={(event) => setRoleEditor((current) => ({ ...current, description: event.target.value }))} /></label>
                </div>
                <div className={s.actions}>
                  <button className={s.buttonSecondary} type="button" onClick={() => setRoleEditor(null)}>Cancelar</button>
                  <button className={s.buttonPrimary} type="button" onClick={saveRole} disabled={roleSaving}><Save /> {roleSaving ? 'Guardando...' : 'Guardar rol'}</button>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function SecurityRolesPermissionsPage() {
  return (
    <RequirePermission permissionsAll={['permisos.ver_matriz', 'roles.ver']}>
      <SecurityRolesPermissionsContent />
    </RequirePermission>
  );
}
