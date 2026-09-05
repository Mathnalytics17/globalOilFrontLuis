import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, RefreshCcw, Search } from 'lucide-react';
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

    return {
      ...group,
      type,
      points,
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
          <LineChart data={series.points}>
            <CartesianGrid stroke="#30333b" />
            <XAxis dataKey="name" stroke="#aeb4c0" />
            <YAxis stroke="#aeb4c0" width={70} />
            <Tooltip
              formatter={(value, name, item) => [`${item?.payload?.label ?? value}${series.unit ? ` ${series.unit}` : ''}`, 'Resultado']}
              labelFormatter={(label) => `Fecha: ${label}`}
              contentStyle={{ background: '#202126', border: '1px solid #3a3d45', color: '#fff' }}
            />
            <Line type="monotone" dataKey="value" stroke="#ff3045" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
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
        };

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

  const testOptions = useMemo(() => {
    const map = new Map();
    machineRows.forEach((row) => map.set(row.testId, row.testName));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [machineRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!companyFilter || !machineFilter) return [];
    return machineRows.filter((row) => {
      if (testFilter && row.testId !== testFilter) return false;
      if (!term) return true;
      return [row.machineName, row.sampleId, row.testName, row.value, row.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    }).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [companyFilter, machineFilter, machineRows, testFilter, search]);

  const selectedMachine = machines.find((machine) => String(machine.id) === String(machineFilter));
  const canShowHistory = Boolean(companyFilter && machineFilter);
  const trendSeries = useMemo(() => buildSeries(filteredRows), [filteredRows]);

  return (
    <main className="historyPage">
      <header className="header">
        <button type="button" className="iconBtn" onClick={() => router.push('/machines')}><ArrowLeft size={20} /></button>
        <div>
          <span>Maquinas</span>
          <h1>Historico de muestras y pruebas</h1>
          <p>Consulte la evolucion de resultados registrados por equipo.</p>
        </div>
        <button type="button" className="ghostBtn" onClick={load} disabled={loading}><RefreshCcw size={17} /> Recargar</button>
      </header>

      <section className="filters">
        <label>
          Empresa
          <select
            value={companyFilter}
            onChange={(event) => {
              setCompanyFilter(event.target.value);
              setMachineFilter('');
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

      <section className="summary">
        <article><span>Maquinas de empresa</span><strong>{companyFilter ? machineOptions.length : 0}</strong></article>
        <article><span>Muestras con pruebas</span><strong>{new Set(filteredRows.map((row) => row.sampleId)).size}</strong></article>
        <article><span>Resultados</span><strong>{filteredRows.length}</strong></article>
        <article><span>Series numéricas</span><strong>{trendSeries.filter((series) => series.type === 'numeric').length}</strong></article>
      </section>

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
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Maquina</th>
                <th>Muestra</th>
                <th>Prueba</th>
                <th>Resultado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty">Cargando historico...</td></tr>
              ) : filteredRows.length ? filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.machineName}</td>
                  <td>{row.sampleId}</td>
                  <td>{row.testName}</td>
                  <td>{row.value ?? '-'} {row.unit}</td>
                  <td><span className="status">{row.status}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty">No hay resultados para los filtros seleccionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section> : null}

      <style jsx global>{`
        .historyPage { min-height: 100vh; padding: 38px 48px; background: #171717; color: #fff; }
        .header { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; margin-bottom: 20px; }
        .header span { color: #ff3045; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .16em; }
        .header h1 { margin: 6px 0; font-size: 34px; font-weight: 600; }
        .header p { margin: 0; color: #c3c8d1; }
        .iconBtn, .ghostBtn { border: 1px solid #3a3d45; color: #fff; background: #202228; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
        .iconBtn { width: 44px; height: 44px; }
        .ghostBtn { height: 44px; padding: 0 14px; font-weight: 800; }
        .filters { border: 1px solid #30333b; background: #1d1e23; border-radius: 8px; padding: 14px; display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 12px; margin-bottom: 14px; }
        label { color: #aeb4c0; display: grid; gap: 6px; font-size: 13px; font-weight: 800; }
        select, input { height: 42px; border: 1px solid #3a3d45; background: #0f1014; color: #fff; border-radius: 7px; padding: 0 12px; outline: 0; }
        .searchBox span { display: flex; align-items: center; gap: 8px; border: 1px solid #3a3d45; background: #0f1014; border-radius: 7px; padding: 0 10px; }
        .searchBox input { border: 0; flex: 1; padding: 0; }
        .summary { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 12px; margin-bottom: 14px; }
        .summary article, .panel { border: 1px solid #30333b; background: #1d1e23; border-radius: 8px; }
        .summary article { padding: 14px; }
        .summary span { color: #aeb4c0; }
        .summary strong { display: block; margin-top: 8px; font-size: 30px; }
        .panel { padding: 16px; margin-bottom: 14px; }
        .panelTitle { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; }
        .panelTitle h2 { margin: 0; font-size: 22px; font-weight: 600; }
        .panelTitle strong { color: #fff; margin-right: auto; }
        .panelTitle span { color: #aeb4c0; }
        .emptyState h2 { margin: 0 0 8px; font-size: 22px; }
        .emptyState p { margin: 0; color: #aeb4c0; }
        .trendGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 14px; }
        .trendCard { border: 1px solid #30333b; border-radius: 8px; background: #202126; padding: 14px; min-width: 0; }
        .trendHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .trendHead h3 { margin: 0 0 4px; font-size: 17px; font-weight: 700; }
        .trendHead p { margin: 0 0 4px; color: #e5e7eb; font-size: 13px; }
        .trendHead span { color: #aeb4c0; font-size: 13px; }
        .trendHead strong { border: 1px solid #3a3d45; border-radius: 999px; padding: 5px 9px; color: #cfd5de; }
        .miniChart { height: 220px; min-width: 0; }
        .categoryHistory { display: grid; max-height: 220px; overflow: auto; border-top: 1px solid #30333b; }
        .categoryHistory > div { display: grid; grid-template-columns: 90px minmax(100px, 1fr); gap: 4px 12px; padding: 10px 2px; border-bottom: 1px solid #30333b; }
        .categoryHistory span, .categoryHistory small { color: #aeb4c0; font-size: 12px; }
        .categoryHistory small { grid-column: 2; }
        .tableWrap { overflow: auto; }
        table { width: 100%; min-width: 920px; border-collapse: collapse; }
        th { text-align: left; padding: 12px; color: #c4cad5; background: #27282d; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
        td { padding: 13px 12px; border-top: 1px solid #30333b; color: #e8ebf1; }
        .status { display: inline-flex; border: 1px solid #3a3d45; border-radius: 999px; padding: 5px 9px; color: #cfd5de; }
        .empty { color: #aeb4c0; text-align: center; padding: 28px; }
        @media (max-width: 980px) {
          .historyPage { padding: 26px 18px; }
          .header { grid-template-columns: auto 1fr; }
          .ghostBtn { grid-column: 1 / -1; justify-content: center; }
          .filters, .summary { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
