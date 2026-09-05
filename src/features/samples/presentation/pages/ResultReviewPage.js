import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Beaker,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileSpreadsheet,
  Filter,
  History,
  ListChecks,
  Pencil,
  RefreshCw,
  Search,
  X,
  ShieldOff,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { reviewInterpretationService } from '@features/samples/infrastructure/reviewInterpretationService';
import { resultEntryService } from '@src/features/samples/infrastructure/resultEntryService';
import { resultsService } from '@features/samples/infrastructure/resultsService';
import { presentLimitBands } from '@utils/limitPresentation';

const fmtDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO');
};

const statusClass = (value = '') => {
  const v = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('_', ' ')
    .toLowerCase();
  if (v.includes('normal') || v.includes('revis') || v.includes('aprob')) return 'ok';
  if (v.includes('crítico') || v.includes('critico')) return 'critical';
  if (v.includes('no deseado') || v.includes('alert') || v.includes('fuera') || v.includes('rechaz')) return 'alert';
  if (v.includes('sin criterio') || v.includes('sin info') || v.includes('sin límite') || v.includes('sin limite')) return 'warning';
  if (v.includes('pend') || v.includes('sin resultado')) return 'pending';
  if (v.includes('informativo') || v.includes('no evaluable')) return 'neutral';
  return 'neutral';
};

const normalizeStatusLabel = (row) => row.estado_tecnico_label || row.estado_limite || row.evaluacion_limite?.estado_label || 'Pendiente';

const fieldLabel = (detail) => detail.field_label || detail.componente || detail.field || 'Resultado';

const measuredValue = (detail) => (
  detail.resultado_valor_label ?? detail.value_label ?? detail.resultado_valor ?? detail.value ?? '-'
);

const detailStatusLabel = (detail) => {
  const value = String(detail.estado || '').toUpperCase();
  if (value === 'NORMAL') return 'ACEPTABLE';
  if (value === 'NO_DESEADO' || value === 'FUERA_DE_LIMITE') return 'ALERTA';
  if (value === 'CRITICO') return 'CRÍTICO';
  if (value === 'INFORMATIVO') return 'INFORMATIVO';
  return value.replaceAll('_', ' ') || (detail.passed === true ? 'ACEPTABLE' : detail.passed === false ? 'NO DESEADO' : 'SIN EVALUAR');
};

const groupEvaluationDetails = (details = []) => {
  const groups = [];
  details.forEach((detail) => {
    const label = detail.result_label || 'Resultado';
    let group = groups.find((item) => item.label === label);
    if (!group) {
      group = { label, unit: detail.unit || '', details: [] };
      groups.push(group);
    }
    if (!group.unit && detail.unit) group.unit = detail.unit;
    group.details.push(detail);
  });
  return groups;
};

const STATUS_RANK = { NORMAL: 0, INFORMATIVO: 0, NO_DESEADO: 1, FUERA_DE_LIMITE: 1, CRITICO: 2 };

const groupTechnicalStatus = (details = []) => details.reduce((worst, detail) => {
  const status = String(detail.estado || (detail.passed === false ? 'NO_DESEADO' : 'NORMAL')).toUpperCase();
  return (STATUS_RANK[status] ?? 0) > (STATUS_RANK[worst] ?? 0) ? status : worst;
}, 'NORMAL');

const fieldType = (field = {}) => String(field.tipo_dato || field.tipo_comparacion || 'texto').toLowerCase();

const fieldOptions = (field = {}) => (field.opciones || []).map((option) => (
  typeof option === 'object'
    ? { value: String(option.value ?? option.label ?? ''), label: String(option.label ?? option.value ?? '') }
    : { value: String(option), label: String(option) }
));

const isSelectField = (field) => ['booleano', 'escala', 'escala_ordinal', 'opcion'].includes(fieldType(field)) || fieldOptions(field).length > 0;

const resultSummary = (group) => group.details.map((detail) => ({
  label: fieldLabel(detail),
  value: measuredValue(detail),
  status: detailStatusLabel(detail),
}));

const limitBandRows = (detail) => {
  const bands = presentLimitBands(detail);
  return [
    { key: 'acceptable', label: 'Aceptable', tone: 'ok', text: bands.acceptable },
    { key: 'warning', label: 'Alerta', tone: 'warning', text: bands.warning },
    { key: 'critical', label: 'Critico', tone: 'critical', text: bands.critical },
  ].filter((band) => band.text);
};

const criterionDisplay = (row) => {
  if (row.criterio_limite_catalogo_info && row.criterio_limite_item_info) {
    return {
      label: row.criterio_limite_catalogo_info.nombre,
      value: row.criterio_limite_item_info.nombre,
    };
  }
  if (row.criterio_limite_escala_info && row.criterio_limite_escala_item_info) {
    return {
      label: row.criterio_limite_escala_info.nombre,
      value: row.criterio_limite_escala_item_info.etiqueta,
    };
  }
  return {
    label: 'Origen del límite',
    value: row.criterio_aplicado && !row.criterio_aplicado.includes('Resultado principal')
      ? row.criterio_aplicado
      : 'Configuración de la prueba',
  };
};

