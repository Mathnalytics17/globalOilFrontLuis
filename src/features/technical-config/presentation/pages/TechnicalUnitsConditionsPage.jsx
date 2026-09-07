
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MoreHorizontal, Plus, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import technicalConfigService from '../../infrastructure/technicalConfigService';
import dynamicTechnicalConfigService from '../../infrastructure/dynamicTechnicalConfigService';
import ps from '../components/TechnicalPs5.module.css';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';

const emptyUnit = { nombre: '', simbolo: '', magnitud: '', descripcion: '', activo: true };
const emptyCondition = { nombre: '', magnitud: 'temperatura', valor: '', unidad: '', descripcion: '', activo: true };

const operators = [
  { nombre: 'Menor o igual', simbolo: '<=', categoria: 'Comparación', activo: true },
  { nombre: 'Mayor o igual', simbolo: '>=', categoria: 'Comparación', activo: true },
  { nombre: 'Entre rango', simbolo: 'rango', categoria: 'Rango', activo: true },
  { nombre: 'Igual', simbolo: '=', categoria: 'Comparación', activo: true },
];

const stringifyError = (err, fallback) => {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  try { return JSON.stringify(data); } catch { return fallback; }
};

export default function TechnicalUnitsConditionsPage() {
  const [tab, setTab] = useState('units');
  const [units, setUnits] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [unitForm, setUnitForm] = useState(emptyUnit);
  const [conditionForm, setConditionForm] = useState(emptyCondition);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editingConditionId, setEditingConditionId] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const load = async () => {
    try {
      const [unitList, conditionList] = await Promise.all([
        technicalConfigService.listUnits(showInactive ? {} : { activo: true }),
        technicalConfigService.listConditions(showInactive ? {} : { activo: true }),
      ]);
      setUnits(unitList || []);
      setConditions(conditionList || []);
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudieron cargar unidades y condiciones.'));
    }
  };

  useEffect(() => { load(); }, [showInactive]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units;
    return units.filter((unit) => `${unit.nombre} ${unit.simbolo} ${unit.magnitud}`.toLowerCase().includes(q));
  }, [units, search]);

  const filteredConditions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conditions;
    return conditions.filter((condition) => `${condition.nombre} ${condition.valor} ${condition.magnitud}`.toLowerCase().includes(q));
  }, [conditions, search]);

  const openUnit = (unit = null) => {
    setTab('units');
    if (unit) {
      setEditingUnitId(unit.id);
      setUnitForm({
        nombre: unit.nombre || '',
        simbolo: unit.simbolo || '',
        magnitud: unit.magnitud || '',
        descripcion: unit.descripcion || '',
        activo: unit.activo !== false,
      });
    } else {
      setEditingUnitId(null);
      setUnitForm(emptyUnit);
    }
    setDrawer('unit');
  };

  const openCondition = (condition = null) => {
    setTab('conditions');
    if (condition) {
      setEditingConditionId(condition.id);
      setConditionForm({
        nombre: condition.nombre || '',
        magnitud: condition.magnitud || 'temperatura',
        valor: condition.valor ?? '',
        unidad: condition.unidad || condition.unidad_id || '',
        descripcion: condition.descripcion || '',
        activo: condition.activo !== false,
      });
    } else {
      setEditingConditionId(null);
      setConditionForm(emptyCondition);
    }
    setDrawer('condition');
  };

  const submitUnit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingUnitId) await technicalConfigService.updateUnit(editingUnitId, unitForm);
      else await technicalConfigService.createUnit(unitForm);
      toast.success(editingUnitId ? 'Unidad actualizada.' : 'Unidad creada.');
      setDrawer(null);
      await load();
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudo guardar la unidad.'));
    } finally {
      setSaving(false);
    }
  };

  const submitCondition = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...conditionForm, valor: conditionForm.valor === '' ? null : Number(conditionForm.valor) };
      if (editingConditionId) await technicalConfigService.updateCondition(editingConditionId, payload);
      else await technicalConfigService.createCondition(payload);
      toast.success(editingConditionId ? 'Condición actualizada.' : 'Condición creada.');
      setDrawer(null);
      await load();
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudo guardar la condición.'));
    } finally {
      setSaving(false);
    }
  };

  const removeUnit = async (unit) => {
    if (!window.confirm(`¿Desactivar la unidad ${unit.simbolo} - ${unit.nombre}?`)) return;
    try {
      await dynamicTechnicalConfigService.units.remove(unit.id);
      toast.success('Unidad desactivada.');
      await load();
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudo eliminar la unidad.'));
    }
  };

  const toggleRecord = async (row) => {
    try {
      if (tab === 'units') {
        if (row.activo === false) await technicalConfigService.restoreUnit(row.id);
        else await technicalConfigService.deleteUnit(row.id);
      } else if (tab === 'conditions') {
        if (row.activo === false) await technicalConfigService.restoreCondition(row.id);
        else await technicalConfigService.deleteCondition(row.id);
      }
      toast.success(row.activo === false ? 'Registro reactivado.' : 'Registro desactivado.');
      await load();
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudo cambiar el estado.'));
    }
  };

  const currentRows = tab === 'units' ? filteredUnits : tab === 'conditions' ? filteredConditions : operators;
  const rowSortColumns = useMemo(() => ({
    name: (row) => row.nombre,
    value: (row) => tab === 'conditions' ? row.valor : row.simbolo,
    category: (row) => row.magnitud || row.categoria || 'General',
    status: (row) => row.activo !== false,
  }), [tab]);
  const { sortedRows, sort, requestSort } = useTableSort(currentRows, rowSortColumns, {
    key: 'name',
    direction: 'asc',
  });

  return (
    <main className={ps.page}>
      <div className={ps.pageScroll}>
        <section className={ps.wideShell}>
          <Link href="/configuracion-tecnica" className={ps.backButton}>
            <ArrowLeft size={21} />
            Volver a configuración técnica
          </Link>

          <header className={ps.header}>
            <div className={ps.headerMain}>
              <h1 className={ps.sectionTitle}>Unidades y condiciones</h1>
              <p className={ps.subtitle}>Administra unidades de medida, operadores y condiciones usadas por las pruebas.</p>
            </div>
          </header>

          <nav className={ps.subNav}>
            <button type="button" className={tab === 'units' ? ps.active : ''} onClick={() => setTab('units')}>Unidades</button>
            <button type="button" className={tab === 'operators' ? ps.active : ''} onClick={() => setTab('operators')}>Operadores</button>
            <button type="button" className={tab === 'conditions' ? ps.active : ''} onClick={() => setTab('conditions')}>Condiciones</button>
          </nav>

          <div className={ps.searchActionLine}>
            <div className={ps.searchBox}>
              <Search size={22} />
              <input
                className={ps.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'units' ? 'Buscar unidades...' : tab === 'conditions' ? 'Buscar condiciones...' : 'Buscar operadores...'}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#bbb' }}><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inactivos</label>
            {tab === 'units' ? (
              <button type="button" className={ps.buttonPrimary} onClick={() => openUnit()}>
                <Plus size={22} /> Nueva unidad
              </button>
            ) : null}
            {tab === 'conditions' ? (
              <button type="button" className={ps.buttonPrimary} onClick={() => openCondition()}>
                <Plus size={22} /> Nueva condición
              </button>
            ) : null}
          </div>

          <table className={ps.linearTable}>
            <thead>
              <tr>
                <SortableTableHeader column="name" label="Nombre" sort={sort} onSort={requestSort} />
                <SortableTableHeader column="value" label={tab === 'conditions' ? 'Valor' : 'Simbolo'} sort={sort} onSort={requestSort} />
                <SortableTableHeader column="category" label="Categoria" sort={sort} onSort={requestSort} />
                <SortableTableHeader column="status" label="Estado" sort={sort} onSort={requestSort} />
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id || row.simbolo || row.nombre}>
                  <td>{row.nombre}</td>
                  <td>{tab === 'conditions' ? `${row.valor ?? '-'} ${units.find((u) => String(u.id) === String(row.unidad))?.simbolo || ''}` : row.simbolo}</td>
                  <td>{row.magnitud || row.categoria || 'General'}</td>
                  <td><span className={ps.statusPill}><span className={`${ps.statusDot} ${ps.greenDot}`} />{row.activo === false ? 'Inactivo' : 'Activo'}</span></td>
                  <td>
                    {tab === 'units' ? (
                      <><button type="button" className={ps.tableAction} title="Editar" onClick={() => openUnit(row)}><MoreHorizontal size={24} /></button><button type="button" className={ps.tableAction} onClick={() => toggleRecord(row)}>{row.activo === false ? 'Reactivar' : 'Desactivar'}</button></>
                    ) : tab === 'conditions' ? (
                      <><button type="button" className={ps.tableAction} title="Editar" onClick={() => openCondition(row)}><MoreHorizontal size={24} /></button><button type="button" className={ps.tableAction} onClick={() => toggleRecord(row)}>{row.activo === false ? 'Reactivar' : 'Desactivar'}</button></>
                    ) : <span style={{ color: '#777' }}>—</span>}
                  </td>
                </tr>
              ))}
              {!currentRows.length ? (
                <tr><td colSpan="5" style={{ color: '#999' }}>No hay registros para mostrar.</td></tr>
              ) : null}
            </tbody>
          </table>

          <footer className={ps.footerNote}>
            <span>Mostrando {currentRows.length} registro(s)</span>
          </footer>
        </section>
      </div>

      {drawer ? (
        <UnitDrawer
          drawer={drawer}
          unitForm={unitForm}
          setUnitForm={setUnitForm}
          conditionForm={conditionForm}
          setConditionForm={setConditionForm}
          units={units}
          submitUnit={submitUnit}
          submitCondition={submitCondition}
          close={() => setDrawer(null)}
          saving={saving}
        />
      ) : null}
    </main>
  );
}

