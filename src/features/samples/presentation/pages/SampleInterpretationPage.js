import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  BarChart3,
  Eye,
  FileSpreadsheet,
  FileText,
  Menu,
  Save,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { reviewInterpretationService } from '@features/samples/infrastructure/reviewInterpretationService';
import { reportsService } from '@features/reports/infrastructure/reportsService';
import { resultEntryService } from '@features/samples/infrastructure/resultEntryService';
import { useAuth } from '@features/auth/application/AuthContext';
import { presentLimitBands } from '@utils/limitPresentation';

const fmtDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO');
};

const statusClass = (value = '') => {
  const v = String(value).toLowerCase();
  if (v.includes('normal') || v.includes('interpret') || v.includes('revis')) return 'ok';
  if (v.includes('crítico') || v.includes('critico')) return 'critical';
  if (v.includes('alert') || v.includes('fuera') || v.includes('no deseado')) return 'alert';
  if (v.includes('sin criterio') || v.includes('sin info') || v.includes('sin límite') || v.includes('sin limite')) return 'warning';
  if (v.includes('pend')) return 'pending';
  if (v.includes('informativo') || v.includes('no evaluable')) return 'neutral';
  return 'neutral';
};

const getSampleTests = (batch, sampleId) => (batch?.sample_tests || []).filter((item) => item.muestra === sampleId);

const cleanLimitLabel = (value = '') => {
  let text = String(value || '').trim();
  const replacements = {
    secuencia_1_: 'Sec. I ',
    secuencia_2_: 'Sec. II ',
    secuencia_3_: 'Sec. III ',
    _valor_minimo: '',
    _valor_maximo: '',
    _min: '',
    _max: '',
  };
  Object.entries(replacements).forEach(([source, target]) => {
    text = text.replaceAll(source, target);
  });
  const compact = {
    ei: 'EI',
    fi: 'FI',
    eii: 'EII',
    fii: 'FII',
    eiii: 'EIII',
    fiii: 'FIII',
    '4um': '4um',
    '6um': '6um',
    '14um': '14um',
  };
  const normalized = text.replaceAll('_', ' ').trim();
  return compact[normalized.toLowerCase()] || normalized;
};

const cleanGroupLabel = (value = '', index = 0) => {
  let text = String(value || '').trim();
  const replacements = {
    'Secuencia 1': 'Secuencia I',
    'Secuencia 2': 'Secuencia II',
    'Secuencia 3': 'Secuencia III',
    'secuencia 1': 'Secuencia I',
    'secuencia 2': 'Secuencia II',
    'secuencia 3': 'Secuencia III',
  };
  Object.entries(replacements).forEach(([source, target]) => {
    text = text.replaceAll(source, target);
  });
  return text || `Resultado ${index + 1}`;
};

const normalizedStatus = (value, passed = null) => {
  const status = String(value || '').toUpperCase().replaceAll(' ', '_');
  if (status === 'NORMAL') return 'NORMAL';
  if (status === 'CRITICO' || status === 'CRÍTICO') return 'CRÍTICO';
  if (status === 'NO_DESEADO' || status === 'FUERA_DE_LIMITE') return 'NO DESEADO';
  if (status === 'INFORMATIVO') return 'INFORMATIVO';
  if (passed === true) return 'NORMAL';
  if (passed === false) return 'NO DESEADO';
  return status.replaceAll('_', ' ') || 'NO EVALUABLE';
};

const criterionDisplay = (test) => {
  if (test.criterio_limite_catalogo_info && test.criterio_limite_item_info) {
    return `${test.criterio_limite_catalogo_info.nombre}: ${test.criterio_limite_item_info.nombre}`;
  }
  if (test.criterio_limite_escala_info && test.criterio_limite_escala_item_info) {
    return `${test.criterio_limite_escala_info.nombre}: ${test.criterio_limite_escala_item_info.etiqueta}`;
  }
  const value = String(test.criterio_aplicado || '');
  return value && !value.includes('Resultado principal') ? value : 'Configuración de la prueba';
};

const buildEvaluationTest = (test) => {
  const details = test.limite_detalles || test.evaluacion_limite?.details || [];
  const hierarchy = test.evaluacion_limite?.result_outcomes
    || test.evaluacion_limite?.raw?.result_outcomes
    || [];
  const outcomeFor = (resultId, label) => hierarchy.find((outcome) => (
    (resultId && String(outcome.result_id) === String(resultId))
    || cleanGroupLabel(outcome.label || '', 0).toLowerCase() === String(label || '').toLowerCase()
  ));
  const groups = [];
  details.forEach((detail, index) => {
    const groupLabel = cleanGroupLabel(detail.result_label || detail.division_label || 'Resultado', index);
    const resultId = detail.result_id || null;
    let group = groups.find((item) => (
      (resultId && String(item.resultId) === String(resultId))
      || (!resultId && item.label === groupLabel)
    ));
    if (!group) {
      group = { resultId, label: groupLabel, unit: detail.unit || '', fields: [] };
      groups.push(group);
    }
    if (!group.unit && detail.unit) group.unit = detail.unit;
    group.fields.push({
      key: detail.field_id || `${detail.field || 'field'}-${index}`,
      label: cleanLimitLabel(detail.field_label || detail.field || 'Resultado'),
      value: detail.resultado_valor_label ?? detail.value_label ?? detail.resultado_valor ?? detail.value ?? '-',
      unit: detail.unit || '',
      rule: presentLimitBands(detail),
      status: normalizedStatus(detail.estado || detail.status, detail.passed),
      reason: detail.reason || '',
    });
  });
  groups.forEach((group) => {
    const outcome = outcomeFor(group.resultId, group.label);
    group.status = normalizedStatus(outcome?.estado, outcome?.passed);
    group.reason = outcome
      ? `${outcome.red_count || 0} crítico(s), ${outcome.yellow_count || 0} alerta(s) de ${outcome.evaluated_count || group.fields.length} campo(s).`
      : '';
  });

  const status = normalizedStatus(
    test.estado_tecnico_label || test.estado_limite || test.evaluacion_limite?.estado_label,
  );
  const dominantFields = groups
    .flatMap((group) => group.fields)
    .filter((field) => field.status === status || (
      status === 'CRÍTICO' && field.status === 'CRÍTICO'
    ));
  const engineReason = test.evaluacion_limite?.reason || test.evaluacion_limite?.raw?.reason || '';
  const decision = engineReason || (dominantFields.length
    ? `${dominantFields.length} campo${dominantFields.length === 1 ? '' : 's'} determina${dominantFields.length === 1 ? '' : 'n'} el estado: ${dominantFields.map((field) => field.label).join(', ')}.`
    : '');

  return {
    id: test.id,
    acronym: test.prueba?.acronimo || test.prueba?.nombre_variable || '-',
    name: test.prueba?.nombre_variable || '',
    condition: test.prueba?.condicion || '',
    criterion: criterionDisplay(test),
    status,
    decision,
    groups,
    fallbackResult: test.resultado_resumen || '-',
    fallbackLimit: test.limite_resumen || test.evaluacion_limite?.summary || 'No aplica',
  };
};

