import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  RefreshCw,
  Save,
  Search,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

import TechnicalConfigShell from '../components/TechnicalConfigShell';
import technicalConfigService from '../../infrastructure/technicalConfigService';
import { apiErrorToText } from '../components/technicalConfigUtils';
import styles from '../components/TechnicalConfig.module.css';

const normalizeArray = (data) => (Array.isArray(data) ? data : data?.results || []);
const emptyForm = {
  comentario_normal: '',
  comentario_fuera_limite: '',
  comentario_no_evaluable: '',
};

const testName = (field) => (
  field?.fuente_limite_info?.prueba_nombre
  || field?.prueba_nombre
  || field?.fuente_limite_info?.prueba_info?.nombre_variable
  || 'Prueba'
);

export default function TechnicalLimitCommentsPage() {
  const [fields, setFields] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return fields;
    return fields.filter((field) => [
      field.nombre,
      field.codigo,
      testName(field),
      field.fuente_limite_info?.catalogo_nombre,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [fields, query]);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await technicalConfigService.listLimitFields({ page_size: 1000 });
      setFields(normalizeArray(data));
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudieron cargar los comentarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const startEdit = (field) => {
    setEditing(field);
    setForm({
      comentario_normal: field.comentario_normal || '',
      comentario_fuera_limite: field.comentario_fuera_limite || '',
      comentario_no_evaluable: field.comentario_no_evaluable || '',
    });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await technicalConfigService.patchLimitField(editing.id, form);
      const updated = { ...editing, ...form };
      setFields((current) => current.map((field) => (
        field.id === editing.id ? updated : field
      )));
      setEditing(updated);
      toast.success('Comentarios guardados.');
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudieron guardar los comentarios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TechnicalConfigShell
      title="Comentarios técnicos"
      subtitle="Administre los textos que acompañan la interpretación de cada campo evaluable."
      action={(
        <button className={styles.iconButton} type="button" title="Recargar" onClick={reload} disabled={loading}>
          <RefreshCw size={17} />
        </button>
      )}
    >
      <div className={styles.commentLayout}>
        <section className={`${styles.card} ${styles.commentList}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Campos con límite</h2>
              <p className={styles.cardSubtitle}>{fields.length} campos disponibles. Seleccione uno para consultar o editar.</p>
            </div>
          </div>
          <label className={styles.commentSearch}>
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar prueba, resultado o campo" />
          </label>
          <div className={styles.listStack}>
            {filtered.map((field) => (
              <button
                key={field.id}
                type="button"
                className={`${styles.listItem} ${editing?.id === field.id ? styles.active : ''}`}
                onClick={() => startEdit(field)}
              >
                <span className={styles.commentItemTitle}>
                  <strong>{testName(field)}</strong>
                  <small>{field.operador || 'Informativo'}</small>
                </span>
                <span>{field.nombre || field.codigo}</span>
                <small>{field.codigo}</small>
              </button>
            ))}
            {!filtered.length ? <div className={styles.emptyState}>No hay campos que coincidan con la búsqueda.</div> : null}
          </div>
        </section>

        <section className={`${styles.card} ${styles.commentEditor}`}>
          {editing ? (
            <>
              <header className={styles.commentEditorHeader}>
                <span>Campo seleccionado</span>
                <h2>{editing.nombre || editing.codigo}</h2>
                <p>{testName(editing)} · {editing.codigo}</p>
              </header>
              <form className={styles.commentForm} onSubmit={save}>
                <label className={styles.commentStateGreen}>
                  <span><CheckCircle2 size={18} /> Aceptable</span>
                  <small>Texto sugerido cuando el valor queda en verde.</small>
                  <textarea value={form.comentario_normal} onChange={(event) => setForm({ ...form, comentario_normal: event.target.value })} placeholder="Ej. El resultado se encuentra dentro del intervalo aceptable." />
                </label>
                <label className={styles.commentStateYellow}>
                  <span><AlertTriangle size={18} /> Requiere seguimiento</span>
                  <small>Texto para valores en alerta o críticos. El reporte conserva el color calculado.</small>
                  <textarea value={form.comentario_fuera_limite} onChange={(event) => setForm({ ...form, comentario_fuera_limite: event.target.value })} placeholder="Ej. Revisar tendencia y programar una nueva muestra." />
                </label>
                <label className={styles.commentStateNeutral}>
                  <span><XCircle size={18} /> No evaluable</span>
                  <small>Texto mostrado cuando no hay datos suficientes para decidir.</small>
                  <textarea value={form.comentario_no_evaluable} onChange={(event) => setForm({ ...form, comentario_no_evaluable: event.target.value })} placeholder="Ej. No fue posible evaluar el campo con la información disponible." />
                </label>
                <div className={styles.actions}>
                  <button className={styles.primaryAction} type="submit" disabled={saving}>
                    <Save size={17} /> {saving ? 'Guardando...' : 'Guardar comentarios'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className={styles.commentEmpty}>
              <Search size={28} />
              <h2>Seleccione un campo</h2>
              <p>Podrá consultar sus comentarios actuales y editarlos sin salir de esta pantalla.</p>
            </div>
          )}
        </section>
      </div>
    </TechnicalConfigShell>
  );
}
