
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { technicalConfigService } from '../../infrastructure/technicalConfigService';
import { apiErrorToText, slugify } from '../components/technicalConfigUtils';
import ps from '../components/TechnicalPs5.module.css';
import PaginationBar from '../../../../../src/components/pagination/PaginationBar';
import SortableTableHeader from '@components/SortableTableHeader';
import useTableSort from '@hooks/useTableSort';

const EMPTY_CATALOG = {
  nombre: '',
  codigo: '',
  tipo_muestra: 'aceite',
  descripcion: '',
  activo: true,
  es_requerido_en_muestra: true,
  permite_desconocido: true,
  orden: 1,
};

const EMPTY_ITEM = { nombre: '', codigo: '', descripcion: '', activo: true };

const appliesLabel = (value) => {
  const v = String(value || '').toLowerCase();
  if (v === 'aceite') return 'Aceites';
  if (v === 'grasa') return 'Grasas';
  if (v === 'ambos') return 'General';
  return value || 'General';
};

export default function TechnicalCatalogsPage() {
  const [catalogs, setCatalogs] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [catalogForm, setCatalogForm] = useState(EMPTY_CATALOG);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [editingCatalogId, setEditingCatalogId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(20);
  const [catalogMeta, setCatalogMeta] = useState({ count: 0 });
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useState(20);
  const [itemMeta, setItemMeta] = useState({ count: 0 });

  const selectedCatalog = useMemo(
    () => catalogs.find((catalog) => String(catalog.id) === String(selectedCatalogId)),
    [catalogs, selectedCatalogId]
  );

  const itemCounts = useMemo(() => {
    const map = new Map();
    catalogs.forEach((catalog) => {
      map.set(String(catalog.id), Array.isArray(catalog.items) ? catalog.items.length : (catalog.items_count || catalog.total_items || 0));
    });
    return map;
  }, [catalogs]);

  const filteredCatalogs = catalogs;
  const selectedItems = items;
  const catalogSortColumns = useMemo(() => ({
    nombre: (row) => row.nombre,
    aplica: (row) => appliesLabel(row.tipo_muestra),
    items: (row) => itemCounts.get(String(row.id)) || 0,
    estado: (row) => row.activo,
  }), [itemCounts]);
  const { sortedRows: sortedCatalogs, sort: catalogSort, requestSort: sortCatalogs } = useTableSort(
    filteredCatalogs,
    catalogSortColumns,
    { key: 'nombre', direction: 'asc' }
  );
  const { sortedRows: sortedItems, sort: itemSort, requestSort: sortItems } = useTableSort(
    selectedItems,
    {
      item: (row) => row.nombre,
      codigo: (row) => row.codigo,
      estado: (row) => row.activo,
    },
    { key: 'item', direction: 'asc' }
  );

  const loadCatalogs = async () => {
    try {
      const data = await technicalConfigService.pageCatalogs({
        incluir_eliminados: true,
        page: catalogPage,
        page_size: catalogPageSize,
        search,
      });
      setCatalogs(data.results || []);
      setCatalogMeta({ count: data.count || 0 });
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudieron cargar los catálogos.');
    }
  };

  const loadItems = async () => {
    if (!selectedCatalogId) {
      setItems([]);
      setItemMeta({ count: 0 });
      return;
    }
    try {
      const data = await technicalConfigService.pageCatalogItems({
        incluir_eliminados: true,
        catalogo: selectedCatalogId,
        page: itemPage,
        page_size: itemPageSize,
      });
      setItems(data.results || []);
      setItemMeta({ count: data.count || 0 });
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudieron cargar los ítems.');
    }
  };

  const load = async () => {
    await Promise.all([loadCatalogs(), loadItems()]);
  };

  useEffect(() => { loadCatalogs(); }, [catalogPage, catalogPageSize, search]);
  useEffect(() => { loadItems(); }, [selectedCatalogId, itemPage, itemPageSize]);

  const openNewCatalog = () => {
    setEditingCatalogId(null);
    setCatalogForm(EMPTY_CATALOG);
    setDrawer('catalog');
  };

  const openEditCatalog = (catalog) => {
    setEditingCatalogId(catalog.id);
    setCatalogForm({
      nombre: catalog.nombre || '',
      codigo: catalog.codigo || '',
      tipo_muestra: catalog.tipo_muestra || 'ambos',
      descripcion: catalog.descripcion || '',
      activo: catalog.activo !== false,
      es_requerido_en_muestra: catalog.es_requerido_en_muestra !== false,
      permite_desconocido: catalog.permite_desconocido !== false,
      orden: catalog.orden || 1,
    });
    setDrawer('catalog');
  };

  const openNewItem = () => {
    setEditingItemId(null);
    setItemForm(EMPTY_ITEM);
    setDrawer('item');
  };

  const openEditItem = (item) => {
    setEditingItemId(item.id);
    setItemForm({
      nombre: item.nombre || '',
      codigo: item.codigo || '',
      descripcion: item.descripcion || '',
      activo: item.activo !== false,
    });
    setDrawer('item');
  };

  const saveCatalog = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...catalogForm,
        codigo: slugify(catalogForm.codigo || catalogForm.nombre),
      };
      const saved = editingCatalogId
        ? await technicalConfigService.updateCatalog(editingCatalogId, payload)
        : await technicalConfigService.createCatalog(payload);
      toast.success(editingCatalogId ? 'Catálogo actualizado.' : 'Catálogo creado.');
      setDrawer(null);
      await load();
      setSelectedCatalogId(String(saved?.id || editingCatalogId || ''));
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudo guardar el catálogo.');
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (event) => {
    event.preventDefault();
    if (!selectedCatalogId) {
      toast.warning('Seleccione un catálogo.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        catalogo: selectedCatalogId,
        nombre: itemForm.nombre,
        codigo: slugify(itemForm.codigo || itemForm.nombre),
        descripcion: itemForm.descripcion || '',
        activo: itemForm.activo !== false,
      };
      if (editingItemId) await technicalConfigService.updateCatalogItem(editingItemId, payload);
      else await technicalConfigService.createCatalogItem(payload);
      toast.success(editingItemId ? 'Item actualizado.' : 'Item creado.');
      setDrawer(null);
      await load();
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudo guardar el item.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCatalog = async (catalog) => {
    if (!catalog?.id) return;
    if (!window.confirm(`Desactivar el catálogo "${catalog.nombre}"?`)) return;
    try {
      await technicalConfigService.deleteCatalog(catalog.id);
      toast.success('Catálogo desactivado.');
      setSelectedCatalogId('');
      await load();
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudo desactivar el catálogo.');
    }
  };

  const deleteItem = async (item) => {
    if (!item?.id) return;
    if (!window.confirm(`Desactivar el item "${item.nombre}"?`)) return;
    try {
      await technicalConfigService.deleteCatalogItem(item.id);
      toast.success('Item desactivado.');
      await load();
    } catch (error) {
      toast.error(apiErrorToText(error) || 'No se pudo desactivar el item.');
    }
  };

  if (selectedCatalog) {
    return (
      <main className={ps.page}>
        <div className={ps.pageScroll}>
          <section className={ps.wideShell}>
            <button type="button" className={ps.backButton} onClick={() => setSelectedCatalogId('')}>
              <ArrowLeft size={21} />
              Catálogos técnicos
            </button>

            <header className={ps.header}>
              <div className={ps.headerMain}>
                <h1 className={ps.sectionTitle}>{selectedCatalog.nombre}</h1>
                <p className={ps.subtitle}>
                  {appliesLabel(selectedCatalog.tipo_muestra)} · {selectedItems.length} items · <span style={{ color: selectedCatalog.activo === false ? '#ef232a' : '#58c878' }}>●</span> {selectedCatalog.activo === false ? 'Inactivo' : 'Activo'}
                </p>
              </div>
              <div className={ps.actionsRight}>
                <button type="button" className={ps.buttonPrimary} onClick={openNewItem}>
                  <Plus size={21} /> Nuevo item
                </button>
                <button type="button" className={ps.buttonSecondary} onClick={() => openEditCatalog(selectedCatalog)}>
                  <Edit3 size={18} /> Editar catálogo
                </button>
                <button type="button" className={ps.buttonSecondary} onClick={() => deleteCatalog(selectedCatalog)}>
                  <Trash2 size={18} /> Desactivar
                </button>
              </div>
            </header>

            <table className={ps.linearTable}>
              <thead>
                <tr>
                  <SortableTableHeader columnKey="item" label="Item" sort={itemSort} onSort={sortItems} />
                  <SortableTableHeader columnKey="codigo" label="Código" sort={itemSort} onSort={sortItems} />
                  <SortableTableHeader columnKey="estado" label="Estado" sort={itemSort} onSort={sortItems} />
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.codigo}</td>
                    <td><span className={ps.statusPill}><span className={`${ps.statusDot} ${item.activo === false ? '' : ps.greenDot}`} />{item.activo === false ? 'Inactivo' : 'Activo'}</span></td>
                    <td>
                      <button className={ps.tableAction} type="button" onClick={() => openEditItem(item)}>
                        <Edit3 size={18} /> Editar
                      </button>
                      <button className={ps.tableAction} type="button" onClick={() => deleteItem(item)}>
                        <Trash2 size={18} /> Desactivar
                      </button>
                    </td>
                  </tr>
                ))}
                {!selectedItems.length ? (
                  <tr><td colSpan="4" style={{ color: '#999' }}>Este catálogo todavía no tiene items.</td></tr>
                ) : null}
              </tbody>
            </table>
            <PaginationBar count={itemMeta.count} page={itemPage} pageSize={itemPageSize} onPageChange={setItemPage} onPageSizeChange={(size) => { setItemPage(1); setItemPageSize(size); }} />
          </section>
        </div>

        {drawer ? (
          <CatalogDrawer
            drawer={drawer}
            title={drawer === 'catalog' ? (editingCatalogId ? 'Editar catálogo' : 'Nuevo catálogo') : (editingItemId ? 'Editar item' : 'Nuevo item')}
            catalogForm={catalogForm}
            setCatalogForm={setCatalogForm}
            itemForm={itemForm}
            setItemForm={setItemForm}
            saveCatalog={saveCatalog}
            saveItem={saveItem}
            close={() => setDrawer(null)}
            saving={saving}
          />
        ) : null}
      </main>
    );
  }

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
              <h1 className={ps.sectionTitle}>Catálogos técnicos</h1>
              <p className={ps.subtitle}>Listas base usadas por muestras, límites y asignación de pruebas.</p>
            </div>
          </header>

          <div className={ps.searchActionLine}>
            <div className={ps.searchBox}>
              <Search size={22} />
              <input className={ps.searchInput} value={search} onChange={(e) => { setCatalogPage(1); setSearch(e.target.value); }} placeholder="Buscar catálogo..." />
            </div>
            <button type="button" className={ps.buttonPrimary} onClick={openNewCatalog}>
              <Plus size={22} /> Nuevo catálogo
            </button>
          </div>

          <table className={ps.linearTable}>
            <thead>
              <tr>
                <SortableTableHeader columnKey="nombre" label="Nombre" sort={catalogSort} onSort={sortCatalogs} />
                <SortableTableHeader columnKey="aplica" label="Aplica para" sort={catalogSort} onSort={sortCatalogs} />
                <SortableTableHeader columnKey="items" label="Items" sort={catalogSort} onSort={sortCatalogs} />
                <SortableTableHeader columnKey="estado" label="Estado" sort={catalogSort} onSort={sortCatalogs} />
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedCatalogs.map((catalog, index) => (
                <tr key={catalog.id} className={index === 0 ? ps.selected : ''}>
                  <td>{catalog.nombre}</td>
                  <td>{appliesLabel(catalog.tipo_muestra)}</td>
                  <td>{itemCounts.get(String(catalog.id)) || 0}</td>
                  <td><span className={ps.statusPill}>{catalog.activo === false ? 'Inactivo' : 'Activo'}</span></td>
                  <td>
                    <button type="button" className={ps.tableAction} onClick={() => { setItemPage(1); setSelectedCatalogId(String(catalog.id)); }}>
                      Ver <ChevronRight size={22} />
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredCatalogs.length ? (
                <tr><td colSpan="5" style={{ color: '#999' }}>No hay catálogos para mostrar.</td></tr>
              ) : null}
            </tbody>
          </table>

          <PaginationBar count={catalogMeta.count} page={catalogPage} pageSize={catalogPageSize} onPageChange={setCatalogPage} onPageSizeChange={(size) => { setCatalogPage(1); setCatalogPageSize(size); }} />

          <footer className={ps.footerNote}>
            <span>© 2025 Global Oil. Todos los derechos reservados.</span>
            <span>Versión 1.0.0</span>
          </footer>
        </section>
      </div>

      {drawer ? (
        <CatalogDrawer
          drawer={drawer}
          title={drawer === 'catalog' ? (editingCatalogId ? 'Editar catálogo' : 'Nuevo catálogo') : (editingItemId ? 'Editar item' : 'Nuevo item')}
          catalogForm={catalogForm}
          setCatalogForm={setCatalogForm}
          itemForm={itemForm}
          setItemForm={setItemForm}
          saveCatalog={saveCatalog}
          saveItem={saveItem}
          close={() => setDrawer(null)}
          saving={saving}
        />
      ) : null}
    </main>
  );
}

