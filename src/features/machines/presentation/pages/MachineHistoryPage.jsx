import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Activity, Database, FileBarChart2, Search, TestTube2, Wrench } from 'lucide-react';
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
import PaginationBar from '@shared/ui/PaginationBar';

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
  // El endpoint de histórico entrega filas normalizadas, pero el valor aún
  // llega como texto para conservar precisión y la unidad en el registro.
  // La gráfica necesita explícitamente su representación numérica.
  if (machines.every((item) => item?.seriesId)) {
    return machines.map((item) => ({
      ...item,
      machineId: String(item.machineId || ''),
      pointId: String(item.pointId || ''),
      numeric: numericValue(item.value),
    }));
  }
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
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [companyFilter, setCompanyFilter] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [pointFilter, setPointFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');
  const [search, setSearch] = useState('');
  const [includeInvalid, setIncludeInvalid] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(25);
  const [historyMeta, setHistoryMeta] = useState({ count: 0, next: null, previous: null });

  const load = async () => {
    setLoading(true);
    try {
      const data = await machinesService.list();
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

  useEffect(() => {
    if (!machineFilter) {
      setHistoryRows([]);
      setHistoryMeta({ count: 0, next: null, previous: null });
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    machinesService.history(machineFilter, {
      page: historyPage,
      page_size: historyPageSize,
      point: pointFilter || undefined,
      test: testFilter || undefined,
      include_invalid: includeInvalid || undefined,
    })
      .then((data) => {
        if (!cancelled) {
          setHistoryRows(data.results || []);
          setHistoryMeta({ count: data.count || 0, next: data.next || null, previous: data.previous || null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryRows([]);
          setHistoryMeta({ count: 0, next: null, previous: null });
          toast.error('No se pudo cargar el histórico del equipo.');
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [machineFilter, pointFilter, testFilter, includeInvalid, historyPage, historyPageSize]);

  useEffect(() => { setHistoryPage(1); }, [machineFilter, pointFilter, testFilter, includeInvalid, historyPageSize]);

  const rows = useMemo(() => buildRows(historyRows), [historyRows]);

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
            className="go-button go-button-primary reportAction"
            onClick={() => router.push({
              pathname: '/machines/historico/reporte',
              query: { machine: machineFilter, point: pointFilter || undefined, test: testFilter || undefined },
            })}
          >
            <FileBarChart2 size={17} /> Preparar informe de tendencia
          </button>
        ) : null}
      />

      <section className="filtersPanel">
        <div className="filtersHeading">
          <div>
            <span>Explorar histórico</span>
            <p>Seleccione el equipo y refine las series que desea comparar.</p>
          </div>
          {machineFilter ? <button type="button" className="clearFilters" onClick={() => { setPointFilter(''); setTestFilter(''); setSearch(''); setIncludeInvalid(false); }}>Limpiar filtros</button> : null}
        </div>
        <div className="filters">
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
        <label className="invalidToggle">
          <input type="checkbox" checked={includeInvalid} onChange={(event) => setIncludeInvalid(event.target.checked)} disabled={!machineFilter} />
          Incluir muestras invalidadas
        </label>
        </div>
      </section>

      <MetricStrip items={[
        { label: 'Máquinas disponibles', value: companyFilter ? machineOptions.length : 0, icon: Wrench },
        { label: 'Muestras visibles', value: new Set(filteredRows.map((row) => row.sampleId)).size, icon: Database },
        { label: 'Resultados visibles', value: filteredRows.length, icon: TestTube2 },
        { label: 'Series visibles', value: trendSeries.length, icon: Activity },
      ]} />

      {!canShowHistory ? (
        <section className="panel emptyState">
          <h2>Seleccione empresa y maquina</h2>
          <p>El historico se calcula solo para una maquina concreta.</p>
        </section>
      ) : null}

      {canShowHistory ? <section className="panel">
        <div className="panelTitle panelTitle--stacked">
          <div>
            <span className="sectionEyebrow">Tendencias</span>
            <h2>{testFilter ? 'Evolución de la prueba' : 'Evolución por campo'}</h2>
            <p>Compare la evolución histórica de cada resultado medido.</p>
          </div>
          <div className="contextChips">
            <strong>{selectedMachine?.nombre || selectedMachine?.codigo_equipo || ''}</strong>
            {pointFilter ? <em>{pointOptions.find((point) => point.id === pointFilter)?.label}</em> : null}
            <span>{trendSeries.length} serie{trendSeries.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="trendGrid">
          {trendSeries.length ? (
            trendSeries.map((series) => <TrendCard key={series.id} series={series} />)
          ) : <p className="empty">No hay resultados históricos para los filtros seleccionados.</p>}
        </div>
      </section> : null}

      {canShowHistory ? <section className="panel">
        <div className="panelTitle panelTitle--stacked">
          <div>
            <span className="sectionEyebrow">Detalle</span>
            <h2>Registro histórico</h2>
            <p>Consulte los resultados que alimentan las tendencias mostradas arriba.</p>
          </div>
          <span className="resultCount">{historyMeta.count} registro{historyMeta.count === 1 ? '' : 's'}</span>
        </div>
        <DataTable
          data={loading || historyLoading ? [] : filteredRows}
          rowKey="id"
          pagination={false}
          minWidth={760}
          emptyMessage={loading || historyLoading ? 'Cargando histórico…' : 'No hay resultados para los filtros seleccionados.'}
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
        <PaginationBar
          count={historyMeta.count}
          page={historyPage}
          pageSize={historyPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={setHistoryPage}
          onPageSizeChange={(size) => { setHistoryPageSize(size); setHistoryPage(1); }}
        />
      </section> : null}

      <style jsx global>{`
        .historyPage { min-height: 0; background: transparent; color: #fff; }
        .historyPage .go-page-heading { align-items: flex-end; margin-bottom: 20px; }
        .historyPage .reportAction { min-height: 40px; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }

        .filtersPanel { border: 1px solid #292c32; background: linear-gradient(180deg, #191b1f 0%, #17191c 100%); border-radius: 12px; margin-bottom: 18px; overflow: visible; }
        .filtersHeading { min-height: 58px; padding: 13px 16px 11px; border-bottom: 1px solid #292c32; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .filtersHeading span, .sectionEyebrow { display: block; color: #f5f6f8; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .filtersHeading p { margin: 4px 0 0; color: #8f97a3; font-size: 12.5px; font-weight: 400; }
        .clearFilters { appearance: none; border: 0; background: transparent; color: #b9c0ca; font-size: 12px; font-weight: 650; cursor: pointer; padding: 7px 9px; border-radius: 7px; }
        .clearFilters:hover { background: #23262b; color: #fff; }
        .filters { padding: 14px 16px 16px; display: grid; grid-template-columns: minmax(0,.8fr) minmax(0,1.55fr) minmax(0,1.25fr) minmax(0,.72fr) minmax(0,1.15fr); gap: 12px; align-items: end; }
        .filters > label { min-width: 0; max-width: 100%; }
        .historyPage label { color: #aeb4c0; display: grid; gap: 6px; font-size: 11.5px; font-weight: 650; }
        .historyPage select, .historyPage input { width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; height: 39px; border: 1px solid #353941; background: #121417; color: #f7f8fa; border-radius: 8px; padding: 0 34px 0 11px; outline: 0; font-size: 12.5px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; transition: border-color .16s ease, box-shadow .16s ease; }
        .historyPage select:focus, .historyPage input:focus { border-color: #5e6672; box-shadow: 0 0 0 2px rgba(255,255,255,.04); }
        .searchBox span { display: flex; min-width: 0; max-width: 100%; align-items: center; gap: 8px; height: 39px; border: 1px solid #353941; background: #121417; border-radius: 8px; padding: 0 10px; color: #929aa6; box-sizing: border-box; overflow: hidden; }
        .searchBox input { width: auto; border: 0; height: 37px; flex: 1; min-width: 0; padding: 0; background: transparent; box-shadow: none !important; overflow: hidden; text-overflow: ellipsis; }
        .invalidToggle { grid-column: 1 / -1; display: inline-flex; grid-template-columns: auto 1fr; align-items: center; justify-content: start; gap: 8px; color: #c8ced8; font-size: 12px; cursor: pointer; width: fit-content; }
        .invalidToggle input { width: 16px; height: 16px; accent-color: #ff3045; }

        .historyPage .go-metric-strip { margin-bottom: 18px; border-top-color: #26292f; border-bottom-color: #26292f; }
        .historyPage .go-metric-value { font-size: 20px; }
        .historyPage .go-metric-icon { color: #9aa2ae; }

        .panel { border: 1px solid #292c32; background: #17191c; border-radius: 12px; padding: 18px; margin-bottom: 18px; overflow: hidden; }
        .panelTitle { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 16px; }
        .panelTitle--stacked { align-items: flex-start; }
        .panelTitle h2 { margin: 3px 0 0; font-size: 17px; line-height: 1.2; font-weight: 750; color: #f4f5f7; }
        .panelTitle p { margin: 5px 0 0; color: #8f97a3; font-size: 12.5px; }
        .contextChips { margin-left: auto; display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 7px; max-width: 58%; }
        .contextChips strong, .contextChips em, .contextChips span, .resultCount { max-width: 100%; border: 1px solid #32363e; background: #202329; border-radius: 999px; padding: 6px 10px; color: #cfd4dc; font-size: 11.5px; font-style: normal; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .contextChips strong { color: #fff; }
        .sectionEyebrow { color: #8f97a3; font-size: 10.5px; }
        .emptyState { padding: 30px 22px; text-align: center; }
        .emptyState h2 { margin: 0 0 6px; font-size: 16px; }
        .emptyState p { margin: 0; color: #8f97a3; }

        .trendGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .trendCard { border: 1px solid #2f333a; border-radius: 10px; background: #1d2025; padding: 15px; min-width: 0; box-shadow: inset 0 1px rgba(255,255,255,.015); }
        .trendCard:hover { border-color: #3a3f47; }
        .trendHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; min-height: 70px; }
        .trendHead h3 { margin: 0 0 5px; font-size: 16px; line-height: 1.25; font-weight: 750; color: #f5f6f8; }
        .trendHead p { margin: 0 0 4px; color: #cdd2d9; font-size: 12.5px; line-height: 1.35; }
        .trendHead span { color: #8f97a3; font-size: 12px; }
        .trendHead strong { flex: 0 0 auto; min-width: 34px; text-align: center; border: 1px solid #353a42; background: #24272d; border-radius: 999px; padding: 5px 8px; color: #d8dce3; font-size: 12px; }
        .miniChart { height: 275px; min-width: 0; padding-top: 4px; }
        .trendLegend { display: flex; gap: 10px; flex-wrap: wrap; margin: 7px 0 0 4px; font-size: 10.5px; color: #aeb4be; }
        .trendLegend span { display: inline-flex; align-items: center; gap: 5px; }
        .trendLegend i { width: 7px; height: 7px; border-radius: 50%; }
        .categoryHistory { display: grid; max-height: 270px; overflow: auto; border-top: 1px solid #2e3238; scrollbar-width: thin; }
        .categoryHistory > div { display: grid; grid-template-columns: 100px minmax(100px, 1fr); gap: 4px 12px; padding: 11px 2px; border-bottom: 1px solid #292d33; }
        .categoryHistory span, .categoryHistory small { color: #929aa6; font-size: 11.5px; }
        .categoryHistory strong { color: #f1f3f5; }
        .categoryHistory small { grid-column: 2; }
        .status { display: inline-flex; border: 1px solid #353a42; background: #202329; border-radius: 999px; padding: 4px 8px; color: #cfd5de; font-size: 11.5px; }
        .empty { grid-column: 1 / -1; color: #929aa6; text-align: center; padding: 40px 20px; }

        .historyPage .go-pagination { margin-top: 14px; padding-top: 14px; border-top: 1px solid #292c32; }

        @media (max-width: 1380px) {
          .filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .trendGrid { grid-template-columns: 1fr; }
        }
        @media (max-width: 980px) {
          .historyPage .go-page-heading { align-items: flex-start; }
          .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .contextChips { max-width: 100%; margin-left: 0; justify-content: flex-start; }
          .panelTitle--stacked { flex-direction: column; }
        }
        @media (max-width: 640px) {
          .filtersHeading { align-items: flex-start; }
          .filters { grid-template-columns: 1fr; padding: 12px; }
          .filtersPanel { border-radius: 9px; }
          .panel { padding: 12px; border-radius: 9px; }
          .trendCard { padding: 11px; }
          .miniChart { height: 235px; }
          .historyPage .reportAction { width: 100%; justify-content: center; }
        }
      `}</style>
    </main>
  );
}
