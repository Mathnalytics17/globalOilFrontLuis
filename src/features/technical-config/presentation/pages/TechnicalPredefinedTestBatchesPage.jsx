import { appDialog } from '@shared/ui/AppDialogProvider';
import { useEffect, useMemo, useState } from 'react';
import { Boxes, Layers, Pencil, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import MetricStrip from '@shared/ui/MetricStrip';
import OverflowMenu from '@shared/ui/OverflowMenu';
import DataTable from '@shared/ui/DataTable';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import styles from '../components/TechnicalConfig.module.css';
import { predefinedTestBatchesService } from '@features/technical-config/infrastructure/predefinedTestBatchesService';
import { testsService } from '@features/technical-config/infrastructure/testsService';
import { sampleManagementTypesService } from '@features/samples/infrastructure/sampleManagementTypesService';
import technicalConfigService from '../../infrastructure/technicalConfigService';

const emptyMeta = {
  nombre: '',
  descripcion: '',
  tipo_lote: 'personalizado',
  tipo_gestion: '',
  es_default: false,
  activo: true,
};

const newRow = () => ({
  key: `row_${Math.random().toString(36).slice(2)}`,
  prueba: '',
  condicion: '',
  condicion_texto: '',
  unidad: '',
});

const normalizeError = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
};

