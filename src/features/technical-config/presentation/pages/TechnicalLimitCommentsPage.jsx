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

const fullTestName = (field) => {
  const source = field?.fuente_limite_info || {};
  const acronym = source.prueba_acronimo || field?.prueba_acronimo;
  const name = source.prueba_nombre || field?.prueba_nombre || field?.fuente_limite_info?.prueba_info?.nombre_variable;
  return acronym && name && acronym !== name ? `${acronym} · ${name}` : acronym || name || 'Prueba sin identificar';
};

const resultName = (field) => (
  field?.componente_nombre
  || field?.division_nombre
  || field?.resultado_nombre
  || field?.nombre
  || field?.codigo
  || 'Resultado principal'
);

const fieldName = (field) => field?.nombre || field?.codigo || 'Campo sin nombre';

const operatorLabel = (operator) => ({
  max: 'Máximo', min: 'Mínimo', between: 'Rango', eq: 'Igual a', neq: 'Diferente de',
  in: 'En lista', not_in: 'Fuera de lista', scale_max: 'Escala máxima',
  scale_min: 'Escala mínima', informativo: 'Informativo',
}[operator] || operator || 'Regla');

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
      fullTestName(field),
      resultName(field),
      field.fuente_limite_info?.catalogo_nombre,
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [fields, query]);

  const groupedFields = useMemo(() => {
    const groups = new Map();
    filtered.forEach((field) => {
      const source = field.fuente_limite_info || {};
      const key = String(source.id || field.fuente_limite || fullTestName(field));
      if (!groups.has(key)) {
        groups.set(key, { key, test: fullTestName(field), version: source.version, fields: [] });
      }
      groups.get(key).fields.push(field);
    });
    return [...groups.values()];
  }, [filtered]);

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
      action={null}
    >
      <div className={styles.commentLayout}>
        <section className={`${styles.card} ${styles.commentList}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Pruebas y campos evaluables</h2>
              <p className={styles.cardSubtitle}>{fields.length} campos de las versiones vigentes. Seleccione un campo para editar los textos del reporte.</p>
            </div>
          </div>
          <label className={styles.commentSearch}>
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar prueba, resultado o campo" />
          </label>
          <div className={styles.listStack}>
            {groupedFields.map((group) => (
              <section className={styles.commentTestGroup} key={group.key}>
                <header>
                  <strong>{group.test}</strong>
                  <small>{group.version ? `Límites V${group.version}` : 'Límites vigentes'} · {group.fields.length} campo(s)</small>
                </header>
                {group.fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    className={`${styles.listItem} ${editing?.id === field.id ? styles.active : ''}`}
                    onClick={() => startEdit(field)}
                  >
                    <span className={styles.commentItemTitle}>
                      <strong>{fieldName(field)}</strong>
                      <small>{operatorLabel(field.operador)}</small>
                    </span>
                    <span>Resultado: {resultName(field)}</span>
                    <small>{field.unidad ? `Unidad: ${field.unidad}` : 'Sin unidad informada'}</small>
                  </button>
                ))}
              </section>
            ))}
            {!filtered.length ? <div className={styles.emptyState}>No hay campos que coincidan con la búsqueda.</div> : null}
          </div>
        </section>

        <section className={`${styles.card} ${styles.commentEditor}`}>
          {editing ? (
            <>
              <header className={styles.commentEditorHeader}>
                <span>Comentario para el campo</span>
                <h2>{fieldName(editing)}</h2>
                <dl className={styles.commentContext}>
                  <div><dt>Prueba</dt><dd>{fullTestName(editing)}</dd></div>
                  <div><dt>Resultado</dt><dd>{resultName(editing)}</dd></div>
                  <div><dt>Evaluación</dt><dd>{operatorLabel(editing.operador)}{editing.unidad ? ` · ${editing.unidad}` : ''}</dd></div>
                </dl>
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
