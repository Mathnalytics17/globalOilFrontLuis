import { appDialog } from '@shared/ui/AppDialogProvider';
import { createContext, useContext, useEffect, useState } from 'react';
import { ChevronRight, Eye, Folder, FolderPlus, Pencil, Trash2, Wrench, MapPin, ListFilter, Link2, X } from 'lucide-react';
import { toast } from 'react-toastify';

import ModalCreationFile from './ModalCreationFile';
import { assetTreeService } from '@features/asset-tree/infrastructure/assetTreeService';
import { foldersService } from '@features/asset-tree/infrastructure/foldersService';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { sampleBatchesService } from '@features/samples/infrastructure/sampleBatchesService';
import { useAuth } from '@features/auth/presentation/context/AuthContext';
import OverflowMenu from '@shared/ui/OverflowMenu';
import GlobalOilLoader from '@shared/ui/GlobalOilLoader';

const ModalContext = createContext({ onHide: () => {} });
function Modal({ show, onHide, size, children }) {
  if (!show) return null;
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onHide?.()}><ModalContext.Provider value={{ onHide }}><section className={`w-full ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-auto rounded-xl border border-white/[0.08] bg-[#191b1e] shadow-2xl`}>{children}</section></ModalContext.Provider></div>;
}
Modal.Header = function ModalHeader({ closeButton, children }) { const { onHide } = useContext(ModalContext); return <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4"><div>{children}</div>{closeButton ? <button type="button" className="go-mini !h-8 !w-8 !p-0" onClick={onHide} aria-label="Cerrar"><X className="h-4 w-4" /></button> : null}</header>; };
Modal.Title = function ModalTitle({ children }) { return <h2 className="m-0 text-lg font-semibold text-white">{children}</h2>; };
Modal.Body = function ModalBody({ children, className = '' }) { return <div className={`p-5 ${className}`}>{children}</div>; };
Modal.Footer = function ModalFooter({ children }) { return <footer className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] px-5 py-4">{children}</footer>; };
function Button({ children, onClick, disabled, className = '', variant }) { return <button type="button" disabled={disabled} onClick={onClick} className={`${variant === 'danger' ? 'go-primary' : 'go-ghost'} ${className}`}>{children}</button>; }

const transformStructure = (folders = []) =>
  folders.map((folder) => ({
    id: folder.id,
    // The root has one source of truth: Empresa.nombre.  This fallback also
    // renders old trees correctly until the API reconciles their saved label.
    name: folder.typeFolder === 'root' ? (folder.compania_info?.nombre || folder.nombre) : folder.nombre,
    type: folder.typeFolder,
    company: folder.compania_info,
    machine: folder.machine_info,
    sample: folder.muestra_info,
    children: [
      ...transformStructure(folder.subfolders),
      ...(folder.sampling_points || []).map((point) => ({
        id: `point-${point.id}`,
        name: point.nombre,
        type: 'sampling-point',
        company: folder.compania_info,
        machine: folder.machine_info,
        point,
        children: [],
      })),
    ],
  }));

const loadTree = async () => {
  const response = await assetTreeService.getBasicStructure();
  return response.success ? transformStructure(response.structure) : [];
};

const TreeSkeleton = () => (
  <div className="space-y-3 p-6 animate-pulse">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="h-12 rounded bg-[#333]" />
    ))}
  </div>
);