export default function TechnicalPredefinedTestBatchesPage() {
  const [bundles, setBundles] = useState([]);
  const [tests, setTests] = useState([]);
  const [types, setTypes] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [details, setDetails] = useState([newRow()]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [bundleList, testsList, typesList, conditionList] = await Promise.all([
        predefinedTestBatchesService.list({}),
        testsService.list({ activo: true }),
        sampleManagementTypesService.list({ activo: true }),
        technicalConfigService.listConditions({ activo: true }),
      ]);
      setBundles(bundleList);
      setTests(testsList);
      setTypes(typesList);
      setConditions(conditionList);
    } catch (err) {
      setError(normalizeError(err, 'No se pudieron cargar los lotes predefinidos de pruebas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setMeta(emptyMeta);
    setDetails([newRow()]);
    setMessage('');
    setError('');
  };

  const hydrateRowFromTest = (row, testId) => {
    const test = tests.find((item) => String(item.id) === String(testId));
    if (!test) return { ...row, prueba: testId };
    return {
      ...row,
      prueba: String(test.id),
      condicion: test.condicion_catalogo ? String(test.condicion_catalogo) : '',
      condicion_texto: test.condicion || test.condicion_catalogo_info?.nombre || '',
      unidad: (test.unidades_resultados || []).join(', ') || test.unidad_medida || '',
    };
  };

  const updateRow = (key, field, value) => {
    setDetails((prev) => prev.map((row) => {
      if (row.key !== key) return row;
      if (field === 'prueba') return hydrateRowFromTest(row, value);
      if (field === 'condicion') {
        const condition = conditions.find((item) => String(item.id) === String(value));
        return {
          ...row,
          condicion: value,
          condicion_texto: condition ? `${condition.nombre}${condition.unidad_info?.simbolo ? ` · ${condition.valor} ${condition.unidad_info.simbolo}` : ''}` : '',
        };
      }
      return { ...row, [field]: value };
    }));
  };

  const payload = useMemo(() => ({
    ...meta,
    tipo_gestion: meta.tipo_gestion || null,
    detalles: details.filter((row) => row.prueba).map((row, index) => ({
      prueba: Number(row.prueba),
      condicion: row.condicion ? Number(row.condicion) : null,
      condicion_texto: row.condicion_texto || null,
      unidad: row.unidad || null,
      orden: index + 1,
      activo: true,
    })),
  }), [meta, details]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!payload.detalles.length) throw new Error('Debes agregar al menos una prueba al lote.');
      if (editingId) {
        await predefinedTestBatchesService.update(editingId, payload);
        setMessage('Lote predefinido actualizado.');
      } else {
        await predefinedTestBatchesService.create(payload);
        setMessage('Lote predefinido creado.');
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err.message || normalizeError(err, 'No se pudo guardar el lote.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id) => {
    setError('');
    setMessage('');
    try {
      const bundle = await predefinedTestBatchesService.getById(id);
      setEditingId(bundle.id);
      setMeta({
        nombre: bundle.nombre || '',
        descripcion: bundle.descripcion || '',
        tipo_lote: bundle.tipo_lote || 'personalizado',
        tipo_gestion: bundle.tipo_gestion ? String(bundle.tipo_gestion) : '',
        es_default: !!bundle.es_default,
        activo: bundle.activo !== false,
      });
      setDetails(bundle.detalles?.length ? bundle.detalles.map((item) => ({
        key: `row_${item.id}`,
        prueba: item.prueba ? String(item.prueba) : '',
        condicion: item.condicion ? String(item.condicion) : '',
        condicion_texto: item.condicion_texto || '',
        unidad: item.unidad || '',
      })) : [newRow()]);
    } catch (err) {
      setError(normalizeError(err, 'No se pudo cargar el lote para edición.'));
    }
  };

  const handleDelete = async (bundle) => {
    if (!await appDialog.confirm(`¿Eliminar el lote predefinido ${bundle.nombre}?`)) return;
    try {
      await predefinedTestBatchesService.remove(bundle.id);
      if (editingId === bundle.id) resetForm();
      await load();
      setMessage('Lote predefinido eliminado.');
    } catch (err) {
      setError(normalizeError(err, 'No se pudo eliminar el lote.'));
    }
  };

  const counts = {
    total: bundles.length,
    gestion: bundles.filter((item) => item.tipo_lote === 'gestion').length,
    personalizados: bundles.filter((item) => item.tipo_lote === 'personalizado').length,
  };

  return (
    <TechnicalConfigShell
      title="Lotes predefinidos de pruebas"
      subtitle="Plantillas reutilizables para asignar conjuntos de pruebas de forma consistente."
      kicker="Plantillas de pruebas"
      action={null}
    >
      {error ? <div className={styles.alert}>{error}</div> : null}
      {message ? <div className={`${styles.alert} ${styles.success}`}>{message}</div> : null}

      <MetricStrip items={[
        { label: 'Total', value: counts.total, icon: Boxes },
        { label: 'Por gestión', value: counts.gestion, icon: Layers },
        { label: 'Personalizados', value: counts.personalizados, icon: Boxes },
      ]} />

      <section className="predefinedWorkspace">
        <article className={`${styles.card} predefinedEditorCard`}>
          <div className="editorHero">
            <div>
              <div className={styles.kicker}>{editingId ? 'Edición de plantilla' : 'Nueva plantilla'}</div>
              <h2>{editingId ? 'Editar lote predefinido' : 'Crear lote predefinido'}</h2>
              <p>Configure primero la identidad del lote y después agregue las pruebas que lo componen.</p>
            </div>
            <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={resetForm}>
              <Wand2 size={16} /> Nueva plantilla
            </button>
          </div>

          <form onSubmit={handleSubmit} className="predefinedForm">
            <section className="formSection">
              <div className="formSectionHeader">
                <span className="stepNumber">1</span>
                <div>
                  <h3>Información general</h3>
                  <p>Datos que permiten identificar la plantilla en el sistema.</p>
                </div>
              </div>

              <div className="metaGrid">
                <label className={`${styles.field} nameField`}>
                  <span className={styles.label}>Nombre *</span>
                  <input
                    className={styles.input}
                    value={meta.nombre}
                    onChange={(e) => setMeta({ ...meta, nombre: e.target.value })}
                    placeholder="Ej. Rutina mensual dragas"
                    required
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Descripción</span>
                  <textarea
                    className={`${styles.textarea} compactTextarea`}
                    value={meta.descripcion}
                    onChange={(e) => setMeta({ ...meta, descripcion: e.target.value })}
                    placeholder="Describa cuándo debe utilizarse esta plantilla"
                  />
                </label>
              </div>
            </section>

            <section className="formSection">
              <div className="formSectionHeader">
                <span className="stepNumber">2</span>
                <div>
                  <h3>Reglas de asignación</h3>
                  <p>Defina si la plantilla es general o está asociada a un tipo de gestión.</p>
                </div>
              </div>

              <div className="assignmentGrid">
                <label className={styles.field}>
                  <span className={styles.label}>Tipo de lote *</span>
                  <select className={styles.select} value={meta.tipo_lote} onChange={(e) => setMeta({ ...meta, tipo_lote: e.target.value })}>
                    <option value="gestion">Por gestión</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Tipo de gestión</span>
                  <select className={styles.select} value={meta.tipo_gestion} onChange={(e) => setMeta({ ...meta, tipo_gestion: e.target.value })}>
                    <option value="">No aplica</option>
                    {types.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </label>

                <label className="defaultToggle">
                  <input type="checkbox" checked={meta.es_default} onChange={(e) => setMeta({ ...meta, es_default: e.target.checked })} />
                  <span>
                    <strong>Usar como lote por defecto</strong>
                    <small>Se propondrá automáticamente para la gestión seleccionada.</small>
                  </span>
                </label>
              </div>
            </section>

            <section className="formSection testsSection">
              <div className="formSectionHeader testsHeader">
                <div className="sectionIdentity">
                  <span className="stepNumber">3</span>
                  <div>
                    <h3>Pruebas incluidas</h3>
                    <p>Organice las pruebas y condiciones que compondrán este lote.</p>
                  </div>
                </div>
                <div className="testsActions">
                  <span className="testsCount">{details.length} {details.length === 1 ? 'prueba' : 'pruebas'}</span>
                  <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => setDetails((prev) => [...prev, newRow()])}>
                    <Plus size={16} /> Agregar prueba
                  </button>
                </div>
              </div>

              <div className="detailRows">
                {details.map((row, index) => (
                  <div key={row.key} className="detailRow">
                    <div className="detailRowHeader">
                      <div className="detailTitle">
                        <span className="detailIndex">{index + 1}</span>
                        <div>
                          <strong>Prueba {index + 1}</strong>
                          <small>{row.prueba ? 'Configuración incluida en la plantilla' : 'Seleccione una variable para continuar'}</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => setDetails((prev) => prev.length === 1 ? [newRow()] : prev.filter((item) => item.key !== row.key))}
                        aria-label={`Eliminar prueba ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="detailRowGrid">
                      <label>
                        <span>Variable</span>
                        <select value={row.prueba} onChange={(e) => updateRow(row.key, 'prueba', e.target.value)}>
                          <option value="">Seleccione una prueba</option>
                          {tests.map((item) => <option key={item.id} value={item.id}>{item.acronimo} · {item.nombre_variable}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Condición</span>
                        <select value={row.condicion} onChange={(e) => updateRow(row.key, 'condicion', e.target.value)}>
                          <option value="">Sin condición</option>
                          {conditions.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.valor} {item.unidad_info?.simbolo}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Unidad</span>
                        <input value={row.unidad} readOnly placeholder="Tomada de la prueba" />
                      </label>
                      <label>
                        <span>Texto de condición</span>
                        <input value={row.condicion_texto} onChange={(e) => updateRow(row.key, 'condicion_texto', e.target.value)} placeholder="Ej. 40 °C, 100 °C..." />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="formFooter">
              <div className="formFooterCopy">
                <strong>{editingId ? 'Edición en curso' : 'Plantilla nueva'}</strong>
                <span>{editingId ? 'Guarde para aplicar los cambios a esta plantilla.' : 'Revise las pruebas antes de crear el lote.'}</span>
              </div>
              <div className={styles.actions}>
                {editingId ? <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={resetForm}>Cancelar edición</button> : null}
                <button className={`${styles.btn} ${styles.primary}`} disabled={saving} type="submit">
                  <Save size={16} /> {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear lote'}
                </button>
              </div>
            </div>
          </form>
        </article>

        <article className={`${styles.card} predefinedListCard`}>
          <div className="listHeader">
            <div>
              <div className={styles.kicker}>Plantillas disponibles</div>
              <h2>Listado de lotes predefinidos</h2>
              <p>Consulte, edite o elimine las plantillas existentes.</p>
            </div>
            <span className="recordCount">{bundles.length} {bundles.length === 1 ? 'registro' : 'registros'}</span>
          </div>

          {loading ? <div className={styles.empty}>Cargando plantillas de pruebas...</div> : (
            <DataTable
              data={bundles}
              pagination
              minWidth={760}
              emptyMessage="No hay lotes creados todavía."
              columns={[
                {
                  id: 'nombre',
                  label: 'Nombre',
                  mobileTitle: true,
                  minWidth: 220,
                  render: (bundle) => (
                    <div>
                      <strong>{bundle.nombre}</strong>
                      <div className={styles.help}>{bundle.es_default ? 'Lote por defecto' : bundle.descripcion || 'Plantilla personalizada'}</div>
                    </div>
                  ),
                },
                { id: 'tipo_lote', label: 'Tipo', minWidth: 130 },
                { id: 'tipo_gestion_nombre', label: 'Gestión', minWidth: 150, render: (bundle) => bundle.tipo_gestion_nombre || 'No aplica' },
                { id: 'total_pruebas', label: '# pruebas', width: 100, render: (bundle) => bundle.total_pruebas || 0 },
                {
                  id: 'activo',
                  label: 'Estado',
                  width: 110,
                  render: (bundle) => <span className={bundle.activo !== false ? styles.badgeGreen : styles.badgeRed}>{bundle.activo !== false ? 'Activo' : 'Inactivo'}</span>,
                },
                {
                  id: 'acciones',
                  label: 'Acciones',
                  sortable: false,
                  searchable: false,
                  mobileHidden: true,
                  width: 84,
                  render: (bundle) => <OverflowMenu items={[
                    { label: 'Editar', icon: Pencil, onClick: () => handleEdit(bundle.id) },
                    { label: 'Eliminar', icon: Trash2, danger: true, onClick: () => handleDelete(bundle) },
                  ]} />,
                },
              ]}
            />
          )}
        </article>
      </section>

      <style jsx global>{`
        .predefinedWorkspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; width: 100%; max-width: 100%; min-width: 0; overflow: hidden; }
        .predefinedEditorCard, .predefinedListCard { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden; }
        .predefinedForm, .formSection, .detailRows, .detailRow { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; }
        .predefinedEditorCard input, .predefinedEditorCard select, .predefinedEditorCard textarea, .predefinedListCard input, .predefinedListCard select { max-width: 100%; min-width: 0; box-sizing: border-box; }
        .predefinedListCard :global(.dataTableWrap), .predefinedListCard :global(.tableWrap) { max-width: 100%; min-width: 0; overflow-x: auto; overscroll-behavior-inline: contain; }
        .editorHero, .listHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,.07); }
        .editorHero h2, .listHeader h2 { margin: 5px 0 4px; font-size: 20px; }
        .editorHero p, .listHeader p { margin: 0; color: #9ea3ad; font-size: 13px; line-height: 1.5; }
        .predefinedForm { display: grid; gap: 16px; padding-top: 16px; }
        .formSection { border: 1px solid rgba(255,255,255,.075); border-radius: 10px; background: rgba(255,255,255,.018); padding: 16px; }
        .formSectionHeader { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .formSectionHeader h3 { margin: 0 0 3px; font-size: 15px; color: #f4f4f5; }
        .formSectionHeader p { margin: 0; color: #9197a1; font-size: 12px; line-height: 1.45; }
        .stepNumber, .detailIndex { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex: 0 0 auto; background: rgba(239,35,42,.1); border: 1px solid rgba(239,35,42,.28); color: #ff7075; font-size: 12px; font-weight: 800; }
        .metaGrid { display: grid; grid-template-columns: minmax(260px,.8fr) minmax(360px,1.2fr); gap: 14px; align-items: start; }
        .compactTextarea { min-height: 76px !important; resize: vertical; }
        .assignmentGrid { display: grid; grid-template-columns: minmax(220px,.7fr) minmax(260px,.9fr) minmax(340px,1.2fr); gap: 14px; align-items: stretch; }
        .assignmentGrid > *, .metaGrid > * { min-width: 0; }
        .defaultToggle { display: flex; align-items: center; gap: 12px; min-height: 62px; padding: 11px 13px; border: 1px solid #353840; border-radius: 8px; background: #141518; cursor: pointer; }
        .defaultToggle input { width: 18px; height: 18px; flex: 0 0 auto; }
        .defaultToggle span { display: grid; gap: 2px; }
        .defaultToggle strong { font-size: 13px; color: #f3f4f6; }
        .defaultToggle small { font-size: 11px; color: #8f959f; line-height: 1.35; }
        .testsHeader { justify-content: space-between; }
        .sectionIdentity, .testsActions { display: flex; align-items: center; gap: 12px; }
        .testsCount, .recordCount { border: 1px solid #353840; border-radius: 999px; padding: 5px 9px; color: #aeb3bc; font-size: 11px; white-space: nowrap; }
        .detailRows { display: grid; gap: 10px; }
        .detailRow { border: 1px solid rgba(255,255,255,.075); border-radius: 9px; padding: 14px; background: #151619; }
        .detailRowHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 13px; }
        .detailTitle { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .detailTitle > div { display: grid; gap: 2px; min-width: 0; }
        .detailTitle strong { font-size: 13px; }
        .detailTitle small { color: #878d97; font-size: 11px; }
        .detailRowGrid { display: grid; grid-template-columns: minmax(220px,1.25fr) minmax(210px,1fr) minmax(150px,.65fr) minmax(220px,1fr); gap: 10px; }
        .detailRowGrid label { display: grid; gap: 5px; min-width: 0; color: #b8bdc5; font-size: 11px; font-weight: 650; }
        .detailRowGrid input, .detailRowGrid select { width: 100%; min-width: 0; min-height: 38px; border-radius: 7px; border: 1px solid var(--go-border-strong); background: #111216; color: white; padding: 0 10px; font-size: 12px; box-sizing: border-box; }
        .detailRowGrid input:focus, .detailRowGrid select:focus { outline: none; border-color: #595f68; box-shadow: 0 0 0 2px rgba(255,255,255,.035); }
        .detailRowGrid input[readonly] { color: #aeb4bd; background: #121317; }
        .formFooter { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 2px; }
        .formFooterCopy { display: grid; gap: 2px; }
        .formFooterCopy strong { font-size: 12px; color: #f2f3f5; }
        .formFooterCopy span { font-size: 11px; color: #878d96; }
        .listHeader { margin-bottom: 14px; }
        @media (min-width: 1500px) {
          .detailRowGrid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 1280px) {
          .editorHero, .listHeader { flex-wrap: wrap; }
          .editorHero > div:first-child, .listHeader > div:first-child { min-width: 0; flex: 1 1 420px; }
          .assignmentGrid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .defaultToggle { grid-column: 1 / -1; }
          .detailRowGrid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 1180px) {
          .assignmentGrid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .defaultToggle { grid-column: 1 / -1; }
          .detailRowGrid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 900px) {
          .predefinedWorkspace { gap: 14px; }
          .editorHero, .listHeader { align-items: stretch; flex-direction: column; }
          .editorHero button { align-self: flex-start; }
          .metaGrid { grid-template-columns: 1fr; }
          .assignmentGrid { grid-template-columns: 1fr 1fr; }
          .defaultToggle { grid-column: 1 / -1; }
          .formSection { padding: 14px; }
          .predefinedListCard { overflow: hidden; }
        }
        @media (max-width: 760px) {
          .editorHero, .listHeader, .testsHeader, .formFooter { align-items: stretch; flex-direction: column; }
          .metaGrid, .assignmentGrid, .detailRowGrid { grid-template-columns: 1fr; }
          .testsActions { width: 100%; justify-content: space-between; flex-wrap: wrap; }
          .testsActions button, .editorHero button { width: 100%; justify-content: center; }
          .formSection { padding: 13px; }
          .formFooterCopy { display: none; }
          .formFooter :global(.actions) { width: 100%; }
          .formFooter :global(.actions) button { flex: 1 1 100%; justify-content: center; }
          .recordCount { align-self: flex-start; }
          .detailRow { padding: 12px; }
          .detailRowHeader { align-items: center; }
          .detailTitle small { white-space: normal; overflow-wrap: anywhere; }
        }
        @media (max-width: 480px) {
          .predefinedWorkspace { gap: 12px; }
          .editorHero h2, .listHeader h2 { font-size: 18px; }
          .formSectionHeader { gap: 9px; }
          .stepNumber, .detailIndex { width: 26px; height: 26px; }
          .assignmentGrid, .metaGrid, .detailRowGrid { grid-template-columns: minmax(0, 1fr); }
          .defaultToggle { min-height: auto; }
          .testsCount { order: 2; }
        }
      `}</style>
    </TechnicalConfigShell>
  );
}
