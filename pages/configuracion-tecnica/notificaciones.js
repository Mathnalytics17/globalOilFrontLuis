import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  Mail,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Save,
  Search,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';

import RequirePermission from '@features/auth/presentation/RequirePermission';
import operationalDashboardService from '@features/dashboard/infrastructure/operationalDashboardService';

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  active: true,
  email_enabled: true,
  in_app_enabled: false,
  send_time: '',
  frequency: 'event',
  roles: [],
  users: [],
  external_emails_text: '',
};

function normalizeTopic(topic = {}) {
  return {
    ...EMPTY_FORM,
    ...topic,
    roles: Array.isArray(topic.roles) ? topic.roles : [],
    users: (topic.users_info || []).map((item) => item.id),
    external_emails_text: Array.isArray(topic.external_emails) ? topic.external_emails.join('\n') : '',
    send_time: topic.send_time || '',
    in_app_enabled: false,
  };
}

function parseEmails(value) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function recipientCount(topic) {
  return (topic.resolved_recipients || []).length;
}

function NotificationsConfigPage() {
  const initialLoadStarted = useRef(false);
  const [topics, setTopics] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingTopic, setEditingTopic] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [query, setQuery] = useState('');

  const eventLabels = useMemo(
    () => Object.fromEntries(eventTypes.map((item) => [item.value, item.label])),
    [eventTypes],
  );

  const filteredTopics = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) return topics;
    return topics.filter((topic) => [topic.name, topic.description, topic.code, eventLabels[topic.code]]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('es').includes(needle)));
  }, [eventLabels, query, topics]);

  const load = async () => {
    setLoading(true);
    try {
      const [topicResult, roleResult, userResult, eventTypeResult] = await Promise.allSettled([
        operationalDashboardService.getNotificationTopics(),
        operationalDashboardService.getNotificationRoles(),
        operationalDashboardService.getNotificationUsers(),
        operationalDashboardService.getNotificationEventTypes(),
      ]);

      if (topicResult.status === 'rejected') throw topicResult.reason;

      setTopics(topicResult.value);
      setRoles(roleResult.status === 'fulfilled' ? roleResult.value : []);
      setUsers(userResult.status === 'fulfilled' ? userResult.value : []);
      setEventTypes(eventTypeResult.status === 'fulfilled' ? eventTypeResult.value : []);

      const unavailableOptions = [roleResult, userResult, eventTypeResult]
        .filter((result) => result.status === 'rejected').length;
      if (unavailableOptions) {
        toast.warn('Las reglas cargaron, pero algunas opciones auxiliares no están disponibles.');
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la configuración de notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    load();
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) setModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, saving]);

  const startCreate = () => {
    if (!eventTypes.length) {
      toast.warn('No se pudieron cargar los eventos. Recargue antes de crear una regla.');
      return;
    }
    const available = eventTypes.find((item) => item.implemented && !item.configured);
    if (!available) {
      toast.info('Todos los eventos disponibles ya tienen una regla.');
      return;
    }
    setEditingTopic(null);
    setForm({
      ...EMPTY_FORM,
      code: available.value,
      name: available.label,
      frequency: available.mode || 'event',
    });
    setModalOpen(true);
  };

  const startEdit = (topic) => {
    setEditingTopic(topic);
    setForm(normalizeTopic(topic));
    setModalOpen(true);
  };

  const resetModal = () => {
    setModalOpen(false);
    setEditingTopic(null);
    setForm(EMPTY_FORM);
  };

  const closeModal = () => {
    if (saving) return;
    resetModal();
  };

  const toggleListValue = (field, value) => {
    setForm((previous) => {
      const current = Array.isArray(previous[field]) ? previous[field] : [];
      return {
        ...previous,
        [field]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const save = async () => {
    if (!form.code || !form.name.trim()) {
      toast.warn('Seleccione el evento y escriba el nombre de la regla.');
      return;
    }
    if (!form.email_enabled) {
      toast.warn('Active el envío por email.');
      return;
    }
    if (form.frequency === 'daily' && !form.send_time) {
      toast.warn('Indique la hora en que debe enviarse el correo diario.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        active: form.active,
        email_enabled: form.email_enabled,
        in_app_enabled: false,
        send_time: form.send_time || null,
        name: form.name.trim(),
        description: form.description.trim(),
        frequency: form.frequency,
        roles: form.roles,
        users: form.users,
        external_emails: parseEmails(form.external_emails_text),
      };
      const updated = editingTopic
        ? await operationalDashboardService.updateNotificationTopic(editingTopic.id, payload)
        : await operationalDashboardService.createNotificationTopic({ ...payload, code: form.code });

      setTopics((previous) => editingTopic
        ? previous.map((item) => (item.id === updated.id ? updated : item))
        : [...previous, updated].sort((a, b) => a.name.localeCompare(b.name, 'es')));
      setEventTypes((previous) => previous.map((item) => (
        item.value === updated.code ? { ...item, configured: true } : item
      )));
      toast.success(editingTopic ? 'Regla actualizada.' : 'Regla creada.');
      resetModal();
    } catch (error) {
      console.error(error);
      const detail = error?.response?.data?.detail;
      toast.error(detail || 'No se pudo guardar la regla.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (topic) => {
    const nextActive = !topic.active;
    const action = nextActive ? 'reactivar' : 'desactivar';
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} la regla "${topic.name}"?`)) return;
    setSaving(true);
    try {
      const updated = await operationalDashboardService.updateNotificationTopic(topic.id, { active: nextActive });
      setTopics((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      if (editingTopic?.id === topic.id) {
        setEditingTopic(updated);
        setForm(normalizeTopic(updated));
      }
      toast.success(`Regla ${nextActive ? 'reactivada' : 'desactivada'}.`);
    } catch (error) {
      console.error(error);
      toast.error(`No se pudo ${action} la regla.`);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (topic) => {
    const recipients = topic.resolved_recipients || [];
    if (!recipients.length) {
      toast.warn('Edite la regla y agregue al menos un destinatario.');
      return;
    }
    if (!window.confirm(`Se enviará un correo de prueba a:\n\n${recipients.join('\n')}\n\n¿Continuar?`)) return;
    setTestingId(topic.id);
    try {
      const response = await operationalDashboardService.testNotificationTopic(topic.id);
      toast.success(`Prueba enviada a ${response.recipients.length} correo(s).`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo enviar el correo de prueba.');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <main className="page">
      <header className="pageHeader">
        <div>
          <Link href="/configuracion-tecnica" className="back">
            <ArrowLeft size={17} /> Configuración técnica
          </Link>
          <h1>Reglas de correo</h1>
          <p>Defina qué evento envía un correo, a quién se entrega y en qué momento.</p>
        </div>
        <div className="headerActions">
          <button type="button" className="secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={16} /> Recargar
          </button>
          <button type="button" className="primary" onClick={startCreate} disabled={loading}>
            <Plus size={17} /> Nueva regla
          </button>
        </div>
      </header>

      <section className="howItWorks">
        <strong>¿Cómo funciona?</strong>
        <span><b>1.</b> Elija el evento, por ejemplo “Nuevo lote ingresado”.</span>
        <span><b>2.</b> Seleccione “Equipo interno de Global Oil”, personas específicas o correos externos.</span>
        <span><b>3.</b> Guarde y use “Enviar prueba” para verificarlo inmediatamente.</span>
      </section>

      <section className="listPanel">
        <div className="listToolbar">
          <div>
            <h2>Reglas configuradas</h2>
            <span>{topics.length} regla{topics.length === 1 ? '' : 's'}</span>
          </div>
          <label className="searchBox">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o asunto"
            />
          </label>
        </div>

        {loading ? (
          <div className="emptyState">Cargando configuración...</div>
        ) : filteredTopics.length ? (
          <div className="topicTable">
            <div className="tableHead">
              <span>Regla</span>
              <span>Asunto operativo</span>
              <span>Canales</span>
              <span>Destinatarios</span>
              <span>Programación</span>
              <span>Estado</span>
              <span aria-hidden="true" />
            </div>
            {filteredTopics.map((topic) => (
              <article className="topicRow" key={topic.id}>
                <div className="topicIdentity">
                  <span className="topicIcon"><Bell size={17} /></span>
                  <span><strong>{topic.name}</strong><small>{topic.description || 'Sin descripción'}</small></span>
                </div>
                <div data-label="Asunto"><strong>{eventLabels[topic.code] || topic.code}</strong><small>{topic.code}</small></div>
                <div className="channelList" data-label="Canales">
                  {topic.email_enabled ? <span><Mail size={14} /> Email</span> : null}
                </div>
                <div className="recipientSummary" data-label="Destinatarios">
                  <strong>{recipientCount(topic)} correo{recipientCount(topic) === 1 ? '' : 's'} real{recipientCount(topic) === 1 ? '' : 'es'}</strong>
                  <small>{(topic.resolved_recipients || []).length
                    ? topic.resolved_recipients.join(', ')
                    : 'Sin destinatarios: no se enviará'}</small>
                </div>
                <div data-label="Programación">
                  <strong>{topic.frequency === 'daily' ? 'Diaria' : 'Por evento'}</strong>
                  <small>{topic.send_time ? <><Clock3 size={12} /> {String(topic.send_time).slice(0, 5)}</> : 'Sin hora fija'}</small>
                </div>
                <div data-label="Estado">
                  <span className={topic.active ? 'status active' : 'status inactive'}>
                    {topic.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className="rowActions">
                  <button type="button" className="editButton" onClick={() => startEdit(topic)} title="Editar evento y destinatarios">
                    <Pencil size={15} /> Editar
                  </button>
                  <button type="button" className="testButton" onClick={() => sendTest(topic)} disabled={testingId === topic.id || !topic.active || !topic.email_enabled} title="Enviar un correo de prueba ahora">
                    <Mail size={15} /> {testingId === topic.id ? 'Enviando...' : 'Enviar prueba'}
                  </button>
                  <button type="button" className={`iconButton ${topic.active ? 'dangerIcon' : 'activateIcon'}`} onClick={() => toggleActive(topic)} title={topic.active ? 'Desactivar regla' : 'Reactivar regla'}>
                    <Power size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <Bell size={24} />
            <strong>{query ? 'No hay coincidencias' : 'No hay reglas configuradas'}</strong>
            <span>{query ? 'Cambie el término de búsqueda.' : 'Cree la primera para asignar destinatarios a un asunto.'}</span>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="modalBackdrop" role="presentation" onMouseDown={closeModal}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="mail-list-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="modalHeader">
              <div>
                <span className="eyebrow">{editingTopic ? 'Editar configuración' : 'Nuevo asunto'}</span>
                <h2 id="mail-list-title">{editingTopic ? editingTopic.name : 'Crear regla de correo'}</h2>
                <p>Defina el evento y las direcciones exactas que recibirán el aviso.</p>
              </div>
              <button type="button" className="closeButton" onClick={closeModal} title="Cerrar"><X size={21} /></button>
            </header>

            <div className="modalBody">
              <section className="formSection">
                <h3>Identificación</h3>
                <div className="formGrid">
                  <label>
                    Asunto operativo
                    <select
                      value={form.code}
                      disabled={Boolean(editingTopic)}
                      onChange={(event) => {
                        const selectedEvent = eventTypes.find((item) => item.value === event.target.value);
                        setForm((previous) => ({
                          ...previous,
                          code: event.target.value,
                          name: selectedEvent?.label || previous.name,
                          frequency: selectedEvent?.mode || 'event',
                        }));
                      }}
                    >
                      <option value="">Seleccione un asunto</option>
                      {eventTypes.filter((item) => (item.implemented && !item.configured) || item.value === form.code).map((item) => (
                        <option key={item.value} value={item.value}>{item.label}{item.implemented ? '' : ' (pendiente de integración)'}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nombre visible
                    <input value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} />
                  </label>
                  <label className="fullWidth">
                    Descripción
                    <input value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
                  </label>
                </div>
              </section>

              <section className="formSection">
                <h3>Entrega</h3>
                <div className="deliveryGrid">
                  <label className="optionTile">
                    <input type="checkbox" checked={form.active} onChange={(event) => setForm((previous) => ({ ...previous, active: event.target.checked }))} />
                    <CheckCircle2 size={17} /><span><strong>Regla activa</strong><small>Permite enviar correos de este evento.</small></span>
                  </label>
                  <label className="optionTile">
                    <input type="checkbox" checked={form.email_enabled} onChange={(event) => setForm((previous) => ({ ...previous, email_enabled: event.target.checked }))} />
                    <Mail size={17} /><span><strong>Email</strong><small>Envía correo a destinatarios.</small></span>
                  </label>
                  <label className="compactField">
                    Frecuencia
                    <select value={form.frequency} disabled>
                      <option value="event">Por evento</option>
                      <option value="daily">Diaria</option>
                    </select>
                  </label>
                  <label className="compactField">
                    Hora de envío
                    <input type="time" disabled={form.frequency !== 'daily'} value={form.send_time || ''} onChange={(event) => setForm((previous) => ({ ...previous, send_time: event.target.value }))} />
                  </label>
                </div>
              </section>

              <section className="formSection">
                <h3>Destinatarios</h3>
                <div className="recipientGrid">
                  <div className="selectionBox">
                    <h4><Users size={16} /> Roles</h4>
                    {roles.length ? roles.map((role) => (
                      <label key={role.value} className="checkRow">
                        <input type="checkbox" checked={form.roles.includes(role.value)} onChange={() => toggleListValue('roles', role.value)} />
                        <span><strong>{role.label}</strong>{role.description ? <small>{role.description}</small> : null}</span>
                      </label>
                    )) : <span className="muted">No hay roles disponibles.</span>}
                  </div>
                  <div className="selectionBox">
                    <h4><Users size={16} /> Usuarios específicos</h4>
                    <div className="userScroll">
                      {users.length ? users.map((user) => (
                        <label key={user.id} className="checkRow userRow">
                          <input type="checkbox" checked={form.users.includes(user.id)} onChange={() => toggleListValue('users', user.id)} />
                          <span><strong>{user.name}</strong><small>{user.email}</small></span>
                        </label>
                      )) : <span className="muted">No hay usuarios disponibles.</span>}
                    </div>
                  </div>
                </div>
                <label className="emailField">
                  Correos externos
                  <textarea
                    value={form.external_emails_text}
                    onChange={(event) => setForm((previous) => ({ ...previous, external_emails_text: event.target.value }))}
                    placeholder={'correo@empresa.com\notro@empresa.com'}
                  />
                  <small>Ingrese un correo por línea o sepárelos con comas.</small>
                </label>
              </section>
            </div>

            <footer className="modalFooter">
              {editingTopic ? (
                <button type="button" className={editingTopic.active ? 'deleteButton' : 'activateButton'} onClick={() => toggleActive(editingTopic)} disabled={saving}>
                  <Power size={16} /> {editingTopic.active ? 'Desactivar' : 'Reactivar'}
                </button>
              ) : <span />}
              <div>
                <button type="button" className="secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
                <button type="button" className="primary" onClick={save} disabled={saving}>
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar regla'}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .page{min-height:100vh;color:#f6f6f6;padding:30px 38px 44px}.pageHeader{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:16px}.back{display:inline-flex;align-items:center;gap:7px;color:#c5c5c5;text-decoration:none;font-size:14px}.pageHeader h1{font-size:34px;font-weight:600;margin:14px 0 4px;letter-spacing:0}.pageHeader p,.modalHeader p{margin:0;color:#a8a8a8}.headerActions,.modalFooter>div,.rowActions{display:flex;align-items:center;gap:9px}button,input,select,textarea{font:inherit}.primary,.secondary,.deleteButton,.iconButton,.closeButton,.editButton,.testButton{border:1px solid #3b3b3b;border-radius:7px;color:#fff;background:#202020;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}.primary,.secondary,.deleteButton{height:40px;padding:0 14px;font-weight:700}.primary{background:#f5263b;border-color:#f5263b}.deleteButton{color:#ff9ba4;background:#291719;border-color:#6c272d}.primary:disabled,.secondary:disabled,.deleteButton:disabled,.testButton:disabled{opacity:.55;cursor:not-allowed}.howItWorks{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px;padding:13px 16px;border:1px solid #39404a;border-radius:8px;background:#191d22;color:#c8cdd4;font-size:12px}.howItWorks>strong{color:#fff}.howItWorks b{color:#ff5361}.listPanel{border:1px solid #343434;background:#171717;border-radius:8px;overflow:hidden}.listToolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:17px 18px;border-bottom:1px solid #333}.listToolbar h2{font-size:19px;margin:0 0 3px}.listToolbar span{color:#999;font-size:13px}.searchBox{width:min(360px,45%);height:40px;display:flex;align-items:center;gap:9px;border:1px solid #3b3b3b;background:#0d0d0d;border-radius:7px;padding:0 12px;color:#909090}.searchBox input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#fff}.tableHead,.topicRow{display:grid;grid-template-columns:minmax(190px,1.05fr) minmax(165px,.95fr) minmax(105px,.5fr) minmax(210px,1.25fr) minmax(105px,.55fr) 78px minmax(165px,.82fr);align-items:center;gap:12px}.tableHead{min-height:42px;padding:0 16px;background:#222;color:#bfc2c8;font-size:11px;font-weight:800;text-transform:uppercase}.topicRow{min-height:92px;padding:13px 16px;border-top:1px solid #2e2e2e}.topicRow:first-of-type{border-top:0}.topicRow>div{min-width:0}.topicIdentity{display:flex;align-items:center;gap:11px}.topicIdentity>span:last-child{min-width:0}.topicIcon{width:34px;height:34px;border-radius:6px;background:#2b1a1c;color:#ff5c68;display:grid;place-items:center;flex:0 0 auto}.topicRow strong,.topicRow small{display:block}.topicRow strong{font-size:13px;overflow:hidden;text-overflow:ellipsis}.topicRow small{font-size:11px;color:#969696;margin-top:4px;white-space:normal}.recipientSummary small{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;color:#b6bbc2}.topicRow small svg{vertical-align:-2px;margin-right:3px}.channelList{display:flex;flex-wrap:wrap;gap:5px}.channelList span,.status{display:inline-flex;align-items:center;gap:5px;border:1px solid #3b3b3b;border-radius:999px;padding:4px 7px;font-size:11px}.status.active{color:#72e7a0;border-color:#176d3a;background:#10281a}.status.inactive{color:#b8b8b8}.iconButton,.closeButton{width:35px;height:35px;padding:0;background:transparent}.editButton,.testButton{height:32px;padding:0 9px;font-size:11px;font-weight:800;white-space:nowrap}.testButton{border-color:#245a73;color:#9cdefb;background:#12232c}.rowActions{flex-wrap:wrap;justify-content:flex-end}.dangerIcon{color:#ff7882;border-color:#65282d}.emptyState{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#989898;text-align:center}.emptyState strong{color:#e8e8e8}.modalBackdrop{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:20px}.modal{width:min(920px,100%);max-height:min(880px,94vh);display:flex;flex-direction:column;background:#171717;border:1px solid #414141;border-radius:9px;box-shadow:0 28px 90px rgba(0,0,0,.6);overflow:hidden}.modalHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:19px 20px 17px;border-bottom:1px solid #343434}.modalHeader h2{font-size:24px;margin:5px 0 4px}.eyebrow{color:#ff5361;font-size:11px;font-weight:900;text-transform:uppercase}.modalBody{overflow:auto;padding:18px 20px}.formSection+ .formSection{border-top:1px solid #303030;margin-top:19px;padding-top:18px}.formSection h3{font-size:16px;margin:0 0 13px}.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.formGrid label,.compactField,.emailField{display:grid;gap:6px;color:#c7c7c7;font-size:12px;font-weight:700}.fullWidth{grid-column:1/-1}input,select,textarea{border:1px solid #3b3b3b;border-radius:7px;background:#0d0d0d;color:#fff;outline:none}input:focus,select:focus,textarea:focus{border-color:#ef4051}.formGrid input,.formGrid select,.compactField input,.compactField select{height:40px;padding:0 11px}.deliveryGrid{display:grid;grid-template-columns:repeat(2,minmax(160px,1fr)) repeat(2,minmax(130px,.72fr));gap:9px}.optionTile{min-height:60px;border:1px solid #353535;border-radius:7px;background:#202020;padding:9px;display:flex;align-items:center;gap:8px}.optionTile>input{accent-color:#f5263b}.optionTile span{min-width:0}.optionTile strong,.optionTile small,.checkRow span strong,.checkRow span small{display:block}.optionTile strong{font-size:12px}.optionTile small,.checkRow span small{font-size:10px;color:#969696;margin-top:2px}.recipientGrid{display:grid;grid-template-columns:.8fr 1.2fr;gap:12px}.selectionBox{border:1px solid #343434;border-radius:7px;padding:11px;background:#121212}.selectionBox h4{display:flex;align-items:center;gap:7px;margin:0 0 9px;font-size:13px}.checkRow{display:flex;align-items:center;gap:8px;min-height:34px;padding:5px 6px;border-radius:5px;color:#d1d1d1;font-size:12px}.checkRow:hover{background:#222}.checkRow input{accent-color:#f5263b}.userScroll{max-height:190px;overflow:auto}.userRow strong,.userRow small{display:block}.userRow small{color:#8f8f8f;font-size:10px}.emailField{margin-top:12px}.emailField textarea{min-height:72px;resize:vertical;padding:9px}.emailField small,.muted{color:#929292;font-weight:400}.modalFooter{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 20px;border-top:1px solid #343434;background:#141414}
        @media(max-width:1100px){.tableHead{display:none}.topicTable{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px}.topicRow{display:grid;grid-template-columns:1fr auto;gap:12px;border:1px solid #303030;border-radius:7px;min-height:0;padding:13px}.topicIdentity{grid-column:1/-1}.topicRow>div:not(.topicIdentity):not(.rowActions)::before{content:attr(data-label);display:block;color:#7f7f7f;font-size:9px;text-transform:uppercase;margin-bottom:3px}.channelList{align-self:start}.rowActions{grid-column:2;grid-row:2/5;flex-direction:column;justify-content:flex-start}.deliveryGrid{grid-template-columns:repeat(3,1fr)}.compactField{grid-column:span 1}}
        @media(max-width:760px){.page{padding:22px 14px 36px}.pageHeader{align-items:flex-start;flex-direction:column}.pageHeader h1{font-size:29px}.headerActions{width:100%}.headerActions button{flex:1}.listToolbar{align-items:flex-start;flex-direction:column}.searchBox{width:100%}.topicTable{grid-template-columns:1fr}.formGrid,.recipientGrid{grid-template-columns:1fr}.fullWidth{grid-column:auto}.deliveryGrid{grid-template-columns:1fr 1fr}.optionTile:first-child{grid-column:1/-1}.modalBackdrop{padding:8px}.modal{max-height:97vh}.modalHeader,.modalBody,.modalFooter{padding-left:14px;padding-right:14px}.modalFooter{align-items:stretch}.modalFooter,.modalFooter>div{flex-direction:column}.modalFooter button,.modalFooter>div{width:100%}.modalFooter>div button{width:100%}}
        .activateButton{height:40px;padding:0 14px;border:1px solid #176d3a;border-radius:7px;color:#72e7a0;background:#10281a;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700}.activateButton:disabled{opacity:.55;cursor:not-allowed}.activateIcon{color:#72e7a0;border-color:#176d3a}
      `}</style>
    </main>
  );
}

export default function ProtectedNotificationsConfigPage(props) {
  return (
    <RequirePermission permissionsAny={['config_tecnica.ver']}>
      <NotificationsConfigPage {...props} />
    </RequirePermission>
  );
}
