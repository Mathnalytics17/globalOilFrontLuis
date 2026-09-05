import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Clock3, RefreshCw, Save } from 'lucide-react';
import { toast } from 'react-toastify';

import DynamicSampleTechnicalFields, {
  buildDynamicAttributesPayload,
  validateDynamicAttributes,
} from '@features/samples/components/DynamicSampleTechnicalFields';
import { sampleCatalogsService } from '@features/samples/infrastructure/sampleCatalogsService';
import { samplesService } from '@features/samples/infrastructure/samplesService';

const EMPTY = {
  tipo_muestra: 'aceite',
  fecha_toma: '',
  fecha_envio: '',
  condicion: 'usada',
  contacto_cliente: '',
  referencia_equipo: '',
  equipo_placa: '',
  referencia_marca: '',
  periodo_servicio_aceite: '',
  unidad_periodo_aceite: 'horas',
  periodo_servicio_equipo: '',
  unidad_periodo_equipo: 'horas',
  observaciones: '',
  atributos_tecnicos: {},
};

const FIELD_LABELS = {
  tipo_muestra: 'Tipo de muestra',
  fecha_toma: 'Fecha de toma',
  fecha_envio: 'Fecha de envío',
  condicion: 'Condición',
  contacto_cliente: 'Contacto',
  referencia_equipo_id: 'Equipo',
  equipo_placa: 'Placa / identificación',
  referencia_marca: 'Referencia / marca',
  periodo_servicio_aceite: 'Servicio del lubricante',
  unidad_periodo_aceite: 'Unidad del servicio del lubricante',
  periodo_servicio_equipo: 'Servicio del equipo',
  unidad_periodo_equipo: 'Unidad del servicio del equipo',
  observaciones: 'Observaciones',
  atributos_tecnicos: 'Características técnicas',
};

const toLocalDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const normalizeAttributes = (attributes = []) =>
  attributes.reduce((result, attribute) => {
    const key = attribute.campo_tecnico || attribute.catalogo;
    if (key) {
      result[String(key)] = {
        item: attribute.item || '',
        desconocido: Boolean(attribute.desconocido),
        observacion: attribute.observacion || '',
      };
    }
    return result;
  }, {});

const auditValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (Array.isArray(value)) return `${value.length} valor(es)`;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
};

