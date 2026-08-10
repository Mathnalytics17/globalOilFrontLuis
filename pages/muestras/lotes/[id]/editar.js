import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { ArrowLeft, ExternalLink, Save, RefreshCw, Plus } from 'lucide-react';

import { sampleBatchesService } from '@features/samples/infrastructure/sampleBatchesService';
import { sampleCatalogsService } from '@features/samples/infrastructure/sampleCatalogsService';
import { sampleManagementTypesService } from '@features/samples/infrastructure/sampleManagementTypesService';

const EMPTY_FORM = {
  tipo_cliente: 'registrado',
  cliente_empresa: '',
  cliente_ocasional_nombre: '',
  contacto_nombre: '',
  contacto_telefono: '',
  contacto_email: '',
  fecha_envio: '',
  tipo_gestion: '',
  observaciones: '',
};

const normalizeDate = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const EditarLotePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(EMPTY_FORM);
  const [lote, setLote] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [tiposGestion, setTiposGestion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const getCompanyName = (cliente) => cliente?.nombre || cliente?.name || cliente?.razon_social || cliente?.id;

  const loadTiposGestion = async (empresaId = null) => {
    try {
      const data = await sampleManagementTypesService.getAvailableForCompany(empresaId);
      setTiposGestion(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTiposGestion([]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [loteData, options] = await Promise.all([
        sampleBatchesService.getById(id),
        sampleCatalogsService.getBatchCreationOptions().catch(() => ({ companies: [] })),
      ]);

      setLote(loteData);
      setClientes(options.companies || []);
      setForm({
        tipo_cliente: loteData.tipo_cliente || 'registrado',
        cliente_empresa: loteData.cliente_empresa || '',
        cliente_ocasional_nombre: loteData.cliente_ocasional_nombre || '',
        contacto_nombre: loteData.contacto_nombre || '',
        contacto_telefono: loteData.contacto_telefono || '',
        contacto_email: loteData.contacto_email || '',
        fecha_envio: normalizeDate(loteData.fecha_envio),
        tipo_gestion: loteData.tipo_gestion || '',
        observaciones: loteData.observaciones || '',
      });
      await loadTiposGestion(loteData.cliente_empresa || null);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el lote');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'cliente_empresa') loadTiposGestion(value || null);
    if (field === 'tipo_cliente') {
      setForm((prev) => ({
        ...prev,
        tipo_cliente: value,
        cliente_empresa: value === 'registrado' ? prev.cliente_empresa : '',
        cliente_ocasional_nombre: value === 'ocasional' ? prev.cliente_ocasional_nombre : '',
        tipo_gestion: '',
      }));
      loadTiposGestion(value === 'ocasional' ? null : form.cliente_empresa || null);
    }
  };

  const validate = () => {
    if (form.tipo_cliente === 'registrado' && !form.cliente_empresa) return 'Seleccione una empresa registrada';
    if (form.tipo_cliente === 'ocasional' && !form.cliente_ocasional_nombre.trim()) return 'Ingrese el cliente ocasional';
    if (!form.contacto_nombre.trim()) return 'Ingrese el contacto';
    if (!form.fecha_envio) return 'Seleccione fecha de envío';
    if (!form.tipo_gestion) return 'Seleccione tipo de gestión';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.warning(error);
      return;
    }

    setSaving(true);
    try {
      await sampleBatchesService.update(id, {
        tipo_cliente: form.tipo_cliente,
        cliente_empresa: form.tipo_cliente === 'registrado' ? form.cliente_empresa : null,
        cliente_ocasional_nombre: form.tipo_cliente === 'ocasional' ? form.cliente_ocasional_nombre.trim() : null,
        contacto_nombre: form.contacto_nombre.trim(),
        contacto_telefono: form.contacto_telefono.trim() || null,
        contacto_email: form.contacto_email.trim() || null,
        fecha_envio: form.fecha_envio,
        tipo_gestion: form.tipo_gestion,
        observaciones: form.observaciones.trim() || null,
      });
      toast.success('Lote actualizado');
      router.push(`/muestras/lotes/${id}`);
    } catch (error) {
      console.error(error?.response?.data || error);
      toast.error('No se pudo actualizar el lote');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen text-white p-10">Cargando lote...</div>;
  }

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <button onClick={() => router.push(`/muestras/lotes/${id}`)} className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4"><ArrowLeft size={18} />Volver al lote</button>
            <p className="text-xs uppercase tracking-[0.25em] text-red-400 font-bold">Información general del lote</p>
            <h1 className="text-3xl font-bold mt-1">{id}</h1>
            <p className="text-gray-300 mt-2">Edita los datos generales del lote. Las muestras se conservan.</p>
          </div>
          <button onClick={() => router.push('/muestras/nuevo-lote')} className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"><Plus size={18} />Nuevo lote</button>
        </header>

        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Tipo de cliente">
              <select value={form.tipo_cliente} onChange={(e) => updateForm('tipo_cliente', e.target.value)} className="input-dark">
                <option value="registrado">Cliente registrado</option>
                <option value="ocasional">Cliente ocasional</option>
              </select>
            </Field>

            {form.tipo_cliente === 'registrado' ? (
              <Field label="Cliente / empresa">
                <select value={form.cliente_empresa || ''} onChange={(e) => updateForm('cliente_empresa', e.target.value)} className="input-dark">
                  <option value="">Seleccione empresa</option>
                  {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{getCompanyName(cliente)}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Cliente ocasional">
                <input value={form.cliente_ocasional_nombre} onChange={(e) => updateForm('cliente_ocasional_nombre', e.target.value)} className="input-dark" />
              </Field>
            )}

            <Field label="Contacto"><input value={form.contacto_nombre} onChange={(e) => updateForm('contacto_nombre', e.target.value)} className="input-dark" /></Field>
            <Field label="Teléfono"><input value={form.contacto_telefono} onChange={(e) => updateForm('contacto_telefono', e.target.value)} className="input-dark" /></Field>
            <Field label="Correo"><input type="email" value={form.contacto_email} onChange={(e) => updateForm('contacto_email', e.target.value)} className="input-dark" /></Field>
            <Field label="Fecha envío"><input type="date" value={form.fecha_envio} onChange={(e) => updateForm('fecha_envio', e.target.value)} className="input-dark" /></Field>
            <Field label="Tipo de gestión">
              <select value={form.tipo_gestion || ''} onChange={(e) => updateForm('tipo_gestion', e.target.value)} className="input-dark">
                <option value="">Seleccione tipo de gestión</option>
                {tiposGestion.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre || tipo.codigo || tipo.id}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Observaciones"><textarea value={form.observaciones} onChange={(e) => updateForm('observaciones', e.target.value)} className="input-dark min-h-[100px]" /></Field>
            </div>
          </div>
          <button disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg font-semibold">
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            Guardar cambios
          </button>
        </form>

        <section className="border border-[#333] rounded-lg p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg font-semibold">Muestras asociadas</h2>
              <p className="text-gray-400 text-sm">Edite cada muestra sin salir del contexto del lote.</p>
            </div>
            <strong>{lote?.muestras?.length || lote?.total_muestras || 0}</strong>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(lote?.muestras || []).map((muestra) => (
              <button
                type="button"
                key={muestra.id}
                onClick={() => router.push(`/muestras/lotes/${id}/muestras/${muestra.id}`)}
                className="flex items-center justify-between gap-3 border border-[#35353a] bg-[#1b1b1e] rounded-md px-4 py-3 text-left hover:border-red-500"
              >
                <span>
                  <strong className="block">{muestra.id}</strong>
                  <small className="text-gray-400">{muestra.tipo_muestra || 'Muestra'} · {muestra.referencia_marca || muestra.equipo_placa || 'Sin referencia'}</small>
                </span>
                <ExternalLink size={16} />
              </button>
            ))}
          </div>
        </section>
      </div>
      <style jsx global>{`
        .input-dark { width: 100%; background: #292929; border: 1px solid #444; color: white; border-radius: 0.5rem; padding: 0.75rem; outline: none; }
        .input-dark:focus { border-color: #dc2626; box-shadow: 0 0 0 1px #dc2626; }
      `}</style>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block"><span className="block text-sm font-semibold text-gray-300 mb-2">{label}</span>{children}</label>
);

export default EditarLotePage;
