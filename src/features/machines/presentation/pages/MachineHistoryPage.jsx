import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FileBarChart2, Search } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'react-toastify';

import { machinesService } from '@features/machines/infrastructure/machinesService';
import PageHeader from '@shared/ui/PageHeader';
import MetricStrip from '@shared/ui/MetricStrip';
import DataTable from '@shared/ui/DataTable';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function numericValue(value) {
  if (value === null || value === undefined) return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function normalizeLabel(value) {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value).trim();
}

function buildSeries(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.seriesId)) {
      groups.set(row.seriesId, {
        id: row.seriesId,
        testId: row.testId,
        name: row.testName,
        resultName: row.resultName,
        fieldName: row.fieldName,
        unit: row.unit,
        dataType: row.dataType,
        rows: [],
      });
    }
    groups.get(row.seriesId).rows.push(row);
  });

  return Array.from(groups.values()).map((group) => {
    const orderedRows = [...group.rows].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const isExplicitCategory = ['booleano', 'boolean', 'escala', 'escala_ordinal', 'opcion', 'comentario', 'texto']
      .includes(String(group.dataType || '').toLowerCase());
    const type = !isExplicitCategory && orderedRows.some((row) => row.numeric !== null) ? 'numeric' : 'category';
    const points = orderedRows.map((row, index) => ({
        name: formatDate(row.date),
        value: type === 'numeric' ? row.numeric : null,
        label: normalizeLabel(row.value),
        sample: row.sampleId,
        status: row.status,
        index,
      })).filter((point) => type !== 'numeric' || point.value !== null);
    const linesByPoint = new Map();
    orderedRows.forEach((row) => {
      if (type !== 'numeric' || row.numeric === null) return;
      const pointId = row.pointId || 'sin-punto';
      if (!linesByPoint.has(pointId)) linesByPoint.set(pointId, { id: pointId, label: row.pointName || 'Sin punto de medición', rows: [] });
      linesByPoint.get(pointId).rows.push(row);
    });
    const lines = Array.from(linesByPoint.values());
    const chartRows = Array.from(new Set(orderedRows.map((row) => row.date || row.sampleId)))
      .sort((left, right) => new Date(left || 0) - new Date(right || 0))
      .map((date) => {
        const chartRow = { name: formatDate(date) };
        lines.forEach((line) => {
          const item = line.rows.find((row) => (row.date || row.sampleId) === date);
          if (item) chartRow[line.id] = item.numeric;
        });
        return chartRow;
      });

    return {
      ...group,
      type,
      points,
      lines,
      chartRows,
    };
  }).filter((group) => group.points.length);
}

