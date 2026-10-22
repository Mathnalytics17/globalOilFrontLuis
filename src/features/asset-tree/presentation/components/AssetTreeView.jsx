import { appDialog } from '@shared/ui/AppDialogProvider';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Eye,
  Folder,
  FolderPlus,
  History,
  Link2,
  ListFilter,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wrench,
} from 'lucide-react';
import { toast } from 'react-toastify';

import Modal from '@shared/ui/Modal';
import GlobalOilLoader from '@shared/ui/GlobalOilLoader';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { sampleBatchesService } from '@features/samples/infrastructure/sampleBatchesService';
import { assetTreeService } from '../../infrastructure/assetTreeService';
import { foldersService } from '../../infrastructure/foldersService';

const emptyPoint = {
  nombre: '', codigo: '', descripcion: '', lubricante: '', lubricante_catalogo: '',
  lubricante_fabricante: '', lubricante_referencia: '',
  frecuencia_cambio: '', unidad_frecuencia_cambio: 'horas',
  frecuencia_analisis: '', unidad_frecuencia_analisis: 'horas',
};

const transformStructure = (folders = []) => folders.map((folder) => ({
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

function ActionMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="go-button !min-h-8 !w-8 !p-0" aria-label="Acciones" onClick={() => setOpen((value) => !value)}><MoreHorizontal size={16} /></button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 min-w-[210px] rounded-md border border-go-border bg-go-surface p-1.5 shadow-2xl" onClick={() => setOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuAction({ icon: Icon, children, danger = false, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${danger ? 'text-red-300 hover:bg-red-500/10' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'}`}>
      <Icon size={15} /> {children}
    </button>
  );
}

function TreeNode({ node, reload }) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pointOpen, setPointOpen] = useState(false);
  const [pointActivityOpen, setPointActivityOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const canCreate = node.type === 'root' || node.type === 'folder';

  const createChild = async (machineData, name, type) => {
    try {
      if (type === 'machine') {
        // The machines endpoint already creates exactly one tree node.  The
        // old extra POST to /folders created a duplicate (and, when it
        // failed, left a deactivated ghost behind in the tree).
        await machinesService.create({
          nombre: machineData.nombre,
          descripcion: machineData.descripcion,
          empresa: node.company?.id,
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
      toast.success(type === 'machine' ? 'Máquina creada' : 'Carpeta creada');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || 'No se pudo crear el registro');
    }
  };

  const removeNode = async () => {
    const deactivate = ['sampling-point', 'machine'].includes(node.type);
    if (!await appDialog.confirm(`${deactivate ? 'Desactivar' : 'Eliminar'} "${node.name}"?`)) return;
    try {
      if (node.type === 'sampling-point') await assetTreeService.removeSamplingPoint(node.point.id);
      else if (node.machine?.id) await machinesService.remove(node.machine.id);
      else await foldersService.remove(node.id);
      toast.success(deactivate ? 'Registro desactivado' : 'Carpeta eliminada');
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

  const openFilteredLots = () => {
    const params = new URLSearchParams();
    if (node.type === 'sampling-point') params.set('sampling_point_id', node.point.id);
    else params.set('machine_id', node.machine.id);
    window.location.href = `/muestras/lotes?${params.toString()}`;
  };

  const Icon = node.type === 'machine' ? Wrench : node.type === 'sampling-point' ? MapPin : Folder;
  const iconClass = node.type === 'machine' ? 'text-zinc-300' : node.type === 'sampling-point' ? 'text-amber-300' : 'text-zinc-500';

  return (
    <li className="list-none">
      <div className="group flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.035]">
        <button type="button" className="grid h-8 w-8 place-items-center rounded text-zinc-500 hover:bg-white/[0.05] disabled:opacity-20" disabled={!hasChildren} onClick={() => setOpen((value) => !value)}>
          <ChevronRight size={15} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <Icon size={17} className={iconClass} />
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{node.name}</span>
        <ActionMenu>
          {canCreate ? <MenuAction icon={FolderPlus} onClick={() => setCreateOpen(true)}>Crear carpeta o máquina</MenuAction> : null}
          {['folder', 'root'].includes(node.type) ? <MenuAction icon={Pencil} onClick={renameFolder}>Renombrar carpeta</MenuAction> : null}
          {node.type === 'machine' ? <>
            <MenuAction icon={Eye} onClick={() => setDetailOpen(true)}>Ver máquina</MenuAction>
            <MenuAction icon={Pencil} onClick={() => { window.location.href = `/machines/edit-machine?id=${node.machine.id}`; }}>Editar máquina</MenuAction>
            <MenuAction icon={MapPin} onClick={() => setPointOpen(true)}>Crear punto de muestreo</MenuAction>
            <MenuAction icon={ListFilter} onClick={openFilteredLots}>Ver lotes de este equipo</MenuAction>
          </> : null}
          {node.type === 'sampling-point' ? <>
            <MenuAction icon={History} onClick={() => setPointActivityOpen(true)}>Ver actividad del punto</MenuAction>
            <MenuAction icon={Pencil} onClick={() => setPointOpen(true)}>Editar punto</MenuAction>
            <MenuAction icon={Link2} onClick={() => setOrganizeOpen(true)}>Asignar muestras existentes a este punto</MenuAction>
            <MenuAction icon={ListFilter} onClick={openFilteredLots}>Ver lotes de este punto</MenuAction>
          </> : null}
          {node.type !== 'root' ? <MenuAction icon={Trash2} danger onClick={removeNode}>{['sampling-point', 'machine'].includes(node.type) ? 'Desactivar' : 'Eliminar carpeta'}</MenuAction> : null}
        </ActionMenu>
      </div>

      <CreateNodeModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createChild} />
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={node.name} size="sm" footer={<button type="button" className="go-button" onClick={() => setDetailOpen(false)}>Cerrar</button>}>
        <div className="grid gap-3 text-sm">
          <Detail label="Empresa" value={node.company?.nombre} />
          <Detail label="Código" value={node.machine?.codigo_equipo} />
          <Detail label="Serie" value={node.machine?.numero_serie} />
          <Detail label="Componente" value={node.machine?.componente} />
          <Detail label="Tipo de aceite" value={node.machine?.tipoAceite} />
          <Detail label="Ubicación" value={`${node.company?.nombre || 'Empresa'} / ${node.name}`} />
        </div>
      </Modal>
      <SamplingPointModal open={pointOpen} machine={node.machine} point={node.point} onClose={() => setPointOpen(false)} onSaved={() => { setPointOpen(false); reload(); }} />
      <SamplingPointActivityModal open={pointActivityOpen} point={node.point} onClose={() => setPointActivityOpen(false)} />
      <OrganizePointModal open={organizeOpen} point={node.point} machine={node.machine} onClose={() => setOrganizeOpen(false)} onSaved={() => { setOrganizeOpen(false); reload(); }} />

      {open && hasChildren ? <ul className="ml-6 border-l border-go-border pl-2">{node.children.map((child) => <TreeNode key={child.id} node={child} reload={reload} />)}</ul> : null}
    </li>
  );
}

function Detail({ label, value }) {
  return <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-go-border pb-2 last:border-0"><span className="text-go-muted">{label}</span><strong className="font-medium text-go-text">{value || 'No especificado'}</strong></div>;
}

function SamplingPointActivityModal({ open, point, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !point?.id) return;
    let cancelled = false;
    setLoading(true);
    assetTreeService.samplingPointActivity(point.id, { page_size: 30 })
      .then((data) => { if (!cancelled) setEvents(data.results || []); })
      .catch(() => { if (!cancelled) toast.error('No se pudo cargar la actividad del punto.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, point?.id]);

  return <Modal open={Boolean(open && point)} onClose={onClose} title={`Actividad · ${point?.nombre || ''}`} size="lg" footer={<button type="button" className="go-button" onClick={onClose}>Cerrar</button>}>
    {loading ? <div className="py-6"><GlobalOilLoader /></div> : null}
    {!loading && !events.length ? <p className="m-0 text-sm text-go-muted">Aún no hay cambios registrados para este punto desde la activación de trazabilidad.</p> : null}
    {!loading && events.length ? <ol className="m-0 grid list-none gap-3 p-0">{events.map((event) => <li key={event.id} className="rounded-md border border-go-border bg-black/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-go-text">{event.detalle || event.accion}</strong><time className="text-xs text-go-muted">{event.creado_en ? new Date(event.creado_en).toLocaleString('es-CO') : 'Sin fecha'}</time></div>
      <p className="mb-0 mt-1 text-xs text-go-muted">{event.actor_nombre || 'Sistema'}{event.motivo ? ` · Motivo: ${event.motivo}` : ''}</p>
      {event.muestra ? <p className="mb-0 mt-1 text-xs text-zinc-300">Muestra relacionada: {event.muestra}</p> : null}
    </li>)}</ol> : null}
  </Modal>;
}

export default function AssetTreeView() {
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

  useEffect(() => { reload(); }, []);

  return (
    <main className="go-page-shell">
      <header className="go-page-header">
        <div><h1>Árbol de activos</h1><p>Organice empresas, carpetas, máquinas y puntos de muestreo sin sobrecargar la vista con acciones.</p></div>
      </header>
      <section className="go-panel p-3">
        {loading ? <div className="space-y-3 p-4 animate-pulse">{[1,2,3,4].map((item) => <div key={item} className="h-11 rounded bg-white/[0.04]" />)}</div> : null}
        {!loading && error ? <p className="p-4 text-red-300">{error}</p> : null}
        {!loading && !error && !tree.length ? <p className="p-4 text-sm text-go-muted">No hay estructura registrada.</p> : null}
        {!loading && !error && tree.length ? <ul className="space-y-1">{tree.map((node) => <TreeNode key={node.id} node={node} reload={reload} />)}</ul> : null}
      </section>
    </main>
  );
}

function CreateNodeModal({ open, onClose, onCreate }) {
  const [type, setType] = useState('folder');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => { setType('folder'); setName(''); setDescription(''); onClose(); };
  const submit = () => {
    if (!name.trim()) return toast.warning('El nombre es obligatorio.');
    if (type === 'machine' && !description.trim()) return toast.warning('La descripción de la máquina es obligatoria.');
    onCreate(type === 'machine' ? { nombre: name.trim(), descripcion: description.trim() } : null, name.trim(), type);
    reset();
  };

  return (
    <Modal open={open} onClose={reset} title={`Crear ${type === 'machine' ? 'máquina' : 'carpeta'}`} size="sm" footer={<><button type="button" className="go-button" onClick={reset}>Cancelar</button><button type="button" className="go-button-primary" onClick={submit}>Crear</button></>}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">Tipo<select className="go-select" value={type} onChange={(event) => setType(event.target.value)}><option value="folder">Carpeta</option><option value="machine">Máquina</option></select></label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">Nombre<input className="go-field" value={name} onChange={(event) => setName(event.target.value)} /></label>
        {type === 'machine' ? <label className="grid gap-2 text-sm font-semibold text-zinc-300">Descripción<textarea className="go-textarea" value={description} onChange={(event) => setDescription(event.target.value)} /></label> : null}
      </div>
    </Modal>
  );
}

function SamplingPointModal({ open, machine, point, onClose, onSaved }) {
  const [form, setForm] = useState(emptyPoint);
  const [lubricants, setLubricants] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(point ? {
      nombre: point.nombre || '', codigo: point.codigo || '', descripcion: point.descripcion || '', lubricante: point.lubricante || '', lubricante_catalogo: point.lubricante_catalogo ? String(point.lubricante_catalogo) : '', lubricante_fabricante: '', lubricante_referencia: '',
      frecuencia_cambio: point.frecuencia_cambio || '', unidad_frecuencia_cambio: point.unidad_frecuencia_cambio || 'horas',
      frecuencia_analisis: point.frecuencia_analisis || '', unidad_frecuencia_analisis: point.unidad_frecuencia_analisis || 'horas',
    } : emptyPoint);
  }, [open, point]);

  useEffect(() => {
    if (!open) return;
    assetTreeService.listLubricants({ page_size: 1000 })
      .then(setLubricants)
      .catch(() => toast.error('No se pudo cargar el catálogo de lubricantes.'));
  }, [open]);

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
      const payload = {
        ...pointFields,
        nombre: form.nombre.trim(),
        maquina: machine.id,
        lubricante_catalogo: lubricantId,
        frecuencia_cambio: form.frecuencia_cambio === '' ? null : Number(form.frecuencia_cambio),
        frecuencia_analisis: form.frecuencia_analisis === '' ? null : Number(form.frecuencia_analisis),
      };
      if (point) await assetTreeService.updateSamplingPoint(point.id, payload);
      else await assetTreeService.createSamplingPoint(payload);
      toast.success(point ? 'Punto de muestreo actualizado' : 'Punto de muestreo creado');
      setForm(emptyPoint);
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.nombre?.[0] || error.response?.data?.detail || 'No se pudo guardar el punto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(open && machine)} onClose={onClose} title={point ? 'Editar punto de muestreo' : 'Nuevo punto de muestreo'} footer={<><button type="button" className="go-button" onClick={onClose}>Cancelar</button><button type="button" className="go-button-primary" disabled={saving} onClick={save}>{saving ? 'Guardando...' : point ? 'Guardar cambios' : 'Crear punto'}</button></>}>
      <div className="grid gap-4">
        <p className="m-0 text-sm text-go-muted">Quedará dentro de <strong className="text-zinc-300">{machine?.nombre}</strong> y será un nodo terminal.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="go-field" placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <input className="go-field" placeholder="Código opcional" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          <div className="grid gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-zinc-300">Lubricante predeterminado</label>
            <select className="go-select" value={form.lubricante_catalogo} onChange={(e) => setForm({ ...form, lubricante_catalogo: e.target.value })}>
              <option value="">Sin lubricante de catálogo</option>
              {lubricants.map((item) => <option key={item.id} value={item.id}>{item.fabricante} · {item.referencia}</option>)}
            </select>
            {point?.lubricante && !point?.lubricante_catalogo ? <p className="m-0 text-xs text-amber-300">Registro histórico sin catálogo: {point.lubricante}</p> : null}
            <div className="grid gap-2 md:grid-cols-2"><input className="go-field" placeholder="Nuevo: fabricante" value={form.lubricante_fabricante} onChange={(e) => setForm({ ...form, lubricante_fabricante: e.target.value })} /><input className="go-field" placeholder="Nueva: referencia / marca" value={form.lubricante_referencia} onChange={(e) => setForm({ ...form, lubricante_referencia: e.target.value })} /></div>
            <p className="m-0 text-xs text-go-muted">Si no está en el catálogo, complete fabricante y referencia: se crea y queda asignado a este punto.</p>
          </div>
          <input className="go-field" type="number" min="0" placeholder="Frecuencia de cambio" value={form.frecuencia_cambio} onChange={(e) => setForm({ ...form, frecuencia_cambio: e.target.value })} />
          <select className="go-select" value={form.unidad_frecuencia_cambio} onChange={(e) => setForm({ ...form, unidad_frecuencia_cambio: e.target.value })}><option value="horas">Horas</option><option value="km">Kilómetros</option><option value="dias">Días</option></select>
          <input className="go-field" type="number" min="0" placeholder="Frecuencia de análisis" value={form.frecuencia_analisis} onChange={(e) => setForm({ ...form, frecuencia_analisis: e.target.value })} />
          <select className="go-select" value={form.unidad_frecuencia_analisis} onChange={(e) => setForm({ ...form, unidad_frecuencia_analisis: e.target.value })}><option value="horas">Horas</option><option value="km">Kilómetros</option><option value="dias">Días</option></select>
          <textarea className="go-textarea md:col-span-2" placeholder="Descripción opcional" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

function OrganizePointModal({ open, point, machine, onClose, onSaved }) {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [samples, setSamples] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !machine?.id) return;
    setLoading(true);
    sampleBatchesService.list({ machine_id: machine.id, page_size: 200 })
      .then(setBatches)
      .catch(() => toast.error('No se pudieron cargar los lotes de la máquina'))
      .finally(() => setLoading(false));
  }, [open, machine?.id]);

  const selectBatch = async (id) => {
    setBatchId(id); setSamples([]); setSelected([]);
    if (!id) return;
    setLoading(true);
    try {
      const detail = await sampleBatchesService.getById(id);
      setSamples((detail.muestras || []).filter((sample) => Number(sample.referencia_equipo) === Number(machine.id)));
    } catch {
      toast.error('No se pudo cargar el lote');
    } finally {
      setLoading(false);
    }
  };

  const assign = async (wholeBatch) => {
    if (!wholeBatch && !selected.length) return toast.error('Seleccione al menos una muestra');
    setSaving(true);
    try {
      const result = await assetTreeService.organizeSamplingPoint(point.id, wholeBatch ? { lote_id: batchId } : { sample_ids: selected });
      const skipped = result.resumen?.omitidas || 0;
      toast.success(`${result.resumen?.asignadas || 0} muestra(s) asociadas${skipped ? `; ${skipped} omitidas por pertenecer a otra máquina` : ''}`);
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudieron organizar las muestras');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(open && point)}
      onClose={onClose}
      title={`Asignar muestras al punto · ${point?.nombre || ''}`}
      size="lg"
      footer={<><button type="button" className="go-button" onClick={onClose}>Cancelar</button><button type="button" className="go-button" disabled={!batchId || saving} onClick={() => assign(true)}>Mover todas las compatibles</button><button type="button" className="go-button-primary" disabled={!selected.length || saving} onClick={() => assign(false)}>{saving ? 'Guardando...' : `Mover ${selected.length} seleccionada(s) al punto`}</button></>}
    >
      <div className="grid gap-4">
        <p className="m-0 text-sm text-go-muted">Use esta acción solo para corregir la asociación de muestras que ya existen. Se moverán a <strong className="text-zinc-300">{point?.nombre}</strong> y conservarán su lote, resultados e historial. Solo se muestran muestras de <strong className="text-zinc-300">{machine?.nombre}</strong>.</p>
        <select className="go-select" value={batchId} onChange={(e) => selectBatch(e.target.value)} disabled={loading}>
          <option value="">Seleccione un lote de esta máquina</option>
          {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id} · {batch.cliente_nombre || 'Sin cliente'} ({batch.muestras_coincidentes ?? batch.total_muestras} coinciden)</option>)}
        </select>
        {loading ? <GlobalOilLoader label="Cargando estructura de activos..." /> : null}
        {!loading && batchId ? (
          <div className="max-h-72 overflow-auto rounded-md border border-go-border bg-go-deep p-2">
            {samples.map((sample) => (
              <label key={sample.id} className="flex items-center gap-3 border-b border-go-border p-2 last:border-0">
                <input type="checkbox" checked={selected.includes(sample.id)} onChange={(e) => setSelected((items) => e.target.checked ? [...items, sample.id] : items.filter((id) => id !== sample.id))} />
                <span><strong className="text-sm">{sample.id}</strong><small className="block text-go-muted">{sample.punto_muestreo ? `Punto actual: ${sample.punto_muestreo.nombre}` : 'Sin punto asignado'}</small></span>
              </label>
            ))}
            {!samples.length ? <p className="p-3 text-sm text-go-muted">Este lote no tiene muestras compatibles.</p> : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