function CatalogDrawer({
  drawer,
  title,
  catalogForm,
  setCatalogForm,
  itemForm,
  setItemForm,
  saveCatalog,
  saveItem,
  close,
  saving,
}) {
  const isCatalog = drawer === 'catalog';
  return (
    <aside className={ps.sidePanel}>
      <div className={ps.sidePanelHeader}>
        <h2 className={ps.sidePanelTitle}>{title}</h2>
        <button type="button" className={ps.closeButton} onClick={close}><X size={25} /></button>
      </div>

      <form className={ps.formStack} onSubmit={isCatalog ? saveCatalog : saveItem}>
        {isCatalog ? (
          <>
            <div className={ps.field}>
              <label>Nombre <b>*</b></label>
              <input className={ps.input} value={catalogForm.nombre} onChange={(e) => setCatalogForm({ ...catalogForm, nombre: e.target.value })} placeholder="Ej. Grado de viscosidad" required />
              <span className={ps.helpText}>Nombre visible del catálogo.</span>
            </div>
            <div className={ps.field}>
              <label>Código</label>
              <input className={ps.input} value={catalogForm.codigo} onChange={(e) => setCatalogForm({ ...catalogForm, codigo: e.target.value })} placeholder="Se genera si lo deja vacío" />
            </div>
            <div className={ps.field}>
              <label>Aplica para <b>*</b></label>
              <select className={ps.select} value={catalogForm.tipo_muestra} onChange={(e) => setCatalogForm({ ...catalogForm, tipo_muestra: e.target.value })}>
                <option value="aceite">Aceites</option>
                <option value="grasa">Grasas</option>
                <option value="ambos">General</option>
              </select>
            </div>
            <div className={ps.field}>
              <label>Descripción</label>
              <textarea className={ps.textarea} value={catalogForm.descripcion} onChange={(e) => setCatalogForm({ ...catalogForm, descripcion: e.target.value })} placeholder="Descripción opcional" />
            </div>
          </>
        ) : (
          <>
            <div className={ps.field}>
              <label>Nombre del item <b>*</b></label>
              <input className={ps.input} value={itemForm.nombre} onChange={(e) => setItemForm({ ...itemForm, nombre: e.target.value })} placeholder="Ingrese el nombre del item" required />
            </div>
            <div className={ps.field}>
              <label>Código</label>
              <input className={ps.input} value={itemForm.codigo} onChange={(e) => setItemForm({ ...itemForm, codigo: e.target.value })} placeholder="Ingrese el código" />
            </div>
            <div className={ps.field}>
              <label>Descripción</label>
              <textarea className={ps.textarea} value={itemForm.descripcion} onChange={(e) => setItemForm({ ...itemForm, descripcion: e.target.value })} placeholder="Ingresa la descripción del item" />
            </div>
          </>
        )}

        <div className={ps.panelFooter}>
          <button type="button" className={ps.buttonSecondary} onClick={close}>Cancelar</button>
          <button type="submit" className={ps.buttonPrimary} disabled={saving}>
            {isCatalog ? 'Guardar catálogo' : 'Crear item'}
          </button>
        </div>
      </form>
    </aside>
  );
}
