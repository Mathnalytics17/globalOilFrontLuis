import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import TechnicalConfigShell from '../components/TechnicalConfigShell';
import styles from '../components/TechnicalConfig.module.css';
import { apiErrorToText } from '../components/technicalConfigUtils';
import { sampleManagementTypesService } from '@features/samples/infrastructure/sampleManagementTypesService';
import { companiesOptionsService } from '@features/companies/infrastructure/companiesOptionsService';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';

const EMPTY_FORM = {
  id: null,
  nombre: '',
  dias_habiles: 0,
  dias_calendario: 0,
  aplica_a_todos: true,
  empresas_permitidas: [],
  activo: true,
};

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeIds = (items = []) => items.map((item) => (typeof item === 'object' ? item.id : item)).filter(Boolean);

const getCompaniesLabel = (item) => {
  if (item.aplica_a_todos) return 'Todas las empresas';
  const companies = item.empresas_permitidas_info || [];
  if (!companies.length) return 'Sin empresas asignadas';
  if (companies.length <= 3) return companies.map((company) => company.nombre || company.name || `Empresa ${company.id}`).join(', ');
  return `${companies.length} empresas específicas`;
};

export default function SampleManagementTypesPage() {
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sampleManagementTypesService.list({ incluir_eliminados: includeDeleted ? 'true' : 'false' });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(apiErrorToText(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await companiesOptionsService.list();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.warning('No se pudieron cargar las empresas para asignación específica.');
      setCompanies([]);
    }
  };

  useEffect(() => { load(); }, [includeDeleted]);
  useEffect(() => { loadCompanies(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.nombre, item.dias_habiles, item.dias_calendario, getCompaniesLabel(item)]
      .filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [items, search]);

  const managementSortColumns = useMemo(() => ({
    name: (item) => item.nombre,
    days: (item) => Number(item.dias_habiles || 0) + Number(item.dias_calendario || 0),
    visibility: (item) => getCompaniesLabel(item),
    status: (item) => !item.deleted_at && item.activo,
  }), []);
  const { sortedRows, sort, requestSort } = useTableSort(filtered, managementSortColumns, {
    key: 'name',
    direction: 'asc',
  });

  const filteredCompanies = useMemo(() => {
    const term = companySearch.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter((company) => String(company.nombre || '').toLowerCase().includes(term));
  }, [companies, companySearch]);

  const stats = useMemo(() => items.reduce((acc, item) => {
    acc.total += 1;
    if (item.activo && !item.deleted_at) acc.activos += 1;
    if (item.aplica_a_todos) acc.globales += 1;
    else acc.especificos += 1;
    return acc;
  }, { total: 0, activos: 0, globales: 0, especificos: 0 }), [items]);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleCompany = (companyId) => {
    const idText = String(companyId);
    setForm((prev) => {
      const exists = prev.empresas_permitidas.map(String).includes(idText);
      return {
        ...prev,
        empresas_permitidas: exists
          ? prev.empresas_permitidas.filter((id) => String(id) !== idText)
          : [...prev.empresas_permitidas, companyId],
      };
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCompanySearch('');
  };

  const edit = (item) => {
    setForm({
      id: item.id,
      nombre: item.nombre || '',
      dias_habiles: item.dias_habiles ?? 0,
      dias_calendario: item.dias_calendario ?? 0,
      aplica_a_todos: item.aplica_a_todos ?? true,
      empresas_permitidas: normalizeIds(item.empresas_permitidas || item.empresas_permitidas_info || []),
      activo: item.activo ?? true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPayload = () => ({
    nombre: form.nombre.trim(),
    dias_habiles: toNumber(form.dias_habiles),
    dias_calendario: toNumber(form.dias_calendario),
    aplica_a_todos: Boolean(form.aplica_a_todos),
    empresas_permitidas: form.aplica_a_todos ? [] : form.empresas_permitidas,
    activo: Boolean(form.activo),
  });

  const save = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError('El nombre del tipo de gestión es obligatorio.');
      return;
    }

    if (!form.aplica_a_todos && !form.empresas_permitidas.length) {
      setError('Seleccione al menos una empresa o marque “Aplica a todos”.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (form.id) {
        await sampleManagementTypesService.update(form.id, payload);
        toast.success('Tipo de gestión actualizado');
      } else {
        await sampleManagementTypesService.create(payload);
        toast.success('Tipo de gestión creado');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(apiErrorToText(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`¿Eliminar el tipo de gestión "${item.nombre}"?`)) return;
    try {
      await sampleManagementTypesService.remove(item.id);
      toast.success('Tipo de gestión eliminado');
      await load();
    } catch (err) {
      setError(apiErrorToText(err));
    }
  };

  const restore = async (item) => {
    try {
      await sampleManagementTypesService.restore(item.id);
      toast.success('Tipo de gestión restaurado');
      await load();
    } catch (err) {
      setError(apiErrorToText(err));
    }
  };

  const selectedCompanyIds = form.empresas_permitidas.map(String);

  return (
    <TechnicalConfigShell
      title="Tipos de gestión de muestras"
      subtitle="CRUD operativo para crear opciones como Comercial, Postventa o PQRS. Estos tipos se usan al crear lotes y pueden tener tiempos y visibilidad por empresa."
      kicker="Configuración del sistema"
    >
      {error ? <div className={styles.alert}>{error}</div> : null}

      <section className={styles.grid}>
        <article className={`${styles.card} ${styles.col3}`}><h3>Total</h3><div className={styles.statNumber}>{stats.total}</div></article>
        <article className={`${styles.card} ${styles.col3}`}><h3>Activos</h3><div className={styles.statNumber}>{stats.activos}</div></article>
        <article className={`${styles.card} ${styles.col3}`}><h3>Globales</h3><div className={styles.statNumber}>{stats.globales}</div></article>
        <article className={`${styles.card} ${styles.col3}`}><h3>Por empresa</h3><div className={styles.statNumber}>{stats.especificos}</div></article>

        <article className={`${styles.card} ${styles.col5}`}>
          <h2>{form.id ? 'Editar tipo de gestión' : 'Nuevo tipo de gestión'}</h2>
          <p>Define el nombre, los tiempos y si aplica para todos los clientes o solo para empresas específicas.</p>
          <form onSubmit={save} className={styles.formGrid}>
            <label className={styles.fieldFull}>
              <span className={styles.label}>Nombre *</span>
              <input className={styles.input} value={form.nombre} onChange={(e) => updateForm('nombre', e.target.value)} placeholder="Ej: Comercial, Postventa, PQRS" />
            </label>
            <label className={styles.fieldSmall}>
              <span className={styles.label}>Días hábiles</span>
              <input className={styles.input} type="number" min="0" value={form.dias_habiles} onChange={(e) => updateForm('dias_habiles', e.target.value)} />
            </label>
            <label className={styles.fieldSmall}>
              <span className={styles.label}>Días calendario</span>
              <input className={styles.input} type="number" min="0" value={form.dias_calendario} onChange={(e) => updateForm('dias_calendario', e.target.value)} />
            </label>
            <label className={styles.fieldSmall}>
              <span className={styles.label}>Estado</span>
              <select className={styles.select} value={form.activo ? 'true' : 'false'} onChange={(e) => updateForm('activo', e.target.value === 'true')}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
            <label className={styles.fieldFull} style={{ display: 'flex', gap: 10, alignItems: 'center', flexDirection: 'row' }}>
              <input type="checkbox" checked={form.aplica_a_todos} onChange={(e) => updateForm('aplica_a_todos', e.target.checked)} />
              <span className={styles.label} style={{ margin: 0 }}>Aplica a todos los clientes</span>
            </label>

            {!form.aplica_a_todos ? (
              <div className={styles.fieldFull}>
                <span className={styles.label}>Empresas permitidas</span>
                <input className={styles.input} value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder="Buscar empresa..." />
                <div style={{ maxHeight: 230, overflow: 'auto', marginTop: 10, border: '1px solid #303746', borderRadius: 14, padding: 10 }}>
                  {filteredCompanies.map((company) => (
                    <label key={company.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 4px' }}>
                      <input type="checkbox" checked={selectedCompanyIds.includes(String(company.id))} onChange={() => toggleCompany(company.id)} />
                      <span>{company.nombre}</span>
                    </label>
                  ))}
                  {!filteredCompanies.length ? <p className={styles.help}>No hay empresas para mostrar.</p> : null}
                </div>
              </div>
            ) : null}

            <div className={`${styles.actions} ${styles.fieldFull}`}>
              <button className={`${styles.btn} ${styles.primary}`} type="submit" disabled={saving}>{saving ? 'Guardando...' : form.id ? 'Actualizar' : 'Crear'}</button>
              {form.id ? <button className={`${styles.btn} ${styles.secondary}`} type="button" onClick={resetForm}>Cancelar edición</button> : null}
            </div>
          </form>
        </article>

        <article className={`${styles.card} ${styles.col7}`}>
          <div className={styles.actions} style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0 }}>Tipos registrados</h2>
              <p className={styles.help}>Se listan los tipos de gestión disponibles para lotes de muestras.</p>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
              <span>Ver eliminados</span>
            </label>
          </div>

          <input className={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, días o empresa..." style={{ marginBottom: 14 }} />

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortableTableHeader column="name" label="Nombre" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="days" label="Dias" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="visibility" label="Visibilidad" sort={sort} onSort={requestSort} />
                  <SortableTableHeader column="status" label="Estado" sort={sort} onSort={requestSort} />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5}>Cargando...</td></tr> : null}
                {!loading && !filtered.length ? <tr><td colSpan={5}>No hay tipos de gestión.</td></tr> : null}
                {!loading && sortedRows.map((item) => (
                  <tr key={item.id}>
                    <td><b>{item.nombre}</b></td>
                    <td>{item.dias_habiles ?? 0} hábiles / {item.dias_calendario ?? 0} calendario</td>
                    <td>{getCompaniesLabel(item)}</td>
                    <td>{item.deleted_at || !item.activo ? <span className={styles.badgeRed}>Inactivo</span> : <span className={styles.badgeGreen}>Activo</span>}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={`${styles.btn} ${styles.secondary}`} type="button" onClick={() => edit(item)}>Editar</button>
                        {item.deleted_at || !item.activo
                          ? <button className={`${styles.btn} ${styles.secondary}`} type="button" onClick={() => restore(item)}>Restaurar</button>
                          : <button className={`${styles.btn} ${styles.danger}`} type="button" onClick={() => remove(item)}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </TechnicalConfigShell>
  );
}
