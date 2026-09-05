import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCw, Save, Trash2, Wand2 } from 'lucide-react';
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
    if (!window.confirm(`¿Eliminar el lote predefinido ${bundle.nombre}?`)) return;
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
      subtitle="Plantillas de pruebas para asignación por lote."
      kicker="Plantillas de pruebas"
      action={<button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={load}><RefreshCw size={16} /> Recargar</button>}
    >
      {error ? <div className={styles.alert}>{error}</div> : null}
      {message ? <div className={`${styles.alert} ${styles.success}`}>{message}</div> : null}

      <section className={styles.grid}>
        <article className={`${styles.card} ${styles.col3}`}><div className={styles.kicker}>Total</div><div className={styles.statNumber}>{counts.total}</div><p>Lotes activos.</p></article>
        <article className={`${styles.card} ${styles.col3}`}><div className={styles.kicker}>Por gestión</div><div className={styles.statNumber}>{counts.gestion}</div><p>Ligados a tipo de gestión.</p></article>
        <article className={`${styles.card} ${styles.col3}`}><div className={styles.kicker}>Personalizados</div><div className={styles.statNumber}>{counts.personalizados}</div><p>Independientes del flujo.</p></article>

        <article className={`${styles.card} ${styles.col5}`}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>{editingId ? 'Editar lote' : 'Nuevo lote'}</div>
              <h2>{editingId ? 'Editar plantilla' : 'Crear plantilla'}</h2>
            </div>
            <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={resetForm}><Wand2 size={16} /> Nuevo</button>
          </div>

          <form onSubmit={handleSubmit} className={styles.formGrid}>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.label}>Nombre *</span><input className={styles.input} value={meta.nombre} onChange={(e) => setMeta({ ...meta, nombre: e.target.value })} required /></label>
            <label className={`${styles.field} ${styles.fieldSmall}`}><span className={styles.label}>Tipo de lote *</span>
              <select className={styles.select} value={meta.tipo_lote} onChange={(e) => setMeta({ ...meta, tipo_lote: e.target.value })}>
                <option value="gestion">Por gestión</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>
            <label className={`${styles.field} ${styles.field}`}><span className={styles.label}>Tipo de gestión</span>
              <select className={styles.select} value={meta.tipo_gestion} onChange={(e) => setMeta({ ...meta, tipo_gestion: e.target.value })}>
                <option value="">No aplica</option>
                {types.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </select>
            </label>
            <label className={`${styles.field} ${styles.fieldFull}`}><span className={styles.label}>Descripción</span><textarea className={styles.textarea} value={meta.descripcion} onChange={(e) => setMeta({ ...meta, descripcion: e.target.value })} /></label>
            <label className={`${styles.field} ${styles.fieldFull}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={meta.es_default} onChange={(e) => setMeta({ ...meta, es_default: e.target.checked })} /><span className={styles.label} style={{ margin: 0 }}>Marcar como lote por defecto para la gestión seleccionada</span></label>

            <div className={`${styles.fieldFull}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.kicker}>Pruebas del lote</div>
                  <h2>Construcción interna</h2>
                </div>
                <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => setDetails((prev) => [...prev, newRow()])}><Plus size={16} /> Agregar prueba</button>
              </div>
              <div className="detailRows">
                {details.map((row, index) => {
                  return (
                    <div key={row.key} className="detailRow">
                      <div className="detailRowHeader"><strong>Prueba #{index + 1}</strong><button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => setDetails((prev) => prev.length === 1 ? [newRow()] : prev.filter((item) => item.key !== row.key))}><Trash2 size={14} /></button></div>
                      <div className="detailRowGrid">
                        <label><span>Variable</span><select value={row.prueba} onChange={(e) => updateRow(row.key, 'prueba', e.target.value)}><option value="">Seleccione</option>{tests.map((item) => <option key={item.id} value={item.id}>{item.acronimo} · {item.nombre_variable}</option>)}</select></label>
                        <label><span>Condición</span><select value={row.condicion} onChange={(e) => updateRow(row.key, 'condicion', e.target.value)}><option value="">Sin condición</option>{conditions.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.valor} {item.unidad_info?.simbolo}</option>)}</select></label>
                        <label><span>Unidad</span><input value={row.unidad} readOnly placeholder="Tomada de la prueba" /></label>
                        <label><span>Texto condición</span><input value={row.condicion_texto} onChange={(e) => updateRow(row.key, 'condicion_texto', e.target.value)} placeholder="40 °C, 100 °C..." /></label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.primary}`} disabled={saving} type="submit"><Save size={16} /> {editingId ? 'Guardar cambios' : 'Crear lote'}</button>
              {editingId ? <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={resetForm}>Cancelar edición</button> : null}
            </div>
          </form>
        </article>

        <article className={`${styles.card} ${styles.col7}`}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.kicker}>Listado activo</div>
              <h2>Plantillas registradas</h2>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Nombre</th><th>Tipo</th><th>Gestión</th><th># pruebas</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6}>Cargando...</td></tr> : bundles.length ? bundles.map((bundle) => (
                  <tr key={bundle.id}>
                    <td><strong>{bundle.nombre}</strong><div className={styles.help}>{bundle.es_default ? 'Lote por defecto' : 'Plantilla'}</div></td>
                    <td>{bundle.tipo_lote}</td>
                    <td>{bundle.tipo_gestion_nombre || '-'}</td>
                    <td>{bundle.total_pruebas || 0}</td>
                    <td><span className={bundle.activo !== false ? styles.badgeGreen : styles.badgeRed}>{bundle.activo !== false ? 'Activo' : 'Inactivo'}</span></td>
                    <td><div className={styles.inlineActions}><button type="button" className={styles.iconBtn} onClick={() => handleEdit(bundle.id)}><Pencil size={14} /></button><button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => handleDelete(bundle)}><Trash2 size={14} /></button></div></td>
                  </tr>
                )) : <tr><td colSpan={6}>No hay lotes creados todavía.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <style jsx global>{`
        .detailRows { display: grid; gap: 12px; }
        .detailRow { border: 1px solid #303746; border-radius: 16px; padding: 14px; background: rgba(15,18,26,.72); }
        .detailRowHeader { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
        .detailRowGrid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        .detailRowGrid label { display: grid; gap: 6px; color: #dbeafe; font-size: 14px; font-weight: 700; }
        .detailRowGrid input, .detailRowGrid select { width: 100%; min-height: 44px; border-radius: 12px; border: 1px solid #343a46; background: #101217; color: white; padding: 0 12px; }
        .detailRowGrid input:focus, .detailRowGrid select:focus { outline: none; border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.12); }
        @media (max-width: 1100px) { .detailRowGrid { grid-template-columns: 1fr; } }
      `}</style>
    </TechnicalConfigShell>
  );
}
