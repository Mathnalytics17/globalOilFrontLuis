import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  FlaskConical,
  RefreshCw,
  Search,
  CheckCircle,
  Eye,
  PackageCheck,
  Clock,
  ClipboardCheck,
  AlertCircle,
} from 'lucide-react';

import DataTable from '@components/dataTableGen';
import { labBatchEntriesService } from '@features/samples/infrastructure/labBatchEntriesService';

const normalizeArrayResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatDateTimeLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO');
};

const getApiError = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.lote)) return data.lote.join(' ');
  if (typeof data?.lote === 'string') return data.lote;
  return fallback;
};

const getTipoLabel = (lote) => {
  const aceites = Number(lote?.muestras_aceite || 0);
  const grasas = Number(lote?.muestras_grasa || 0);
  const parts = [];
  if (aceites) parts.push(`${aceites} aceite${aceites === 1 ? '' : 's'}`);
  if (grasas) parts.push(`${grasas} grasa${grasas === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : '-';
};

const getSampleTechLabel = (sample) => {
  const attrs = Array.isArray(sample?.atributos_tecnicos) ? sample.atributos_tecnicos : [];
  if (!attrs.length) return '-';
  return attrs
    .map((attr) => {
      const label = attr.catalogo_nombre || attr.catalogo_codigo || 'Atributo';
      const value = attr.desconocido ? 'Desconocido' : attr.item_nombre || '-';
      return `${label}: ${value}`;
    })
    .join(' · ');
};

const LaboratorioLotesPage = () => {
  const router = useRouter();
  const [available, setAvailable] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLote, setSelectedLote] = useState('');
  const [form, setForm] = useState({
    fecha_recepcion: formatDateTimeLocal(),
    condiciones_entrega: '',
    observaciones: '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (router.query?.lote) setSelectedLote(String(router.query.lote));
  }, [router.query?.lote]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = search.trim() ? { search: search.trim() } : {};
      const [availableData, entriesData] = await Promise.all([
        labBatchEntriesService.availableBatches(params),
        labBatchEntriesService.list(params).catch(() => []),
      ]);
      setAvailable(normalizeArrayResponse(availableData));
      setEntries(normalizeArrayResponse(entriesData));
    } catch (error) {
      console.error(error?.response?.data || error);
      toast.error('No se pudo cargar el ingreso de laboratorio');
    } finally {
      setLoading(false);
    }
  };

  const selectedBatch = useMemo(
    () => available.find((lote) => String(lote.id) === String(selectedLote)),
    [available, selectedLote]
  );

  const stats = useMemo(() => ({
    disponibles: available.length,
    ingresados: entries.length,
    muestrasDisponibles: available.reduce((acc, item) => acc + Number(item.total_muestras || 0), 0),
    muestrasIngresadas: entries.reduce((acc, item) => acc + Number(item.lote_info?.total_muestras || 0), 0),
  }), [available, entries]);

  const handleSelect = (lote) => {
    setSelectedLote(String(lote.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedLote) {
      toast.warning('Seleccione un lote para ingresar');
      return;
    }
    if (!form.fecha_recepcion) {
      toast.warning('Seleccione la fecha de recepción');
      return;
    }

    setConfirmOpen(true);
  };

  const confirmEntry = async () => {
    const total = Number(selectedBatch?.total_muestras || 0);
    setConfirmOpen(false);

    setSaving(true);
    try {
      await labBatchEntriesService.create({
        lote: selectedLote,
        fecha_recepcion: new Date(form.fecha_recepcion).toISOString(),
        condiciones_entrega: form.condiciones_entrega.trim() || null,
        observaciones: form.observaciones.trim() || null,
        campos_adicionales: {
          total_muestras_recepcionadas: total,
          origen: 'ingreso_lote_laboratorio',
        },
      });
      toast.success('Lote ingresado al laboratorio');
      setForm({ fecha_recepcion: formatDateTimeLocal(), condiciones_entrega: '', observaciones: '' });
      await router.push('/muestras/lotes');
    } catch (error) {
      console.error(error?.response?.data || error);
      const detail = getApiError(error, 'No se pudo ingresar el lote');
      if (String(detail).toLowerCase().includes('ya existe')) {
        toast.info('El lote ya había sido recibido. Volviendo a la lista de lotes.');
        await router.push('/muestras/lotes');
      } else {
        toast.error(detail);
      }
    } finally {
      setSaving(false);
    }
  };

  const isReceptionMode = Boolean(selectedLote);

  const revertEntry = async (row) => {
    const reason = window.prompt(`Motivo para revertir el ingreso del lote ${row.lote}:`);
    if (reason === null) return;
    if (!reason.trim()) return toast.error('El motivo es obligatorio.');
    try {
      await labBatchEntriesService.remove(row.id, reason.trim());
      toast.success('Ingreso revertido. El lote volvió a estado registrado.');
      await fetchData();
    } catch (error) {
      toast.error(getApiError(error, 'No se pudo revertir el ingreso.'));
    }
  };

  const availableColumns = [
    { id: 'id', label: 'LOTE', minWidth: 130, render: (row) => <span className="font-mono font-bold text-red-400">{row.id}</span> },
    { id: 'cliente_nombre', label: 'CLIENTE', minWidth: 220, render: (row) => (
      <div>
        <p className="font-semibold text-white">{row.cliente_nombre || '-'}</p>
        <p className="text-xs text-gray-400">{row.contacto_nombre || 'Sin contacto'}</p>
      </div>
    ) },
    { id: 'fecha_envio', label: 'FECHA ENVÍO', minWidth: 130, render: (row) => <span>{row.fecha_envio || '-'}</span> },
    { id: 'tipo_gestion', label: 'GESTIÓN', minWidth: 160, render: (row) => <span>{row.tipo_gestion_nombre || row.tipo_gestion || '-'}</span> },
    { id: 'total_muestras', label: 'MUESTRAS', minWidth: 120, align: 'center', render: (row) => <span className="font-bold">{row.total_muestras || 0}</span> },
    { id: 'tipos', label: 'TIPOS', minWidth: 160, render: (row) => <span>{getTipoLabel(row)}</span> },
    { id: 'estado', label: 'ESTADO', minWidth: 140, render: (row) => <span className="badge bg-blue-900/50 border-blue-500/50 text-blue-100">{row.estado || '-'}</span> },
    { id: 'acciones', label: 'ACCIONES', minWidth: 180, align: 'center', render: (row) => (
      <div className="flex justify-center gap-2">
        <button onClick={() => router.push(`/muestras/lotes/${row.id}`)} className="action-btn bg-blue-700 hover:bg-blue-600" title="Ver lote"><Eye size={15} /></button>
        <button onClick={() => router.push(`/muestras/laboratorio?lote=${row.id}`)} className="action-btn bg-yellow-700 hover:bg-yellow-600" title="Recibir en laboratorio"><FlaskConical size={15} /></button>
      </div>
    ) },
  ];

  const entryColumns = [
    { id: 'lote', label: 'LOTE', minWidth: 130, render: (row) => <span className="font-mono font-bold text-red-400">{row.lote}</span> },
    { id: 'cliente', label: 'CLIENTE', minWidth: 220, render: (row) => <span>{row.lote_info?.cliente_nombre || '-'}</span> },
    { id: 'fecha_recepcion', label: 'FECHA RECEPCIÓN', minWidth: 180, render: (row) => <span>{formatDate(row.fecha_recepcion)}</span> },
    { id: 'usuario', label: 'RECIBIDO POR', minWidth: 180, render: (row) => <span>{row.usuario_recepcion_nombre || '-'}</span> },
    { id: 'total', label: 'MUESTRAS', minWidth: 120, align: 'center', render: (row) => <span>{row.lote_info?.total_muestras || 0}</span> },
    { id: 'acciones', label: 'ACCIONES', minWidth: 160, align: 'center', render: (row) => <div className="flex justify-center gap-2"><button onClick={() => router.push(`/muestras/lotes/${row.lote}`)} className="action-btn bg-blue-700 hover:bg-blue-600" title="Ver lote"><Eye size={15} /></button><button onClick={() => revertEntry(row)} className="action-btn bg-red-700 hover:bg-red-600" title="Revertir ingreso con motivo">↶</button></div> },
  ];

  return (
    <div className="min-h-0 bg-transparent text-white p-0">
      <div className="w-full max-w-none mx-0 space-y-3">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <button onClick={() => router.push('/muestras/lotes')} className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4"><ArrowLeft size={18} />Volver a lotes</button>
            <p className="text-xs uppercase tracking-[0.25em] text-red-400 font-bold">Laboratorio</p>
            <h1 className="text-3xl font-bold mt-1">{isReceptionMode ? `Recibir lote ${selectedLote}` : 'Ingreso de lotes al laboratorio'}</h1>
            <p className="text-gray-300 mt-2">{isReceptionMode ? 'Confirma exclusivamente la recepción de este lote.' : 'Consulta lotes pendientes y el historial de ingresos.'}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
          <button onClick={fetchData} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-semibold">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />Actualizar
          </button>
          </div>
        </header>

        {!isReceptionMode ? <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SummaryCard icon={PackageCheck} title="Lotes disponibles" value={stats.disponibles} />
          <SummaryCard icon={PackageCheck} title="Muestras pendientes" value={stats.muestrasDisponibles} />
          <SummaryCard icon={FlaskConical} title="Ingresos registrados" value={stats.ingresados} />
          <SummaryCard icon={ClipboardCheck} title="Muestras ingresadas" value={stats.muestrasIngresadas} />
        </div> : null}

        {!isReceptionMode ? <section className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchData(); }} className="input-dark pl-10" placeholder="Buscar lote, cliente o contacto" />
            </div>
            <button onClick={fetchData} disabled={loading} className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold disabled:opacity-50">Buscar</button>
          </div>
        </section> : null}

        {isReceptionMode ? <section className="grid grid-cols-1 xl:grid-cols-5 gap-3">
          <form onSubmit={handleSubmit} className="xl:col-span-2 bg-[#1a1a1a] border border-[#333] rounded-lg p-4 space-y-3 h-fit">
            <div>
              <h2 className="text-xl font-bold">Registrar recepción</h2>
              <p className="text-gray-400 text-sm mt-1">Selecciona un lote disponible y confirma los datos de recepción.</p>
            </div>
            <Field label="Lote">
              {selectedLote ? (
                <div className="input-dark flex items-center font-bold">{selectedLote}</div>
              ) : (
                <button type="button" className="input-dark text-left text-red-200 border-red-500/40" onClick={() => router.push('/muestras/lotes')}>
                  Seleccione un lote desde lotes
                </button>
              )}
            </Field>
            <Field label="Fecha y hora de recepción">
              <input type="datetime-local" value={form.fecha_recepcion} onChange={(e) => setForm((prev) => ({ ...prev, fecha_recepcion: e.target.value }))} className="input-dark" />
            </Field>
            <Field label="Condiciones de entrega">
              <textarea value={form.condiciones_entrega} onChange={(e) => setForm((prev) => ({ ...prev, condiciones_entrega: e.target.value }))} className="input-dark min-h-[90px]" placeholder="Ej: envases sellados, muestra completa, sin fugas..." />
            </Field>
            <Field label="Observaciones">
              <textarea value={form.observaciones} onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))} className="input-dark min-h-[90px]" placeholder="Notas internas del laboratorio" />
            </Field>
            {selectedBatch ? <SelectedBatchPreview lote={selectedBatch} /> : <EmptySelection />}
            <button disabled={saving || !selectedBatch} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold">
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <FlaskConical size={18} />}
              Ingresar lote al laboratorio
            </button>
          </form>

          <div className="xl:col-span-3 bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
            <div className="p-5 border-b border-[#333] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Muestras del lote seleccionado</h2>
                <p className="text-sm text-gray-400 mt-1">Verificación rápida antes de recibir el lote.</p>
              </div>
              <Clock className="text-gray-500" size={22} />
            </div>
            {selectedBatch ? <SamplesPreview samples={selectedBatch.muestras_resumen || []} /> : <div className="p-10 text-center text-gray-400">Selecciona un lote para ver sus muestras.</div>}
          </div>
        </section> : null}

        {!isReceptionMode ? <section className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#333]"><h2 className="text-xl font-bold">Lotes disponibles para ingreso</h2></div>
          {loading ? <div className="p-10 text-center text-gray-300">Cargando...</div> : available.length ? <DataTable columns={availableColumns} data={available} /> : <div className="p-10 text-center text-gray-400">No hay lotes pendientes de ingreso.</div>}
        </section> : null}

        {!isReceptionMode ? <section className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#333]"><h2 className="text-xl font-bold">Historial de ingresos</h2></div>
          {loading ? <div className="p-10 text-center text-gray-300">Cargando...</div> : entries.length ? <DataTable columns={entryColumns} data={entries} /> : <div className="p-10 text-center text-gray-400">Todavía no hay ingresos registrados.</div>}
        </section> : null}
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={() => setConfirmOpen(false)}>
          <section className="w-full max-w-lg rounded-lg border border-[#444] bg-[#171717] p-6 shadow-2xl" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2 className="text-2xl font-bold">Confirmar ingreso</h2>
            <p className="mt-3 text-gray-300">El lote <strong>{selectedLote}</strong> y sus {selectedBatch?.total_muestras || 0} muestra(s) quedarán registrados en laboratorio.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="px-4 py-3 rounded-lg border border-[#555]" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button type="button" className="px-4 py-3 rounded-lg bg-red-600 font-semibold" onClick={confirmEntry}>Ingresar lote</button>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx global>{`
        .input-dark { width: 100%; background: #292929; border: 1px solid #444; color: white; border-radius: 0.5rem; padding: 0.75rem; outline: none; }
        .input-dark:focus { border-color: #dc2626; box-shadow: 0 0 0 1px #dc2626; }
        .input-dark::placeholder { color: #777; }
        .input-dark:disabled { opacity: 0.6; cursor: not-allowed; }
        .action-btn { display: inline-flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border-radius: 0.5rem; color: white; transition: 0.15s ease; }
        .badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; border-width: 1px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
      `}</style>
    </div>
  );
};

const SelectedBatchPreview = ({ lote }) => (
  <div className="rounded-xl border border-yellow-500/40 bg-yellow-900/15 p-4 text-sm text-yellow-100 space-y-2">
    <div className="flex items-center gap-2 font-bold"><AlertCircle size={16} />Confirmación</div>
    <p>Vas a ingresar el lote <strong>{lote.id}</strong> de <strong>{lote.cliente_nombre}</strong>.</p>
    <p><strong>{lote.total_muestras}</strong> muestra(s): {getTipoLabel(lote)}.</p>
  </div>
);

const EmptySelection = () => (
  <div className="rounded-xl border border-[#444] bg-[#222] p-4 text-sm text-gray-400">Selecciona un lote de la tabla o del selector para habilitar el ingreso.</div>
);

const SamplesPreview = ({ samples }) => {
  if (!samples.length) return <div className="p-10 text-center text-gray-400">El lote no trae muestras en la respuesta.</div>;
  return (
    <div className="divide-y divide-[#333] max-h-[520px] overflow-auto">
      {samples.map((sample) => (
        <div key={sample.id} className="p-4 hover:bg-[#222] transition">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
            <div>
              <p className="font-mono font-bold text-red-400">{sample.id}</p>
              <p className="text-sm text-gray-300 capitalize">{sample.tipo_muestra} · {sample.condicion}</p>
            </div>
            <span className={`badge ${sample.is_ingresado ? 'bg-green-900/50 border-green-500/50 text-green-100' : 'bg-gray-800 border-gray-600 text-gray-200'}`}>
              {sample.is_ingresado ? 'Ingresada' : 'Pendiente'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
            <InfoLine label="Fabricante" value={sample.fabricante || '-'} />
            <InfoLine label="Referencia / marca" value={sample.referencia_marca || '-'} />
            <InfoLine label="Equipo" value={sample.referencia_equipo_nombre || sample.equipo_placa || (sample.condicion === 'nueva' ? 'No aplica' : '-')} />
            <InfoLine label="Fecha toma" value={formatDate(sample.fecha_toma)} />
          </div>
          <p className="text-xs text-gray-400 mt-3">{getSampleTechLabel(sample)}</p>
        </div>
      ))}
    </div>
  );
};

const InfoLine = ({ label, value }) => <div><span className="text-gray-500">{label}: </span><span className="text-gray-200">{value}</span></div>;

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-gray-300 mb-2">{label}</span>
    {children}
  </label>
);

const SummaryCard = ({ icon: Icon, title, value }) => (
  <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400"><Icon size={22} /></div>
    <div><p className="text-gray-400 text-sm">{title}</p><p className="text-2xl font-bold text-white">{value}</p></div>
  </div>
);

export default LaboratorioLotesPage;
