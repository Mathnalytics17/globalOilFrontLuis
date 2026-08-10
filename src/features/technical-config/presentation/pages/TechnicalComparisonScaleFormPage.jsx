import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowDown, ArrowUp, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import technicalConfigService from '../../infrastructure/technicalConfigService';
import { apiErrorToText } from '../components/technicalConfigUtils';
import styles from '../components/TechnicalConfig.module.css';

const slug = (value) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default function TechnicalComparisonScaleFormPage({ scaleId }) {
  const router = useRouter();
  const editing = Boolean(scaleId);
  const [form, setForm] = useState({ nombre: '', codigo: '', descripcion: '', activo: true });
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const [scale, values] = await Promise.all([technicalConfigService.getComparisonScale(scaleId), technicalConfigService.listComparisonScaleItems({ escala: scaleId, page_size: 1000 })]);
      setForm({ nombre: scale.nombre || '', codigo: scale.codigo || '', descripcion: scale.descripcion || '', activo: scale.activo !== false });
      setItems(values.sort((a, b) => Number(a.orden) - Number(b.orden)));
    } catch (error) { toast.error(apiErrorToText(error)); }
  };
  useEffect(() => { if (editing) load(); }, [scaleId]);
  const saveScale = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, codigo: form.codigo || slug(form.nombre) };
      const saved = editing ? await technicalConfigService.updateComparisonScale(scaleId, payload) : await technicalConfigService.createComparisonScale(payload);
      toast.success(editing ? 'Escala actualizada.' : 'Escala creada. Ahora agregue sus valores.');
      if (!editing) router.replace(`/configuracion-tecnica/escalas/edit/${saved.id}`); else await load();
    } catch (error) { toast.error(apiErrorToText(error)); } finally { setSaving(false); }
  };
  const addItem = async () => {
    if (!label.trim()) return toast.error('Escriba el valor de la escala.');
    try { await technicalConfigService.createComparisonScaleItem({ escala: scaleId, etiqueta: label.trim(), orden: items.length + 1, activo: true }); setLabel(''); await load(); }
    catch (error) { toast.error(apiErrorToText(error)); }
  };
  const remove = async (item) => { try { await technicalConfigService.deleteComparisonScaleItem(item.id); await load(); } catch (error) { toast.error(apiErrorToText(error)); } };
  const rename = async (item, value) => {
    const next = value.trim(); if (!next || next === item.etiqueta) return;
    try { await technicalConfigService.patchComparisonScaleItem(item.id, { etiqueta: next }); await load(); }
    catch (error) { toast.error(apiErrorToText(error)); }
  };
  const move = async (index, delta) => {
    const target = index + delta; if (target < 0 || target >= items.length) return;
    const ordered = [...items]; [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try { await technicalConfigService.reorderComparisonScaleItems({ escala: scaleId, items: ordered.map((item, position) => ({ id: item.id, orden: position + 1 })) }); await load(); }
    catch (error) { toast.error(apiErrorToText(error)); }
  };
  return <TechnicalConfigShell title={editing ? `Editar escala: ${form.nombre}` : 'Nueva escala'} subtitle="El orden define la jerarquía: primero es mejor o menor; último es peor o mayor.">
    <form className={styles.card} onSubmit={saveScale}><div className={styles.formGrid}><label>Nombre *<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required/></label><label>Código<input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Se genera automáticamente"/></label><label className={styles.fullWidth}>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}/></label><label><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })}/> Activa</label></div><button className={styles.primaryButton} disabled={saving}><Save size={17}/>{saving ? 'Guardando...' : 'Guardar escala'}</button></form>
    {editing && <section className={styles.card}><h2>Valores ordenados</h2><p>Ejemplo: Excelente, Bueno, Regular, Malo. El sistema compara por esta posición.</p><div className={styles.inlineForm}><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nuevo valor"/><button className={styles.primaryButton} type="button" onClick={addItem}>Agregar</button></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Orden</th><th>Valor</th><th>Acciones</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td><input className={styles.input} defaultValue={item.etiqueta} onBlur={(event) => rename(item, event.target.value)}/></td><td><div className={styles.inlineActions}><button title="Subir" onClick={() => move(index, -1)}><ArrowUp size={16}/></button><button title="Bajar" onClick={() => move(index, 1)}><ArrowDown size={16}/></button><button title="Eliminar" onClick={() => remove(item)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div></section>}
  </TechnicalConfigShell>;
}
