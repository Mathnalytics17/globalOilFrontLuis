import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { technicalConfigService } from '../../infrastructure/technicalConfigService';
import { apiErrorToText, configNav, styles } from '../components/technicalConfigUtils';

const EMPTY_EQUIPMENT = { codigo: '', nombre: '', descripcion: '', activo: true };
const EMPTY_METHOD = { equipo_prueba: '', codigo: '', nombre: '', norma_referencia: '', descripcion: '', activo: true };

export default function TechnicalEquipmentMethodsPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState([]);
  const [methods, setMethods] = useState([]);
  const [eqForm, setEqForm] = useState(EMPTY_EQUIPMENT);
  const [methodForm, setMethodForm] = useState(EMPTY_METHOD);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [editingEquipmentId, setEditingEquipmentId] = useState(null);
  const [editingMethodId, setEditingMethodId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const selectedEquipment = useMemo(() => equipment.find((e) => String(e.id) === String(selectedEquipmentId)), [equipment, selectedEquipmentId]);

  const load = async () => {
    setError('');
    try {
      const eq = await technicalConfigService.listTestEquipment();
      setEquipment(eq);
      const active = selectedEquipmentId || eq?.[0]?.id || '';
      setSelectedEquipmentId(active ? String(active) : '');
      const mt = await technicalConfigService.listEquipmentMethods(active ? { equipo_prueba: active } : {});
      setMethods(mt);
    } catch (e) { setError(apiErrorToText(e)); }
  };

  const loadMethods = async (equipmentId) => {
    try { setMethods(await technicalConfigService.listEquipmentMethods(equipmentId ? { equipo_prueba: equipmentId } : {})); }
    catch (e) { setError(apiErrorToText(e)); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadMethods(selectedEquipmentId); setMethodForm((m) => ({ ...m, equipo_prueba: selectedEquipmentId })); }, [selectedEquipmentId]);

  const saveEquipment = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      const created = editingEquipmentId
        ? await technicalConfigService.updateTestEquipment(editingEquipmentId, eqForm)
        : await technicalConfigService.createTestEquipment(eqForm);
      setOk(editingEquipmentId ? 'Equipo actualizado.' : 'Equipo de prueba creado. Ahora puede asignarle métodos.');
      setEqForm(EMPTY_EQUIPMENT);
      setEditingEquipmentId(null);
      await load();
      setSelectedEquipmentId(String(created.id));
    } catch (e) { setError(apiErrorToText(e)); }
  };

  const saveMethod = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      const payload = { ...methodForm, equipo_prueba: selectedEquipmentId || methodForm.equipo_prueba };
      if (editingMethodId) await technicalConfigService.updateEquipmentMethod(editingMethodId, payload);
      else await technicalConfigService.createEquipmentMethod(payload);
      setOk(editingMethodId ? 'Método actualizado.' : 'Método creado para el equipo seleccionado.');
      setMethodForm({ ...EMPTY_METHOD, equipo_prueba: selectedEquipmentId });
      setEditingMethodId(null);
      await loadMethods(selectedEquipmentId);
    } catch (e) { setError(apiErrorToText(e)); }
  };

  const changeEquipmentStatus = async (item) => {
    try {
      if (item.activo === false) await technicalConfigService.restoreEquipment(item.id);
      else await technicalConfigService.deleteEquipment(item.id);
      setOk(item.activo === false ? 'Equipo reactivado.' : 'Equipo desactivado.');
      await load();
    } catch (e) { setError(apiErrorToText(e)); }
  };

  const changeMethodStatus = async (item) => {
    try {
      if (item.activo === false) await technicalConfigService.restoreMethod(item.id);
      else await technicalConfigService.deleteMethod(item.id);
      setOk(item.activo === false ? 'Método reactivado.' : 'Método desactivado.');
      await loadMethods(selectedEquipmentId);
    } catch (e) { setError(apiErrorToText(e)); }
  };

  const visibleEquipment = showInactive ? equipment : equipment.filter((item) => item.activo !== false);
  const visibleMethods = showInactive ? methods : methods.filter((item) => item.activo !== false);

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <nav style={styles.nav}>{configNav.map(([label, href]) => <Link key={href} href={href} style={styles.navLink(router.pathname === href)}>{label}</Link>)}</nav>
        <div style={styles.hero}><div style={styles.iconBox}>EQ</div><div><h1 style={styles.h1}>Equipos de prueba y métodos</h1><p style={styles.sub}>Cree los equipos de medición usados en laboratorio y los métodos técnicos disponibles para cada uno.</p></div></div>
        {error ? <div style={styles.error}>{error}</div> : null}{ok ? <div style={styles.ok}>{ok}</div> : null}
        <div style={styles.twoCols}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>{editingEquipmentId ? 'Editar equipo de prueba' : 'Nuevo equipo de prueba'}</h2>
            <form onSubmit={saveEquipment}>
              <label style={styles.label}>Código</label><input style={styles.input} value={eqForm.codigo} onChange={(e) => setEqForm({ ...eqForm, codigo: e.target.value })} placeholder="Ej: VISC-01" required />
              <label style={styles.label}>Nombre</label><input style={styles.input} value={eqForm.nombre} onChange={(e) => setEqForm({ ...eqForm, nombre: e.target.value })} placeholder="Ej: Viscosímetro" required />
              <label style={styles.label}>Descripción</label><textarea style={styles.textarea} value={eqForm.descripcion} onChange={(e) => setEqForm({ ...eqForm, descripcion: e.target.value })} />
              <button style={{ ...styles.button, width: '100%', marginTop: 16 }} type="submit">{editingEquipmentId ? 'Guardar equipo' : 'Crear equipo'}</button>
            </form>
          </section>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Métodos del equipo</h2>
            <label style={styles.label}>Equipo</label><select style={styles.select} value={selectedEquipmentId} onChange={(e) => setSelectedEquipmentId(e.target.value)}><option value="">Seleccione...</option>{visibleEquipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.codigo} · {eq.nombre}</option>)}</select>
            {selectedEquipment ? <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button type="button" style={styles.buttonSecondary || styles.button} onClick={() => { setEditingEquipmentId(selectedEquipment.id); setEqForm({ codigo: selectedEquipment.codigo || '', nombre: selectedEquipment.nombre || '', descripcion: selectedEquipment.descripcion || '', activo: selectedEquipment.activo !== false }); }}>Editar equipo</button><button type="button" style={styles.buttonSecondary || styles.button} onClick={() => changeEquipmentStatus(selectedEquipment)}>{selectedEquipment.activo === false ? 'Reactivar equipo' : 'Desactivar equipo'}</button></div> : null}
            <form onSubmit={saveMethod}>
              <label style={styles.label}>Código método</label><input style={styles.input} value={methodForm.codigo} onChange={(e) => setMethodForm({ ...methodForm, codigo: e.target.value })} placeholder="Ej: ASTM D445" required />
              <label style={styles.label}>Nombre método</label><input style={styles.input} value={methodForm.nombre} onChange={(e) => setMethodForm({ ...methodForm, nombre: e.target.value })} placeholder="Ej: Viscosidad cinemática" required />
              <label style={styles.label}>Norma de referencia</label><input style={styles.input} value={methodForm.norma_referencia} onChange={(e) => setMethodForm({ ...methodForm, norma_referencia: e.target.value })} placeholder="Ej: ASTM D445" />
              <label style={styles.label}>Descripción</label><textarea style={styles.textarea} value={methodForm.descripcion} onChange={(e) => setMethodForm({ ...methodForm, descripcion: e.target.value })} />
              <button style={{ ...styles.button, width: '100%', marginTop: 16 }} type="submit">{editingMethodId ? 'Guardar método' : 'Crear método'}</button>
            </form>
          </section>
        </div>
        <section style={{ ...styles.card, marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h2 style={styles.cardTitle}>{selectedEquipment ? `Métodos de ${selectedEquipment.nombre}` : 'Métodos registrados'}</h2><label><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inactivos</label></div>
          <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Método</th><th style={styles.th}>Norma</th><th style={styles.th}>Equipo</th><th style={styles.th}>Estado</th><th style={styles.th}>Acciones</th></tr></thead><tbody>{visibleMethods.map((m) => <tr key={m.id}><td style={styles.td}><strong>{m.codigo}</strong><br />{m.nombre}</td><td style={styles.td}>{m.norma_referencia || '-'}</td><td style={styles.td}>{m.equipo_prueba_info?.nombre || m.equipo_prueba}</td><td style={styles.td}>{m.activo ? <span style={styles.badge}>Activo</span> : <span style={styles.badge}>Inactivo</span>}</td><td style={styles.td}><button type="button" onClick={() => { setEditingMethodId(m.id); setMethodForm({ equipo_prueba: m.equipo_prueba || selectedEquipmentId, codigo: m.codigo || '', nombre: m.nombre || '', norma_referencia: m.norma_referencia || '', descripcion: m.descripcion || '', activo: m.activo !== false }); }}>Editar</button> <button type="button" onClick={() => changeMethodStatus(m)}>{m.activo === false ? 'Reactivar' : 'Desactivar'}</button></td></tr>)}{!visibleMethods.length ? <tr><td style={styles.td} colSpan={5}>No hay métodos para este equipo.</td></tr> : null}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
