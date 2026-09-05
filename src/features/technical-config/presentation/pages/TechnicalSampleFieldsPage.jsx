import { useEffect, useMemo, useState } from 'react';
import { Edit3, RefreshCw, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

import technicalConfigService from '../../infrastructure/technicalConfigService';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import styles from '../components/TechnicalConfig.module.css';
import { apiErrorToText, slugify } from '../components/technicalConfigUtils';

const emptyForm = {
  nombre_visible: '',
  codigo: '',
  tipo_muestra: 'aceite',
  catalogo: '',
  obligatorio: true,
  permite_desconocido: true,
  visible_en_ingreso: true,
  visible_en_asignacion: true,
  orden: 1,
  ayuda: '',
  activo: true,
};

const sampleKindOptions = [
  { value: 'aceite', label: 'Aceite' },
  { value: 'grasa', label: 'Grasa' },
  { value: 'ambos', label: 'Aceite y grasa' },
];

const getCatalogName = (field) =>
  field?.catalogo_info?.nombre || field?.catalogo_nombre || field?.catalogo?.nombre || field?.catalogo || '-';

export default function TechnicalSampleFieldsPage() {
  const [fields, setFields] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeCatalogs = useMemo(
    () => catalogs.filter((catalog) => catalog.activo !== false && !catalog.deleted_at),
    [catalogs]
  );

  const reload = async () => {
    setLoading(true);
    try {
      const [fieldList, catalogList] = await Promise.all([
        technicalConfigService.listSampleFields({ page_size: 1000 }),
        technicalConfigService.listCatalogs({ page_size: 1000 }),
      ]);
      setFields(fieldList);
      setCatalogs(catalogList);
    } catch (error) {
      toast.error(apiErrorToText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'nombre_visible' && !editingId ? { codigo: slugify(value) } : {}),
    }));
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const edit = (field) => {
    setEditingId(field.id);
    setForm({
      nombre_visible: field.nombre_visible || '',
      codigo: field.codigo || '',
      tipo_muestra: field.tipo_muestra || 'aceite',
      catalogo: field.catalogo || field.catalogo_info?.id || '',
      obligatorio: Boolean(field.obligatorio),
      permite_desconocido: field.permite_desconocido !== false,
      visible_en_ingreso: field.visible_en_ingreso !== false,
      visible_en_asignacion: field.visible_en_asignacion !== false,
      orden: Number(field.orden || 1),
      ayuda: field.ayuda || '',
      activo: field.activo !== false,
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.nombre_visible.trim() || !form.catalogo) {
      toast.warning('Nombre y catálogo son obligatorios.');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      codigo: slugify(form.codigo || form.nombre_visible),
      catalogo: Number(form.catalogo),
      orden: Math.max(1, Number(form.orden || 1)),
    };

    try {
      if (editingId) {
        await technicalConfigService.updateSampleField(editingId, payload);
        toast.success('Campo técnico actualizado.');
      } else {
        await technicalConfigService.createSampleField(payload);
        toast.success('Campo técnico creado.');
      }
      reset();
      await reload();
    } catch (error) {
      toast.error(apiErrorToText(error));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (field) => {
    if (!window.confirm(`¿Desactivar "${field.nombre_visible}"?`)) return;
    try {
      await technicalConfigService.deleteSampleField(field.id);
      toast.success('Campo técnico desactivado.');
      await reload();
    } catch (error) {
      toast.error(apiErrorToText(error));
    }
  };

  return (
    <TechnicalConfigShell
      title="Campos técnicos de muestra"
      subtitle="Define qué inputs aparecen al registrar aceites y grasas, y a qué catálogo pertenece cada uno."
      action={(
        <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={reload} disabled={loading}>
          <RefreshCw size={16} /> Recargar
        </button>
      )}
    >
      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.col5}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>{editingId ? 'Editar campo' : 'Nuevo campo'}</h2>
              <p className={styles.cardSubtitle}>El formulario de muestras se construye desde esta configuración.</p>
            </div>
          </div>

          <form className={styles.formGrid} onSubmit={submit}>
            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Nombre visible *</span>
              <input className={styles.input} value={form.nombre_visible} onChange={(e) => update('nombre_visible', e.target.value)} placeholder="Ej: Grado de viscosidad" />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Código</span>
              <input className={styles.input} value={form.codigo} onChange={(e) => update('codigo', e.target.value)} placeholder="grado_viscosidad" />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Aplica a</span>
              <select className={styles.select} value={form.tipo_muestra} onChange={(e) => update('tipo_muestra', e.target.value)}>
                {sampleKindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Catálogo asociado *</span>
              <select className={styles.select} value={form.catalogo} onChange={(e) => update('catalogo', e.target.value)}>
                <option value="">Seleccione catálogo</option>
                {activeCatalogs.map((catalog) => (
                  <option key={catalog.id} value={catalog.id}>{catalog.nombre}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Orden</span>
              <input className={styles.input} type="number" min="1" value={form.orden} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => update('orden', e.target.value)} />
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Ayuda</span>
              <textarea className={styles.textarea} value={form.ayuda} onChange={(e) => update('ayuda', e.target.value)} placeholder="Texto corto para orientar al usuario." />
            </label>

            {[
              ['obligatorio', 'Obligatorio'],
              ['permite_desconocido', 'Permite desconocido'],
              ['visible_en_ingreso', 'Visible en ingreso'],
              ['visible_en_asignacion', 'Visible en asignación'],
              ['activo', 'Activo'],
            ].map(([key, label]) => (
              <label key={key} className={`${styles.checkInline} ${styles.col6}`}>
                <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} />
                <span>{label}</span>
              </label>
            ))}

            <div className={`${styles.actions} ${styles.fieldFull}`}>
              <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={saving}>
                <Save size={16} /> {editingId ? 'Guardar cambios' : 'Crear campo'}
              </button>
              {editingId ? (
                <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={reset}>Cancelar</button>
              ) : null}
            </div>
          </form>
        </section>

        <section className={`${styles.card} ${styles.col7}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Campos configurados</h2>
              <p className={styles.cardSubtitle}>Estos son los inputs que verá el usuario al crear muestras.</p>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Tipo</th>
                  <th>Catálogo</th>
                  <th>Uso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fields.length ? fields.map((field) => (
                  <tr key={field.id}>
                    <td><strong>{field.nombre_visible}</strong><br /><small>{field.codigo}</small></td>
                    <td>{field.tipo_muestra}</td>
                    <td>{getCatalogName(field)}</td>
                    <td>
                      {field.obligatorio ? 'Obligatorio' : 'Opcional'}
                      <br />
                      <small>{field.permite_desconocido ? 'Permite desconocido' : 'No permite desconocido'}</small>
                    </td>
                    <td>
                      <span className={field.activo ? styles.badgeGreen : styles.badgeRed}>
                        {field.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => edit(field)} title="Editar">
                          <Edit3 size={15} />
                        </button>
                        <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={() => deactivate(field)} title="Desactivar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className={styles.empty}>No hay campos técnicos configurados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TechnicalConfigShell>
  );
}
