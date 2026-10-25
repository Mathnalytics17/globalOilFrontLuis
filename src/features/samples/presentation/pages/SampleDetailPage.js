import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CalendarDays, Clock3, Droplets, Gauge, RefreshCw, Save, Wrench } from 'lucide-react';
import { toast } from 'react-toastify';

import GlobalOilLoader from '@shared/ui/GlobalOilLoader';

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
  punto_muestreo: 'Punto de medida',
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

const auditValue = (value, field, machines = []) => {
  if (value === null || value === undefined || value === '') {
    return field === 'punto_muestreo' ? 'Sin punto de medida' : 'Sin dato';
  }
  if (field === 'referencia_equipo_id' && typeof value !== 'object') {
    const machine = machines.find((item) => String(item.id) === String(value));
    return machine ? [machine.codigo_equipo, machine.nombre].filter(Boolean).join(' · ') : 'Equipo no disponible';
  }
  if (Array.isArray(value)) return value.length ? `${value.length} dato(s) técnico(s) actualizado(s)` : 'Sin datos técnicos';
  if (typeof value === 'object') {
    if (value.nombre) return [value.codigo, value.nombre].filter(Boolean).join(' · ');
    if (value.nombre_visible) return value.nombre_visible;
    return 'Información estructurada actualizada';
  }
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
  const [samplingPoints, setSamplingPoints] = useState([]);
  const [measurementPointId, setMeasurementPointId] = useState('');
  const [manualPoint, setManualPoint] = useState('');
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
      setSamplingPoints(options.samplingPoints || []);
      setMeasurementPointId(data.punto_muestreo?.id ? String(data.punto_muestreo.id) : '');
      setManualPoint(data.campos_adicionales?.punto_muestreo_manual || (data.punto_muestreo?.manual ? data.punto_muestreo.nombre : '') || '');
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
  };

  const changeRegisteredMachine = (machineId) => {
    update('referencia_equipo', machineId);
    // A point belongs to exactly one machine. Do not keep a stale selection
    // while the user chooses the compatible point for the new machine.
    if (String(machineId) !== String(sample?.referencia_equipo || '')) setMeasurementPointId('');
  };

  const compatibleSamplingPoints = samplingPoints.filter(
    (point) => String(point.maquina) === String(form.referencia_equipo) && point.activo !== false,
  );

  const save = async (event) => {
    event.preventDefault();
    if (!form.fecha_toma) return toast.warning('Seleccione la fecha de toma.');
    const technicalErrors = validateDynamicAttributes(form, catalogs);
    if (Object.keys(technicalErrors).length) return toast.warning(Object.values(technicalErrors)[0]);
    setSaving(true);
    try {
      const savedSample = await samplesService.patch(muestraId, {
        ...form,
        referencia_equipo: equipmentMode === 'catalog' ? form.referencia_equipo || null : null,
        equipo_placa: equipmentMode === 'manual' ? form.equipo_placa.trim() || null : null,
        campos_adicionales: { ...(sample.campos_adicionales || {}), punto_muestreo_manual: equipmentMode === 'manual' ? manualPoint.trim() : '' },
        periodo_servicio_aceite: form.periodo_servicio_aceite === '' ? null : Number(form.periodo_servicio_aceite),
        periodo_servicio_equipo: form.periodo_servicio_equipo === '' ? null : Number(form.periodo_servicio_equipo),
        contacto_cliente: form.contacto_cliente.trim() || null,
        referencia_marca: form.referencia_marca.trim() || null,
        observaciones: form.observaciones.trim() || null,
        fecha_envio: form.fecha_envio || null,
        atributos_tecnicos: buildDynamicAttributesPayload(form, catalogs),
      });
      const previousPointId = sample?.punto_muestreo?.id ? String(sample.punto_muestreo.id) : '';
      const machineWasChanged = String(savedSample.referencia_equipo || '') !== String(sample?.referencia_equipo || '');
      if (!machineWasChanged && measurementPointId !== previousPointId) {
        await samplesService.setMeasurementPoint(muestraId, measurementPointId || null);
      }
      if (machineWasChanged && equipmentMode === 'catalog' && measurementPointId) {
        await samplesService.setMeasurementPoint(muestraId, measurementPointId);
      }
      toast.success('Muestra actualizada y cambio registrado en el historial.');
      await load();
    } catch (error) {
      const data = error?.response?.data;
      toast.error(data?.detail || data?.error || 'No se pudo actualizar la muestra.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - var(--go-topbar-height, 58px))', display: 'grid', placeItems: 'center', padding: '32px' }}>
        <GlobalOilLoader label="Cargando muestra..." />
      </div>
    );
  }

  if (!sample) {
    return (
      <div style={{ minHeight: 'calc(100vh - var(--go-topbar-height, 58px))', display: 'grid', placeItems: 'center', padding: '32px', color: 'var(--go-muted, #858b94)' }}>
        No se encontró la muestra.
      </div>
    );
  }

  return (
    <main className="sampleEdit">
      <header className="pageHeader">
        <div>
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
          <SectionHeading icon={<Droplets size={19} />} title="Datos de la muestra" description="Identificación, condición y fechas de esta toma." />
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
            <SectionHeading icon={<Wrench size={19} />} title="Equipo y punto de medida" description="El punto conserva el contexto técnico para el histórico." />
            <div className="segmented">
              <button type="button" className={equipmentMode === 'catalog' ? 'active' : ''} onClick={() => changeEquipmentMode('catalog')}>Seleccionar equipo</button>
              <button type="button" className={equipmentMode === 'manual' ? 'active' : ''} onClick={() => changeEquipmentMode('manual')}>Ingresar placa</button>
            </div>
          </div>
          {equipmentMode === 'catalog' ? (
            <>
              <Field label="Equipo registrado"><select value={form.referencia_equipo} onChange={(event) => changeRegisteredMachine(event.target.value)}><option value="">Seleccione un equipo</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.codigo_equipo || machine.nombre} · {machine.nombre}</option>)}</select></Field>
              <Field label="Punto de medida">
                <select value={measurementPointId} onChange={(event) => setMeasurementPointId(event.target.value)} disabled={!form.referencia_equipo}>
                  <option value="">Sin punto de medida</option>
                  {compatibleSamplingPoints.map((point) => <option key={point.id} value={point.id}>{point.codigo ? `${point.codigo} · ` : ''}{point.nombre}</option>)}
                </select>
              </Field>
              {form.referencia_equipo && !compatibleSamplingPoints.length && <p className="pointHint">Este equipo no tiene puntos de medida activos. Puede guardar la muestra sin punto o crearlo desde el árbol de activos.</p>}
            </>
          ) : (
            <><Field label="Placa / identificación manual"><input value={form.equipo_placa} onChange={(event) => update('equipo_placa', event.target.value)} /></Field><Field label="Punto de medida manual"><input value={manualPoint} onChange={(event) => setManualPoint(event.target.value)} /></Field></>
          )}
          {sample.punto_muestreo && <div className="pointContext"><Gauge size={17} /><div><strong>{sample.punto_muestreo.nombre}</strong><span>Seleccione arriba un punto compatible para cambiarlo. La asignación anterior se conserva en el historial.</span></div></div>}
        </section>

        <section>
          <SectionHeading icon={<CalendarDays size={19} />} title="Periodos de servicio" description="Lecturas del lubricante y del equipo en el momento de la toma." />
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
                <div key={field} className="change"><strong>{FIELD_LABELS[field] || field.replaceAll('_', ' ')}</strong><span><b>Antes:</b> {auditValue(values.anterior, field, machines)}</span><span><b>Después:</b> {auditValue(values.nuevo, field, machines)}</span></div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <style jsx global>{`
        .sampleEdit {
          color: var(--go-text, #f3f4f6);
          color-scheme: dark;
          width: min(100%, 1440px);
          margin: 0 auto;
          padding: 34px clamp(20px, 3vw, 46px) 72px;
        }

        .sampleEdit .pageHeader,
        .sampleEdit .auditHeader,
        .sampleEdit .sectionTitle,
        .sampleEdit .formActions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .sampleEdit .pageHeader {
          padding: 0 2px 4px;
        }

        .sampleEdit .kicker {
          margin: 0 0 7px;
          color: var(--go-accent, #ef2b32);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .sampleEdit .pageHeader h1 {
          margin: 0 0 8px;
          font-size: clamp(28px, 3vw, 38px);
          line-height: 1.08;
          font-weight: 720;
          letter-spacing: -.035em;
          color: #f7f7f8;
        }

        .sampleEdit .pageHeader > div > span,
        .sampleEdit .empty,
        .sampleEdit .sectionHeading p {
          color: var(--go-muted, #858b94);
        }

        .sampleEdit .pointHint {
          margin: 10px 0 0;
          color: var(--go-muted, #858b94);
          font-size: 12px;
          line-height: 1.5;
        }

        .sampleEdit .pageHeader > div > span {
          display: block;
          max-width: 720px;
          font-size: 13px;
          line-height: 1.55;
        }

        .sampleEdit .historyJump,
        .sampleEdit .secondary,
        .sampleEdit .save {
          min-height: 40px;
          border-radius: var(--go-radius-sm, 7px);
          border: 1px solid var(--go-border-strong, #3a3f46);
          background: var(--go-surface-raised, #1e2024);
          color: var(--go-text, #f3f4f6);
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease;
        }

        .sampleEdit .historyJump:hover,
        .sampleEdit .secondary:hover {
          background: var(--go-surface-hover, #24272c);
          border-color: #4a5058;
        }

        .sampleEdit .historyJump svg,
        .sampleEdit .secondary svg,
        .sampleEdit .save svg {
          color: currentColor;
          stroke-width: 2.2;
        }

        .sampleEdit .editForm,
        .sampleEdit .audit {
          overflow: hidden;
          margin-top: 24px;
          border: 1px solid var(--go-border-soft, rgba(255,255,255,.065));
          border-radius: var(--go-radius-lg, 11px);
          background: var(--go-surface, #191b1e);
          box-shadow: 0 18px 44px rgba(0,0,0,.16);
        }

        .sampleEdit .editForm > section {
          padding: 26px 28px;
        }

        .sampleEdit .editForm > section + section {
          border-top: 1px solid var(--go-border-soft, rgba(255,255,255,.065));
        }

        .sampleEdit .sectionHeading {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }

        .sampleEdit .sectionHeading > svg {
          flex: none;
          width: 34px;
          height: 34px;
          padding: 8px;
          box-sizing: border-box;
          border: 1px solid #383d44;
          border-radius: 8px;
          background: #202328;
          color: #f0f1f2;
        }

        .sampleEdit .sectionHeading h2,
        .sampleEdit .audit h2 {
          margin: 0 0 4px;
          font-size: 16px;
          line-height: 1.25;
          font-weight: 720;
          color: #f1f2f4;
        }

        .sampleEdit .sectionHeading p {
          margin: 0;
          font-size: 12px;
          line-height: 1.45;
        }

        .sampleEdit .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .sampleEdit .field {
          min-width: 0;
          display: grid;
          gap: 7px;
        }

        .sampleEdit .field.full {
          grid-column: 1 / -1;
        }

        .sampleEdit .field > span {
          color: #bfc4cc;
          font-size: 11.5px;
          line-height: 1.25;
          font-weight: 650;
        }

        .sampleEdit .field input,
        .sampleEdit .field select,
        .sampleEdit .field textarea {
          width: 100%;
          min-width: 0;
          min-height: 40px;
          border: 1px solid var(--go-border-strong, #3a3f46);
          border-radius: var(--go-radius-sm, 7px);
          background: #141518;
          color: var(--go-text, #f3f4f6);
          padding: 8px 11px;
          font: inherit;
          font-size: 13px;
          outline: none;
          box-shadow: none;
          color-scheme: dark;
          transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;
        }

        .sampleEdit .field input:hover,
        .sampleEdit .field select:hover,
        .sampleEdit .field textarea:hover {
          border-color: #484e57;
        }

        .sampleEdit .field input:focus,
        .sampleEdit .field select:focus,
        .sampleEdit .field textarea:focus {
          border-color: #626973;
          background: #16181b;
          box-shadow: 0 0 0 2px rgba(255,255,255,.035);
        }

        .sampleEdit .field textarea {
          min-height: 96px;
          resize: vertical;
        }

        .sampleEdit .period {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 124px;
          gap: 8px;
        }

        .sampleEdit .sectionTitle {
          align-items: flex-start;
        }

        .sampleEdit .sectionTitle .sectionHeading {
          margin-bottom: 20px;
        }

        .sampleEdit .segmented {
          flex: none;
          display: flex;
          overflow: hidden;
          border: 1px solid var(--go-border-strong, #3a3f46);
          border-radius: 8px;
          background: #121316;
        }

        .sampleEdit .segmented button {
          min-height: 38px;
          border: 0;
          border-right: 1px solid var(--go-border-strong, #3a3f46);
          background: transparent;
          color: #aeb4bd;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color .15s ease, color .15s ease;
        }

        .sampleEdit .segmented button:last-child {
          border-right: 0;
        }

        .sampleEdit .segmented button:hover {
          background: #1d2024;
          color: #fff;
        }

        .sampleEdit .segmented button.active {
          background: var(--go-accent, #ef2b32);
          color: #fff;
        }

        .sampleEdit .pointContext {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-top: 16px;
          padding: 14px 15px;
          border: 1px solid var(--go-border-soft, rgba(255,255,255,.065));
          border-radius: 9px;
          background: #14171b;
          color: #fff;
        }

        .sampleEdit .pointContext > svg {
          flex: none;
          margin-top: 1px;
          color: #d9dde3;
        }

        .sampleEdit .pointContext div {
          display: grid;
          gap: 4px;
        }

        .sampleEdit .pointContext strong {
          font-size: 13px;
          font-weight: 720;
        }

        .sampleEdit .pointContext span {
          color: #969da7;
          font-size: 11.5px;
          line-height: 1.45;
        }

        .sampleEdit .technical .md\\:col-span-4 {
          border: 0 !important;
          padding-top: 0 !important;
        }

        .sampleEdit .formActions {
          padding: 16px 28px;
          border-top: 1px solid var(--go-border-soft, rgba(255,255,255,.065));
          background: #17191c;
        }

        .sampleEdit .save {
          min-width: 178px;
          border-color: var(--go-accent, #ef2b32);
          background: var(--go-accent, #ef2b32);
          color: #fff;
        }

        .sampleEdit .save:hover:not(:disabled) {
          background: var(--go-accent-hover, #d9232a);
          border-color: var(--go-accent-hover, #d9232a);
        }

        .sampleEdit .save:disabled {
          opacity: .52;
          cursor: not-allowed;
        }

        .sampleEdit .audit {
          padding: 24px 28px;
        }

        .sampleEdit .auditHeader {
          padding-bottom: 16px;
          border-bottom: 1px solid var(--go-border-soft, rgba(255,255,255,.065));
        }

        .sampleEdit .auditHeader .kicker {
          margin-top: 0;
        }

        .sampleEdit .auditHeader h2 {
          margin: 0;
        }

        .sampleEdit .auditHeader > span {
          color: var(--go-muted, #858b94);
          font-size: 11.5px;
        }

        .sampleEdit .auditEntry {
          padding: 18px 0;
          border-bottom: 1px solid var(--go-border-soft, rgba(255,255,255,.065));
        }

        .sampleEdit .auditEntry:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .sampleEdit .auditMeta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 11px;
        }

        .sampleEdit .auditMeta strong {
          font-size: 12.5px;
        }

        .sampleEdit .auditMeta span {
          color: var(--go-muted, #858b94);
          font-size: 11.5px;
        }

        .sampleEdit .changeGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .sampleEdit .change {
          display: grid;
          gap: 4px;
          padding: 11px 12px;
          border: 1px solid var(--go-border-soft, rgba(255,255,255,.065));
          border-left: 2px solid var(--go-accent, #ef2b32);
          border-radius: 7px;
          background: #202328;
        }

        .sampleEdit .change > strong {
          margin-bottom: 1px;
          font-size: 12px;
        }

        .sampleEdit .change span {
          color: #adb3bb;
          font-size: 11px;
        }

        .sampleEdit .change b {
          color: #d8dce1;
          font-weight: 650;
        }

        .sampleEdit .spin {
          animation: sample-spin 1s linear infinite;
        }

        @keyframes sample-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1080px) {
          .sampleEdit .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 760px) {
          .sampleEdit {
            padding: 22px 14px 44px;
          }

          .sampleEdit .pageHeader,
          .sampleEdit .sectionTitle,
          .sampleEdit .auditHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .sampleEdit .pageHeader h1 {
            font-size: 28px;
          }

          .sampleEdit .grid,
          .sampleEdit .changeGrid {
            grid-template-columns: 1fr;
          }

          .sampleEdit .field.full {
            grid-column: auto;
          }

          .sampleEdit .historyJump,
          .sampleEdit .segmented {
            width: 100%;
          }

          .sampleEdit .segmented button {
            flex: 1;
          }

          .sampleEdit .editForm > section,
          .sampleEdit .audit {
            padding: 20px 16px;
          }

          .sampleEdit .formActions {
            position: sticky;
            bottom: 0;
            z-index: 3;
            padding: 12px 16px;
            background: rgba(23,25,28,.96);
            backdrop-filter: blur(8px);
          }

          .sampleEdit .save {
            flex: 1;
            min-width: 0;
          }
        }

        @media (max-width: 480px) {
          .sampleEdit .period {
            grid-template-columns: 1fr;
          }

          .sampleEdit .formActions {
            flex-direction: column-reverse;
          }

          .sampleEdit .secondary,
          .sampleEdit .save {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

const Field = ({ label, full, children }) => <label className={`field ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>;
const Period = ({ label, value, unit, onValue, onUnit }) => <Field label={label}><div className="period"><input type="number" min="0" value={value} onChange={(event) => onValue(event.target.value)} /><select value={unit} onChange={(event) => onUnit(event.target.value)}><option value="horas">Horas</option><option value="km">Kilómetros</option><option value="millas">Millas</option><option value="dias">Días</option></select></div></Field>;
const SectionHeading = ({ icon, title, description }) => <div className="sectionHeading">{icon}<div><h2>{title}</h2><p>{description}</p></div></div>;