const TreeNode = ({ node, reload }) => {
  const { loadUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pointOpen, setPointOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);

  const hasChildren = node.children.length > 0;
  const canCreate = node.type === 'root' || node.type === 'folder';

  const createChild = async (machineData, name, type) => {
    try {
      if (type === 'machine') {
        await machinesService.create({
          nombre: machineData.nombre,
          descripcion: machineData.descripcion,
          empresa: node.company?.id,
          // El backend crea el único nodo visual dentro del padre elegido.
          // No crear un segundo /folders/ aquí: eso dejaba la máquina creada
          // aunque la UI recibiera un error de restricción única.
          parent_folder: node.id,
        });
      } else {
        await foldersService.create({
          nombre: name,
          typeFolder: type,
          id_parent_node: String(node.id),
          compania: node.company?.id,
          isMachine: false,
          machine: null,
        });
      }
      toast.success(type === 'machine' ? 'Maquina creada' : 'Carpeta creada');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo crear el registro');
    }
  };

  const removeNode = async () => {
    const verb = ['sampling-point', 'machine'].includes(node.type) ? 'Desactivar' : 'Eliminar';
    if (!await appDialog.confirm(`${verb} "${node.name}"?`)) return;
    try {
      if (node.type === 'sampling-point') {
        await assetTreeService.removeSamplingPoint(node.point.id);
      } else if (node.machine?.id) {
        await machinesService.remove(node.machine.id);
      } else {
        await foldersService.remove(node.id);
      }
      toast.success(['sampling-point', 'machine'].includes(node.type) ? 'Registro desactivado' : 'Carpeta eliminada');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar el registro');
    }
  };

  const renameFolder = async () => {
    const name = await appDialog.prompt('Nuevo nombre de la carpeta:', node.name);
    if (name === null || !name.trim() || name.trim() === node.name) return;
    try {
      await foldersService.patch(node.id, { nombre: name.trim() });
      toast.success('Carpeta renombrada.');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo renombrar la carpeta');
    }
  };

  const renameCompany = async () => {
    if (!node.company?.id) {
      toast.error('No fue posible identificar la empresa de este nodo.');
      return;
    }
    const name = await appDialog.prompt('Nuevo nombre de la empresa:', node.company.nombre || node.name);
    if (name === null || !name.trim() || name.trim() === node.company.nombre) return;
    try {
      await companiesService.patch(node.company.id, { nombre: name.trim() });
      await loadUser({ silent: true });
      toast.success('Empresa renombrada. El nodo raíz se actualizó automáticamente.');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.response?.data?.nombre?.[0] || 'No se pudo renombrar la empresa');
    }
  };

  const openFilteredLots = () => {
    const params = new URLSearchParams();
    if (node.type === 'sampling-point') params.set('sampling_point_id', node.point.id);
    else params.set('machine_id', node.machine.id);
    window.location.href = `/muestras/lotes?${params.toString()}`;
  };

  const editMachine = () => {
    window.location.href = `/machines/edit-machine?id=${node.machine.id}`;
  };

  return (
    <li className="list-none">
      <div className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.025]">
        <button type="button" title={hasChildren ? 'Expandir' : 'Sin elementos internos'} className="grid h-8 w-8 place-items-center rounded-md text-[#777d86] hover:bg-white/[0.05] hover:text-white disabled:opacity-25" disabled={!hasChildren} onClick={() => setOpen((value) => !value)}>
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        {node.type === 'machine' ? <Wrench className="h-[17px] w-[17px] text-[#7bca9b]" /> : node.type === 'sampling-point' ? <MapPin className="h-[17px] w-[17px] text-[#d9b36e]" /> : <Folder className="h-[17px] w-[17px] text-[#6f9fd8]" />}
        <span className="min-w-0 flex-1 truncate text-sm text-[#e5e7ea]">{node.name}</span>
        <OverflowMenu items={[
          canCreate ? { label: 'Crear carpeta o máquina', icon: FolderPlus, onClick: () => setCreateOpen(true) } : null,
          node.type === 'root' ? { label: 'Cambiar nombre de empresa', icon: Pencil, onClick: renameCompany } : null,
          node.type === 'folder' ? { label: 'Renombrar carpeta', icon: Pencil, onClick: renameFolder } : null,
          node.type === 'machine' ? { label: 'Ver lotes de este equipo', icon: ListFilter, onClick: openFilteredLots } : null,
          node.type === 'machine' ? { label: 'Crear punto de muestreo', icon: MapPin, onClick: () => setPointOpen(true) } : null,
          node.type === 'machine' ? { label: 'Ver máquina', icon: Eye, onClick: () => setDetailOpen(true) } : null,
          node.type === 'machine' ? { label: 'Editar máquina', icon: Pencil, onClick: editMachine } : null,
          node.type === 'sampling-point' ? { label: 'Ver lotes de este punto', icon: ListFilter, onClick: openFilteredLots } : null,
          node.type === 'sampling-point' ? { label: 'Asignar muestras existentes a este punto', icon: Link2, onClick: () => setOrganizeOpen(true) } : null,
          node.type === 'sampling-point' ? { label: 'Editar punto', icon: Pencil, onClick: () => setPointOpen(true) } : null,
          node.type !== 'root' ? { separator: true } : null,
          node.type !== 'root' ? { label: ['sampling-point', 'machine'].includes(node.type) ? 'Desactivar' : 'Eliminar carpeta', icon: Trash2, danger: true, onClick: removeNode } : null,
        ]} />
      </div>

      <ModalCreationFile
        show={createOpen}
        onHide={() => setCreateOpen(false)}
        onCreate={createChild}
        compania_id={node.company?.id}
      />

      <Modal show={detailOpen} onHide={() => setDetailOpen(false)} centered>
        <Modal.Header closeButton className="bg-[#17191c] text-white">
          <Modal.Title>{node.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#141518] text-white">
          <p><strong>Empresa:</strong> {node.company?.nombre || 'No especificada'}</p>
          <p><strong>Codigo:</strong> {node.machine?.codigo_equipo || 'No especificado'}</p>
          <p><strong>Serie:</strong> {node.machine?.numero_serie || 'No especificada'}</p>
          <p><strong>Componente:</strong> {node.machine?.componente || 'No especificado'}</p>
          <p><strong>Tipo de aceite:</strong> {node.machine?.tipoAceite || 'No especificado'}</p>
          <p><strong>Ubicación:</strong> {node.company?.nombre || 'Empresa'} / {node.name}</p>
        </Modal.Body>
        <Modal.Footer className="bg-[#141518]">
          <Button variant="secondary" onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

      <SamplingPointModal
        show={pointOpen}
        machine={node.machine}
        point={node.point}
        onHide={() => setPointOpen(false)}
        onSaved={() => { setPointOpen(false); reload(); }}
      />

      <OrganizePointModal
        show={organizeOpen}
        point={node.point}
        machine={node.machine}
        onHide={() => setOrganizeOpen(false)}
        onSaved={() => { setOrganizeOpen(false); reload(); }}
      />

      {open && hasChildren && (
        <ul className="ml-6 border-l border-white/[0.06] pl-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} reload={reload} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function RecursiveFolderDocumentStructure() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    try {
      setLoading(true);
      setError('');
      setTree(await loadTree());
    } catch (requestError) {
      setError(requestError.message || 'No se pudo cargar la estructura');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <main className="go-page">
      <div className="go-shell max-w-[1180px]">
        <header className="go-header">
          <div><h1>Estructura de activos</h1><p>Organización jerárquica de empresas, carpetas, máquinas y puntos de muestreo.</p></div>
        </header>
        <section className="go-card !p-3">
          {loading && <TreeSkeleton />}
          {!loading && error && <p className="p-4 text-[#e58b91]">{error}</p>}
          {!loading && !error && tree.length === 0 && <div className="go-empty-state">No hay estructura registrada.</div>}
          {!loading && !error && tree.length > 0 && <ul className="space-y-1">{tree.map((node) => <TreeNode key={node.id} node={node} reload={reload} />)}</ul>}
        </section>
      </div>
    </main>
  );
}

const SamplingPointModal = ({ show, machine, point, onHide, onSaved }) => {
  const [form, setForm] = useState({ nombre: '', codigo: '', descripcion: '', lubricante: '', lubricante_catalogo: '', lubricante_fabricante: '', lubricante_referencia: '', frecuencia_cambio: '', unidad_frecuencia_cambio: 'horas', frecuencia_analisis: '', unidad_frecuencia_analisis: 'horas' });
  const [lubricants, setLubricants] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!show) return;
    setForm(point ? {
      nombre: point.nombre || '', codigo: point.codigo || '', descripcion: point.descripcion || '', lubricante: point.lubricante || '', lubricante_catalogo: point.lubricante_catalogo ? String(point.lubricante_catalogo) : '', lubricante_fabricante: '', lubricante_referencia: '', frecuencia_cambio: point.frecuencia_cambio ?? '', unidad_frecuencia_cambio: point.unidad_frecuencia_cambio || 'horas', frecuencia_analisis: point.frecuencia_analisis ?? '', unidad_frecuencia_analisis: point.unidad_frecuencia_analisis || 'horas',
    } : { nombre: '', codigo: '', descripcion: '', lubricante: '', lubricante_catalogo: '', lubricante_fabricante: '', lubricante_referencia: '', frecuencia_cambio: '', unidad_frecuencia_cambio: 'horas', frecuencia_analisis: '', unidad_frecuencia_analisis: 'horas' });
  }, [show, point]);
  useEffect(() => {
    if (!show) return;
    assetTreeService.listLubricants({ page_size: 1000 })
      .then(setLubricants)
      .catch(() => toast.error('No se pudo cargar el catálogo de lubricantes.'));
  }, [show]);
  const save = async () => {
    if (!form.nombre.trim()) return toast.error('Escriba el nombre del punto');
    setSaving(true);
    try {
      let lubricantId = form.lubricante_catalogo || null;
      if (form.lubricante_fabricante.trim() || form.lubricante_referencia.trim()) {
        if (!form.lubricante_fabricante.trim() || !form.lubricante_referencia.trim()) {
          toast.error('Para crear un lubricante indique fabricante y referencia / marca.');
          return;
        }
        const lubricant = await assetTreeService.createLubricant({ fabricante: form.lubricante_fabricante.trim(), referencia: form.lubricante_referencia.trim() });
        lubricantId = lubricant.id;
      }
      const { lubricante_fabricante, lubricante_referencia, ...pointFields } = form;
      const payload = { ...pointFields, lubricante_catalogo: lubricantId, nombre: form.nombre.trim(), maquina: machine.id, frecuencia_cambio: form.frecuencia_cambio === '' ? null : Number(form.frecuencia_cambio), frecuencia_analisis: form.frecuencia_analisis === '' ? null : Number(form.frecuencia_analisis) };
      if (point) await assetTreeService.updateSamplingPoint(point.id, payload);
      else await assetTreeService.createSamplingPoint(payload);
      toast.success(point ? 'Punto de muestreo actualizado' : 'Punto de muestreo creado');
      setForm({ nombre: '', codigo: '', descripcion: '', lubricante: '', lubricante_catalogo: '', lubricante_fabricante: '', lubricante_referencia: '', frecuencia_cambio: '', unidad_frecuencia_cambio: 'horas', frecuencia_analisis: '', unidad_frecuencia_analisis: 'horas' });
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.nombre?.[0] || error.response?.data?.detail || 'No se pudo crear el punto');
    } finally { setSaving(false); }
  };
  return (
    <Modal show={Boolean(show && machine)} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-[#17191c] text-white"><Modal.Title>{point ? 'Editar punto de muestreo' : 'Nuevo punto de muestreo'}</Modal.Title></Modal.Header>
      <Modal.Body className="space-y-3 bg-[#141518] text-white">
        <p className="text-sm text-gray-400">Quedara dentro de <strong>{machine?.nombre}</strong> y sera un nodo terminal.</p>
        <input className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" placeholder="Codigo opcional" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">Lubricante predeterminado</label>
          <select className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" value={form.lubricante_catalogo} onChange={(e) => setForm({ ...form, lubricante_catalogo: e.target.value })}>
            <option value="">Sin lubricante de catálogo</option>
            {lubricants.map((item) => <option key={item.id} value={item.id}>{item.fabricante} · {item.referencia}</option>)}
          </select>
          {point?.lubricante && !point?.lubricante_catalogo ? <p className="m-0 text-xs text-amber-300">Registro histórico sin catálogo: {point.lubricante}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <input className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" placeholder="Nuevo: fabricante" value={form.lubricante_fabricante} onChange={(e) => setForm({ ...form, lubricante_fabricante: e.target.value })} />
            <input className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" placeholder="Nueva: referencia / marca" value={form.lubricante_referencia} onChange={(e) => setForm({ ...form, lubricante_referencia: e.target.value })} />
          </div>
          <p className="m-0 text-xs text-gray-500">Si no está en el catálogo, complete fabricante y referencia: se crea y queda asignado a este punto.</p>
        </div>
        <div className="grid grid-cols-2 gap-2"><div ><input className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" type="number" min="0" placeholder="Frecuencia de cambio" value={form.frecuencia_cambio} onChange={(e) => setForm({ ...form, frecuencia_cambio: e.target.value })} /></div><div ><select className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" value={form.unidad_frecuencia_cambio} onChange={(e) => setForm({ ...form, unidad_frecuencia_cambio: e.target.value })}><option value="horas">Horas</option><option value="km">Kilómetros</option><option value="dias">Días</option></select></div></div>
        <div className="grid grid-cols-2 gap-2"><div ><input className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" type="number" min="0" placeholder="Frecuencia de análisis" value={form.frecuencia_analisis} onChange={(e) => setForm({ ...form, frecuencia_analisis: e.target.value })} /></div><div ><select className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" value={form.unidad_frecuencia_analisis} onChange={(e) => setForm({ ...form, unidad_frecuencia_analisis: e.target.value })}><option value="horas">Horas</option><option value="km">Kilómetros</option><option value="dias">Días</option></select></div></div>
        <textarea className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" placeholder="Descripcion opcional" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      </Modal.Body>
      <Modal.Footer className="bg-[#141518]"><Button variant="secondary" onClick={onHide}>Cancelar</Button><Button variant="danger" disabled={saving} onClick={save}>{saving ? 'Guardando...' : point ? 'Guardar cambios' : 'Crear punto'}</Button></Modal.Footer>
    </Modal>
  );
};

const OrganizePointModal = ({ show, point, machine, onHide, onSaved }) => {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [samples, setSamples] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show || !machine?.id) return;
    setLoading(true);
    sampleBatchesService.list({ machine_id: machine.id, page_size: 200 })
      .then(setBatches).catch(() => toast.error('No se pudieron cargar los lotes de la maquina'))
      .finally(() => setLoading(false));
  }, [show, machine?.id]);

  const selectBatch = async (id) => {
    setBatchId(id); setSamples([]); setSelected([]);
    if (!id) return;
    setLoading(true);
    try {
      const detail = await sampleBatchesService.getById(id);
      const eligible = (detail.muestras || []).filter((sample) => Number(sample.referencia_equipo) === Number(machine.id));
      setSamples(eligible);
    } catch { toast.error('No se pudo cargar el lote'); }
    finally { setLoading(false); }
  };

  const assign = async (wholeBatch) => {
    if (!wholeBatch && !selected.length) return toast.error('Seleccione al menos una muestra');
    setSaving(true);
    try {
      const result = await assetTreeService.organizeSamplingPoint(point.id, wholeBatch ? { lote_id: batchId } : { sample_ids: selected });
      const skipped = result.resumen?.omitidas || 0;
      toast.success(`${result.resumen?.asignadas || 0} muestra(s) asociadas${skipped ? `; ${skipped} omitidas por pertenecer a otra maquina` : ''}`);
      onSaved();
    } catch (error) { toast.error(error.response?.data?.detail || 'No se pudieron organizar las muestras'); }
    finally { setSaving(false); }
  };

  return (
    <Modal show={Boolean(show && point)} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-[#17191c] text-white"><Modal.Title>Asignar muestras al punto · {point?.nombre}</Modal.Title></Modal.Header>
      <Modal.Body className="bg-[#141518] text-white">
        <p className="text-sm text-gray-400">Use esta acción solo para corregir la asociación de muestras que ya existen. Se moverán a <strong>{point?.nombre}</strong> y conservarán su lote, resultados e historial. Solo se muestran muestras de <strong>{machine?.nombre}</strong>.</p>
        <select className="w-full rounded-md border border-[#353940] bg-[#141518] px-3 py-2 text-sm text-white" value={batchId} onChange={(e) => selectBatch(e.target.value)} disabled={loading}>
          <option value="">Seleccione un lote de esta maquina</option>
          {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id} · {batch.cliente_nombre || 'Sin cliente'} ({batch.muestras_coincidentes ?? batch.total_muestras} coinciden)</option>)}
        </select>
        {loading && <div className="mt-3"><GlobalOilLoader label="Cargando estructura de activos..." /></div>}
        {!loading && batchId && <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/[0.06] bg-[#151719] p-2">
          {samples.map((sample) => <label key={sample.id} className="flex items-center gap-3 border-b border-white/[0.07] p-2 last:border-0">
            <input type="checkbox" checked={selected.includes(sample.id)} onChange={(e) => setSelected((items) => e.target.checked ? [...items, sample.id] : items.filter((id) => id !== sample.id))} />
            <span><strong>{sample.id}</strong><small className="block text-gray-400">{sample.punto_muestreo ? `Punto actual: ${sample.punto_muestreo.nombre}` : 'Sin punto asignado'}</small></span>
          </label>)}
          {!samples.length && <p className="p-3 text-gray-400">Este lote no tiene muestras compatibles.</p>}
        </div>}
      </Modal.Body>
      <Modal.Footer className="bg-[#141518]"><Button variant="secondary" onClick={onHide}>Cancelar</Button><Button variant="outline-warning" disabled={!batchId || saving} onClick={() => assign(true)}>Mover todas las compatibles</Button><Button variant="danger" disabled={!selected.length || saving} onClick={() => assign(false)}>{saving ? 'Guardando...' : `Mover ${selected.length} seleccionada(s) al punto`}</Button></Modal.Footer>
    </Modal>
  );
};
