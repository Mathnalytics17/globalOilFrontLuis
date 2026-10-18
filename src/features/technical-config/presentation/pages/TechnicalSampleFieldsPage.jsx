import { appDialog } from '@shared/ui/AppDialogProvider';
import { useEffect, useMemo, useState } from 'react';
import { Pencil as Edit3, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import DataTable from '@shared/ui/DataTable';

import technicalConfigService from '../../infrastructure/technicalConfigService';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import styles from '../components/TechnicalConfig.module.css';
import pageStyles from './TechnicalSampleFieldsPage.module.css';
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

const behaviorOptions = [
  ['obligatorio', 'Obligatorio', 'El usuario deberá diligenciar este campo.'],
  ['permite_desconocido', 'Permite desconocido', 'Acepta un valor desconocido cuando aplique.'],
  ['visible_en_ingreso', 'Visible en ingreso', 'Se mostrará al registrar una muestra.'],
  ['visible_en_asignacion', 'Visible en asignación', 'Se mostrará durante la asignación.'],
  ['activo', 'Activo', 'El campo estará disponible para nuevos registros.'],
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (!await appDialog.confirm(`¿Desactivar "${field.nombre_visible}"?`)) return;
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
      action={null}
    >
      <div className={pageStyles.stack}>
        <section className={pageStyles.card}>
          <div className={pageStyles.cardHeader}>
            <div>
              <p className={pageStyles.kicker}>{editingId ? 'Edición de campo' : 'Nuevo campo'}</p>
              <h2 className={pageStyles.cardTitle}>{editingId ? 'Editar campo técnico' : 'Crear campo técnico'}</h2>
              <p className={pageStyles.cardSubtitle}>
                Configure primero la identidad del campo, luego dónde aplica y finalmente su comportamiento dentro del flujo de muestras.
              </p>
            </div>
            {editingId ? (
              <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={reset}>
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form className={pageStyles.form} onSubmit={submit}>
            <section className={pageStyles.section}>
              <div className={pageStyles.sectionHeader}>
                <span className={pageStyles.step}>1</span>
                <div>
                  <h3 className={pageStyles.sectionTitle}>Identidad del campo</h3>
                  <p className={pageStyles.sectionHelp}>Defina cómo verá y cómo reconocerá el sistema este dato.</p>
                </div>
              </div>

              <div className={pageStyles.fieldsGrid}>
                <label className={`${pageStyles.field} ${pageStyles.fieldWide}`}>
                  <span className={pageStyles.label}>Nombre visible *</span>
                  <input
                    className={pageStyles.input}
                    value={form.nombre_visible}
                    onChange={(e) => update('nombre_visible', e.target.value)}
                    placeholder="Ej: Grado de viscosidad"
                  />
                </label>

                <label className={`${pageStyles.field} ${pageStyles.fieldSmall}`}>
                  <span className={pageStyles.label}>Orden</span>
                  <input
                    className={pageStyles.input}
                    type="number"
                    min="1"
                    value={form.orden}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => update('orden', e.target.value)}
                  />
                </label>

                <label className={`${pageStyles.field} ${pageStyles.fieldFull}`}>
                  <span className={pageStyles.label}>Código</span>
                  <input
                    className={pageStyles.input}
                    value={form.codigo}
                    onChange={(e) => update('codigo', e.target.value)}
                    placeholder="grado_viscosidad"
                  />
                </label>
              </div>
            </section>

            <section className={pageStyles.section}>
              <div className={pageStyles.sectionHeader}>
                <span className={pageStyles.step}>2</span>
                <div>
                  <h3 className={pageStyles.sectionTitle}>Aplicación y catálogo</h3>
                  <p className={pageStyles.sectionHelp}>Indique para qué muestras aplica y de dónde toma sus valores.</p>
                </div>
              </div>

              <div className={pageStyles.fieldsGrid}>
                <label className={pageStyles.field}>
                  <span className={pageStyles.label}>Aplica a</span>
                  <select className={pageStyles.select} value={form.tipo_muestra} onChange={(e) => update('tipo_muestra', e.target.value)}>
                    {sampleKindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>

                <label className={pageStyles.field}>
                  <span className={pageStyles.label}>Catálogo asociado *</span>
                  <select className={pageStyles.select} value={form.catalogo} onChange={(e) => update('catalogo', e.target.value)}>
                    <option value="">Seleccione catálogo</option>
                    {activeCatalogs.map((catalog) => (
                      <option key={catalog.id} value={catalog.id}>{catalog.nombre}</option>
                    ))}
                  </select>
                </label>

                <label className={`${pageStyles.field} ${pageStyles.fieldFull}`}>
                  <span className={pageStyles.label}>Ayuda para el usuario</span>
                  <textarea
                    className={pageStyles.textarea}
                    value={form.ayuda}
                    onChange={(e) => update('ayuda', e.target.value)}
                    placeholder="Texto corto para orientar al usuario."
                  />
                </label>
              </div>
            </section>

            <section className={pageStyles.section}>
              <div className={pageStyles.sectionHeader}>
                <span className={pageStyles.step}>3</span>
                <div>
                  <h3 className={pageStyles.sectionTitle}>Comportamiento</h3>
                  <p className={pageStyles.sectionHelp}>Controle obligatoriedad, visibilidad y disponibilidad del campo.</p>
                </div>
              </div>

              <div className={pageStyles.toggleGrid}>
                {behaviorOptions.map(([key, label, help]) => (
                  <label key={key} className={pageStyles.toggleCard}>
                    <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} />
                    <span className={pageStyles.toggleText}>
                      <strong>{label}</strong>
                      <small>{help}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <div className={pageStyles.formActions}>
              {editingId ? (
                <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={reset}>
                  Cancelar
                </button>
              ) : null}
              <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={saving}>
                <Save size={16} /> {editingId ? 'Guardar cambios' : 'Crear campo'}
              </button>
            </div>
          </form>
        </section>

        <section className={pageStyles.card}>
          <div className={pageStyles.cardHeader}>
            <div>
              <p className={pageStyles.kicker}>Listado activo</p>
              <h2 className={pageStyles.cardTitle}>Campos configurados</h2>
              <p className={pageStyles.cardSubtitle}>Estos son los inputs que verá el usuario al crear muestras.</p>
            </div>
            <span className={pageStyles.countBadge}>{fields.length} {fields.length === 1 ? 'registro' : 'registros'}</span>
          </div>

          <div className={pageStyles.listBody}>
            <DataTable
              data={fields}
              rowKey="id"
              pagination
              searchable
              initialRowsPerPage={15}
              pageSizeOptions={[10, 15, 25, 50]}
              minWidth={760}
              emptyMessage={loading ? 'Cargando campos técnicos…' : 'No hay campos técnicos configurados.'}
              columns={[
                { id: 'nombre_visible', label: 'Campo', mobileTitle: true, minWidth: 180, render: (field) => <><strong>{field.nombre_visible}</strong><br /><small>{field.codigo}</small></> },
                { id: 'tipo_muestra', label: 'Tipo', minWidth: 110 },
                { id: 'catalogo', label: 'Catálogo', minWidth: 170, render: (field) => getCatalogName(field) },
                { id: 'uso', label: 'Uso', sortable: false, minWidth: 170, render: (field) => <>{field.obligatorio ? 'Obligatorio' : 'Opcional'}<br /><small>{field.permite_desconocido ? 'Permite desconocido' : 'No permite desconocido'}</small></> },
                { id: 'activo', label: 'Estado', minWidth: 100, render: (field) => <span className={field.activo ? styles.badgeGreen : styles.badgeRed}>{field.activo ? 'Activo' : 'Inactivo'}</span> },
                { id: 'acciones', label: 'Acciones', sortable: false, mobileActions: true, minWidth: 110, render: (field) => <div className={styles.actions}><button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => edit(field)} title="Editar"><Edit3 size={15} /></button><button type="button" className={`${styles.btn} ${styles.danger}`} onClick={() => deactivate(field)} title="Desactivar"><Trash2 size={15} /></button></div> },
              ]}
            />
          </div>
        </section>
      </div>
    </TechnicalConfigShell>
  );
}