export default function InterpretationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [batchId, setBatchId] = useState('');
  const [batch, setBatch] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [sampleData, setSampleData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [trendGroups, setTrendGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [predefinedComments, setPredefinedComments] = useState([]);
  const [selectedComments, setSelectedComments] = useState([]);
  const [manualComment, setManualComment] = useState('');
  const [manualComments, setManualComments] = useState([]);
  const [graphsEnabled, setGraphsEnabled] = useState(true);
  const [selectedGraphs, setSelectedGraphs] = useState([]);
  const [signatureModal, setSignatureModal] = useState(false);
  const [responsable, setResponsable] = useState('');
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [signatureMode, setSignatureMode] = useState('draw');
  const [drawnSignature, setDrawnSignature] = useState('');
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [expandedTests, setExpandedTests] = useState([]);
  const [reportScope, setReportScope] = useState('sample');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState('Procesando solicitud...');
  const pendingRequestsRef = useRef(0);
  const selectedSampleIdRef = useRef('');
  const sampleCacheRef = useRef(new Map());
  const trendsCacheRef = useRef(new Map());
  const sampleRequestsRef = useRef(new Map());
  const trendRequestsRef = useRef(new Map());
  const batchRequestRef = useRef(null);
  const activeTrendKeyRef = useRef('');

  const beginRequest = (message) => {
    pendingRequestsRef.current += 1;
    setRequestMessage(message);
    setRequestBusy(true);
  };

  const endRequest = () => {
    pendingRequestsRef.current = Math.max(0, pendingRequestsRef.current - 1);
    if (pendingRequestsRef.current === 0) setRequestBusy(false);
  };

  const rememberCached = (cache, key, value, limit) => {
    cache.delete(key);
    cache.set(key, value);
    while (cache.size > limit) {
      cache.delete(cache.keys().next().value);
    }
  };

  useEffect(() => {
    if (router.query?.lote) setBatchId(String(router.query.lote));
  }, [router.query?.lote]);

  useEffect(() => {
    if (batchId) loadBatch(batchId);
  }, [batchId]);

  useEffect(() => {
    selectedSampleIdRef.current = selectedSampleId;
    if (!selectedSampleId) return;

    const cached = sampleCacheRef.current.get(selectedSampleId);
    if (cached) {
      loadSample(selectedSampleId, { silent: true });
      return;
    }

    // No conservamos las gráficas de la muestra anterior mientras llega la nueva.
    // Eso evitaba una consulta de tendencias con una combinación incorrecta.
    setSampleData(null);
    setSelectedGraphs([]);
    setTrends([]);
    setTrendGroups([]);
    loadSample(selectedSampleId, { silent: true });
  }, [selectedSampleId]);

  useEffect(() => {
    if (
      !selectedSampleId
      || sampleData?.muestra?.id !== selectedSampleId
      || !selectedGraphs.length
    ) {
      activeTrendKeyRef.current = '';
      return undefined;
    }

    activeTrendKeyRef.current = `${selectedSampleId}|${[...selectedGraphs].sort().join('|')}`;

    // El pequeño debounce absorbe el doble efecto de React Strict Mode y varios
    // clics seguidos sobre las gráficas sin cancelar una petición ya enviada.
    const timer = window.setTimeout(() => {
      loadTrends(selectedSampleId, selectedGraphs, { silent: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [selectedSampleId, sampleData?.muestra?.id, selectedGraphs.join('|')]);

  useEffect(() => {
    if (signatureModal && signatureMode === 'draw') {
      setTimeout(prepareCanvas, 80);
    }
  }, [signatureModal, signatureMode]);

  const loadBatch = async (loteId) => {
    if (batchRequestRef.current?.key === loteId) {
      return batchRequestRef.current.promise;
    }

    beginRequest('Cargando las muestras y resultados del lote...');
    setLoading(true);
    const request = (async () => {
      try {
      const data = await reviewInterpretationService.getInterpretationBatch(loteId);
      setBatch(data);
      const querySample = router.query?.muestra ? String(router.query.muestra) : '';
      const first = data.muestras?.find((sample) => sample.id === querySample) || data.muestras?.[0];
      setSelectedSampleId(first?.id || '');
      } catch (error) {
        console.error(error);
        toast.error('No se pudo cargar el lote para interpretación.');
      } finally {
        setLoading(false);
        endRequest();
        if (batchRequestRef.current?.key === loteId) batchRequestRef.current = null;
      }
    })();
    batchRequestRef.current = { key: loteId, promise: request };
    return request;
  };

  const applySampleData = (data, sampleId) => {
    if (selectedSampleIdRef.current !== sampleId) return;
    setSampleData(data);
    setConclusion(data.conclusion || '');
    const comments = data.predefined_comments || [];
    setPredefinedComments(comments);
    setSelectedComments(Array.isArray(data.selected_predefined_comments) ? data.selected_predefined_comments : comments);
    setManualComments(data.comentarios_manuales || []);
    setManualComment('');
    setGraphsEnabled(data.graficas_activas !== false);
    setSelectedGraphs(data.graficas_seleccionadas || []);
    setExpandedTests([]);
  };

  const prefetchAdjacentSamples = (sampleId) => {
    const samples = batch?.muestras || [];
    const index = samples.findIndex((sample) => sample.id === sampleId);
    if (index < 0) return;
    [samples[index - 1]?.id, samples[index + 1]?.id]
      .filter(Boolean)
      .forEach((adjacentId) => loadSample(adjacentId, { prefetch: true, silent: true }));
  };

  const loadSample = async (sampleId, { force = false, prefetch = false, silent = false } = {}) => {
    if (!force && sampleCacheRef.current.has(sampleId)) {
      const cached = sampleCacheRef.current.get(sampleId);
      if (!prefetch) {
        applySampleData(cached, sampleId);
        prefetchAdjacentSamples(sampleId);
      }
      return cached;
    }
    if (sampleRequestsRef.current.has(sampleId)) {
      const data = await sampleRequestsRef.current.get(sampleId);
      if (!prefetch) applySampleData(data, sampleId);
      return data;
    }

    if (!silent) beginRequest(`Preparando la muestra ${sampleId}...`);
    const request = reviewInterpretationService.getInterpretationSample(sampleId);
    sampleRequestsRef.current.set(sampleId, request);
    try {
      const data = await request;
      rememberCached(sampleCacheRef.current, sampleId, data, 12);
      if (!prefetch) {
        applySampleData(data, sampleId);
        prefetchAdjacentSamples(sampleId);
      }
      return data;
    } catch (error) {
      console.error(error);
      if (!prefetch && selectedSampleIdRef.current === sampleId) {
        toast.error('No se pudo cargar la interpretación de la muestra.');
      }
      return null;
    } finally {
      sampleRequestsRef.current.delete(sampleId);
      if (!silent) endRequest();
    }
  };

  const loadTrends = async (sampleId, graphIds, { silent = false } = {}) => {
    const normalizedGraphs = [...graphIds].sort();
    const key = `${sampleId}|${normalizedGraphs.join('|')}`;
    if (trendsCacheRef.current.has(key)) {
      const cached = trendsCacheRef.current.get(key);
      if (selectedSampleIdRef.current === sampleId && activeTrendKeyRef.current === key) {
        setTrends(cached.series || []);
        setTrendGroups(cached.groups || []);
      }
      return cached;
    }
    if (trendRequestsRef.current.has(key)) return trendRequestsRef.current.get(key);

    if (!silent) beginRequest('Consultando tendencias históricas...');
    const request = reviewInterpretationService.getTrends(sampleId, normalizedGraphs);
    trendRequestsRef.current.set(key, request);
    try {
      const data = await request;
      rememberCached(trendsCacheRef.current, key, data, 30);
      if (selectedSampleIdRef.current === sampleId && activeTrendKeyRef.current === key) {
        setTrends(data.series || []);
        setTrendGroups(data.groups || []);
      }
      return data;
    } catch (error) {
      console.error(error);
      if (selectedSampleIdRef.current === sampleId && activeTrendKeyRef.current === key) {
        setTrends([]);
        setTrendGroups([]);
      }
      return null;
    } finally {
      trendRequestsRef.current.delete(key);
      if (!silent) endRequest();
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
  const selectedTests = useMemo(() => sampleData?.sample_tests || getSampleTests(batch, selectedSampleId), [sampleData, batch, selectedSampleId]);
  const evaluatedTests = useMemo(() => selectedTests.map(buildEvaluationTest), [selectedTests]);
  const diagnosticCounts = useMemo(() => evaluatedTests.reduce((counts, test) => {
    if (test.status === 'NORMAL') counts.normal += 1;
    else if (test.status === 'NO DESEADO') counts.warning += 1;
    else if (test.status === 'CRÍTICO') counts.critical += 1;
    else if (test.status === 'INFORMATIVO') counts.informative += 1;
    else counts.pending += 1;
    return counts;
  }, { normal: 0, warning: 0, critical: 0, informative: 0, pending: 0 }), [evaluatedTests]);
  const graphOptions = useMemo(() => selectedTests.map((test) => test.prueba?.acronimo).filter(Boolean), [selectedTests]);

  const saveInterpretation = async () => {
    if (!selectedSampleId) return;
    beginRequest(`Guardando el contenido de ${selectedSampleId}...`);
    setSaving(true);
    try {
      await reviewInterpretationService.saveInterpretationSample(selectedSampleId, {
        conclusion,
        comentarios_predefinidos: selectedComments,
        comentarios_manuales: manualComments,
        graficas_activas: graphsEnabled,
        graficas_seleccionadas: selectedGraphs,
      });
      toast.success('Interpretación guardada.');
      setBatch((current) => current ? {
        ...current,
        muestras: (current.muestras || []).map((sample) => (
          sample.id === selectedSampleId ? {
            ...sample,
            has_interpretation: Boolean(conclusion.trim() || selectedComments.length || manualComments.length),
          } : sample
        )),
      } : current);
      await loadSample(selectedSampleId, { force: true, silent: true });
    } catch (error) {
      console.error(error);
      toast.error('No se pudo guardar la interpretación.');
    } finally {
      setSaving(false);
      endRequest();
    }
  };

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event.changedTouches?.[0] || event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  };

  const prepareCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth || 420;
    const height = canvas.offsetHeight || 150;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
    }
  };

  const startDrawing = (event) => {
    event.preventDefault();
    prepareCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(event);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const drawSignature = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) setDrawnSignature(canvas.toDataURL('image/png'));
  };

  const clearDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDrawnSignature('');
  };

  const previewReport = async () => {
    if (!selectedSampleId) {
      toast.warning('Seleccione una muestra.');
      return;
    }

    beginRequest(`Generando la vista previa de ${selectedSampleId}...`);
    setSaving(true);
    try {
      await reviewInterpretationService.saveInterpretationSample(selectedSampleId, {
        conclusion,
        comentarios_predefinidos: selectedComments,
        comentarios_manuales: manualComments,
        graficas_activas: graphsEnabled,
        graficas_seleccionadas: selectedGraphs,
      });

      const response = await reportsService.previewFromInterpretation(selectedSampleId);
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo abrir la vista previa.');
    } finally {
      setSaving(false);
      endRequest();
    }
  };

  const openGenerateReport = () => {
    if (!selectedSampleId) {
      toast.warning('Seleccione una muestra.');
      return;
    }
    if (reportScope === 'sample' && !selectedSample?.is_revisado) {
      toast.warning('Primero debe completar la revisión de todos los resultados de esta muestra.');
      return;
    }
    setResponsable((current) => current || user?.full_name || user?.email || '');
    setSignatureMode(user?.firma_predeterminada ? 'default' : 'draw');
    setSignatureModal(true);
  };

  const handleSignatureFile = (file) => {
    setSignatureFile(file || null);
    if (signaturePreview) window.URL.revokeObjectURL(signaturePreview);
    setSignaturePreview(file ? window.URL.createObjectURL(file) : '');
    if (file) setSignatureMode('upload');
  };

  const generateReport = async () => {
    if (!selectedSampleId) {
      toast.warning('Seleccione una muestra.');
      return;
    }

    beginRequest(reportScope === 'batch'
      ? `Generando los reportes de las ${batch?.muestras?.length || 0} muestras...`
      : `Generando el reporte de ${selectedSampleId}...`);
    setSaving(true);
    try {
      await reviewInterpretationService.saveInterpretationSample(selectedSampleId, {
        conclusion,
        comentarios_predefinidos: selectedComments,
        comentarios_manuales: manualComments,
        graficas_activas: graphsEnabled,
        graficas_seleccionadas: selectedGraphs,
      });

      let firma_ruta = '';
      if (signatureFile) {
        const signature = await reportsService.uploadSignature(signatureFile);
        firma_ruta = signature.filePath || signature.savedPath || '';
      }

      const reportPayload = {
        firma_ruta,
        firma_base64: signatureMode === 'draw' ? drawnSignature : '',
        responsable: responsable || undefined,
      };
      if (reportScope === 'batch') {
        const result = await reportsService.generateBatchFromInterpretation(batchId, reportPayload);
        toast.success(result.detail || `${result.generated || 0} reportes generados.`);
      } else {
        const report = await reportsService.generateFromInterpretation(selectedSampleId, reportPayload);
        toast.success(`Reporte ${report.consecutivo} v${report.version} generado.`);
      }
      setSignatureModal(false);
      router.push('/reportes');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo generar el reporte.');
    } finally {
      setSaving(false);
      endRequest();
    }
  };

  const toggleGraph = (acronym) => {
    setSelectedGraphs((prev) => (
      prev.includes(acronym) ? prev.filter((item) => item !== acronym) : [...prev, acronym]
    ));
  };

  const toggleTestDetails = (testId) => {
    setExpandedTests((current) => (
      current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId]
    ));
  };

  const downloadResultsExcel = async (mode, sampleId = null) => {
    if (!batchId) return;
    beginRequest(sampleId ? `Preparando el Excel de ${sampleId}...` : 'Preparando el Excel del lote...');
    setSaving(true);
    try {
      const response = await resultEntryService.downloadExport(batchId, mode, sampleId);
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = sampleId ? `resultados_${sampleId}.xlsx` : `resultados_${batchId}_${mode}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setExportMenuOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo descargar el Excel de resultados.');
    } finally {
      setSaving(false);
      endRequest();
    }
  };

  const deselectComment = (index) => {
    const comment = predefinedComments[index];
    setSelectedComments((prev) => prev.filter((item) => item !== comment));
  };

  const restoreSuggestedComments = () => {
    setSelectedComments(predefinedComments);
  };

  const clearSuggestedComments = () => {
    setSelectedComments([]);
  };

  const toggleComment = (comment) => {
    setSelectedComments((prev) => (
      prev.includes(comment) ? prev.filter((item) => item !== comment) : [...prev, comment]
    ));
  };

  const addManualComment = () => {
    const value = manualComment.trim();
    if (!value) return;
    setManualComments((prev) => [...prev, value]);
    setManualComment('');
  };

  const removeManualComment = (index) => {
    setManualComments((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAndNext = async () => {
    await saveInterpretation();
    const samples = batch?.muestras || [];
    const index = samples.findIndex((sample) => sample.id === selectedSampleId);
    if (index >= 0 && index < samples.length - 1) {
      setSelectedSampleId(samples[index + 1].id);
    }
  };

  const goToRelativeSample = (step) => {
    const samples = batch?.muestras || [];
    const index = samples.findIndex((sample) => sample.id === selectedSampleId);
    if (index < 0) return;
    const nextIndex = Math.min(Math.max(index + step, 0), samples.length - 1);
    setSelectedSampleId(samples[nextIndex].id);
  };

  return (
    <div className="interpPage">
      {requestBusy ? (
        <div className="requestOverlay" role="status" aria-live="assertive" aria-busy="true">
          <div className="requestCard">
            <div className="requestSpinner" aria-hidden="true" />
            <strong>{requestMessage}</strong>
            <span>Espere un momento. No cierre ni actualice esta página.</span>
          </div>
        </div>
      ) : null}
      <header className="interpTop">
        <div className="titleBox">
          <div className="miniIcon"><Menu size={20} /></div>
          <div>
            <h1>Preparación de reportes</h1>
            <p>Revise el pre-reporte, agregue el criterio técnico y genere reportes por muestra o por lote.</p>
          </div>
        </div>

        <div className="topActions">
          <div className="exportMenu">
            <button type="button" className="btn secondary" onClick={() => setExportMenuOpen((open) => !open)} disabled={saving || !batchId}>
              <FileSpreadsheet size={17} /> Excel de resultados
            </button>
            {exportMenuOpen ? (
              <div className="exportMenuPanel">
                <strong>Exportar para análisis</strong>
                <button type="button" onClick={() => downloadResultsExcel('por_muestra_columnas', selectedSampleId)}>Muestra seleccionada</button>
                <button type="button" onClick={() => downloadResultsExcel('consolidado')}>Lote en una hoja</button>
                <button type="button" onClick={() => downloadResultsExcel('por_muestra')}>Lote por hojas</button>
              </div>
            ) : null}
          </div>
          <button type="button" className="btn secondary" onClick={previewReport} disabled={saving}><Eye size={17} /> Previsualizar esta muestra</button>
          <button type="button" className="btn secondary" onClick={saveInterpretation} disabled={saving || !selectedSampleId}><Save size={17} /> Guardar esta muestra</button>
          <button type="button" className="btn red" onClick={openGenerateReport} disabled={saving || !selectedSampleId}>
            <FileText size={17} /> Crear reporte(s)
          </button>
        </div>
      </header>

      <section className="summaryLine">
        <label>
          <span>Lote</span>
          {batchId ? (
            <div className="lockedLot">{batchId}</div>
          ) : (
            <button type="button" className="lockedLot action" onClick={() => router.push('/muestras/lotes')}>
              Seleccione un lote desde lotes
            </button>
          )}
        </label>
        <label>
          <span>Muestra</span>
          <select value={selectedSampleId} onChange={(e) => setSelectedSampleId(e.target.value)}>
            {(batch?.muestras || []).map((sample) => <option key={sample.id} value={sample.id}>{sample.id}</option>)}
          </select>
        </label>
        <Info label="Cliente" value={batch?.cliente_nombre || sampleData?.muestra?.cliente_nombre || '-'} />
        <Info label="Máquina / Equipo" value={sampleData?.muestra?.equipo || selectedSample?.equipo || '-'} />
        <Info label="Muestras del lote" value={batch?.muestras?.length || 0} />
      </section>

      <div className="sampleStepBar">
        <button type="button" onClick={() => goToRelativeSample(-1)}>← Muestra anterior</button>
        <span>{selectedSampleId || '-'} · {selectedSample ? `${(batch?.muestras || []).findIndex((s) => s.id === selectedSampleId) + 1}/${batch?.muestras?.length || 0}` : '0/0'}</span>
        <button type="button" onClick={() => goToRelativeSample(1)}>Siguiente muestra →</button>
      </div>

      <section className="mainGrid">
        <aside className="samplePane">
          <h2>Muestras del lote ({batch?.muestras?.length || 0})</h2>
          <div className="searchBox">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar muestra" />
            <Settings2 size={15} />
          </div>
          <div className="sampleList">
            {filteredSamples.map((sample) => (
              <button
                key={sample.id}
                className={`sampleItem ${sample.id === selectedSampleId ? 'active' : ''}`}
                onClick={() => setSelectedSampleId(sample.id)}
              >
                <span>
                  <strong>{sample.id}</strong>
                  <small>{fmtDate(sample.fecha_toma)}</small>
                  {sample.has_interpretation ? <small className="savedContent">Contenido guardado</small> : null}
                </span>
                <em className={`pill ${statusClass(sample.estado_revision)}`}>{sample.estado_revision || 'Pendiente'}</em>
              </button>
            ))}
          </div>
        </aside>

        <main className="contentPane">
          <section className="resultsLimits">
            <div className="blockTitle">1. Resultados y límites</div>
            <div className="testEvaluations">
              {evaluatedTests.length ? evaluatedTests.map((test) => (
                <article className="testEvaluation" key={test.id}>
                  <header className="testEvaluationHead">
                    <div>
                      <strong>{test.acronym}</strong>
                      <span>{test.name}{test.condition ? ` · ${test.condition}` : ''}</span>
                    </div>
                    <div className="criterionSummary">
                      <small>Límite según</small>
                      <strong>{test.criterion}</strong>
                    </div>
                    <div className="testDecision">
                      <span className={`pill ${statusClass(test.status)}`}>{test.status}</span>
                      {test.decision ? <small>{test.decision}</small> : null}
                    </div>
                    <button type="button" className="detailsToggle" onClick={() => toggleTestDetails(test.id)}>
                      {expandedTests.includes(test.id) ? 'Ocultar campos y reglas' : 'Ver campos y reglas'}
                    </button>
                  </header>

                  {expandedTests.includes(test.id) && test.groups.length ? test.groups.map((group, groupIndex) => (
                    <section className="evaluationGroup" key={`${test.id}-${group.label}-${groupIndex}`}>
                      {(test.groups.length > 1 || group.label !== 'Resultado' || group.unit) ? (
                        <div className="evaluationGroupHead">
                          <h4>{group.label}{group.unit ? <span className="resultUnit">Unidad: {group.unit}</span> : null}</h4>
                          {group.status ? <span className={`fieldPill ${statusClass(group.status)}`}>{group.status}</span> : null}
                          {group.reason ? <small>{group.reason}</small> : null}
                        </div>
                      ) : null}
                      <div className="evaluationField fieldLabels" aria-hidden="true">
                        <span>Campo</span><span>Medición</span><span>Bandas del límite</span><span>Estado y motivo</span>
                      </div>
                      {group.fields.map((field) => (
                        <div className="evaluationField" key={field.key}>
                          <strong className="fieldName">{field.label}</strong>
                          <strong className="fieldValue">{field.value}</strong>
                          <div className="limitBands">
                            <span className="limitBand acceptable"><i />Aceptable <b>{field.rule.acceptable}</b></span>
                            {field.rule.warning ? <span className="limitBand warning"><i />Alerta <b>{field.rule.warning}</b></span> : null}
                            {field.rule.critical ? <span className="limitBand critical"><i />Crítico <b>{field.rule.critical}</b></span> : null}
                          </div>
                          <div className="fieldOutcome">
                            <span className={`fieldPill ${statusClass(field.status)}`}>{field.status}</span>
                            {field.reason ? <small>{field.reason}</small> : null}
                          </div>
                        </div>
                      ))}
                    </section>
                  )) : expandedTests.includes(test.id) ? (
                    <div className="evaluationFallback">
                      <span><small>Resultado</small><strong>{test.fallbackResult}</strong></span>
                      <span><small>Límite</small><strong>{test.fallbackLimit}</strong></span>
                    </div>
                  ) : null}
                </article>
              )) : <div className="emptyEvaluation">Sin resultados revisados para esta muestra.</div>}
            </div>
          </section>

          <section className="diagnostic">
            <div className="blockTitle">Resumen de diagnóstico</div>
            <div className="diagRow ok"><span>Aceptables</span><strong>{diagnosticCounts.normal}</strong><small>Dentro de la banda verde.</small></div>
            <div className="diagRow warning"><span>Alertas</span><strong>{diagnosticCounts.warning}</strong><small>En zona amarilla.</small></div>
            <div className="diagRow critical"><span>Críticas</span><strong>{diagnosticCounts.critical}</strong><small>Fuera del umbral crítico.</small></div>
            <div className="diagRow neutral"><span>Informativas</span><strong>{diagnosticCounts.informative}</strong><small>No modifican el estado técnico.</small></div>
            {diagnosticCounts.pending ? <div className="diagRow pending"><span>Sin evaluar</span><strong>{diagnosticCounts.pending}</strong><small>Requieren configuración o resultado.</small></div> : null}
          </section>

          <section className="commentsBox">
            <div className="blockTitle">2. Comentarios e interpretación técnica</div>
            <div className="commentsToolbar">
              <button type="button" onClick={restoreSuggestedComments}>Restaurar sugeridos</button>
              <button type="button" onClick={clearSuggestedComments}>Limpiar selección</button>
            </div>
            <div className="commentsTable">
              <div className="commentsHead">Comentarios predefinidos</div>
              {predefinedComments.length ? predefinedComments.map((comment, index) => (
                <div className="commentRow" key={`${comment}-${index}`}>
                  <span>{index + 1}.</span>
                  <label>
                    <input type="checkbox" checked={selectedComments.includes(comment)} onChange={() => toggleComment(comment)} />
                    <p>{comment}</p>
                  </label>
                  <button type="button" onClick={() => deselectComment(index)} title="No incluir"><X size={13} /></button>
                </div>
              )) : (
                <div className="commentRow"><span>1.</span><label><p>Sin comentarios predefinidos para esta muestra.</p></label></div>
              )}
            </div>

            <div className="manualCommentBox">
              <input value={manualComment} onChange={(e) => setManualComment(e.target.value)} placeholder="Agregar comentario manual para esta muestra" />
              <button type="button" onClick={addManualComment}>Agregar</button>
            </div>
            {manualComments.length ? (
              <div className="manualList">
                {manualComments.map((comment, index) => (
                  <div key={`${comment}-${index}`}><span>{index + 1}</span><p>{comment}</p><button onClick={() => removeManualComment(index)}><X size={13} /></button></div>
                ))}
              </div>
            ) : null}

            <label className="conclusionBox">
              <span>Conclusión</span>
              <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Conclusión técnica de la muestra para el informe..." />
              <em>{conclusion.length}/1500</em>
            </label>
            <div className="sampleWorkActions">
              <span>El contenido se guarda por muestra y alimenta su reporte individual.</span>
              <button type="button" className="btn red" onClick={saveAndNext} disabled={saving || !selectedSampleId}>
                <Save size={16} /> Guardar y seguir con la siguiente
              </button>
            </div>
          </section>

          <section className="trendBox">
            <div className="trendTop">
              <div className="blockTitle">3. Tendencias históricas</div>
              <label className="switchLine">
                <input type="checkbox" checked={graphsEnabled} onChange={(e) => setGraphsEnabled(e.target.checked)} />
                Activar gráficas
              </label>
              <div className="chips">
                {graphOptions.map((option) => (
                  <button key={option} className={selectedGraphs.includes(option) ? 'chip active' : 'chip'} onClick={() => toggleGraph(option)}>{option}</button>
                ))}
              </div>
            </div>
            {graphsEnabled ? (
              trendGroups.length ? (
                <div className="trendGroups">
                  {trendGroups.map((test) => (
                    <section className="trendTest" key={test.prueba_id || test.prueba}>
                      <header><strong>{test.prueba}</strong><span>{test.nombre}</span></header>
                      {(test.resultados || []).map((result) => (
                        <div className="trendResult" key={`${test.prueba}-${result.resultado}`}>
                          <h3>{result.resultado}</h3>
                          {result.numeric_series?.length ? (
                            <div className="chartsGrid">
                              {result.numeric_series.map((serie) => <MiniChart key={serie.key} serie={serie} />)}
                            </div>
                          ) : null}
                          {result.categorical_series?.length ? (
                            <div className="categoricalGrid">
                              {result.categorical_series.map((serie) => <CategoricalHistory key={serie.key} serie={serie} />)}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="chartsGrid">
                  {trends.length ? trends.map((serie) => (
                    <MiniChart key={`${serie.prueba}-${serie.campo || ''}`} serie={serie} />
                  )) : (
                    <div className="emptyChart"><BarChart3 size={28} /> No hay suficiente histórico para tendencia. Se muestra cuando existan más mediciones del mismo equipo.</div>
                  )}
                </div>
              )
            ) : <div className="emptyChart">Gráficas desactivadas.</div>}
          </section>
        </main>
      </section>

      {signatureModal ? (
        <div className="modalOverlay">
          <div className="signatureModal">
            <div className="modalHead">
              <h3>Crear reportes</h3>
              <button type="button" onClick={() => setSignatureModal(false)}>×</button>
            </div>
            <p className="modalIntro">
              Cada muestra siempre produce su propio reporte y su propia versión. Elija si desea crear solo el reporte actual o uno para cada muestra del lote.
            </p>

            <div className="reportScope">
              <label className={reportScope === 'sample' ? 'active' : ''}>
                <input type="radio" name="report-scope" value="sample" checked={reportScope === 'sample'} onChange={() => setReportScope('sample')} />
                <span><strong>Esta muestra</strong><small>{selectedSampleId}</small></span>
              </label>
              <label className={reportScope === 'batch' ? 'active' : ''}>
                <input type="radio" name="report-scope" value="batch" checked={reportScope === 'batch'} onChange={() => setReportScope('batch')} />
                <span><strong>Todas las muestras del lote</strong><small>Genera {batch?.muestras?.length || 0} reportes individuales</small></span>
              </label>
            </div>
            {reportScope === 'batch' ? <p className="scopeHint">Todas deben estar revisadas y tener su contenido guardado. Después podrá consolidarlas en PDF o ZIP desde Reportes.</p> : null}

            <label className="signatureField">
              <span>Responsable</span>
              <input
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Nombre del responsable que firmará el informe"
              />
            </label>

            <div className="signatureTabs">
              {user?.firma_predeterminada ? (
                <button type="button" className={signatureMode === 'default' ? 'active' : ''} onClick={() => setSignatureMode('default')}>
                  Firma de mi cuenta
                </button>
              ) : null}
              <button type="button" className={signatureMode === 'draw' ? 'active' : ''} onClick={() => setSignatureMode('draw')}>
                Firmar con mouse / táctil
              </button>
              <button type="button" className={signatureMode === 'upload' ? 'active' : ''} onClick={() => setSignatureMode('upload')}>
                Subir imagen
              </button>
            </div>

            {signatureMode === 'default' ? (
              <div className="signaturePreview">
                <img src={user?.firma_predeterminada} alt="Firma predeterminada de la cuenta" />
              </div>
            ) : signatureMode === 'draw' ? (
              <div className="drawSignatureBox">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={drawSignature}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={drawSignature}
                  onTouchEnd={stopDrawing}
                />
                <button type="button" className="clearSignature" onClick={clearDrawnSignature}>Limpiar firma</button>
              </div>
            ) : (
              <>
                <label className="signatureField">
                  <span>Firma del responsable</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSignatureFile(e.target.files?.[0])}
                  />
                </label>

                {signaturePreview ? (
                  <div className="signaturePreview">
                    <img src={signaturePreview} alt="Vista previa firma" />
                  </div>
                ) : (
                  <div className="signaturePreview empty">Sin firma seleccionada</div>
                )}
              </>
            )}

            <div className="modalActions">
              <button type="button" className="btn secondary" onClick={() => setSignatureModal(false)}>Cancelar</button>
              <button type="button" className="btn red" onClick={generateReport} disabled={saving}>
                <FileText size={16} /> {reportScope === 'batch' ? 'Generar reportes del lote' : 'Generar reporte de esta muestra'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .interpPage{background:transparent;color:#fff;padding:0 0 18px}
        .interpTop{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:10px}
        .titleBox{display:flex;gap:12px;align-items:center}.titleBox h1{font-size:24px;margin:0}.titleBox p{color:#c8c8c8;margin:3px 0 0}
        .miniIcon{width:42px;height:42px;border:1px solid #444;background:#111;border-radius:9px;display:grid;place-items:center}
        .topActions{display:flex;gap:10px}.btn{min-height:40px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;display:inline-flex;align-items:center;gap:8px;padding:0 14px;font-weight:800;cursor:pointer}.btn.red{background:#ef232a;border-color:#ef232a}
        .exportMenu{position:relative}.exportMenuPanel{position:absolute;right:0;top:calc(100% + 6px);z-index:60;width:240px;border:1px solid #3b3d43;background:#17181b;padding:6px;box-shadow:0 14px 32px rgba(0,0,0,.45)}.exportMenuPanel strong{display:block;padding:8px 10px 5px;color:#fca5a5;font-size:12px}.exportMenuPanel button{width:100%;border:0;background:transparent;color:#f3f3f3;padding:9px 10px;text-align:left;cursor:pointer}.exportMenuPanel button:hover{background:#292b30}
        .summaryLine{display:grid;grid-template-columns:1.2fr 1.2fr repeat(3,1fr);gap:0;border:1px solid #383838;background:linear-gradient(180deg,#1b1b1b,#111);border-radius:10px;overflow:hidden;margin-bottom:10px}.summaryLine>label,.summaryLine>.info{padding:12px 14px;border-left:1px solid #303030}.summaryLine>:first-child{border-left:0}.summaryLine span,.info label{display:block;color:#aeb6c1;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}.summaryLine select{height:36px;width:100%;border:1px solid #444;background:#111;color:#fff;border-radius:7px;padding:0 9px}.lockedLot{min-height:36px;border-radius:7px;border:1px solid #444;background:#111;color:#fff;padding:0 9px;display:inline-flex;align-items:center;font-weight:900}.lockedLot.action{cursor:pointer;color:#fecaca;border-color:rgba(239,35,42,.45)}.info .value{font-weight:900}
        .mainGrid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:10px}.samplePane,.contentPane section{border:1px solid #383838;background:linear-gradient(180deg,rgba(27,27,27,.98),rgba(16,16,16,.98));border-radius:10px}.samplePane{padding:12px}.samplePane h2{font-size:16px;margin:0 0 10px}.searchBox{height:36px;border:1px solid #404040;background:#080808;border-radius:7px;display:grid;grid-template-columns:18px 1fr 18px;align-items:center;gap:8px;padding:0 9px;margin-bottom:10px}.searchBox input{border:0;background:transparent;color:#fff;outline:0}.sampleList{max-height:670px;overflow:auto}.sampleItem{width:100%;min-height:52px;border:0;border-bottom:1px solid #2d2d2d;background:transparent;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;padding:8px;cursor:pointer}.sampleItem.active{background:#2a2d31;border-left:3px solid #ef232a}.sampleItem strong,.sampleItem small{display:block}.sampleItem small{color:#aaa}
        .pill{display:inline-flex;align-items:center;border-radius:999px;border:1px solid #444;background:#222;color:#e5e7eb;padding:4px 9px;font-size:12px;font-weight:800}.pill.ok{color:#86efac;border-color:rgba(34,197,94,.45);background:rgba(22,101,52,.35)}.pill.critical{color:#fecaca;border-color:rgba(239,35,42,.6);background:rgba(127,29,29,.32)}.pill.alert{color:#fde047;border-color:rgba(234,179,8,.5);background:rgba(113,63,18,.28)}.pill.warning{color:#facc15;border-color:rgba(250,204,21,.5);background:rgba(113,63,18,.25)}.pill.pending,.pill.neutral{color:#d1d5db}
        .contentPane{display:grid;grid-template-columns:minmax(720px,2fr) 300px;gap:10px;min-width:0}.contentPane section{padding:12px}.resultsLimits{grid-column:1;overflow:hidden}.diagnostic{grid-column:2;grid-row:1}.commentsBox,.trendBox{grid-column:1/3}.blockTitle{font-size:18px;font-weight:900;margin-bottom:10px}
        .testEvaluations{border:1px solid #333;border-radius:8px;overflow:hidden}.testEvaluation{border-top:1px solid #343434;background:#111}.testEvaluation:first-child{border-top:0}.testEvaluationHead{display:grid;grid-template-columns:minmax(130px,.75fr) minmax(160px,1fr) minmax(180px,1.2fr) auto;gap:12px;align-items:center;padding:12px 14px;background:#202124}.detailsToggle{min-height:32px;border:1px solid #454545;background:#111;color:#fff;border-radius:7px;padding:0 9px;font-weight:800;cursor:pointer;white-space:nowrap}.testEvaluationHead>div:first-child strong{font-size:16px}.testEvaluationHead>div:first-child span{display:block;color:#aeb6c1;font-size:12px;margin-top:2px}.criterionSummary{border-left:1px solid #383838;padding-left:12px}.criterionSummary small{display:block;color:#8f98a5;font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}.criterionSummary strong{font-size:12px;line-height:1.35}.testDecision{display:flex;align-items:flex-start;gap:8px}.testDecision small{color:#b8c0cc;font-size:11px;line-height:1.3}
        .evaluationGroup{padding:9px 14px!important;border:0!important;border-radius:0!important;background:transparent!important}.evaluationGroupHead{display:flex;align-items:center;gap:8px;margin-bottom:6px}.evaluationGroupHead h4{margin:0!important}.evaluationGroupHead small{color:#8f98a5;font-size:9px}.evaluationGroup h4{margin:0 0 6px;color:#e5e7eb;font-size:11px;text-transform:uppercase;letter-spacing:.06em}.evaluationField{display:grid;grid-template-columns:minmax(80px,.65fr) minmax(75px,.55fr) minmax(220px,1.9fr) minmax(160px,1.25fr);gap:10px;align-items:center;padding:7px 0;border-top:1px solid #2c2f34}.evaluationField.fieldLabels{padding:0 0 5px;border-top:0;color:#7f8996;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.evaluationField.fieldLabels+.evaluationField{border-top:0}.fieldName{font-size:11px;text-transform:uppercase;color:#d9dee7}.fieldValue{font-size:15px}.limitBands{display:flex;flex-wrap:wrap;gap:5px 10px}.limitBand{display:inline-flex;align-items:center;gap:4px;color:#9ca3af;font-size:10px;line-height:1.25}.limitBand i{width:7px;height:7px;border-radius:2px;background:#22c55e;flex:0 0 auto}.limitBand b{color:#e5e7eb}.limitBand.warning i{background:#eab308}.limitBand.critical i{background:#ef232a}.fieldOutcome{display:flex;align-items:flex-start;gap:7px}.fieldOutcome small{color:#aeb6c1;font-size:10px;line-height:1.25}.fieldPill{display:inline-flex;border:1px solid #444;border-radius:999px;padding:3px 7px;font-size:9px;font-weight:900;white-space:nowrap}.fieldPill.ok{color:#86efac;border-color:rgba(34,197,94,.45);background:rgba(22,101,52,.25)}.fieldPill.alert{color:#fde047;border-color:rgba(234,179,8,.5);background:rgba(113,63,18,.25)}.fieldPill.critical{color:#fecaca;border-color:rgba(239,35,42,.55);background:rgba(127,29,29,.25)}.fieldPill.neutral,.fieldPill.pending{color:#d1d5db}.evaluationFallback{display:grid;grid-template-columns:1fr 2fr;gap:12px;padding:12px 14px}.evaluationFallback span small{display:block;color:#8f98a5;font-size:9px;text-transform:uppercase;margin-bottom:3px}.emptyEvaluation{padding:30px;text-align:center;color:#9ca3af}
        .diagRow{min-height:52px;border:1px solid #333;border-left:3px solid #6b7280;border-radius:7px;margin-bottom:8px;padding:9px 10px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 10px}.diagRow span{font-weight:900}.diagRow strong{font-size:20px}.diagRow small{grid-column:1/3;color:#9ca3af}.diagRow.ok{border-left-color:#22c55e}.diagRow.warning{border-left-color:#eab308}.diagRow.critical{border-left-color:#ef232a}.diagRow.neutral{border-left-color:#9ca3af}
        .commentsTable{border:1px solid #333;border-radius:8px;overflow:hidden}.commentsHead{height:28px;background:#e6edf8;color:#111;padding:5px 9px;font-weight:800}.commentRow{display:grid;grid-template-columns:42px 1fr 28px;align-items:center;min-height:28px;background:#dbe7f5;color:#111;border-top:1px solid #bed0e5}.commentRow span{text-align:center;font-weight:900}.commentRow p{margin:0}.commentRow button{background:transparent;border:0;cursor:pointer}.providerComment{display:grid;gap:6px;margin-top:10px}.providerComment span{font-weight:800}.providerComment textarea{min-height:82px;border:1px solid #404040;background:#080808;color:#fff;border-radius:8px;padding:10px;resize:vertical}.providerComment em{text-align:right;color:#aaa;font-style:normal}.sampleWorkActions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid #333}.sampleWorkActions span{color:#9ca3af;font-size:12px}
        .trendTop{display:grid;grid-template-columns:220px 160px 1fr;align-items:center;gap:12px}.switchLine{display:flex;align-items:center;gap:8px}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{height:28px;border:1px solid #444;background:#252525;color:#ddd;border-radius:7px;padding:0 10px;cursor:pointer}.chip.active{background:#3b3b3b;border-color:#666;color:#fff}.chartsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.chartCard,.emptyChart{min-height:220px;border:1px solid #333;background:#111;border-radius:8px;padding:12px}.chartCard h3{margin:0 0 8px}.lineChart{width:100%;height:150px;display:block;background:linear-gradient(180deg,rgba(255,255,255,.025),transparent);border-bottom:1px solid #555}.trendLine{fill:none;stroke:#d1d5db;stroke-width:2.2}.trendPoint{fill:#d1d5db;stroke:#111;stroke-width:1.5}.trendPoint.actual{fill:#ef232a;stroke:#fff}.axisLabel{fill:#9ca3af;font-size:10px}.emptyChart{display:grid;place-items:center;color:#aaa;text-align:center}.chartFoot{color:#aaa;font-size:12px;margin-top:7px}
        .resultUnit{display:inline-flex!important;margin:0 0 0 8px!important;padding:2px 6px;border:1px solid #46505d;border-radius:999px;color:#cbd5e1!important;font-size:9px!important;font-weight:800;letter-spacing:0;text-transform:none;vertical-align:middle}
        .requestOverlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.78);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;cursor:wait}.requestCard{width:min(430px,92vw);min-height:210px;border:1px solid #494949;background:linear-gradient(180deg,#202020,#121212);border-radius:14px;box-shadow:0 30px 90px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;text-align:center;padding:26px}.requestCard strong{font-size:18px;line-height:1.35}.requestCard span{color:#b8b8b8;font-size:13px}.requestSpinner{width:54px;height:54px;border:6px solid #454545;border-top-color:#ef232a;border-right-color:#ef232a;border-radius:50%;animation:requestSpin .8s linear infinite}@keyframes requestSpin{to{transform:rotate(360deg)}}

        .trendGroups{display:grid;gap:12px;margin-top:10px}.trendTest{padding:0!important;overflow:hidden;background:#111!important}.trendTest>header{display:flex;align-items:baseline;gap:10px;padding:10px 12px;background:#232323;border-bottom:1px solid #383838}.trendTest>header strong{font-size:16px}.trendTest>header span{color:#aeb6c1;font-size:12px}.trendResult{padding:10px 12px;border-top:1px solid #303030}.trendResult:first-of-type{border-top:0}.trendResult>h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;color:#d7dce4}.categoricalGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.historyCard{border:1px solid #333;background:#111;border-radius:8px;padding:10px;min-width:0}.historyCard h3{font-size:14px;margin:0 0 8px}.historyTable{width:100%;border-collapse:collapse;font-size:12px}.historyTable th,.historyTable td{padding:7px 8px;border-top:1px solid #303030;text-align:left}.historyTable th{color:#9ca3af;text-transform:uppercase;font-size:9px}.historyTable tr.current td{color:#fff;font-weight:800;background:#242424}.savedContent{color:#86efac!important;font-size:10px!important;margin-top:2px}
        .sampleStepBar{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #383838;background:#151515;border-radius:10px;padding:9px 12px;margin-bottom:10px}.sampleStepBar button{height:34px;border:1px solid #444;background:#111;color:#fff;border-radius:7px;padding:0 10px;cursor:pointer}.sampleStepBar span{font-weight:900;color:#ddd}
        .commentRow label{display:flex!important;align-items:center;gap:9px;min-width:0}.commentRow input{accent-color:#ef232a}.commentsToolbar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:8px}.commentsToolbar button{height:30px;border:1px solid #404040;background:#141414;color:#fff;border-radius:7px;padding:0 10px;font-weight:800;cursor:pointer}.manualCommentBox{display:grid;grid-template-columns:1fr 100px;gap:8px;margin-top:10px}.manualCommentBox input,.manualCommentBox button{min-height:38px;border:1px solid #404040;background:#080808;color:#fff;border-radius:8px;padding:0 10px}.manualCommentBox button{background:#222;font-weight:800;cursor:pointer}.manualList{display:grid;gap:5px;margin-top:8px}.manualList>div{display:grid;grid-template-columns:28px 1fr 28px;align-items:center;border:1px solid #333;background:#111;border-radius:8px;padding:7px 8px}.manualList p{margin:0}.manualList button{background:transparent;border:0;color:#fff;cursor:pointer}.conclusionBox{display:grid;gap:6px;margin-top:12px}.conclusionBox span{font-weight:900;color:#e5e7eb}.conclusionBox textarea{min-height:110px;border:1px solid #404040;background:#080808;color:#fff;border-radius:8px;padding:10px;resize:vertical}.conclusionBox em{text-align:right;color:#aaa;font-style:normal}
        .pill.neutral{color:#d1d5db;background:#333}.chartsGrid .chartCard:only-child{grid-column:auto}
        .topActions{flex-wrap:wrap;justify-content:flex-end}.topActions .btn{max-width:220px;justify-content:center;text-align:center;line-height:1.15}.summaryLine>*{min-width:0}.info .value{overflow-wrap:anywhere}.mainGrid{grid-template-columns:280px minmax(0,1fr);min-width:0}.contentPane{grid-template-columns:minmax(0,1fr) 260px}.contentPane section{min-width:0}.commentsBox,.trendBox{overflow:hidden}.pill{max-width:100%;white-space:normal;line-height:1.15}.diagRow{overflow-wrap:anywhere}.commentRow{grid-template-columns:42px minmax(0,1fr) 28px}.commentRow p{overflow-wrap:anywhere}.trendTop{grid-template-columns:auto auto minmax(0,1fr)}.chips{min-width:0}.chip{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chartCard,.emptyChart{min-width:0}.chartCard h3{overflow-wrap:anywhere}

        @media(max-width:1400px){.contentPane{grid-template-columns:1fr}.diagnostic,.resultsLimits,.commentsBox,.trendBox{grid-column:1}.diagnostic{grid-row:auto}}
        .modalOverlay{position:fixed;inset:0;background:rgba(0,0,0,.62);display:grid;place-items:center;z-index:100;padding:20px}
        .signatureModal{width:min(560px,96vw);border:1px solid #3d3d3d;background:linear-gradient(180deg,#1b1b1b,#101010);border-radius:12px;box-shadow:0 28px 80px rgba(0,0,0,.55);padding:18px;color:#fff}
        .modalHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.modalHead h3{margin:0;font-size:22px}.modalHead button{background:transparent;border:0;color:#fff;font-size:24px;cursor:pointer}
        .modalIntro{color:#c8c8c8;line-height:1.45;margin:0 0 14px}.signatureField{display:grid;gap:6px;margin-bottom:12px}.signatureField span{font-weight:900;color:#e5e7eb}.signatureField input{min-height:40px;border:1px solid #404040;background:#080808;color:#fff;border-radius:8px;padding:0 10px}
        .reportScope{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px}.reportScope label{display:flex;align-items:flex-start;gap:9px;border:1px solid #444;background:#101010;border-radius:9px;padding:11px;cursor:pointer}.reportScope label.active{border-color:#ef232a;background:rgba(127,29,29,.22)}.reportScope input{margin-top:3px;accent-color:#ef232a}.reportScope strong,.reportScope small{display:block}.reportScope small{color:#aeb6c1;margin-top:3px}.scopeHint{border-left:3px solid #eab308;background:rgba(113,63,18,.2);color:#fde68a;padding:9px 10px;margin:0 0 12px;font-size:12px;line-height:1.4}
        .signaturePreview{min-height:110px;border:1px dashed #555;border-radius:8px;background:#080808;display:grid;place-items:center;margin:10px 0;color:#aaa}.signaturePreview img{max-width:220px;max-height:105px;object-fit:contain;background:#fff;padding:4px}
        .modalActions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}

        .signatureTabs{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 12px}.signatureTabs button{min-height:38px;flex:1 1 150px;border:1px solid #404040;background:#111;color:#ddd;border-radius:8px;font-weight:800;cursor:pointer}.signatureTabs button.active{background:#ef232a;border-color:#ef232a;color:#fff}
        .drawSignatureBox{display:grid;gap:8px}.drawSignatureBox canvas{width:100%;height:150px;border:1px dashed #666;border-radius:8px;background:#fff;touch-action:none;cursor:crosshair}.clearSignature{height:34px;border:1px solid #444;background:#151515;color:#fff;border-radius:8px;cursor:pointer;font-weight:800}


        @media(max-width:1200px){.summaryLine{grid-template-columns:repeat(2,1fr)}.mainGrid{grid-template-columns:1fr}.chartsGrid,.categoricalGrid{grid-template-columns:1fr}.trendTop{grid-template-columns:1fr}.evaluationField{grid-template-columns:minmax(75px,.6fr) minmax(70px,.5fr) minmax(200px,1.7fr) minmax(145px,1.2fr)}}@media(max-width:800px){.interpTop{flex-direction:column;align-items:flex-start}.summaryLine{grid-template-columns:1fr}.topActions{width:100%;justify-content:stretch}.topActions .btn{flex:1 1 100%;max-width:none}.testEvaluationHead{grid-template-columns:1fr}.criterionSummary{border-left:0;border-top:1px solid #383838;padding:9px 0 0}.testDecision{border-top:1px solid #383838;padding-top:9px}.evaluationGroup{overflow-x:auto}.evaluationField{min-width:650px}.sampleStepBar{align-items:stretch;flex-direction:column}.sampleStepBar span{text-align:center}}
      `}</style>
    </div>
  );
}

const Info = ({ label, value }) => <div className="info"><label>{label}</label><div className="value">{value}</div></div>;

const MiniChart = ({ serie }) => {
  const rawPoints = (serie.points || []).slice(-18);
  const points = rawPoints
    .map((point) => ({ ...point, y: Number(point.valor) }))
    .filter((point) => Number.isFinite(point.y));

  if (points.length < 2) {
    return (
      <div className="chartCard">
        <h3>{serie.campo || serie.prueba} {serie.unidad ? `(${serie.unidad})` : ''}</h3>
        <div className="emptyChart">No hay suficiente histórico para tendencia. Se necesitan al menos dos mediciones del mismo equipo.</div>
      </div>
    );
  }

  const width = 520;
  const height = 150;
  const padX = 28;
  const padY = 18;
  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max === min ? 1 : max - min;

  const coords = points.map((point, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(points.length - 1, 1);
    const y = height - padY - ((point.y - min) / range) * (height - padY * 2);
    return { ...point, x, y };
  });

  const polyline = coords.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="chartCard">
      <h3>{serie.campo || serie.prueba} {serie.unidad ? `(${serie.unidad})` : ''}</h3>
      <svg className="lineChart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#4b5563" strokeWidth="1" />
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#374151" strokeWidth="1" />
        <text x={padX} y={13} className="axisLabel">{max}</text>
        <text x={padX} y={height - 4} className="axisLabel">{min}</text>
        <polyline points={polyline} className="trendLine" />
        {coords.map((point) => (
          <circle
            key={`${point.muestra}-${point.fecha}`}
            cx={point.x}
            cy={point.y}
            r={point.actual ? 5 : 3.5}
            className={`trendPoint ${point.actual ? 'actual' : ''}`}
          >
            <title>{`${point.muestra}: ${point.valor} ${serie.unidad || ''}`}</title>
          </circle>
        ))}
      </svg>
      <div className="chartFoot">Tendencia histórica del mismo equipo. La muestra actual se muestra en rojo.</div>
    </div>
  );
};

const CategoricalHistory = ({ serie }) => {
  const points = (serie.points || []).slice(-12);
  return (
    <div className="historyCard">
      <h3>{serie.campo}</h3>
      <table className="historyTable">
        <thead><tr><th>Fecha</th><th>Muestra</th><th>Valor</th></tr></thead>
        <tbody>
          {points.map((point) => (
            <tr className={point.actual ? 'current' : ''} key={`${point.muestra}-${point.fecha}-${point.valor}`}>
              <td>{point.fecha ? new Date(point.fecha).toLocaleDateString('es-CO') : '-'}</td>
              <td>{point.muestra}</td>
              <td>{point.label ?? point.valor ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
