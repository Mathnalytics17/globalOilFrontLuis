import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, ClipboardList, FlaskConical, Gauge, MapPin, Wrench } from 'lucide-react';

import AppErrorState from '@shared/ui/AppErrorState';
import GlobalOilLoader from '@shared/ui/GlobalOilLoader';
import { samplesService } from '@features/samples/infrastructure/samplesService';

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric', month: 'long', year: 'numeric',
});

const valueOrDash = (value) => value === null || value === undefined || value === '' ? '—' : String(value);

const sampleStatus = (sample) => {
  if (sample?.estado_operativo === 'invalidada') return { label: 'Invalidada', tone: 'go-status-off' };
  if (sample?.is_revisado) return { label: 'Revisada', tone: 'go-status-on' };
  if (sample?.is_resultado_ingresado) return { label: 'Resultados cargados', tone: 'go-badge go-badge-warning' };
  if (sample?.is_ingresado) return { label: 'En laboratorio', tone: 'go-badge go-badge-warning' };
  return { label: 'Registrada', tone: 'go-badge go-badge-neutral' };
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
};

const technicalAttributeLabel = (attribute) => (
  attribute?.campo_tecnico_nombre || attribute?.campo_tecnico_info?.nombre ||
  attribute?.catalogo_nombre || attribute?.catalogo_info?.nombre || 'Dato técnico'
);

export default function SampleReadOnlyPage() {
  const router = useRouter();
  const { muestra: sampleId } = router.query;
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!sampleId) return;
    try {
      setLoading(true);
      setError(null);
      setSample(await samplesService.getById(sampleId));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [sampleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignedTests = useMemo(() => (
    Array.isArray(sample?.pruebas_asignadas) ? sample.pruebas_asignadas : []
  ), [sample]);

  if (loading) return <GlobalOilLoader message="Cargando la muestra…" />;
  if (error) {
    return <AppErrorState title="No se pudo cargar la muestra" description="La información no está disponible en este momento." onRetry={load} />;
  }
  if (!sample) return null;

  const status = sampleStatus(sample);
  const equipment = sample.referencia_equipo_info || sample.referencia_equipo_id;

  return (
    <div className="go-page">
      <div className="go-shell max-w-6xl">
        <button type="button" className="mb-5 inline-flex items-center gap-2 text-sm text-[#b6bdc8] hover:text-white" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="go-card mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#969ca6]">Consulta de muestra</p>
              <h1 className="mt-1 text-3xl font-bold text-white">{sample.id}</h1>
              <p className="mt-2 text-sm text-[#b6bdc8]">Información de consulta. Esta vista no permite modificar la muestra.</p>
            </div>
            <span className={`w-fit rounded px-3 py-1.5 text-sm font-semibold ${status.tone}`}>{status.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="go-card">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white"><ClipboardList size={19} className="text-[#e2646a]" /> Datos de la muestra</h2>
            <dl className="space-y-3 text-sm">
              <Detail label="Fecha de toma" value={formatDate(sample.fecha_toma)} />
              <Detail label="Tipo" value={valueOrDash(sample.tipo_muestra)} />
              <Detail label="Condición" value={valueOrDash(sample.condicion)} />
              <Detail label="Referencia / marca" value={valueOrDash(sample.referencia_marca)} />
              <Detail label="Contacto" value={valueOrDash(sample.contacto_cliente)} />
              <Detail label="Observaciones" value={valueOrDash(sample.observaciones)} />
            </dl>
          </section>

          <section className="go-card">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white"><Wrench size={19} className="text-[#e2646a]" /> Equipo y punto de medida</h2>
            <dl className="space-y-3 text-sm">
              <Detail label="Equipo" value={equipment ? [equipment.codigo_equipo || equipment.codigo, equipment.nombre].filter(Boolean).join(' · ') : '—'} />
              <Detail label="Punto de medida" value={valueOrDash(sample.punto_muestreo?.nombre)} icon={<MapPin size={14} />} />
              <Detail label="Placa / identificación" value={valueOrDash(sample.equipo_placa)} />
              <Detail label="Servicio lubricante" value={sample.periodo_servicio_aceite ? `${sample.periodo_servicio_aceite} ${sample.unidad_periodo_aceite || ''}`.trim() : '—'} />
              <Detail label="Servicio equipo" value={sample.periodo_servicio_equipo ? `${sample.periodo_servicio_equipo} ${sample.unidad_periodo_equipo || ''}`.trim() : '—'} />
            </dl>
          </section>

          <section className="go-card lg:col-span-2">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white"><FlaskConical size={19} className="text-[#e2646a]" /> Pruebas asignadas ({assignedTests.length})</h2>
            {assignedTests.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-white/[0.1] text-xs uppercase tracking-wide text-[#969ca6]"><tr><th className="pb-3 pr-3">Prueba</th><th className="pb-3 pr-3">Resultado</th><th className="pb-3 pr-3">Unidad</th><th className="pb-3">Estado</th></tr></thead>
                  <tbody>{assignedTests.map((test) => <tr key={test.id} className="border-b border-white/[0.06] text-[#d8dce2]"><td className="py-3 pr-3 font-medium text-white">{valueOrDash(test.prueba_nombre || test.nombre || test.prueba?.nombre_variable)}</td><td className="py-3 pr-3">{valueOrDash(test.valor)}</td><td className="py-3 pr-3">{valueOrDash(test.unidad)}</td><td className="py-3">{valueOrDash(test.estatus)}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-[#969ca6]">No hay pruebas asignadas a esta muestra.</p>}
          </section>

          {sample.atributos_tecnicos?.length ? <section className="go-card lg:col-span-2"><h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white"><Gauge size={19} className="text-[#e2646a]" /> Datos técnicos</h2><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{sample.atributos_tecnicos.map((attribute) => <Detail key={attribute.id || `${attribute.campo_tecnico}-${attribute.catalogo}`} label={technicalAttributeLabel(attribute)} value={attribute.desconocido ? 'No especificado' : valueOrDash(attribute.item_nombre || attribute.item_info?.nombre || attribute.item)} />)}</div></section> : null}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon }) {
  return <div className="flex items-start justify-between gap-5 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"><dt className="flex shrink-0 items-center gap-1 text-[#969ca6]">{icon}{label}</dt><dd className="text-right font-medium text-white break-words">{value}</dd></div>;
}
