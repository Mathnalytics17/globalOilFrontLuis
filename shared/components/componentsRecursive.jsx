import { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { ChevronRight, Eye, Folder, FolderPlus, Pencil, Trash2, Wrench, MapPin, ListFilter, Link2 } from 'lucide-react';
import { toast } from 'react-toastify';

import ModalCreationFile from '@components/modals/modalCreationFile';
import { assetTreeService } from '@features/asset-tree/infrastructure/assetTreeService';
import { foldersService } from '@features/asset-tree/infrastructure/foldersService';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { sampleBatchesService } from '@features/samples/infrastructure/sampleBatchesService';

const transformStructure = (folders = []) =>
  folders.map((folder) => ({
    id: folder.id,
    name: folder.nombre,
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
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pointOpen, setPointOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);

  const hasChildren = node.children.length > 0;
  const canCreate = node.type === 'root' || node.type === 'folder';

  const createChild = async (machineData, name, type) => {
    let machine;
    try {
      if (type === 'machine') {
        machine = await machinesService.create({
          nombre: machineData.nombre,
          componente: machineData.descripcion,
          empresa: node.company?.id,
        });
      }

      await foldersService.create({
        nombre: name,
        typeFolder: type,
        id_parent_node: String(node.id),
        compania: node.company?.id,
        isMachine: type === 'machine',
        machine: machine?.id || null,
      });
      toast.success(type === 'machine' ? 'Maquina creada' : 'Carpeta creada');
      reload();
    } catch (error) {
      if (machine?.id) {
        await machinesService.remove(machine.id).catch(() => null);
      }
      toast.error(error.response?.data?.detail || 'No se pudo crear el registro');
    }
  };

  const removeNode = async () => {
    const verb = node.type === 'sampling-point' ? 'Desactivar' : 'Eliminar';
    if (!window.confirm(`${verb} "${node.name}"?`)) return;
    try {
      if (node.type === 'sampling-point') {
        await assetTreeService.removeSamplingPoint(node.point.id);
      } else if (node.machine?.id) {
        await machinesService.remove(node.machine.id);
      } else {
        await foldersService.remove(node.id);
      }
      toast.success('Registro eliminado');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar el registro');
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
      <div className="flex min-h-12 items-center gap-2 rounded px-2 py-2 hover:bg-[#333]">
        <button
          type="button"
          title={hasChildren ? 'Expandir' : 'Sin elementos internos'}
          className="grid h-8 w-8 place-items-center rounded hover:bg-[#444] disabled:opacity-30"
          disabled={!hasChildren}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>

        {node.type === 'machine' ? (
          <Wrench className="h-5 w-5 text-emerald-400" />
        ) : node.type === 'sampling-point' ? (
          <MapPin className="h-5 w-5 text-amber-400" />
        ) : (
          <Folder className="h-5 w-5 text-sky-400" />
        )}

        <span className="min-w-0 flex-1 truncate text-sm text-white">{node.name}</span>

        {canCreate && (
          <button type="button" title="Crear carpeta o maquina" onClick={() => setCreateOpen(true)}>
            <FolderPlus className="h-4 w-4 text-sky-400" />
          </button>
        )}
        {node.type === 'machine' && (
          <>
            <button type="button" title="Ver lotes y muestras de esta maquina" onClick={openFilteredLots}>
              <ListFilter className="h-4 w-4 text-amber-300" />
            </button>
            <button type="button" title="Crear punto de muestreo" onClick={() => setPointOpen(true)}>
              <MapPin className="h-4 w-4 text-amber-400" />
            </button>
            <button type="button" title="Ver maquina" onClick={() => setDetailOpen(true)}>
              <Eye className="h-4 w-4 text-blue-400" />
            </button>
            <button type="button" title="Editar maquina" onClick={editMachine}>
              <Pencil className="h-4 w-4 text-emerald-400" />
            </button>
          </>
        )}
        {node.type === 'sampling-point' && (
          <>
            <button type="button" title="Ver lotes y muestras asociadas" onClick={openFilteredLots}>
              <ListFilter className="h-4 w-4 text-sky-400" />
            </button>
            <button type="button" title="Organizar muestras en este punto" onClick={() => setOrganizeOpen(true)}>
              <Link2 className="h-4 w-4 text-emerald-400" />
            </button>
            <button type="button" title="Editar punto de muestreo" onClick={() => setPointOpen(true)}>
              <Pencil className="h-4 w-4 text-emerald-400" />
            </button>
          </>
        )}
        <button type="button" title="Eliminar" onClick={removeNode}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>

      <ModalCreationFile
        show={createOpen}
        onHide={() => setCreateOpen(false)}
        onCreate={createChild}
        compania_id={node.company?.id}
      />

      <Modal show={detailOpen} onHide={() => setDetailOpen(false)} centered>
        <Modal.Header closeButton className="bg-[#292929] text-white">
          <Modal.Title>{node.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#1a1a1a] text-white">
          <p><strong>Empresa:</strong> {node.company?.nombre || 'No especificada'}</p>
          <p><strong>Codigo:</strong> {node.machine?.codigo_equipo || 'No especificado'}</p>
          <p><strong>Serie:</strong> {node.machine?.numero_serie || 'No especificada'}</p>
          <p><strong>Componente:</strong> {node.machine?.componente || 'No especificado'}</p>
        </Modal.Body>
        <Modal.Footer className="bg-[#1a1a1a]">
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
        <ul className="ml-6 border-l border-[#444] pl-2">
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

  const syncRoots = async () => {
    try {
      const response = await assetTreeService.syncCompanyRoots();
      toast.success(response.message);
      reload();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'No se pudieron sincronizar las empresas');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Estructura de activos</h1>
            <p className="text-sm text-gray-400">Organizacion jerarquica de carpetas y maquinas.</p>
          </div>
          <Button variant="outline-warning" onClick={syncRoots}>
            <FolderPlus className="mr-2 inline h-4 w-4" />
            Sincronizar empresas
          </Button>
        </div>

        <div className="rounded border border-[#333] bg-[#292929] p-4">
          {loading && <TreeSkeleton />}
          {!loading && error && <p className="p-4 text-red-400">{error}</p>}
          {!loading && !error && tree.length === 0 && (
            <p className="p-4 text-sm text-gray-400">No hay estructura registrada.</p>
          )}
          {!loading && !error && tree.length > 0 && (
            <ul className="space-y-1">
              {tree.map((node) => <TreeNode key={node.id} node={node} reload={reload} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const SamplingPointModal = ({ show, machine, point, onHide, onSaved }) => {
  const [form, setForm] = useState({ nombre: '', codigo: '', descripcion: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!show) return;
    setForm(point ? {
      nombre: point.nombre || '', codigo: point.codigo || '', descripcion: point.descripcion || '',
    } : { nombre: '', codigo: '', descripcion: '' });
  }, [show, point]);
  const save = async () => {
    if (!form.nombre.trim()) return toast.error('Escriba el nombre del punto');
    setSaving(true);
    try {
      const payload = { ...form, nombre: form.nombre.trim(), maquina: machine.id };
      if (point) await assetTreeService.updateSamplingPoint(point.id, payload);
      else await assetTreeService.createSamplingPoint(payload);
      toast.success(point ? 'Punto de muestreo actualizado' : 'Punto de muestreo creado');
      setForm({ nombre: '', codigo: '', descripcion: '' });
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.nombre?.[0] || error.response?.data?.detail || 'No se pudo crear el punto');
    } finally { setSaving(false); }
  };
  return (
    <Modal show={Boolean(show && machine)} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-[#292929] text-white"><Modal.Title>{point ? 'Editar punto de muestreo' : 'Nuevo punto de muestreo'}</Modal.Title></Modal.Header>
      <Modal.Body className="space-y-3 bg-[#1a1a1a] text-white">
        <p className="text-sm text-gray-400">Quedara dentro de <strong>{machine?.nombre}</strong> y sera un nodo terminal.</p>
        <input className="form-control bg-dark text-white" placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input className="form-control bg-dark text-white" placeholder="Codigo opcional" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
        <textarea className="form-control bg-dark text-white" placeholder="Descripcion opcional" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      </Modal.Body>
      <Modal.Footer className="bg-[#1a1a1a]"><Button variant="secondary" onClick={onHide}>Cancelar</Button><Button variant="danger" disabled={saving} onClick={save}>{saving ? 'Guardando...' : point ? 'Guardar cambios' : 'Crear punto'}</Button></Modal.Footer>
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
      <Modal.Header closeButton className="bg-[#292929] text-white"><Modal.Title>Organizar muestras · {point?.nombre}</Modal.Title></Modal.Header>
      <Modal.Body className="bg-[#1a1a1a] text-white">
        <p className="text-sm text-gray-400">Solo se asociaran muestras cuya maquina sea <strong>{machine?.nombre}</strong>. Esto no modifica el ingreso del lote.</p>
        <select className="form-select bg-dark text-white" value={batchId} onChange={(e) => selectBatch(e.target.value)} disabled={loading}>
          <option value="">Seleccione un lote de esta maquina</option>
          {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id} · {batch.cliente_nombre || 'Sin cliente'} ({batch.muestras_coincidentes ?? batch.total_muestras} coinciden)</option>)}
        </select>
        {loading && <p className="mt-3 text-gray-400">Cargando...</p>}
        {!loading && batchId && <div className="mt-3 max-h-64 overflow-auto rounded border border-[#444] p-2">
          {samples.map((sample) => <label key={sample.id} className="flex items-center gap-3 border-b border-[#333] p-2 last:border-0">
            <input type="checkbox" checked={selected.includes(sample.id)} onChange={(e) => setSelected((items) => e.target.checked ? [...items, sample.id] : items.filter((id) => id !== sample.id))} />
            <span><strong>{sample.id}</strong><small className="block text-gray-400">{sample.punto_muestreo ? `Actualmente: ${sample.punto_muestreo.nombre}` : 'Sin punto asignado'}</small></span>
          </label>)}
          {!samples.length && <p className="p-3 text-gray-400">Este lote no tiene muestras compatibles.</p>}
        </div>}
      </Modal.Body>
      <Modal.Footer className="bg-[#1a1a1a]"><Button variant="secondary" onClick={onHide}>Cancelar</Button><Button variant="outline-warning" disabled={!batchId || saving} onClick={() => assign(true)}>Asignar lote compatible</Button><Button variant="danger" disabled={!selected.length || saving} onClick={() => assign(false)}>{saving ? 'Guardando...' : `Asignar seleccionadas (${selected.length})`}</Button></Modal.Footer>
    </Modal>
  );
};
