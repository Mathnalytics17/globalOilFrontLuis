import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Printer } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'react-toastify';

import { machinesService } from '@features/machines/infrastructure/machinesService';
import PageHeader from '@shared/ui/PageHeader';

const numberValue = (value) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('es-CO') : '-';

function buildSeries(machine, pointId, testId) {
  const grouped = new Map();
  (machine?.muestras || []).forEach((sample) => {
    if (pointId && String(sample.punto_muestreo?.id) !== String(pointId)) return;
    (sample.pruebas_asignadas || []).forEach((assignment) => {
      const test = assignment.prueba || {};
      if (testId && String(test.id) !== String(testId)) return;
      const fields = new Map((assignment.resultado_payload?.fields || []).map((field) => [field.key, field]));
      const values = assignment.resultado_payload?.values || [];
      values.forEach((item, index) => {
        const field = fields.get(item.key) || {};
        const value = item.value_label ?? item.value;
        const numeric = numberValue(value);
        if (numeric === null) return;
        const key = `${test.id}-${field.key || item.key || index}`;
        const current = grouped.get(key) || {
          id: key,
          name: field.componente_nombre || field.label || test.nombre_variable || test.acronimo,
          test: test.acronimo || test.nombre_variable || 'Prueba',
          unit: field.unidad || assignment.unidad || test.unidad_medida || '',
          points: [],
        };
        current.points.push({ date: sample.fecha_toma || assignment.fecha_medicion, value: numeric, sample: sample.id, pointId: String(sample.punto_muestreo?.id || 'sin-punto'), pointName: sample.punto_muestreo?.nombre || 'Sin punto de medición' });
        grouped.set(key, current);
      });
    });
  });
  return Array.from(grouped.values())
    .map((item) => {
      const points = item.points.sort((a, b) => new Date(a.date) - new Date(b.date));
      const linesByPoint = new Map();
      points.forEach((point) => {
        if (!linesByPoint.has(point.pointId)) linesByPoint.set(point.pointId, { id: point.pointId, label: point.pointName, points: [] });
        linesByPoint.get(point.pointId).points.push(point);
      });
      const lines = Array.from(linesByPoint.values());
      const chartRows = Array.from(new Set(points.map((point) => point.date))).sort((a, b) => new Date(a) - new Date(b)).map((date) => {
        const row = { date };
        lines.forEach((line) => { const point = line.points.find((itemPoint) => itemPoint.date === date); if (point) row[line.id] = point.value; });
        return row;
      });
      return { ...item, points, lines, chartRows };
    })
    .filter((item) => item.points.length >= 2);
}