export default function EditSamplePage() {
  const router = useRouter();
  const { id, muestraId } = router.query;
  const [sample, setSample] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [catalogs, setCatalogs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [history, setHistory] = useState([]);
  const [equipmentMode, setEquipmentMode] = useState('manual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!muestraId) return;
    setLoading(true);
    try {
      const [data, catalogData, options, historyData] = await Promise.all([
        samplesService.getById(muestraId),
        sampleCatalogsService.getAllSampleFormCatalogs(),
        sampleCatalogsService.getBatchCreationOptions(),
        samplesService.history(muestraId),
      ]);
      setSample(data);
      setCatalogs(catalogData);
      setMachines(options.machines || []);
      setHistory(historyData);
      setEquipmentMode(data.referencia_equipo ? 'catalog' : 'manual');
      setForm({
        ...EMPTY,
        tipo_muestra: data.tipo_muestra || 'aceite',
        fecha_toma: toLocalDateTime(data.fecha_toma),
        fecha_envio: String(data.fecha_envio || '').slice(0, 10),
        condicion: data.condicion || 'usada',
        contacto_cliente: data.contacto_cliente || '',
        referencia_equipo: data.referencia_equipo || '',
        equipo_placa: data.equipo_placa || '',
        referencia_marca: data.referencia_marca || '',
        periodo_servicio_aceite: data.periodo_servicio_aceite ?? '',
        unidad_periodo_aceite: data.unidad_periodo_aceite || 'horas',
        periodo_servicio_equipo: data.periodo_servicio_equipo ?? '',
        unidad_periodo_equipo: data.unidad_periodo_equipo || 'horas',
        observaciones: data.observaciones || '',
        atributos_tecnicos: normalizeAttributes(data.atributos_tecnicos),
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'No se pudo cargar la muestra.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [muestraId]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateDynamic = (_index, field, value) => update(field, value);

  const changeEquipmentMode = (mode) => {
    setEquipmentMode(mode);
    if (mode === 'catalog') update('equipo_placa', '');
    else update('referencia_equipo', '');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.fecha_toma) return toast.warning('Seleccione la fecha de toma.');
    const technicalErrors = validateDynamicAttributes(form, catalogs);
    if (Object.keys(technicalErrors).length) return toast.warning(Object.values(technicalErrors)[0]);
    setSaving(true);
    try {
      await samplesService.patch(muestraId, {
        ...form,
        referencia_equipo: equipmentMode === 'catalog' ? form.referencia_equipo || null : null,
        equipo_placa: equipmentMode === 'manual' ? form.equipo_placa.trim() || null : null,
        periodo_servicio_aceite: form.periodo_servicio_aceite === '' ? null : Number(form.periodo_servicio_aceite),
        periodo_servicio_equipo: form.periodo_servicio_equipo === '' ? null : Number(form.periodo_servicio_equipo),
        contacto_cliente: form.contacto_cliente.trim() || null,
        referencia_marca: form.referencia_marca.trim() || null,
        observaciones: form.observaciones.trim() || null,
        fecha_envio: form.fecha_envio || null,
        atributos_tecnicos: buildDynamicAttributesPayload(form, catalogs),
      });
      toast.success('Muestra actualizada y cambio registrado en el historial.');
      await load();
    } catch (error) {
      const data = error?.response?.data;
      toast.error(data?.detail || data?.error || 'No se pudo actualizar la muestra.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="sampleLoading"><RefreshCw className="spin" /> Cargando muestra...</div>;
  if (!sample) return <div className="sampleLoading">No se encontró la muestra.</div>;

  return (
    <main className="sampleEdit">
      <header className="pageHeader">
        <div>
          <button className="back" type="button" onClick={() => router.push(`/muestras/lotes/${id}`)}><ArrowLeft size={17} /> Volver al lote</button>
          <p className="kicker">Muestra</p>
          <h1>Editar {sample.id}</h1>
          <span>Todos los cambios quedan registrados con usuario, fecha y valores anteriores.</span>
        </div>
        <button className="historyJump" type="button" onClick={() => document.getElementById('historial-muestra')?.scrollIntoView({ behavior: 'smooth' })}>
          <Clock3 size={17} /> Historial ({history.length})
        </button>
      </header>

      <form onSubmit={save} className="editForm">
        <section>
          <h2>Datos de la muestra</h2>
          <div className="grid">
            <Field label="Tipo de muestra"><select value={form.tipo_muestra} onChange={(event) => update('tipo_muestra', event.target.value)}><option value="aceite">Aceite</option><option value="grasa">Grasa</option></select></Field>
            <Field label="Condición"><select value={form.condicion} onChange={(event) => update('condicion', event.target.value)}><option value="nueva">Nueva</option><option value="usada">Usada</option></select></Field>
            <Field label="Fecha de toma"><input type="datetime-local" value={form.fecha_toma} onChange={(event) => update('fecha_toma', event.target.value)} /></Field>
            <Field label="Fecha de envío"><input type="date" value={form.fecha_envio} onChange={(event) => update('fecha_envio', event.target.value)} /></Field>
            <Field label="Contacto"><input value={form.contacto_cliente} onChange={(event) => update('contacto_cliente', event.target.value)} /></Field>
            <Field label="Referencia / marca"><input value={form.referencia_marca} onChange={(event) => update('referencia_marca', event.target.value)} /></Field>
          </div>
        </section>

        <section>
          <div className="sectionTitle">
            <h2>Equipo</h2>
            <div className="segmented">
              <button type="button" className={equipmentMode === 'catalog' ? 'active' : ''} onClick={() => changeEquipmentMode('catalog')}>Seleccionar equipo</button>
              <button type="button" className={equipmentMode === 'manual' ? 'active' : ''} onClick={() => changeEquipmentMode('manual')}>Ingresar placa</button>
            </div>
          </div>
          {equipmentMode === 'catalog' ? (
            <Field label="Equipo registrado"><select value={form.referencia_equipo} onChange={(event) => update('referencia_equipo', event.target.value)}><option value="">Seleccione un equipo</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.codigo_equipo || machine.nombre} · {machine.nombre}</option>)}</select></Field>
          ) : (
            <Field label="Placa / identificación manual"><input value={form.equipo_placa} onChange={(event) => update('equipo_placa', event.target.value)} /></Field>
          )}
        </section>

        <section>
          <h2>Periodos de servicio</h2>
          <div className="grid">
            <Period label="Servicio del lubricante" value={form.periodo_servicio_aceite} unit={form.unidad_periodo_aceite} onValue={(value) => update('periodo_servicio_aceite', value)} onUnit={(value) => update('unidad_periodo_aceite', value)} />
            <Period label="Servicio del equipo" value={form.periodo_servicio_equipo} unit={form.unidad_periodo_equipo} onValue={(value) => update('periodo_servicio_equipo', value)} onUnit={(value) => update('unidad_periodo_equipo', value)} />
            <Field label="Observaciones" full><textarea value={form.observaciones} onChange={(event) => update('observaciones', event.target.value)} /></Field>
          </div>
        </section>

        <section className="technical">
          <DynamicSampleTechnicalFields catalogs={catalogs} muestra={form} index={0} updateMuestra={updateDynamic} />
        </section>

        <div className="formActions">
          <button type="button" className="secondary" onClick={() => router.push(`/muestras/lotes/${id}`)}>Cancelar</button>
          <button className="save" disabled={saving}>{saving ? <RefreshCw size={17} className="spin" /> : <Save size={17} />}{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>

      <section className="audit" id="historial-muestra">
        <div className="auditHeader"><div><p className="kicker">Auditoría</p><h2>Historial de la muestra</h2></div><span>{history.length} cambio(s)</span></div>
        {!history.length ? <p className="empty">Todavía no hay modificaciones registradas.</p> : history.map((entry) => (
          <article key={entry.id} className="auditEntry">
            <div className="auditMeta"><strong>{entry.usuario_nombre}</strong><span>{new Date(entry.creado_en).toLocaleString('es-CO')}</span></div>
            <div className="changeGrid">
              {Object.entries(entry.cambios || {}).map(([field, values]) => (
                <div key={field} className="change"><strong>{FIELD_LABELS[field] || field}</strong><span><b>Antes:</b> {auditValue(values.anterior)}</span><span><b>Después:</b> {auditValue(values.nuevo)}</span></div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <style jsx>{`
        .sampleEdit{color:#f7f7f7;max-width:1280px;margin:0 auto;padding:24px 28px 56px}.sampleLoading{min-height:60vh;color:#fff;display:flex;gap:10px;align-items:center;justify-content:center}.pageHeader,.auditHeader,.sectionTitle,.formActions{display:flex;align-items:center;justify-content:space-between;gap:18px}.back{display:inline-flex;align-items:center;gap:7px;background:none;border:0;color:#c8c8c8;padding:0;cursor:pointer}.kicker{color:#ff3040;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin:16px 0 4px}.pageHeader h1{font-size:32px;font-weight:600;margin:0 0 5px}.pageHeader span,.empty{color:#a8a8aa}.historyJump,.secondary,.save{min-height:40px;border-radius:6px;border:1px solid #404046;background:#202024;color:#fff;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;cursor:pointer}.editForm,.audit{border:1px solid #343438;border-radius:7px;margin-top:20px;background:#18181a}.editForm section{padding:18px 20px}.editForm section+section{border-top:1px solid #303034}.editForm h2,.audit h2{font-size:18px;margin:0 0 14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.field{display:grid;gap:6px}.field.full{grid-column:1/-1}.field>span{font-size:13px;font-weight:700;color:#d5d5d8}.field input,.field select,.field textarea{width:100%;min-height:40px;border:1px solid #414147;border-radius:6px;background:#0e0e10;color:#fff;padding:9px 11px}.field textarea{min-height:86px;resize:vertical}.period{display:grid;grid-template-columns:1fr 120px;gap:8px}.segmented{display:flex;border:1px solid #3c3c42;border-radius:6px;overflow:hidden}.segmented button{border:0;background:#151517;color:#aaa;padding:8px 12px;cursor:pointer}.segmented button.active{background:#ef2532;color:#fff}.technical :global(.md\\:col-span-4){border:0!important;padding-top:0!important}.formActions{padding:14px 20px;border-top:1px solid #303034}.save{background:#ef2532;border-color:#ef2532;min-width:190px}.save:disabled{opacity:.55}.audit{padding:18px 20px}.auditHeader{border-bottom:1px solid #303034;padding-bottom:14px}.auditHeader .kicker{margin-top:0}.auditHeader h2{margin:0}.auditHeader>span{color:#aaa}.auditEntry{padding:16px 0;border-bottom:1px solid #2d2d31}.auditMeta{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.auditMeta span{color:#a8a8aa;font-size:13px}.changeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.change{border-left:3px solid #ef2532;background:#202024;padding:9px 11px;display:grid;gap:3px}.change>strong{font-size:13px}.change span{font-size:12px;color:#bbb}.change b{color:#e6e6e6}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:760px){.sampleEdit{padding:18px 12px 40px}.pageHeader,.sectionTitle{align-items:flex-start;flex-direction:column}.grid,.changeGrid{grid-template-columns:1fr}.field.full{grid-column:auto}.historyJump{width:100%}.segmented{width:100%}.segmented button{flex:1}.formActions{position:sticky;bottom:0;background:#18181a}.save{flex:1}}
      `}</style>
    </main>
  );
}

const Field = ({ label, full, children }) => <label className={`field ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>;
const Period = ({ label, value, unit, onValue, onUnit }) => <Field label={label}><div className="period"><input type="number" min="0" value={value} onChange={(event) => onValue(event.target.value)} /><select value={unit} onChange={(event) => onUnit(event.target.value)}><option value="horas">Horas</option><option value="km">Kilómetros</option><option value="millas">Millas</option><option value="dias">Días</option></select></div></Field>;
