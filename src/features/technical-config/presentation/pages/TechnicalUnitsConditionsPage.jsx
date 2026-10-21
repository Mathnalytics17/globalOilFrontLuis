
import { appDialog } from '@shared/ui/AppDialogProvider';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MoreHorizontal, Plus, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import technicalConfigService from '../../infrastructure/technicalConfigService';
import dynamicTechnicalConfigService from '../../infrastructure/dynamicTechnicalConfigService';
import ps from '../components/TechnicalPs5.module.css';
import DataTable from '@shared/ui/DataTable';
import useTableSort from '@shared/hooks/useTableSort';
import { getApiErrorMessage } from '@shared/utils/errors';

const emptyUnit = { nombre: '', simbolo: '', categoria: '', descripcion: '', activo: true };
const emptyCategory = { nombre: '', descripcion: '', activo: true };
const emptyCondition = { nombre: '', magnitud_categoria: '', valor: '', unidad: '', descripcion: '', activo: true };

const operators = [
  { nombre: 'Menor o igual', simbolo: '<=', categoria: 'Comparación', activo: true },
  { nombre: 'Mayor o igual', simbolo: '>=', categoria: 'Comparación', activo: true },
  { nombre: 'Entre rango', simbolo: 'rango', categoria: 'Rango', activo: true },
  { nombre: 'Igual', simbolo: '=', categoria: 'Comparación', activo: true },
];

const stringifyError = (err, fallback) => getApiErrorMessage(err, fallback);

