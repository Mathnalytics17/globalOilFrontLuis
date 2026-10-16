import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const ModalCreationFile = ({ show, onHide, onCreate }) => {
  const [type, setType] = useState('folder');
  const [name, setName] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (!show) return;
    setType('folder');
    setName('');
    setDescripcion('');
  }, [show]);

  const close = () => onHide?.();
  const handleCreate = () => {
    if (!name.trim()) return alert('El nombre no puede estar vacío.');
    if (type === 'machine' && !descripcion.trim()) return alert('Ingrese la descripción de la máquina.');
    const machineData = type === 'machine' ? { nombre: name.trim(), descripcion: descripcion.trim(), isMachine: true } : null;
    onCreate(machineData, name.trim(), type);
    close();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#191b1e] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div><h2 className="m-0 text-lg font-semibold text-white">Crear {type === 'machine' ? 'máquina' : 'carpeta'}</h2><p className="mt-1 text-xs text-[#858b94]">Agregue un nuevo nodo a la estructura de activos.</p></div>
          <button type="button" className="go-mini !h-8 !w-8 !p-0" onClick={close} aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </header>
        <div className="go-form-grid !grid-cols-1 p-5">
          <label>Tipo<select value={type} onChange={(event) => setType(event.target.value)}><option value="folder">Carpeta</option><option value="machine">Máquina</option></select></label>
          <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} placeholder={type === 'machine' ? 'Nombre de la máquina' : 'Nombre de la carpeta'} /></label>
          {type === 'machine' ? <label>Descripción<textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} placeholder="Descripción de la máquina" /></label> : null}
        </div>
        <footer className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-4"><button className="go-ghost" type="button" onClick={close}>Cancelar</button><button className="go-primary" type="button" onClick={handleCreate}>Crear</button></footer>
      </section>
    </div>
  );
};

export default ModalCreationFile;
