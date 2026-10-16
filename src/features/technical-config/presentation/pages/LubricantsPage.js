import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '@shared/ui/PageHeader';
import { assetTreeService } from '@features/asset-tree/infrastructure/assetTreeService';

const EMPTY = { fabricante: '', referencia: '' };

export default function LubricantsPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setRows(await assetTreeService.listLubricants({ page_size: 1000 })); }
    catch { toast.error('No se pudo cargar el catálogo de lubricantes.'); }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => rows.filter((row) => row.activo !== false), [rows]);
  const startCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const startEdit = (row) => { setEditing(row); setForm({ fabricante: row.fabricante || '', referencia: row.referencia || '' }); setOpen(true); };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.fabricante.trim() || !form.referencia.trim()) return toast.error('Fabricante y referencia / marca son obligatorios.');
    setSaving(true);
    try {
      const payload = { fabricante: form.fabricante.trim(), referencia: form.referencia.trim() };
      if (editing) await assetTreeService.updateLubricant(editing.id, payload); else await assetTreeService.createLubricant(payload);
      toast.success(editing ? 'Lubricante actualizado.' : 'Lubricante creado.'); setOpen(false); await load();
    } catch (error) { toast.error(error?.response?.data?.referencia?.[0] || error?.response?.data?.detail || 'No se pudo guardar el lubricante.'); }
    finally { setSaving(false); }
  };
  const remove = async (row) => {
    if (!window.confirm(`¿Desactivar ${row.fabricante} ${row.referencia}?`)) return;
    try { await assetTreeService.removeLubricant(row.id); toast.success('Lubricante desactivado.'); await load(); }
    catch (error) { toast.error(error?.response?.data?.detail || 'No se pudo desactivar el lubricante.'); }
  };

  return <div className="go-page"><div className="go-shell">
    <PageHeader eyebrow="Configuración del sistema" title="Lubricantes" subtitle="Catálogo reutilizable para puntos de medida y muestras." actions={<button className="go-primary" onClick={startCreate}><Plus size={17}/> Nuevo lubricante</button>} />
    <section className="overflow-hidden rounded-xl border border-white/[.08] bg-[#191b1e]">
      <table className="w-full text-sm"><thead className="bg-white/[.03] text-left text-xs uppercase tracking-wide text-[#8d939c]"><tr><th className="p-4">Fabricante</th><th className="p-4">Referencia / marca</th><th className="p-4 text-right">Acciones</th></tr></thead>
        <tbody>{visible.map((row) => <tr key={row.id} className="border-t border-white/[.06]"><td className="p-4 text-white">{row.fabricante}</td><td className="p-4 text-[#c9cdd2]">{row.referencia}</td><td className="p-4"><div className="flex justify-end gap-2"><button className="go-icon-button" title="Editar" onClick={() => startEdit(row)}><Pencil size={16}/></button><button className="go-icon-button text-red-400" title="Desactivar" onClick={() => remove(row)}><Trash2 size={16}/></button></div></td></tr>)}{!visible.length && <tr><td colSpan="3" className="p-8 text-center text-[#8d939c]">No hay lubricantes registrados.</td></tr>}</tbody>
      </table>
    </section>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-white/[.1] bg-[#1b1d20] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{editing ? 'Editar lubricante' : 'Nuevo lubricante'}</h2><button type="button" className="text-[#a4aab3]" onClick={() => setOpen(false)}><X/></button></div><div className="space-y-4"><label className="block text-sm font-medium text-gray-300">Fabricante<input required className="input-dark mt-2" value={form.fabricante} onChange={(e) => setForm({...form, fabricante:e.target.value})} placeholder="Ej: Petrobras" /></label><label className="block text-sm font-medium text-gray-300">Referencia / marca<input required className="input-dark mt-2" value={form.referencia} onChange={(e) => setForm({...form, referencia:e.target.value})} placeholder="Ej: Hydra 68" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" className="go-secondary" onClick={() => setOpen(false)}>Cancelar</button><button disabled={saving} className="go-primary">{saving ? 'Guardando…' : 'Guardar'}</button></div></form></div>}
  </div></div>;
}