const TestRules = ({ row }) => {
  const groups = groupEvaluationDetails(row?.limite_detalles || row?.evaluacion_limite?.details || []);
  if (!groups.length) return <div className="empty ruleEmpty">Esta prueba no tiene reglas evaluables configuradas.</div>;

  return (
    <div className="limitGroups">
      {groups.map((group, groupIndex) => (
        <section className="limitGroup" key={`${row.id}-${group.label}-${groupIndex}`}>
          <div className="limitGroupHead">
            <strong>{group.label}{group.unit ? <span className="resultUnit">Unidad: {group.unit}</span> : null}</strong>
            <span className={`fieldStatus ${statusClass(groupTechnicalStatus(group.details))}`}>
              {detailStatusLabel({ estado: groupTechnicalStatus(group.details) })}
            </span>
          </div>
          <div className="limitDetailHead"><span>Campo</span><span>Medición</span><span>Bandas técnicas</span><span>Decisión</span></div>
          {group.details.map((detail, detailIndex) => {
            const bands = limitBandRows(detail);
            return (
              <div className="limitDetail" key={`${fieldLabel(detail)}-${detailIndex}`}>
                <strong>{fieldLabel(detail)}</strong>
                <span>{measuredValue(detail)}</span>
                <div className="limitBands">
                  {bands.map((band, bandIndex) => (
                    <span className={`zone ${band.tone || ''}`} key={`${band.label}-${bandIndex}`}>
                      <i /><b>{band.label}</b> {band.text}
                    </span>
                  ))}
                </div>
                <div>
                  <span className={`fieldStatus ${statusClass(detail.estado)}`}>{detailStatusLabel(detail)}</span>
                  <small>{detail.reason || detail.motivo || ''}</small>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
};


const getUserName = (user) => user?.full_name || user?.username || user?.email || 'Sistema';

const getCurrentSampleIndex = (samples, sampleId) => samples.findIndex((item) => item.id === sampleId);

const getChangeKind = (item) => {
  if (item.type === 'revision') return 'Cambio de estado';
  if (item.type === 'initial') return 'Registro inicial';
  return 'Corrección de resultado';
};

const getSampleTests = (batch, sampleId) => (batch?.sample_tests || []).filter((item) => item.muestra === sampleId);

export default function ReviewResultsPage() {
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batch, setBatch] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [historyModal, setHistoryModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [limitsModal, setLimitsModal] = useState(null);
  const [sampleRulesOpen, setSampleRulesOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testsPage, setTestsPage] = useState(1);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const TESTS_PER_PAGE = 12;

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (router.query?.lote) setSelectedBatchId(String(router.query.lote));
  }, [router.query?.lote]);

  useEffect(() => {
    if (selectedBatchId) loadBatch(selectedBatchId);
  }, [selectedBatchId]);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const list = await reviewInterpretationService.listReviewBatches();
      setBatches(list);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los lotes para revisión.');
    } finally {
      setLoading(false);
    }
  };

  const loadBatch = async (loteId) => {
    setLoadingBatch(true);
    try {
      const data = await reviewInterpretationService.getReviewBatch(loteId);
      setBatch(data);
      const querySample = router.query?.muestra ? String(router.query.muestra) : '';
      const firstPending = data.muestras?.find((sample) => !sample.is_revisado);
      const selected = data.muestras?.find((sample) => sample.id === querySample) || firstPending || data.muestras?.[0];
      setSelectedSampleId(selected?.id || '');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el lote seleccionado.');
    } finally {
      setLoadingBatch(false);
    }
  };

  const filteredSamples = useMemo(() => {
    const term = search.trim().toLowerCase();
    const samples = batch?.muestras || [];
    if (!term) return samples;
    return samples.filter((sample) => [
      sample.id,
      sample.equipo,
      sample.ubicacion,
      sample.estado_revision,
    ].join(' ').toLowerCase().includes(term));
  }, [batch, search]);

  const selectedSample = useMemo(() => (batch?.muestras || []).find((sample) => sample.id === selectedSampleId), [batch, selectedSampleId]);
  const selectedTests = useMemo(() => getSampleTests(batch, selectedSampleId), [batch, selectedSampleId]);
  const testsPages = Math.max(1, Math.ceil(selectedTests.length / TESTS_PER_PAGE));
  const visibleTests = useMemo(
    () => selectedTests.slice((testsPage - 1) * TESTS_PER_PAGE, testsPage * TESTS_PER_PAGE),
    [selectedTests, testsPage],
  );

  useEffect(() => {
    setTestsPage(1);
    setSampleRulesOpen(false);
  }, [selectedSampleId]);

  useEffect(() => {
    if (testsPage > testsPages) setTestsPage(testsPages);
  }, [testsPage, testsPages]);

  const progress = useMemo(() => {
    const total = batch?.muestras?.length || 0;
    const reviewed = (batch?.muestras || []).filter((sample) => sample.is_revisado).length;
    return { total, reviewed };
  }, [batch]);

  const sampleIndex = useMemo(() => getCurrentSampleIndex(batch?.muestras || [], selectedSampleId), [batch, selectedSampleId]);

  const goToRelativeSample = (step) => {
    const samples = batch?.muestras || [];
    if (!samples.length || sampleIndex < 0) return;
    const nextIndex = Math.min(Math.max(sampleIndex + step, 0), samples.length - 1);
    setSelectedSampleId(samples[nextIndex].id);
  };

  const openHistory = async (row) => {
    const resultId = row?.resultado?.id;
    if (!resultId) {
      toast.warning('Este ensayo aún no tiene resultado para historial.');
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await reviewInterpretationService.getResultHistory(resultId);
      setHistoryModal({ row, data });
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el historial.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEdit = (row) => {
    const payload = row?.resultado?.payload || {};
    const fields = payload.fields?.length
      ? payload.fields
      : [{ key: 'value', label: row.prueba?.nombre_variable || row.prueba?.acronimo || 'Resultado', unidad: row.unidad || '', tipo_dato: 'texto' }];
    const existing = new Map((payload.values || []).map((item) => [item.key, item]));
    const values = fields.map((field, index) => ({
      key: field.key,
      value: existing.get(field.key)?.value ?? (!payload.values?.length && index === 0 ? row.resultado_resumen || '' : ''),
      observacion: existing.get(field.key)?.observacion || '',
    }));
    setEditModal({ row, fields, values, justificacion: '' });
  };

  const updateEditValue = (key, value) => {
    setEditModal((prev) => ({
      ...prev,
      values: prev.values.map((item) => item.key === key ? { ...item, value } : item),
    }));
  };

  const saveCorrection = async () => {
    if (!editModal?.row?.resultado?.id) return;
    if (!editModal.justificacion.trim()) {
      toast.warning('La justificación es obligatoria.');
      return;
    }
    setSaving(true);
    try {
      await reviewInterpretationService.correctResult(editModal.row.resultado.id, {
        values: editModal.values,
        justificacion: editModal.justificacion,
      });
      toast.success('Resultado corregido con trazabilidad.');
      setEditModal(null);
      await loadBatch(selectedBatchId);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo corregir el resultado.');
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async (row) => {
    setSaving(true);
    try {
      await reviewInterpretationService.markReviewed(row.id);
      toast.success('Ensayo marcado como revisado.');
      await loadBatch(selectedBatchId);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo marcar como revisado.');
    } finally {
      setSaving(false);
    }
  };

  const invalidateResult = async (row) => {
    const resultId = row?.resultado?.id;
    if (!resultId) {
      toast.warning('Este ensayo todavía no tiene un resultado para invalidar.');
      return;
    }
    const reason = window.prompt('Indique el motivo de invalidación. El resultado permanecerá en el historial:');
    if (!reason?.trim()) return;
    setSaving(true);
    try {
      await resultsService.invalidate(resultId, reason.trim());
      toast.success('Resultado invalidado con trazabilidad.');
      await loadBatch(selectedBatchId);
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.reason?.[0] || 'No se pudo invalidar el resultado.');
    } finally {
      setSaving(false);
    }
  };

  const completeBatch = async () => {
    if (!selectedBatchId) return;
    setSaving(true);
    try {
      await reviewInterpretationService.completeBatchReview(selectedBatchId);
      toast.success('Revisión del lote completada.');
      await loadBatch(selectedBatchId);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo completar la revisión del lote.');
    } finally {
      setSaving(false);
    }
  };

  const downloadSelectedSample = async () => {
    if (!selectedBatchId || !selectedSampleId) {
      toast.warning('Seleccione una muestra.');
      return;
    }
    try {
      const response = await resultEntryService.downloadExport(selectedBatchId, 'por_muestra_columnas', selectedSampleId);
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resultados_${selectedSampleId}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo descargar el Excel de la muestra.');
    }
  };

  const downloadBatchResults = async (mode) => {
    if (!selectedBatchId) return;
    setExportLoading(true);
    try {
      const response = await resultEntryService.downloadExport(selectedBatchId, mode);
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resultados_${selectedBatchId}_${mode}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setExportMenuOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudieron descargar los resultados.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="reviewPage">
      {saving ? (
        <div className="requestOverlay" role="status" aria-busy="true">
          <div className="requestCard">
            <RefreshCw className="requestSpinner" size={46} />
            <strong>Guardando cambios...</strong>
            <span>Espere un momento. No cierre ni actualice esta página.</span>
          </div>
        </div>
      ) : null}
      <header className="reviewTop">
        <div className="titleBox">
          <button
            type="button"
            className="squareBtn"
            onClick={() => router.push(`/muestras/resultados${selectedBatchId ? `?lote=${selectedBatchId}` : ''}`)}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="squareBtn static"><Beaker size={21} /></div>
          <div>
            <h1>Revisión de resultados</h1>
            <p>Primera revisión interna de resultados antes de la generación del informe.</p>
          </div>
        </div>

        <div className="topMeta">
          <label>
            <span>Lote</span>
            {selectedBatchId ? (
              <div className="lockedLot">{selectedBatchId}</div>
            ) : (
              <button type="button" className="lockedLot action" onClick={() => router.push('/muestras/lotes')}>
                Seleccione un lote desde lotes
              </button>
            )}
          </label>
          <Info label="Cliente" value={batch?.cliente_nombre || '-'} />
          <div className="progressBox">
            <span>Progreso</span>
            <strong>{progress.reviewed}/{progress.total}</strong>
            <small>muestras revisadas</small>
          </div>
          <div className="progressBox">
            <span>Muestra</span>
            <strong>{sampleIndex >= 0 ? sampleIndex + 1 : 0}/{progress.total}</strong>
            <small>posición actual</small>
          </div>
          <button type="button" className="btn red" onClick={completeBatch} disabled={saving || !selectedBatchId}>
            <CheckCircle2 size={17} /> Completar revisión del lote
          </button>
          <button type="button" className="btn secondary" onClick={() => router.push(`/muestras/interpretacion${selectedBatchId ? `?lote=${selectedBatchId}` : ''}`)}>
            Ir a interpretación →
          </button>
          <div className="exportMenu">
            <button type="button" className="btn secondary" onClick={() => setExportMenuOpen((open) => !open)} disabled={!selectedBatchId || exportLoading}>
              <FileSpreadsheet size={17} /> Exportar resultados
            </button>
            {exportMenuOpen ? (
              <div className="exportMenuPanel">
                <strong>Resultados del lote</strong>
                <button type="button" onClick={() => downloadBatchResults('consolidado')}>Todos en una hoja</button>
                <button type="button" onClick={() => downloadBatchResults('por_muestra')}>Una hoja por muestra</button>
                <button type="button" onClick={() => downloadBatchResults('por_muestra_columnas')}>Muestras con campos en columnas</button>
              </div>
            ) : null}
          </div>
          <button type="button" className="btn secondary" onClick={downloadSelectedSample} disabled={!selectedSampleId}>
            <FileSpreadsheet size={17} /> Excel de la muestra
          </button>
        </div>
      </header>

      <section className="reviewGrid">
        <aside className="samplesPane">
          <div className="paneHead">
            <h2>Muestras del lote ({batch?.muestras?.length || 0})</h2>
          </div>
          <div className="searchLine">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar muestra" />
            <button type="button"><Filter size={16} /></button>
          </div>

          <div className="sampleList">
            {loadingBatch ? (
              <div className="empty">Cargando muestras...</div>
            ) : filteredSamples.length ? filteredSamples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className={`sampleItem ${sample.id === selectedSampleId ? 'active' : ''}`}
                onClick={() => setSelectedSampleId(sample.id)}
              >
                <strong>{sample.id}</strong>
                <span className={`pill ${statusClass(sample.estado_revision)}`}>
                  {sample.estado_revision}
                  {sample.is_revisado ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
                </span>
              </button>
            )) : (
              <div className="empty">Sin muestras para revisar.</div>
            )}
          </div>

          <div className="legend">
            <span><i className="dot okDot" /> Revisada</span>
            <span><i className="dot pendingDot" /> Pendiente</span>
            <span><i className="dot alertDot" /> Alerta</span>
          </div>
        </aside>

        <main className="reviewContent">
          <div className="sampleHeader" title={`Equipo: ${selectedSample?.equipo || '-'} · Tipo: ${selectedSample?.tipo_muestra || '-'} · Referencia: ${selectedSample?.referencia_marca || '-'}`}>
            <div className="sampleTitleLine">
              <span>Muestra</span>
              <h2>{selectedSample?.id || '-'}</h2>
              <span className={`pill ${statusClass(selectedSample?.estado_revision)}`}>{selectedSample?.estado_revision || '-'}</span>
            </div>
            <div className="sampleNav">
              <button type="button" className="sampleRulesButton" onClick={() => setSampleRulesOpen(true)} disabled={!selectedTests.length}>
                <ListChecks size={16} /> Reglas de la muestra
              </button>
              <button type="button" onClick={() => goToRelativeSample(-1)} disabled={sampleIndex <= 0}><ChevronLeft size={16} /> Anterior</button>
              <button type="button" onClick={() => goToRelativeSample(1)} disabled={sampleIndex < 0 || sampleIndex >= progress.total - 1}>Siguiente <ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="resultsTable">
            <div className="resultsRow head">
              <div>Ensayo</div>
              <div>Campos</div>
              <div>Resultados</div>
              <div>Revisión y acciones</div>
            </div>
            {visibleTests.length ? visibleTests.map((row) => {
              const technicalStatus = normalizeStatusLabel(row);
              const details = row.limite_detalles || row.evaluacion_limite?.details || [];
              const groups = groupEvaluationDetails(details);
              return (
              <div className="resultsRow" key={row.id}>
                <div className="testIdentity">
                  <strong>{row.prueba?.acronimo || row.prueba?.nombre_variable}</strong>
                  <small>{row.prueba?.nombre_variable}{row.prueba?.condicion ? ` · ${row.prueba.condicion}` : ''}</small>
                  {row.metodo && row.metodo !== '-' ? <small>Método: {row.metodo}</small> : null}
                </div>
                <div className="fieldsCell">
                  {groups.length ? groups.map((group, groupIndex) => (
                    <section className="compactGroup" key={`${row.id}-fields-${group.label}-${groupIndex}`}>
                      <strong>{group.label}{group.unit ? <span className="resultUnit">Unidad: {group.unit}</span> : null}</strong>
                      <span>{group.details.map(fieldLabel).join(' / ')}</span>
                    </section>
                  )) : (
                    <span className="muted">Resultado</span>
                  )}
                </div>
                <div className="valuesCell">
                  {groups.length ? groups.map((group, groupIndex) => {
                    const status = groupTechnicalStatus(group.details);
                    return (
                      <section className="compactGroup" key={`${row.id}-values-${group.label}-${groupIndex}`}>
                        <span className={`fieldStatus ${statusClass(status)}`}>{detailStatusLabel({ estado: status })}</span>
                        <div className="joinedValues">
                          {resultSummary(group).map((item, itemIndex) => (
                            <span className={`measurement ${statusClass(item.status)}`} key={`${item.label}-${itemIndex}`}>
                              <b>{item.label}:</b> {item.value}
                            </span>
                          ))}
                        </div>
                      </section>
                    );
                  }) : <strong>{row.resultado_resumen || '-'}</strong>}
                </div>
                <div className="reviewAndActions">
                  <div className="statusStack">
                    <span className={`pill ${statusClass(technicalStatus)}`}>{technicalStatus}</span>
                    <span className={`pill ${statusClass(row.is_revisada ? 'revisada' : 'pendiente')}`}>{row.is_revisada ? 'Revisado' : 'Pendiente'}</span>
                  </div>
                  <div className="rowActions compact">
                    <button className="rulesButton" title="Ver reglas, límites y decisión" type="button" onClick={() => setLimitsModal(row)}><Eye size={15} /><span>Reglas</span></button>
                    <button title="Editar resultado" type="button" onClick={() => openEdit(row)}><Pencil size={15} /></button>
                    <button title="Ver historial" type="button" onClick={() => openHistory(row)}><History size={15} /></button>
                    <button title="Invalidar resultado" type="button" onClick={() => invalidateResult(row)} disabled={!row?.resultado?.id || row?.resultado?.estatus === 'rechazado'}><ShieldOff size={15} /></button>
                    {row.is_revisada ? (
                      <span className="reviewedMini" title="Revisado"><Check size={14} /></span>
                    ) : (
                      <button title="Marcar revisado" type="button" onClick={() => markReviewed(row)}><Check size={15} /></button>
                    )}
                  </div>
                </div>
              </div>
              );
            }) : (
              <div className="empty big">Seleccione una muestra con resultados.</div>
            )}
          </div>
          {selectedTests.length > TESTS_PER_PAGE ? (
            <div className="tablePager">
              <span>{selectedTests.length} ensayos · Página {testsPage} de {testsPages}</span>
              <div>
                <button type="button" onClick={() => setTestsPage((page) => Math.max(1, page - 1))} disabled={testsPage === 1}><ChevronLeft size={16} /></button>
                <button type="button" onClick={() => setTestsPage((page) => Math.min(testsPages, page + 1))} disabled={testsPage === testsPages}><ChevronRight size={16} /></button>
              </div>
            </div>
          ) : null}
        </main>
      </section>

      {historyModal ? (
        <div className="modalOverlay">
          <div className="historyModal">
            <div className="modalHead">
              <h3>Historial de cambios — {historyModal.row?.prueba?.acronimo}</h3>
              <button onClick={() => setHistoryModal(null)}><X size={18} /></button>
            </div>
            <div className="historySummary">
              <span>Resultado actual</span>
              <strong>{historyModal.row?.resultado_resumen || '-'}</strong>
              <small>{historyModal.row?.unidad || ''}</small>
            </div>
            <div className="historyTable">
              <div className="historyRow head"><div>Tipo</div><div>Fecha / hora</div><div>Usuario</div><div>Cambio</div><div>Justificación</div></div>
              {historyModal.data?.history?.map((item) => (
                <div className="historyRow" key={item.id}>
                  <div><span className={`historyType ${item.type}`}>{getChangeKind(item)}</span></div>
                  <div>{fmtDate(item.fecha)}</div>
                  <div>{getUserName(item.usuario)}</div>
                  <div>{item.valor_anterior ? `${item.valor_anterior} → ` : ''}<strong className="redText">{item.valor_nuevo || '—'}</strong></div>
                  <div>{item.justificacion || '-'}</div>
                </div>
              ))}
            </div>
            <div className="modalActions"><button className="btn secondary" onClick={() => setHistoryModal(null)}>Cerrar</button></div>
          </div>
        </div>
      ) : null}

      {editModal ? (
        <div className="modalOverlay">
          <div className="editModal">
            <div className="modalHead">
              <h3>Editar resultado — {editModal.row?.prueba?.acronimo}</h3>
              <button onClick={() => setEditModal(null)}><X size={18} /></button>
            </div>
            <div className="editFields">
              {editModal.fields.map((field) => {
                const item = editModal.values.find((v) => v.key === field.key) || { key: field.key, value: '' };
                const options = fieldOptions(field);
                const type = fieldType(field);
                return (
                  <label key={field.key}>
                    <span>{field.label || field.componente_nombre || field.key}</span>
                    <div className="unitInput">
                      {isSelectField(field) ? (
                        <select value={String(item.value ?? '')} onChange={(e) => updateEditValue(field.key, e.target.value)}>
                          <option value="">Seleccione</option>
                          {options.map((option) => <option key={`${field.key}-${option.value}`} value={option.value}>{option.label}</option>)}
                        </select>
                      ) : type === 'comentario' || type === 'texto_largo' ? (
                        <textarea value={item.value ?? ''} onChange={(e) => updateEditValue(field.key, e.target.value)} />
                      ) : (
                        <input
                          type={['numerico', 'numero', 'decimal', 'entero'].includes(type) ? 'number' : 'text'}
                          step={type === 'entero' ? '1' : 'any'}
                          value={item.value ?? ''}
                          onChange={(e) => updateEditValue(field.key, e.target.value)}
                        />
                      )}
                      <em>{field.unidad || editModal.row?.unidad || ''}</em>
                    </div>
                  </label>
                );
              })}
              <label className="full">
                <span>Justificación del cambio *</span>
                <textarea value={editModal.justificacion} onChange={(e) => setEditModal((prev) => ({ ...prev, justificacion: e.target.value }))} placeholder="Explique el motivo del cambio." />
              </label>
            </div>
            <div className="modalActions">
              <button className="btn secondary" onClick={() => setEditModal(null)}>Cancelar</button>
              <button className="btn red" onClick={saveCorrection} disabled={saving}>Guardar cambio</button>
            </div>
          </div>
        </div>
      ) : null}

      {limitsModal ? (
        <div className="modalOverlay">
          <div className="limitsModal">
            <div className="modalHead">
              <div>
                <h3>Limites y decision - {limitsModal.prueba?.acronimo || limitsModal.prueba?.nombre_variable}</h3>
                <p>{criterionDisplay(limitsModal).label}: <strong>{criterionDisplay(limitsModal).value}</strong></p>
              </div>
              <button type="button" onClick={() => setLimitsModal(null)}><X size={18} /></button>
            </div>
            <TestRules row={limitsModal} />
            <div className="modalActions"><button className="btn secondary" type="button" onClick={() => setLimitsModal(null)}>Cerrar</button></div>
          </div>
        </div>
      ) : null}

      {sampleRulesOpen ? (
        <div className="modalOverlay">
          <div className="limitsModal sampleRulesModal">
            <div className="modalHead">
              <div>
                <h3>Reglas de la muestra - {selectedSampleId}</h3>
                <p>Reglas aplicadas a cada resultado y campo, con su decisión técnica.</p>
              </div>
              <button type="button" onClick={() => setSampleRulesOpen(false)}><X size={18} /></button>
            </div>
            <div className="sampleRuleTests">
              {selectedTests.map((row) => (
                <section className="sampleRuleTest" key={`sample-rule-${row.id}`}>
                  <div className="sampleRuleTestHead">
                    <div>
                      <strong>{row.prueba?.acronimo || row.prueba?.nombre_variable}</strong>
                      <small>{criterionDisplay(row).label}: {criterionDisplay(row).value}</small>
                    </div>
                    <span className={`pill ${statusClass(normalizeStatusLabel(row))}`}>{normalizeStatusLabel(row)}</span>
                  </div>
                  <TestRules row={row} />
                </section>
              ))}
            </div>
            <div className="modalActions"><button className="btn secondary" type="button" onClick={() => setSampleRulesOpen(false)}>Cerrar</button></div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .reviewPage{background:transparent;color:#fff;padding:0 0 18px}
        .reviewTop{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:12px}
        .titleBox{display:flex;align-items:center;gap:12px}.titleBox h1{font-size:25px;margin:0}.titleBox p{margin:3px 0 0;color:#c8c8c8}
        .squareBtn{width:44px;height:44px;border-radius:9px;border:1px solid #444;background:#101010;color:#fff;display:grid;place-items:center;cursor:pointer}.squareBtn.static{cursor:default}
        .topMeta{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.topMeta label span,.progressBox span,.info label{display:block;color:#aeb6c1;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}.topMeta select{height:36px;border-radius:8px;border:1px solid #454545;background:#090909;color:#fff;padding:0 10px}.lockedLot{min-height:36px;border-radius:8px;border:1px solid #454545;background:#090909;color:#fff;padding:0 10px;display:inline-flex;align-items:center;font-weight:900}.lockedLot.action{cursor:pointer;color:#fecaca;border-color:rgba(239,35,42,.45)}
        .progressBox strong{font-size:18px;margin-right:5px}.progressBox small{display:block;color:#c8c8c8}
        .btn{min-height:40px;border-radius:8px;border:1px solid #444;background:#1b1b1b;color:#fff;display:inline-flex;align-items:center;gap:8px;padding:0 14px;font-weight:800;cursor:pointer}.btn.red{background:#ef232a;border-color:#ef232a}.btn.secondary{background:#111}.btn:disabled{opacity:.45;cursor:not-allowed}
        .exportMenu{position:relative}.exportMenuPanel{position:absolute;z-index:40;right:0;top:calc(100% + 6px);width:245px;padding:6px;border:1px solid #3b3d43;background:#17181b;box-shadow:0 14px 32px rgba(0,0,0,.4)}.exportMenuPanel strong{display:block;padding:8px 10px 5px;color:#fca5a5;font-size:12px}.exportMenuPanel button{width:100%;border:0;background:transparent;color:#f3f3f3;padding:9px 10px;text-align:left;cursor:pointer}.exportMenuPanel button:hover{background:#292b30}
        .reviewGrid{display:grid;grid-template-columns:295px minmax(0,1fr);gap:10px}.samplesPane,.reviewContent{border:1px solid #383838;background:linear-gradient(180deg,rgba(27,27,27,.97),rgba(16,16,16,.97));border-radius:10px}.samplesPane{padding:12px}.paneHead h2{font-size:16px;margin:0 0 12px}
        .searchLine{display:grid;grid-template-columns:18px 1fr 38px;align-items:center;gap:8px;margin-bottom:12px}.searchLine input,.searchLine button{height:36px;border:1px solid #404040;background:#080808;color:#fff;border-radius:7px;padding:0 9px}.searchLine input{grid-column:2}.searchLine button{display:grid;place-items:center}
        .sampleList{max-height:650px;overflow:auto}.sampleItem{width:100%;height:42px;border:0;border-bottom:1px solid #2d2d2d;background:transparent;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 8px;cursor:pointer;text-align:left}.sampleItem.active{background:#2a2d31;border-left:3px solid #ef232a}.sampleItem strong{font-size:14px}
        .pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid #4a4a4a;background:#222;color:#e5e7eb;padding:4px 9px;font-size:12px;font-weight:800}.pill.ok{color:#86efac;border-color:rgba(34,197,94,.45);background:rgba(22,101,52,.35)}.pill.alert{color:#fde047;border-color:rgba(234,179,8,.55);background:rgba(113,63,18,.28)}.pill.critical{color:#fecaca;border-color:rgba(239,35,42,.65);background:rgba(127,29,29,.28)}.pill.warning{color:#facc15;border-color:rgba(250,204,21,.5);background:rgba(113,63,18,.25)}.pill.pending{color:#d1d5db}.pill.neutral{color:#d1d5db}
        .legend{display:flex;gap:12px;font-size:12px;color:#bbb;margin-top:12px}.dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px}.okDot{background:#22c55e}.pendingDot{background:#aaa}.alertDot{background:#eab308}
        .reviewContent{padding:18px 20px}.sampleHeader{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.sampleHeader span{color:#aeb6c1}.sampleHeader h2{font-size:26px;margin:4px 0 12px}.sampleNav{display:flex;gap:8px;margin-bottom:12px}.sampleNav button{height:34px;border:1px solid #444;background:#111;color:#fff;border-radius:7px;padding:0 10px;cursor:pointer}.sampleNav button:disabled{opacity:.45;cursor:not-allowed}.sampleMeta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;border:1px solid #333;border-radius:9px;padding:12px;margin-bottom:12px}.info .value{font-size:14px;font-weight:800}
        .resultsTable{border:1px solid #333;border-radius:9px;overflow:auto;max-height:calc(100vh - 310px);scrollbar-gutter:stable}.resultsRow{display:grid;grid-template-columns:minmax(125px,.8fr) minmax(520px,3.6fr) minmax(145px,1fr) minmax(105px,.75fr) minmax(145px,1fr);align-items:stretch;border-top:1px solid #303030;min-width:1120px}.resultsRow:first-child{border-top:0}.resultsRow>div{padding:14px 12px;min-width:0}.resultsRow.head{position:sticky;top:0;z-index:5;background:#242424;color:#bdbdbd;text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.04em}.resultsRow strong,.resultsRow small{display:block}.resultsRow small{color:#aaa;margin-top:3px}.testIdentity,.criterionCell,.technicalCell,.reviewAndActions{display:flex;flex-direction:column;justify-content:center}.testIdentity>strong{font-size:15px}.criterionCell{border-left:1px solid #292929}.criterionCell small{color:#929aa6;font-size:10px;text-transform:uppercase;letter-spacing:.07em;margin:0 0 5px}.criterionCell strong{color:#e5e7eb;font-size:13px;line-height:1.35}.technicalCell{align-items:flex-start;gap:5px}.reviewAndActions{align-items:stretch;gap:9px;border-left:1px solid #292929}.reviewAndActions>.pill{align-self:flex-start}.evaluationCell{padding:0!important;border-left:1px solid #292929}.resultGroup{padding:10px 12px;border-top:1px solid #31343a}.resultGroup:first-child{border-top:0}.resultGroupTitle{color:#f3f4f6;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;margin-bottom:7px}.fieldEvaluation{display:grid;grid-template-columns:minmax(82px,.65fr) minmax(76px,.55fr) minmax(225px,2fr) minmax(105px,.8fr);gap:10px;align-items:center;padding:7px 0;border-top:1px solid #292c31}.fieldEvaluation.fieldHead{padding:0 0 5px;border-top:0;color:#7f8996;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.fieldEvaluation.fieldHead+.fieldEvaluation{border-top:0}.fieldName{font-size:12px;color:#d9dee7;text-transform:uppercase}.measured{font-size:16px;color:#fff}.limitZones{display:flex;flex-wrap:wrap;gap:5px 10px}.zone{display:inline-flex;align-items:center;gap:4px;color:#9ca3af;font-size:10px;line-height:1.25}.zone i{width:7px;height:7px;border-radius:2px;background:#22c55e;flex:0 0 auto}.zone b{color:#e5e7eb}.zone.warning i{background:#eab308}.zone.critical i{background:#ef232a}.fieldStatus{display:inline-flex;align-items:center;border-radius:999px;border:1px solid #4a4a4a;padding:3px 7px;font-size:9px;font-weight:900;white-space:nowrap}.fieldStatus.ok{color:#86efac;border-color:rgba(34,197,94,.45);background:rgba(22,101,52,.25)}.fieldStatus.alert,.fieldStatus.critical{color:#fecaca;border-color:rgba(239,35,42,.55);background:rgba(127,29,29,.25)}.fieldStatus.warning{color:#fde047;border-color:rgba(234,179,8,.5);background:rgba(113,63,18,.25)}.fieldReason{font-size:10px!important;line-height:1.25;margin-top:4px!important}.evaluationFallback{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:70px;padding:12px}.evaluationFallback span{color:#aeb6c1;font-size:12px}.redText{color:#ff4b52;font-weight:900}.rowActions{display:flex!important;gap:6px;flex-wrap:wrap}.rowActions.compact{align-items:center}.rowActions button{min-height:30px;border:1px solid #3d3d3d;background:#141414;color:#fff;border-radius:7px;display:inline-flex;align-items:center;gap:6px;padding:0 8px;cursor:pointer}.rowActions button:disabled{opacity:.45}.reviewedMini{min-height:30px;display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(34,197,94,.45);background:rgba(22,101,52,.25);color:#86efac;border-radius:7px;padding:0 8px;font-size:13px;font-weight:800}
        .empty{min-height:120px;display:grid;place-items:center;color:#a3a3a3;text-align:center}.empty.big{grid-column:1/-1}
        .requestOverlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;cursor:wait}.requestCard{width:min(430px,92vw);min-height:210px;border:1px solid #494949;background:linear-gradient(180deg,#202020,#121212);border-radius:14px;box-shadow:0 30px 90px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;text-align:center;padding:26px}.requestCard strong{font-size:18px}.requestCard span{color:#b8b8b8;font-size:13px}.requestSpinner{color:#ef232a;animation:requestSpin .8s linear infinite}@keyframes requestSpin{to{transform:rotate(360deg)}}
        .modalOverlay{position:fixed;inset:0;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;z-index:100;padding:24px}.historyModal,.editModal{width:min(900px,96vw);max-height:86vh;overflow:auto;border:1px solid #3d3d3d;background:linear-gradient(180deg,#1b1b1b,#101010);border-radius:10px;box-shadow:0 28px 80px rgba(0,0,0,.55);padding:16px}.editModal{width:min(620px,96vw)}.modalHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.modalHead h3{margin:0}.modalHead button{background:transparent;border:0;color:#fff;cursor:pointer}
        .historySummary{display:flex;align-items:baseline;gap:10px;border:1px solid #333;background:#111;border-radius:8px;padding:10px 12px;margin-bottom:10px}.historySummary span{color:#aaa;text-transform:uppercase;font-size:12px;letter-spacing:.08em}.historySummary strong{font-size:22px;color:#ff4b52}.historySummary small{color:#bbb}.historyTable{border:1px solid #333;border-radius:8px;overflow:auto}.historyRow{display:grid;grid-template-columns:.85fr 1fr 1fr 1.3fr 1.7fr;border-top:1px solid #303030}.historyRow:first-child{border-top:0}.historyRow>div{padding:11px}.historyRow.head{background:#242424;color:#bdbdbd;font-size:12px;text-transform:uppercase;font-weight:800}.historyType{display:inline-flex;border-radius:999px;border:1px solid #444;background:#222;padding:4px 8px;font-size:12px;font-weight:800}.historyType.correction{border-color:rgba(239,35,42,.45);color:#fecaca;background:rgba(127,29,29,.25)}.historyType.revision{border-color:rgba(34,197,94,.45);color:#86efac;background:rgba(22,101,52,.25)}
        .editFields{display:grid;gap:12px}.editFields label{display:grid;gap:6px}.editFields span{color:#d1d5db;font-weight:800}.unitInput{display:grid;grid-template-columns:1fr 80px}.unitInput input,.editFields textarea{min-height:40px;border:1px solid #454545;background:#080808;color:#fff;border-radius:8px 0 0 8px;padding:0 10px}.unitInput em{display:grid;place-items:center;border:1px solid #454545;border-left:0;border-radius:0 8px 8px 0;color:#ddd;font-style:normal}.editFields textarea{border-radius:8px;min-height:95px;padding:10px;resize:vertical}.modalActions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}
        .reviewGrid,.reviewContent,.samplesPane,.resultsTable{min-width:0}.resultsRow>div{overflow-wrap:anywhere}.rowActions.compact{display:grid!important;grid-template-columns:1fr;align-items:center}.rowActions button,.reviewedMini{justify-content:center;min-width:0;text-align:center}.sampleMeta .info{min-width:0}.info .value{overflow-wrap:anywhere}.historyRow>div{overflow-wrap:anywhere}
        .fieldStatus.alert,.fieldStatus.warning{color:#fde047;border-color:rgba(234,179,8,.5);background:rgba(113,63,18,.25)}.fieldStatus.critical{color:#fecaca;border-color:rgba(239,35,42,.55);background:rgba(127,29,29,.25)}
        @media(max-width:1400px){.reviewTop{align-items:flex-start;flex-direction:column}.sampleMeta{grid-template-columns:repeat(2,1fr)}.reviewGrid{grid-template-columns:220px minmax(0,1fr)}}
        @media(max-width:1250px){
          .reviewGrid{grid-template-columns:1fr}.samplesPane{max-height:none}.sampleList{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px}
          .resultsTable{border:0;display:grid;gap:10px}.resultsRow.head{display:none}
          .resultsRow{display:grid;grid-template-columns:minmax(110px,.65fr) minmax(0,2fr) minmax(120px,.65fr);min-width:0;border:1px solid #333;border-radius:8px;overflow:hidden}
          .testIdentity{grid-column:1;grid-row:1 / span 2}.evaluationCell{grid-column:2;grid-row:1 / span 2}.criterionCell{grid-column:3;grid-row:1}.technicalCell{grid-column:3;grid-row:2}.reviewAndActions{grid-column:1 / -1;grid-row:3;display:grid!important;grid-template-columns:auto 1fr;align-items:center}
          .rowActions.compact{display:flex!important;justify-content:flex-end}.fieldEvaluation{grid-template-columns:minmax(76px,.6fr) minmax(70px,.5fr) minmax(190px,1.7fr) minmax(100px,.8fr)}
        }
        @media(max-width:900px){
          .reviewGrid{grid-template-columns:1fr}.sampleMeta{grid-template-columns:1fr}
          .resultsTable{border:0;display:grid;gap:10px}.resultsRow.head{display:none}
          .resultsRow{display:grid;grid-template-columns:1fr;min-width:0;border:1px solid #333;border-radius:9px;background:#141414}
          .resultsRow>div{border-top:1px solid #292929;border-left:0}
          .resultsRow>div:first-child{border-top:0}.evaluationCell{order:2}.criterionCell{order:3}.technicalCell{order:4}.reviewAndActions{order:5}
          .fieldEvaluation{grid-template-columns:minmax(75px,.7fr) minmax(70px,.55fr) minmax(170px,1.6fr) minmax(95px,.75fr)}
          .rowActions.compact{grid-template-columns:repeat(auto-fit,minmax(110px,1fr))!important}
        }
        .sampleHeader{align-items:center;margin-bottom:10px}.sampleTitleLine{display:flex;align-items:center;gap:10px;min-width:0}.sampleTitleLine>span:first-child{font-size:11px;text-transform:uppercase;letter-spacing:.08em}.sampleTitleLine h2{font-size:20px;margin:0}.sampleTitleLine .pill{margin-left:2px}
        .resultsRow{grid-template-columns:minmax(130px,.8fr) minmax(190px,1.15fr) minmax(310px,2fr) minmax(145px,.9fr);min-width:820px}.resultsRow>div{padding:11px 10px}.fieldsCell,.valuesCell{border-left:1px solid #292929}.fieldsCell,.valuesCell{display:grid;align-content:center;gap:8px}.compactGroup{display:grid;gap:3px;padding:7px 0;border-top:1px solid #292929}.compactGroup:first-child{border-top:0}.compactGroup>strong{font-size:11px;text-transform:uppercase;color:#b7c0cc;letter-spacing:.04em}.compactGroup>span{font-size:12px;color:#e5e7eb}.resultUnit{display:inline-flex;margin-left:7px;padding:2px 6px;border:1px solid #46505d;border-radius:999px;color:#cbd5e1;font-size:9px;font-weight:800;letter-spacing:0;text-transform:none;vertical-align:middle}.joinedValues{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px}.measurement{font-size:12px;color:#e5e7eb}.measurement b{color:#aeb6c1}.measurement.alert{color:#fde047}.measurement.critical{color:#fecaca}.statusStack{display:flex;gap:5px;flex-wrap:wrap}.reviewAndActions{justify-content:center}.rowActions.compact{display:flex!important;flex-wrap:nowrap}.rowActions.compact button,.reviewedMini{width:31px;height:31px;min-height:31px;padding:0;display:grid;place-items:center}.tablePager{display:flex;justify-content:space-between;align-items:center;padding:9px 2px 0;color:#aeb6c1;font-size:12px}.tablePager>div{display:flex;gap:6px}.tablePager button{width:32px;height:32px;display:grid;place-items:center;border:1px solid #404040;background:#121212;color:#fff;border-radius:7px}.tablePager button:disabled{opacity:.4}
        .historyModal,.editModal,.limitsModal{width:min(900px,96vw);max-height:86vh;overflow:auto;border:1px solid #3d3d3d;background:#171717;border-radius:9px;box-shadow:0 28px 80px rgba(0,0,0,.55);padding:16px}.editModal{width:min(620px,96vw)}.limitsModal{width:min(1040px,96vw)}.modalHead p{margin:5px 0 0;color:#aeb6c1}.limitGroups{display:grid;gap:10px}.limitGroup{border:1px solid #343434;border-radius:8px;overflow:hidden}.limitGroupHead{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#222}.limitDetailHead,.limitDetail{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(90px,.55fr) minmax(300px,2fr) minmax(150px,1fr);gap:12px;align-items:center;padding:9px 12px}.limitDetailHead{color:#8f99a6;font-size:10px;text-transform:uppercase;font-weight:800;letter-spacing:.05em}.limitDetail{border-top:1px solid #303030}.limitDetail>span{font-size:14px}.limitDetail>div:last-child{display:grid;gap:4px;justify-items:start}.limitDetail small{color:#aeb6c1}.limitBands{display:grid;gap:4px}.zone.ok i{background:#22c55e}.zone.warning i{background:#eab308}.zone.critical i{background:#ef232a}
        .sampleNav button{display:inline-flex;align-items:center;gap:6px}.sampleNav .sampleRulesButton{border-color:rgba(239,35,42,.5);color:#fecaca}.sampleRulesModal{width:min(1180px,97vw)}.sampleRuleTests{display:grid;gap:14px}.sampleRuleTest{border:1px solid #3b3b3b;border-radius:9px;padding:12px;background:#111}.sampleRuleTestHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.sampleRuleTestHead strong{font-size:16px}.sampleRuleTestHead small{display:block;color:#aeb6c1;margin-top:3px}.ruleEmpty{min-height:70px}.rowActions.compact{flex-wrap:wrap}.rowActions.compact .rulesButton{width:auto!important;padding:0 9px!important;display:inline-flex!important}.resultsRow{grid-template-columns:minmax(130px,.8fr) minmax(190px,1.15fr) minmax(310px,2fr) minmax(175px,1fr)}
        .unitInput select{min-height:40px;border:1px solid #454545;background:#080808;color:#fff;border-radius:8px 0 0 8px;padding:0 10px}.unitInput textarea{min-height:68px;border:1px solid #454545;background:#080808;color:#fff;border-radius:8px 0 0 8px;padding:8px 10px;resize:vertical}
        @media(max-width:1250px){.resultsTable{display:block;border:1px solid #333}.resultsRow.head{display:grid}.resultsRow{grid-template-columns:minmax(125px,.8fr) minmax(180px,1.1fr) minmax(285px,1.8fr) minmax(140px,.85fr);min-width:780px}.testIdentity,.fieldsCell,.valuesCell,.reviewAndActions{grid-column:auto;grid-row:auto}.reviewAndActions{display:flex!important}.limitDetailHead,.limitDetail{grid-template-columns:minmax(105px,.7fr) minmax(80px,.5fr) minmax(240px,1.8fr) minmax(130px,.9fr)}}
        @media(max-width:760px){.reviewContent{padding:12px}.sampleHeader{align-items:flex-start}.sampleTitleLine{flex-wrap:wrap}.resultsTable{overflow:auto}.resultsRow{min-width:720px}.limitDetailHead{display:none}.limitDetail{grid-template-columns:1fr;gap:6px}.limitDetail>div{justify-items:start}.modalOverlay{padding:10px}.limitsModal{padding:12px}}
      `}</style>
    </div>
  );
}

const Info = ({ label, value }) => (
  <div className="info">
    <label>{label}</label>
    <div className="value">{value}</div>
  </div>
);