function UnitDrawer({
  drawer,
  unitForm,
  setUnitForm,
  conditionForm,
  setConditionForm,
  units,
  submitUnit,
  submitCondition,
  close,
  saving,
}) {
  const isUnit = drawer === 'unit';
  return (
    <aside className={ps.sidePanel}>
      <div className={ps.sidePanelHeader}>
        <h2 className={ps.sidePanelTitle}>{isUnit ? 'Nueva unidad' : 'Nueva condición'}</h2>
        <button type="button" className={ps.closeButton} onClick={close}><X size={25} /></button>
      </div>

      <form className={ps.formStack} onSubmit={isUnit ? submitUnit : submitCondition}>
        {isUnit ? (
          <>
            <div className={ps.field}>
              <label>Nombre <b>*</b></label>
              <input className={ps.input} value={unitForm.nombre} onChange={(e) => setUnitForm({ ...unitForm, nombre: e.target.value })} placeholder="Ej. grados Celsius" required />
              <span className={ps.helpText}>Nombre descriptivo de la unidad.</span>
            </div>
            <div className={ps.field}>
              <label>Símbolo <b>*</b></label>
              <input className={ps.input} value={unitForm.simbolo} onChange={(e) => setUnitForm({ ...unitForm, simbolo: e.target.value })} placeholder="Ej. °C" required />
              <span className={ps.helpText}>Símbolo abreviado de la unidad.</span>
            </div>
            <div className={ps.field}>
              <label>Categoría <b>*</b></label>
              <input className={ps.input} value={unitForm.magnitud} onChange={(e) => setUnitForm({ ...unitForm, magnitud: e.target.value })} placeholder="Temperatura, viscosidad, concentración..." required />
              <span className={ps.helpText}>Categoría a la que pertenece la unidad.</span>
            </div>
          </>
        ) : (
          <>
            <div className={ps.field}>
              <label>Nombre <b>*</b></label>
              <input className={ps.input} value={conditionForm.nombre} onChange={(e) => setConditionForm({ ...conditionForm, nombre: e.target.value })} placeholder="Ej. Viscosidad 40 °C" required />
            </div>
            <div className={ps.field}>
              <label>Magnitud</label>
              <input className={ps.input} value={conditionForm.magnitud} onChange={(e) => setConditionForm({ ...conditionForm, magnitud: e.target.value })} />
            </div>
            <div className={ps.field}>
              <label>Valor</label>
              <input className={ps.input} type="number" value={conditionForm.valor} onChange={(e) => setConditionForm({ ...conditionForm, valor: e.target.value })} />
            </div>
            <div className={ps.field}>
              <label>Unidad</label>
              <select className={ps.select} value={conditionForm.unidad} onChange={(e) => setConditionForm({ ...conditionForm, unidad: e.target.value })}>
                <option value="">Sin unidad</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.simbolo} · {unit.nombre}</option>)}
              </select>
            </div>
          </>
        )}

        <div className={ps.panelFooter}>
          <button type="button" className={ps.buttonSecondary} onClick={close}>Cancelar</button>
          <button type="submit" className={ps.buttonPrimary} disabled={saving}>Guardar</button>
        </div>
      </form>
    </aside>
  );
}