function TrendCard({ series }) {
  const subtitle = series.type === 'numeric'
    ? `Numérico${series.unit ? ` · ${series.unit}` : ''}`
    : 'Historial categórico';

  return (
    <article className="trendCard">
      <div className="trendHead">
        <div>
          <h3>{series.name}</h3>
          <p>{series.resultName} · {series.fieldName}</p>
          <span>{subtitle}</span>
        </div>
        <strong>{series.points.length}</strong>
      </div>
      {series.type === 'numeric' ? <div className="miniChart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series.chartRows}>
            <CartesianGrid stroke="#30333b" />
            <XAxis dataKey="name" stroke="#aeb4c0" />
            <YAxis stroke="#aeb4c0" width={70} />
            <Tooltip
              formatter={(value, name) => [`${value}${series.unit ? ` ${series.unit}` : ''}`, name]}
              labelFormatter={(label) => `Fecha: ${label}`}
              contentStyle={{ background: '#202126', border: '1px solid #3a3d45', color: '#fff' }}
            />
            {series.lines.map((line, index) => <Line key={line.id} type="monotone" dataKey={line.id} name={line.label} stroke={['#ff3045', '#5ea8ff', '#d9a441', '#50bf87', '#ad7dff'][index % 5]} strokeWidth={2} dot={{ r: 3 }} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
        {series.lines.length > 1 ? <div className="trendLegend">{series.lines.map((line, index) => <span key={line.id}><i style={{ background: ['#ff3045', '#5ea8ff', '#d9a441', '#50bf87', '#ad7dff'][index % 5] }} />{line.label}</span>)}</div> : null}
      </div> : (
        <div className="categoryHistory">
          {series.points.map((point) => (
            <div key={`${point.sample}-${point.index}`}>
              <span>{point.name}</span>
              <strong>{point.label}</strong>
              <small>{point.sample} · {point.status || 'Sin evaluar'}</small>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function buildRows(machines) {
  return machines.flatMap((machine) => (
    (machine.muestras || []).flatMap((sample) => {
      const tests = sample.pruebas_asignadas || sample.resultados || [];
      return tests.flatMap((assigned) => {
        const test = assigned.prueba || {};
        const testId = String(test.id || assigned.prueba_id || assigned.id);
        const testName = `${test.acronimo || ''}${test.acronimo ? ' - ' : ''}${test.nombre_variable || 'Prueba'}`;
        const evaluation = assigned.evaluacion_limite || {};
        const details = evaluation.details || evaluation.raw?.details || [];
        const resultConfiguration = assigned.configuracion_resultados || {};
        const unitForResult = (resultId, resultName) => {
          const match = Object.entries(resultConfiguration).find(([key, config]) => (
            String(config?.resultado_id || key) === String(resultId || '')
            || String(config?.resultado || '').trim().toLowerCase() === String(resultName || '').trim().toLowerCase()
          ));
          return match?.[1]?.unidad || '';
        };
        const base = {
          machineId: String(machine.id),
          machineName: machine.nombre || machine.codigo_equipo || `Maquina ${machine.id}`,
          sampleId: sample.id,
          date: sample.fecha_toma || sample.fecha_registro || sample.created_at,
          testId,
          testName,
          status: assigned.estado_limite || assigned.evaluacion_limite?.estado || '-',
          pointId: sample.punto_muestreo?.id ? String(sample.punto_muestreo.id) : '',
          pointName: sample.punto_muestreo?.nombre || 'Sin punto de medición',
        };

        const payloadValues = assigned.resultado_payload?.values || [];
        const payloadFields = new Map((assigned.resultado_payload?.fields || []).map((field) => [field.key, field]));
        if (payloadValues.length) {
          return payloadValues.map((value, index) => {
            const field = payloadFields.get(value.key) || {};
            const rawValue = value.value_label ?? value.value;
            return {
              ...base,
              id: `${machine.id}-${sample.id}-${assigned.id}-payload-${index}`,
              seriesId: `${testId}-${field.key || value.key || index}`,
              resultName: field.resultado_nombre || 'Resultado principal',
              fieldName: field.componente_nombre || field.label || value.key || 'Resultado',
              dataType: field.tipo_dato || '',
              value: rawValue,
              numeric: numericValue(rawValue),
              unit: field.unidad || assigned.unidad || test.unidad_medida || '',
            };
          });
        }

        if (!details.length) {
          const configuredUnits = Object.values(resultConfiguration)
            .map((config) => config?.unidad)
            .filter(Boolean);
          return [{
            ...base,
            id: `${machine.id}-${sample.id}-${assigned.id}`,
            seriesId: `${testId}-principal-resultado`,
            resultName: 'Resultado principal',
            fieldName: 'Resultado',
            dataType: '',
            value: assigned.valor,
            numeric: numericValue(assigned.valor),
            unit: configuredUnits.length === 1 ? configuredUnits[0] : (assigned.unidad || test.unidad_medida || ''),
          }];
        }

        return details.map((detail, index) => {
          const resultId = detail.result_id || detail.resultado_id || detail.division_id || 'principal';
          const resultName = detail.result_label || detail.resultado_label || detail.division_label || 'Resultado principal';
          const fieldId = detail.field_id || detail.component_id || detail.componente_id || detail.field || index;
          const fieldName = detail.field_label || detail.componente || detail.field || 'Resultado';
          const value = detail.resultado_valor_label ?? detail.value_label ?? detail.resultado_valor ?? detail.value;
          return {
            ...base,
            id: `${machine.id}-${sample.id}-${assigned.id}-${index}`,
            seriesId: `${testId}-${resultId}-${fieldId}`,
            resultName,
            fieldName,
            dataType: detail.tipo_dato || detail.data_type || '',
            value,
            numeric: numericValue(value),
            unit: unitForResult(resultId, resultName) || detail.unit || assigned.unidad || test.unidad_medida || '',
            status: detail.estado || detail.status || base.status,
          };
        });
      });
    })
  ));
}

export default function MachineHistoryPage() {
  const router = useRouter();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [pointFilter, setPointFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await machinesService.list({ include_muestras: 1 });
      setMachines(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el historico de maquinas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => buildRows(machines), [machines]);

  const companyOptions = useMemo(() => {
    const map = new Map();
    machines.forEach((machine) => {
      const companyId = machine.empresa || machine.empresa_info?.id;
      if (!companyId) return;
      map.set(String(companyId), machine.empresa_info?.nombre || `Empresa ${companyId}`);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [machines]);

  useEffect(() => {
    if (!router.query.machine || !machines.length) return;
    const selectedMachine = machines.find((machine) => String(machine.id) === String(router.query.machine));
    if (!selectedMachine) return;
    const companyId = selectedMachine.empresa || selectedMachine.empresa_info?.id;
    if (companyId) setCompanyFilter(String(companyId));
    setMachineFilter(String(selectedMachine.id));
    if (router.query.point) setPointFilter(String(router.query.point));
    if (router.query.test) setTestFilter(String(router.query.test));
  }, [router.query.machine, machines]);

  const machineOptions = useMemo(() => machines
    .filter((machine) => !companyFilter || String(machine.empresa || machine.empresa_info?.id) === String(companyFilter))
    .map((machine) => ({
      id: String(machine.id),
      label: machine.nombre || machine.codigo_equipo || `Maquina ${machine.id}`,
      code: machine.codigo_equipo || '',
    })), [machines, companyFilter]);

  const machineRows = useMemo(() => (
    machineFilter ? rows.filter((row) => row.machineId === machineFilter) : []
  ), [rows, machineFilter]);

  const pointOptions = useMemo(() => {
    const points = new Map();
    machineRows.forEach((row) => {
      if (row.pointId) points.set(row.pointId, row.pointName);
    });
    return Array.from(points.entries()).map(([id, label]) => ({ id, label }));
  }, [machineRows]);

  const testOptions = useMemo(() => {
    const map = new Map();
    machineRows.forEach((row) => map.set(row.testId, row.testName));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [machineRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!companyFilter || !machineFilter) return [];
    return machineRows.filter((row) => {
      if (pointFilter && row.pointId !== pointFilter) return false;
      if (testFilter && row.testId !== testFilter) return false;
      if (!term) return true;
      return [row.machineName, row.sampleId, row.testName, row.value, row.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    }).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [companyFilter, machineFilter, machineRows, pointFilter, testFilter, search]);

  const selectedMachine = machines.find((machine) => String(machine.id) === String(machineFilter));
  const canShowHistory = Boolean(companyFilter && machineFilter);
  const trendSeries = useMemo(() => buildSeries(filteredRows), [filteredRows]);

  return (
    <main className="go-page go-shell historyPage">
      <PageHeader
        eyebrow="Máquinas"
        title="Histórico de muestras y pruebas"
        subtitle="Consulte la evolución por equipo y punto de medición."
        actions={canShowHistory ? (
          <button
            type="button"
            className="go-button go-button-secondary"
            onClick={() => router.push({
              pathname: '/machines/historico/reporte',
              query: { machine: machineFilter, point: pointFilter || undefined, test: testFilter || undefined },
            })}
          >
            <FileBarChart2 size={17} /> Preparar informe de tendencia
          </button>
        ) : null}
      />

      <section className="filters">
        <label>
          Empresa
          <select
            value={companyFilter}
            onChange={(event) => {
              setCompanyFilter(event.target.value);
              setMachineFilter('');
              setPointFilter('');
              setTestFilter('');
              setSearch('');
            }}
          >
            <option value="">Seleccione empresa</option>
            {companyOptions.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
          </select>
        </label>
        <label>
          Maquina
          <select
            value={machineFilter}
            onChange={(event) => {
              setMachineFilter(event.target.value);
              setPointFilter('');
              setTestFilter('');
              setSearch('');
            }}
            disabled={!companyFilter}
          >
            <option value="">{companyFilter ? 'Seleccione maquina' : 'Primero seleccione empresa'}</option>
            {machineOptions.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.label}{machine.code ? ` · ${machine.code}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Punto de medición
          <select value={pointFilter} onChange={(event) => setPointFilter(event.target.value)} disabled={!machineFilter || !pointOptions.length}>
            <option value="">{pointOptions.length ? 'Todos los puntos' : 'Sin puntos con resultados'}</option>
            {pointOptions.map((point) => <option key={point.id} value={point.id}>{point.label}</option>)}
          </select>
        </label>
        <label>
          Prueba
          <select value={testFilter} onChange={(event) => setTestFilter(event.target.value)} disabled={!machineFilter}>
            <option value="">Todas</option>
            {testOptions.map((test) => <option key={test.id} value={test.id}>{test.label}</option>)}
          </select>
        </label>
        <label className="searchBox">
          Buscar
          <span><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Muestra, prueba, estado..." disabled={!machineFilter} /></span>
        </label>
      </section>

      <MetricStrip items={[
        { label: 'Máquinas de empresa', value: companyFilter ? machineOptions.length : 0 },
        { label: 'Muestras con pruebas', value: new Set(filteredRows.map((row) => row.sampleId)).size },
        { label: 'Resultados', value: filteredRows.length },
        { label: 'Series numéricas', value: trendSeries.filter((series) => series.type === 'numeric').length },
      ]} />

      {!canShowHistory ? (
        <section className="panel emptyState">
          <h2>Seleccione empresa y maquina</h2>
          <p>El historico se calcula solo para una maquina concreta.</p>
        </section>
      ) : null}

      {canShowHistory ? <section className="panel">
        <div className="panelTitle">
          <h2>{testFilter ? 'Evolución de la prueba' : 'Evolución por campo'}</h2>
          <strong>{selectedMachine?.nombre || selectedMachine?.codigo_equipo || ''}</strong>
          {pointFilter ? <em>{pointOptions.find((point) => point.id === pointFilter)?.label}</em> : null}
          <span>{trendSeries.length} serie(s)</span>
        </div>
        <div className="trendGrid">
          {trendSeries.length ? (
            trendSeries.map((series) => <TrendCard key={series.id} series={series} />)
          ) : <p className="empty">No hay resultados históricos para los filtros seleccionados.</p>}
        </div>
      </section> : null}

      {canShowHistory ? <section className="panel">
        <div className="panelTitle">
          <h2>Registro historico</h2>
          <span>{filteredRows.length} resultado(s)</span>
        </div>
        <DataTable
          data={loading ? [] : filteredRows}
          rowKey="id"
          pagination
          initialRowsPerPage={15}
          minWidth={760}
          emptyMessage={loading ? 'Cargando histórico…' : 'No hay resultados para los filtros seleccionados.'}
          defaultSort={{ field: 'date', order: 'desc' }}
          columns={[
            { id: 'date', label: 'Fecha', render: (row) => formatDate(row.date) },
            { id: 'machineName', label: 'Máquina', mobileTitle: true },
            { id: 'pointName', label: 'Punto de medición', minWidth: 160 },
            { id: 'sampleId', label: 'Muestra' },
            { id: 'testName', label: 'Prueba', minWidth: 180 },
            { id: 'value', label: 'Resultado', sortable: false, render: (row) => `${row.value ?? '-'}${row.unit ? ` ${row.unit}` : ''}` },
            { id: 'status', label: 'Estado', render: (row) => <span className="status">{row.status}</span> },
          ]}
        />
      </section> : null}

      <style jsx global>{`
        .historyPage { min-height: 0; background: transparent; color: #fff; }
        .filters { border: 1px solid var(--go-border-soft); background: #191b1e; border-radius: var(--go-radius); padding: 14px; display: grid; grid-template-columns:minmax(170px,1fr) minmax(230px,1.35fr) minmax(230px,1.35fr) minmax(150px,.85fr) minmax(230px,1.35fr); gap: 12px; margin-bottom: 14px; }
        .historyPage label { color: #aeb4c0; display: grid; gap: 5px; font-size: 11.5px; font-weight: 600; }
        .historyPage select, .historyPage input { height: 36px; border: 1px solid #3a3f46; background: #141518; color: #fff; border-radius: 7px; padding: 0 10px; outline: 0; font-size: 12.5px; }
        .searchBox span { display: flex; align-items: center; gap: 8px; border: 1px solid #3a3d45; background: #0f1014; border-radius: 7px; padding: 0 10px; }
        .searchBox input { border: 0; flex: 1; padding: 0; }
        .panel { border: 1px solid var(--go-border-soft); background: #191b1e; border-radius: var(--go-radius); }
        .panel { padding: 16px; margin-bottom: 14px; }
        .panelTitle { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; }
        .panelTitle h2 { margin: 0; font-size: 16px; font-weight: 650; }
        .panelTitle strong { color: #fff; margin-right: auto; }
        .panelTitle em { color: #b9c5d7; font-size: 13px; font-style: normal; }
        .panelTitle span { color: #aeb4c0; }
        .emptyState h2 { margin: 0 0 6px; font-size: 16px; }
        .emptyState p { margin: 0; color: #aeb4c0; }
        .trendGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px; }
        .trendCard { border: 1px solid #30333b; border-radius: 8px; background: #202126; padding: 14px; min-width: 0; }
        .trendHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .trendHead h3 { margin: 0 0 4px; font-size: 17px; font-weight: 700; }
        .trendHead p { margin: 0 0 4px; color: #e5e7eb; font-size: 13px; }
        .trendHead span { color: #aeb4c0; font-size: 13px; }
        .trendHead strong { border: 1px solid #3a3d45; border-radius: 999px; padding: 5px 9px; color: #cfd5de; }
        .miniChart { height: 220px; min-width: 0; }
        .trendLegend{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#b7bec8}.trendLegend span{display:inline-flex;align-items:center;gap:5px}.trendLegend i{width:8px;height:8px;border-radius:50%}
        .categoryHistory { display: grid; max-height: 220px; overflow: auto; border-top: 1px solid #30333b; }
        .categoryHistory > div { display: grid; grid-template-columns: 90px minmax(100px, 1fr); gap: 4px 12px; padding: 10px 2px; border-bottom: 1px solid #30333b; }
        .categoryHistory span, .categoryHistory small { color: #aeb4c0; font-size: 12px; }
        .categoryHistory small { grid-column: 2; }
        .status { display: inline-flex; border: 1px solid #3a3d45; border-radius: 999px; padding: 5px 9px; color: #cfd5de; }
        .empty { color: #aeb4c0; text-align: center; padding: 28px; }
        @media (max-width: 980px) {
          .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .filters { grid-template-columns: 1fr; padding: 8px; }
          .panel { padding: 12px; }
          .panelTitle { align-items: flex-start; flex-wrap: wrap; }
          .trendGrid { grid-template-columns: 1fr; }
          .trendCard { padding: 10px; }
        }
      `}</style>
    </main>
  );
}