export default function TrendReportPage() {
  const router = useRouter();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const machineId = String(router.query.machine || '');
  const pointId = String(router.query.point || '');
  const testId = String(router.query.test || '');

  useEffect(() => {
    if (!router.isReady || !machineId) return;
    let active = true;
    machinesService.list({ include_muestras: 1 }).then((items) => {
      if (!active) return;
      const found = items.find((item) => String(item.id) === machineId);
      setMachine(found || null);
      if (!found) toast.error('No se encontró la máquina solicitada.');
    }).catch(() => toast.error('No se pudo preparar el informe de tendencia.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [router.isReady, machineId]);

  const series = useMemo(() => buildSeries(machine, pointId, testId), [machine, pointId, testId]);
  useEffect(() => setSelected(series.map((item) => item.id)), [series.map((item) => item.id).join('|')]);
  const visibleSeries = series.filter((item) => selected.includes(item.id));
  const pointName = useMemo(() => (machine?.muestras || []).find((sample) => String(sample.punto_muestreo?.id) === pointId)?.punto_muestreo?.nombre, [machine, pointId]);
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <main className="go-page go-shell trendReportPage">
      <PageHeader
        eyebrow="Análisis de tendencias"
        title="Informe de tendencia por punto"
        subtitle="Seleccione las series que desea incluir. Este informe es independiente del reporte operativo existente."
        actions={<button className="go-button go-button-primary noPrint" type="button" onClick={() => window.print()}><Printer size={17} /> Imprimir / Guardar PDF</button>}
      />
      <section className="reportContext">
        <div><small>Máquina</small><strong>{machine?.nombre || 'Cargando…'}</strong></div>
        <div><small>Punto de medición</small><strong>{pointName || 'Todos los puntos'}</strong></div>
        <div><small>Series disponibles</small><strong>{series.length}</strong></div>
      </section>
      <section className="reportSelector noPrint">
        <div><h2>Gráficas incluidas</h2><p>La selección no modifica ninguna interpretación ni reporte ya generado.</p></div>
        <div className="seriesChoices">
          {series.map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span>{item.test} · {item.name}</span></label>)}
        </div>
      </section>
      <section className="reportSheet">
        <header><div><span>GLOBAL OIL</span><h2>Tendencias de condición del lubricante</h2><p>{machine?.nombre} {pointName ? `· ${pointName}` : ''}</p></div><div className="reportDate">Generado: {new Date().toLocaleDateString('es-CO')}</div></header>
        {loading ? <p className="reportEmpty">Preparando series…</p> : null}
        {!loading && !visibleSeries.length ? <p className="reportEmpty">Seleccione al menos una serie con dos o más mediciones.</p> : null}
        <div className="reportCharts">
          {visibleSeries.map((item) => <article key={item.id}>
            <h3>{item.test} · {item.name}</h3><p>{item.unit || 'Sin unidad configurada'} · {item.points.length} mediciones{item.lines.length > 1 ? ` · ${item.lines.length} puntos` : ''}</p>
            <ResponsiveContainer width="100%" height={250}><LineChart data={item.chartRows}><CartesianGrid stroke="#d9dee6" /><XAxis dataKey="date" tickFormatter={dateLabel} /><YAxis width={66} /><Tooltip labelFormatter={dateLabel} formatter={(value, name) => [`${value}${item.unit ? ` ${item.unit}` : ''}`, name]} />{item.lines.map((line, index) => <Line key={line.id} type="monotone" dataKey={line.id} name={line.label} stroke={['#d82432', '#2367b8', '#bf7b12', '#17834a', '#7650b5'][index % 5]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />)}</LineChart></ResponsiveContainer>
            {item.lines.length > 1 ? <div className="reportLegend">{item.lines.map((line, index) => <span key={line.id}><i style={{ background: ['#d82432', '#2367b8', '#bf7b12', '#17834a', '#7650b5'][index % 5] }} />{line.label}</span>)}</div> : null}
          </article>)}
        </div>
        <footer>Informe de demostración. Revise límites, método y condición de cada muestra antes de tomar decisiones operacionales.</footer>
      </section>
      <style jsx global>{`
        .trendReportPage{color:#fff}.reportContext{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--go-border-soft);background:#191b1e;border-radius:10px;margin-bottom:12px}.reportContext>div{padding:13px 16px;border-left:1px solid #30333b}.reportContext>div:first-child{border-left:0}.reportContext small{display:block;color:#9aa4b2;font-size:11px;text-transform:uppercase;letter-spacing:.07em}.reportContext strong{display:block;margin-top:6px}.reportSelector{border:1px solid var(--go-border-soft);background:#191b1e;border-radius:10px;padding:16px;margin-bottom:12px;display:grid;grid-template-columns:250px 1fr;gap:18px}.reportSelector h2{margin:0 0 6px;font-size:17px}.reportSelector p{margin:0;color:#aeb4c0;font-size:13px;line-height:1.4}.seriesChoices{display:flex;gap:8px;flex-wrap:wrap;align-content:flex-start}.seriesChoices label{display:flex;align-items:center;gap:7px;border:1px solid #3a3d45;background:#121316;border-radius:7px;padding:7px 9px;font-size:12px;cursor:pointer}.seriesChoices input{accent-color:#ef233c}.reportSheet{background:#fff;color:#18202c;padding:34px;min-height:680px}.reportSheet header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #d82432;padding-bottom:16px}.reportSheet header span{font-weight:800;color:#d82432;letter-spacing:.08em}.reportSheet h2{margin:5px 0;font-size:26px}.reportSheet p{margin:0;color:#536070}.reportDate{font-size:13px;color:#536070}.reportCharts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:28px}.reportCharts article{border:1px solid #d9dee6;border-radius:8px;padding:14px;min-width:0}.reportCharts h3{margin:0 0 4px;font-size:16px}.reportCharts p{font-size:12px}.reportSheet footer{border-top:1px solid #d9dee6;margin-top:28px;padding-top:12px;color:#536070;font-size:11px}.reportEmpty{padding:80px 0;text-align:center}@media(max-width:760px){.reportContext{grid-template-columns:1fr}.reportContext>div{border-left:0;border-top:1px solid #30333b}.reportContext>div:first-child{border-top:0}.reportSelector{grid-template-columns:1fr}.reportCharts{grid-template-columns:1fr}.reportSheet{padding:20px}.reportSheet header{display:block}.reportDate{margin-top:12px}}@media print{.noPrint,.go-sidebar,.go-topbar{display:none!important}.trendReportPage{padding:0!important}.reportSheet{padding:0!important}.reportCharts{grid-template-columns:repeat(2,minmax(0,1fr))}.reportCharts article{break-inside:avoid}.go-page{max-width:none!important}}
      `}</style>
    </main>
  );
}