export default function TechnicalUnitsConditionsPage() {
  const [tab, setTab] = useState('categories');
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [unitForm, setUnitForm] = useState(emptyUnit);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [conditionForm, setConditionForm] = useState(emptyCondition);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingConditionId, setEditingConditionId] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const load = async () => {
    try {
      const [unitList, categoryList, conditionList] = await Promise.all([
        technicalConfigService.listUnits(showInactive ? {} : { activo: true }),
        // Keep every category in memory so an existing unit can retain an
        // inactive category while it is being edited. The Categories tab
        // itself still follows the "Mostrar inactivos" filter below.
        technicalConfigService.listUnitCategories(),
        technicalConfigService.listConditions(showInactive ? {} : { activo: true }),
      ]);
      setUnits(unitList || []);
      setCategories(categoryList || []);
      setConditions(conditionList || []);
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudieron cargar unidades y condiciones.'));
    }
  };

  useEffect(() => { load(); }, [showInactive]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units;
    return units.filter((unit) => `${unit.nombre} ${unit.simbolo} ${unit.categoria_info?.nombre || unit.magnitud || ''}`.toLowerCase().includes(q));
  }, [units, search]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesSearch = !q || `${category.nombre} ${category.descripcion || ''}`.toLowerCase().includes(q);
      return matchesSearch && (showInactive || category.activo !== false);
    });
  }, [categories, search, showInactive]);

  const filteredConditions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conditions;
    return conditions.filter((condition) => `${condition.nombre} ${condition.valor} ${condition.magnitud_info?.nombre || condition.magnitud || ''}`.toLowerCase().includes(q));
  }, [conditions, search]);

  const openUnit = (unit = null) => {
    setTab('units');
    if (unit) {
      setEditingUnitId(unit.id);
      setUnitForm({
        nombre: unit.nombre || '',
        simbolo: unit.simbolo || '',
        categoria: unit.categoria || unit.categoria_id || '',
        descripcion: unit.descripcion || '',
        activo: unit.activo !== false,
      });
    } else {
      setEditingUnitId(null);
      setUnitForm(emptyUnit);
    }
    setDrawer('unit');
  };

  const openCategory = (category = null) => {
    setTab('categories');
    if (category) {
      setEditingCategoryId(category.id);
      setCategoryForm({ nombre: category.nombre || '', descripcion: category.descripcion || '', activo: category.activo !== false });
    } else {
      setEditingCategoryId(null);
      setCategoryForm(emptyCategory);
    }
    setDrawer('category');
  };

  const openCondition = (condition = null) => {
    setTab('conditions');
    if (condition) {
      setEditingConditionId(condition.id);
      setConditionForm({
        nombre: condition.nombre || '',
        magnitud_categoria: condition.magnitud_categoria || condition.magnitud_categoria_id || '',
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

  const submitCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingCategoryId) await technicalConfigService.updateUnitCategory(editingCategoryId, categoryForm);
      else await technicalConfigService.createUnitCategory(categoryForm);
      toast.success(editingCategoryId ? 'Magnitud actualizada.' : 'Magnitud creada. Ahora puede asociarle unidades.');
      setDrawer(null);
      await load();
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudo guardar la magnitud.'));
    } finally {
      setSaving(false);
    }
  };

  const submitCondition = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...conditionForm, valor: Number(conditionForm.valor) };
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
    if (!await appDialog.confirm(`¿Desactivar la unidad ${unit.simbolo} - ${unit.nombre}?`)) return;
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
      else if (tab === 'categories') {
        if (row.activo === false) await technicalConfigService.restoreUnitCategory(row.id);
        else await technicalConfigService.deleteUnitCategory(row.id);
      }
      toast.success(row.activo === false ? 'Registro reactivado.' : 'Registro desactivado.');
      await load();
    } catch (err) {
      toast.error(stringifyError(err, 'No se pudo cambiar el estado.'));
    }
  };

  const currentRows = tab === 'units' ? filteredUnits : tab === 'conditions' ? filteredConditions : tab === 'categories' ? filteredCategories : operators;
  const rowSortColumns = useMemo(() => ({
    name: (row) => row.nombre,
    value: (row) => tab === 'conditions' ? row.valor : row.simbolo,
    category: (row) => row.magnitud_info?.nombre || row.categoria_info?.nombre || row.magnitud || row.categoria || 'General',
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
              <h1 className={ps.sectionTitle}>Magnitudes, unidades y condiciones</h1>
              <p className={ps.subtitle}>Configure primero qué se mide, después sus unidades y por último las condiciones de ensayo reutilizables.</p>
            </div>
          </header>

          <section className={ps.relationshipGuide} aria-label="Orden de configuración">
            <div className={ps.guideStep}><strong>1. Magnitudes</strong><span>Temperatura, viscosidad, concentración.</span></div>
            <div className={ps.guideArrow}>→</div>
            <div className={ps.guideStep}><strong>2. Unidades</strong><span>°C, cSt, ppm; cada una pertenece a una magnitud.</span></div>
            <div className={ps.guideArrow}>→</div>
            <div className={ps.guideStep}><strong>3. Condiciones</strong><span>Contextos de ensayo como “Viscosidad a 40 °C”.</span></div>
          </section>

          <nav className={ps.subNav}>
            <button type="button" className={tab === 'categories' ? ps.active : ''} onClick={() => setTab('categories')}>1. Magnitudes</button>
            <button type="button" className={tab === 'units' ? ps.active : ''} onClick={() => setTab('units')}>2. Unidades</button>
            <button type="button" className={tab === 'conditions' ? ps.active : ''} onClick={() => setTab('conditions')}>Condiciones</button>
            <button type="button" className={tab === 'operators' ? ps.active : ''} onClick={() => setTab('operators')}>Operadores de límites</button>
          </nav>

          <div className={ps.searchActionLine}>
            <div className={ps.searchBox}>
              <Search size={22} />
              <input
                className={ps.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'units' ? 'Buscar unidades...' : tab === 'categories' ? 'Buscar magnitudes...' : tab === 'conditions' ? 'Buscar condiciones...' : 'Buscar operadores...'}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#bbb' }}><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar inactivos</label>
            {tab === 'units' ? (
              <button type="button" className={ps.buttonPrimary} onClick={() => openUnit()}>
                <Plus size={22} /> Nueva unidad
              </button>
            ) : null}
            {tab === 'categories' ? (
              <button type="button" className={ps.buttonPrimary} onClick={() => openCategory()}>
                <Plus size={22} /> Nueva magnitud
              </button>
            ) : null}
            {tab === 'conditions' ? (
              <button type="button" className={ps.buttonPrimary} onClick={() => openCondition()}>
                <Plus size={22} /> Nueva condición
              </button>
            ) : null}
          </div>

          <DataTable
            data={sortedRows}
            rowKey={(row) => row.id || row.simbolo || row.nombre}
            pagination
            initialRowsPerPage={15}
            pageSizeOptions={[10, 15, 25, 50]}
            minWidth={820}
            sort={sort ? { field: sort.key, direction: sort.direction } : null}
            onSort={requestSort}
            emptyMessage="No hay registros para mostrar."
            columns={[
              { id: 'name', label: 'Nombre', mobileTitle: true, render: (row) => row.nombre },
              { id: 'value', label: tab === 'conditions' ? 'Valor y unidad' : tab === 'categories' ? 'Descripción' : 'Símbolo', render: (row) => tab === 'conditions' ? `${row.valor ?? '-'} ${units.find((u) => String(u.id) === String(row.unidad))?.simbolo || ''}` : tab === 'categories' ? row.descripcion || '—' : row.simbolo },
              { id: 'category', label: tab === 'categories' ? 'Unidades vinculadas' : 'Magnitud', render: (row) => tab === 'categories' ? `${units.filter((unit) => String(unit.categoria) === String(row.id)).length} unidades` : row.magnitud_info?.nombre || row.categoria_info?.nombre || row.magnitud || row.categoria || 'General' },
              { id: 'status', label: 'Estado', render: (row) => <span className={ps.statusPill}><span className={`${ps.statusDot} ${ps.greenDot}`} />{row.activo === false ? 'Inactivo' : 'Activo'}</span> },
              { id: 'acciones', label: 'Acciones', sortable: false, mobileActions: true, minWidth: 180, render: (row) => tab === 'units' ? <><button type="button" className={ps.tableAction} title="Editar" onClick={() => openUnit(row)}><MoreHorizontal size={24} /></button><button type="button" className={ps.tableAction} onClick={() => toggleRecord(row)}>{row.activo === false ? 'Reactivar' : 'Desactivar'}</button></> : tab === 'categories' ? <><button type="button" className={ps.tableAction} title="Editar" onClick={() => openCategory(row)}><MoreHorizontal size={24} /></button><button type="button" className={ps.tableAction} onClick={() => toggleRecord(row)}>{row.activo === false ? 'Reactivar' : 'Desactivar'}</button></> : tab === 'conditions' ? <><button type="button" className={ps.tableAction} title="Editar" onClick={() => openCondition(row)}><MoreHorizontal size={24} /></button><button type="button" className={ps.tableAction} onClick={() => toggleRecord(row)}>{row.activo === false ? 'Reactivar' : 'Desactivar'}</button></> : <span style={{ color: '#777' }}>—</span> },
            ]}
          />

        </section>
      </div>

      {drawer ? (
        <UnitDrawer
          drawer={drawer}
          unitForm={unitForm}
          setUnitForm={setUnitForm}
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          conditionForm={conditionForm}
          setConditionForm={setConditionForm}
          units={units}
          categories={categories}
          submitUnit={submitUnit}
          submitCategory={submitCategory}
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
  categoryForm,
  setCategoryForm,
  conditionForm,
  setConditionForm,
  units,
  categories,
  submitUnit,
  submitCategory,
  submitCondition,
  close,
  saving,
}) {
  const isUnit = drawer === 'unit';
  const isCategory = drawer === 'category';
  const panelTitle = isUnit ? 'Nueva unidad' : isCategory ? 'Magnitud de medida' : 'Nueva condición de ensayo';
  const availableConditionUnits = units.filter((unit) => (
    String(unit.categoria) === String(conditionForm.magnitud_categoria)
    && (unit.activo !== false || String(unit.id) === String(conditionForm.unidad))
  ));
  return (
    <aside className={ps.sidePanel}>
      <div className={ps.sidePanelHeader}>
        <h2 className={ps.sidePanelTitle}>{panelTitle}</h2>
        <button type="button" className={ps.closeButton} onClick={close}><X size={25} /></button>
      </div>

      <form className={ps.formStack} onSubmit={isUnit ? submitUnit : isCategory ? submitCategory : submitCondition}>
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
              <label>Magnitud <b>*</b></label>
              <select className={ps.select} value={unitForm.categoria} onChange={(e) => setUnitForm({ ...unitForm, categoria: e.target.value })} required>
                <option value="">Seleccione una magnitud</option>
                {categories
                  .filter((category) => category.activo !== false || String(category.id) === String(unitForm.categoria))
                  .map((category) => <option key={category.id} value={category.id}>{category.nombre}{category.activo === false ? ' (inactiva)' : ''}</option>)}
              </select>
              <span className={ps.helpText}>Primero cree la magnitud en la pestaña «Magnitudes».</span>
            </div>
          </>
        ) : isCategory ? (
          <>
            <div className={ps.field}>
              <label>Nombre de la magnitud <b>*</b></label>
              <input className={ps.input} value={categoryForm.nombre} onChange={(e) => setCategoryForm({ ...categoryForm, nombre: e.target.value })} placeholder="Ej. Temperatura" required />
              <span className={ps.helpText}>Es la propiedad que se mide. Es única, sin distinguir mayúsculas o espacios adicionales.</span>
            </div>
            <div className={ps.field}>
              <label>Descripción</label>
              <textarea className={ps.textarea} value={categoryForm.descripcion} onChange={(e) => setCategoryForm({ ...categoryForm, descripcion: e.target.value })} placeholder="Qué se mide y cuándo usar esta magnitud." />
            </div>
          </>
        ) : (
          <>
            <div className={ps.field}>
              <label>Nombre descriptivo <b>*</b></label>
              <input className={ps.input} value={conditionForm.nombre} onChange={(e) => setConditionForm({ ...conditionForm, nombre: e.target.value })} placeholder="Ej. Viscosidad 40 °C" required />
              <span className={ps.helpText}>Describe el contexto de ensayo; no reemplaza la magnitud ni su unidad.</span>
            </div>
            <div className={ps.field}>
              <label>Magnitud <b>*</b></label>
              <select className={ps.select} value={conditionForm.magnitud_categoria} onChange={(e) => setConditionForm({ ...conditionForm, magnitud_categoria: e.target.value, unidad: '' })} required>
                <option value="">Seleccione una magnitud</option>
                {categories.filter((category) => category.activo !== false || String(category.id) === String(conditionForm.magnitud_categoria)).map((category) => (
                  <option key={category.id} value={category.id}>{category.nombre}{category.activo === false ? ' (inactiva)' : ''}</option>
                ))}
              </select>
              <span className={ps.helpText}>Controlada por el catálogo de magnitudes.</span>
            </div>
            <div className={ps.field}>
              <label>Valor <b>*</b></label>
              <input className={ps.input} type="number" step="any" value={conditionForm.valor} onChange={(e) => setConditionForm({ ...conditionForm, valor: e.target.value })} required />
            </div>
            <div className={ps.field}>
              <label>Unidad <b>*</b></label>
              <select className={ps.select} value={conditionForm.unidad} onChange={(e) => setConditionForm({ ...conditionForm, unidad: e.target.value })} required disabled={!conditionForm.magnitud_categoria}>
                <option value="">{conditionForm.magnitud_categoria ? 'Seleccione una unidad' : 'Primero seleccione una magnitud'}</option>
                {availableConditionUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.simbolo} · {unit.nombre}</option>)}
              </select>
              <span className={ps.helpText}>Solo se muestran unidades pertenecientes a la magnitud elegida.</span>
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
