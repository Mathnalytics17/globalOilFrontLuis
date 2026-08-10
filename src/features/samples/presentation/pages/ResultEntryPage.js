import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Save,
  Search,
  Upload,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { resultEntryService } from '@features/samples/infrastructure/resultEntryService';
import technicalConfigService from '@features/technical-config/infrastructure/technicalConfigService';

const normalizeValueMap = (currentResult) => {
  const values = currentResult?.payload?.values || [];
  const map = {};
  values.forEach((item) => {
    map[item.key] = {
      value: item.value ?? '',
      observacion: item.observacion || '',
    };
  });
  return map;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO');
};

const getStatusClass = (status) => {
  if (['aprobado', 'completado'].includes(status)) return 'ok';
  if (['en_proceso', 'preliminar'].includes(status)) return 'draft';
  if (['rechazado'].includes(status)) return 'bad';
  return 'pending';
};

const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== '';

export default function ResultEntryPage() {
  const router = useRouter();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchDetail, setBatchDetail] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [formData, setFormData] = useState(null);
  const [valueMap, setValueMap] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [excelPreview, setExcelPreview] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelLoadingMessage, setExcelLoadingMessage] = useState('Procesando archivo Excel...');
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);
  const [sampleFilter, setSampleFilter] = useState('');
  const [testListPage, setTestListPage] = useState(1);
  const [equipment, setEquipment] = useState([]);
  const [methods, setMethods] = useState([]);
  const [executionConfig, setExecutionConfig] = useState({ equipo_prueba: '', metodo_equipo: '' });
  const formCacheRef = useRef({});
  const excelPreviewValuesRef = useRef({});
  const selectedTestRef = useRef('');

  useEffect(() => {
    loadBatches();
    loadExecutionCatalogs();
  }, []);

  useEffect(() => {
    if (router.query?.lote) setSelectedBatchId(String(router.query.lote));
  }, [router.query?.lote]);

  useEffect(() => {
    formCacheRef.current = {};
    excelPreviewValuesRef.current = {};
    setFormData(null);
    if (selectedBatchId) loadBatch(selectedBatchId);
  }, [selectedBatchId]);

  useEffect(() => {
    selectedTestRef.current = String(selectedTestId || '');
    if (selectedTestId) loadForm(selectedTestId);
  }, [selectedTestId]);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await resultEntryService.listBatches({});
      setBatches(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los lotes para ingreso de resultados.');
    } finally {
      setLoading(false);
    }
  };

  const loadBatch = async (loteId, options = {}) => {
    setLoadingBatch(true);
    try {
      const data = await resultEntryService.getBatch(loteId);
      setBatchDetail(data);
      setExcelPreview(null);
      setExcelFile(null);
      if (options.preserveSelected && selectedTestId && data.sample_tests?.some((item) => String(item.id) === String(selectedTestId))) {
        return data;
      }
      const queryMuestra = router.query?.muestra ? String(router.query.muestra) : '';
      const byQuerySample = queryMuestra
        ? data.sample_tests?.find((item) => String(item.muestra_id || item.muestra) === queryMuestra)
        : null;
      const firstPending = data.sample_tests?.find((item) => !['completado', 'aprobado'].includes(item.estatus));
      const first = byQuerySample || firstPending || data.sample_tests?.[0];
      setSelectedTestId(first ? String(first.id) : '');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el detalle del lote.');
      return null;
    } finally {
      setLoadingBatch(false);
    }
  };

  const loadForm = async (pruebaMuestraId) => {
    const cacheKey = String(pruebaMuestraId);
    const cached = formCacheRef.current[cacheKey];
    if (cached) {
      setLoadingForm(false);
      setFormData(cached.formData);
      setValueMap(cached.valueMap);
      setObservaciones(cached.observaciones);
      setExecutionConfig(cached.executionConfig);
      return;
    }

    setLoadingForm(true);
    try {
      const data = await resultEntryService.getForm(pruebaMuestraId);
      const importedValues = excelPreviewValuesRef.current[cacheKey] || [];
      const importedValueMap = Object.fromEntries(importedValues.map((item) => [item.key, {
        value: item.value ?? '',
        observacion: item.observacion || '',
      }]));
      const draft = {
        formData: data,
        valueMap: { ...normalizeValueMap(data.current_result), ...importedValueMap },
        observaciones: data.current_result?.observaciones || '',
        executionConfig: {
          equipo_prueba: data.prueba_muestra?.equipo_configurado || data.prueba_muestra?.equipo_configurado_info?.id || '',
          metodo_equipo: data.prueba_muestra?.metodo_configurado || data.prueba_muestra?.metodo_configurado_info?.id || '',
        },
        dirty: false,
      };
      formCacheRef.current[cacheKey] = draft;
      if (selectedTestRef.current !== cacheKey) return;
      setFormData(data);
      setValueMap(draft.valueMap);
      setObservaciones(draft.observaciones);
      setExecutionConfig(draft.executionConfig);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el formulario de resultado.');
    } finally {
      setLoadingForm(false);
    }
  };

  const loadExecutionCatalogs = async () => {
    try {
      const [equipmentList, methodList] = await Promise.all([
        technicalConfigService.listTestEquipment({ activo: true }),
        technicalConfigService.listEquipmentMethods({ activo: true }),
      ]);
      setEquipment(equipmentList || []);
      setMethods(methodList || []);
    } catch {
      setEquipment([]);
      setMethods([]);
    }
  };

  const filteredSampleTests = useMemo(() => {
    const list = batchDetail?.sample_tests || [];
    const term = search.trim().toLowerCase();
    return list.filter((item) => {
      const sampleId = String(item.muestra_id || item.muestra || '');
      if (sampleFilter && sampleId !== sampleFilter) return false;
      if (!term) return true;
      return [
      item.muestra_id || item.muestra,
      item.prueba?.nombre_variable,
      item.prueba?.acronimo,
      item.condicion_configurada,
      item.estatus,
      ].join(' ').toLowerCase().includes(term);
    });
  }, [batchDetail, sampleFilter, search]);

  const sampleOptions = useMemo(() => Array.from(new Set(
    (batchDetail?.sample_tests || []).map((item) => String(item.muestra_id || item.muestra || '')).filter(Boolean)
  )), [batchDetail]);

  const testsPerPage = 6;
  const totalTestPages = Math.max(1, Math.ceil(filteredSampleTests.length / testsPerPage));
  const visibleSampleTests = useMemo(() => {
    const start = (testListPage - 1) * testsPerPage;
    return filteredSampleTests.slice(start, start + testsPerPage);
  }, [filteredSampleTests, testListPage]);

  const groupedSampleTests = useMemo(() => {
    const map = new Map();
    visibleSampleTests.forEach((item) => {
      const sampleId = item.muestra_id || item.muestra;
      if (!map.has(sampleId)) map.set(sampleId, []);
      map.get(sampleId).push(item);
    });
    return Array.from(map.entries());
  }, [visibleSampleTests]);

  useEffect(() => {
    setTestListPage(1);
  }, [search, sampleFilter, selectedBatchId]);

  useEffect(() => {
    if (testListPage > totalTestPages) setTestListPage(totalTestPages);
  }, [testListPage, totalTestPages]);

  const selectedTestPosition = useMemo(
    () => filteredSampleTests.findIndex((item) => String(item.id) === String(selectedTestId)),
    [filteredSampleTests, selectedTestId]
  );

  const navigateTest = (direction) => {
    if (!filteredSampleTests.length) return;
    const current = selectedTestPosition >= 0 ? selectedTestPosition : 0;
    const next = Math.min(Math.max(current + direction, 0), filteredSampleTests.length - 1);
    setSelectedTestId(String(filteredSampleTests[next].id));
    setTestListPage(Math.floor(next / testsPerPage) + 1);
  };

  const selectedTest = formData?.prueba_muestra;
  const filteredMethods = useMemo(
    () => methods.filter((method) => !executionConfig.equipo_prueba || String(method.equipo_prueba) === String(executionConfig.equipo_prueba)),
    [executionConfig.equipo_prueba, methods]
  );

  const stats = useMemo(() => {
    const list = batchDetail?.sample_tests || [];
    const completed = list.filter((item) => ['completado', 'aprobado'].includes(item.estatus)).length;
    return {
      total: list.length,
      completadas: completed,
      proceso: list.filter((item) => item.estatus === 'en_proceso').length,
      pendientes: list.length - completed,
    };
  }, [batchDetail]);

  const canReview = stats.total > 0 && stats.completadas === stats.total;
  const currentFormComplete = useMemo(
    () => Boolean(formData?.fields?.length) && formData.fields.every((field) => isFilled(valueMap[field.key]?.value)),
    [formData, valueMap]
  );

  const updateValue = (key, field, value) => {
    setValueMap((prev) => {
      const next = {
        ...prev,
        [key]: {
          value: prev[key]?.value ?? '',
          observacion: prev[key]?.observacion || '',
          [field]: value,
        },
      };
      const cached = formCacheRef.current[String(selectedTestId)];
      if (cached) {
        cached.valueMap = next;
        cached.dirty = true;
      }
      return next;
    });
  };

  const updateObservations = (value) => {
    setObservaciones(value);
    const cached = formCacheRef.current[String(selectedTestId)];
    if (cached) {
      cached.observaciones = value;
      cached.dirty = true;
    }
  };

  const updateExecutionConfig = (updater) => {
    setExecutionConfig((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const cached = formCacheRef.current[String(selectedTestId)];
      if (cached) {
        cached.executionConfig = next;
        cached.dirty = true;
      }
      return next;
    });
  };

  const buildPayloadFromDraft = (draft) => ({
    fields: (draft?.formData?.fields || []).map((field) => ({
      key: field.key,
      resultado_id: field.resultado_id ?? null,
      resultado_nombre: field.resultado_nombre || '',
      division_id: field.division_id ?? null,
      division_nombre: field.division_nombre || '',
      componente_id: field.componente_id ?? null,
      componente_nombre: field.componente_nombre || '',
      label: field.label || field.componente_nombre || field.resultado_nombre || field.key,
      unidad: field.unidad || '',
      tipo_dato: field.tipo_dato || '',
      tipo_comparacion: field.tipo_comparacion || '',
      limite_campo: field.limite_campo || null,
      operador_limite: field.operador_limite || '',
      escala_comparacion: field.escala_comparacion || null,
      opciones: field.opciones || [],
    })),
    values: (draft?.formData?.fields || []).map((field) => ({
      key: field.key,
      value: draft?.valueMap?.[field.key]?.value ?? '',
      observacion: draft?.valueMap?.[field.key]?.observacion || '',
    })),
    observaciones: draft?.observaciones || '',
    fecha_medicion: new Date().toISOString(),
    equipo_prueba: draft?.executionConfig?.equipo_prueba || null,
    metodo_equipo: draft?.executionConfig?.metodo_equipo || null,
  });

  const updateLocalStatus = (testId, status) => {
    setBatchDetail((current) => current ? {
      ...current,
      sample_tests: (current.sample_tests || []).map((item) => (
        String(item.id) === String(testId) ? { ...item, estatus: status } : item
      )),
    } : current);
  };

  const saveResult = async ({ draftOnly = false } = {}) => {
    if (!selectedTestId) {
      toast.warning('Seleccione una prueba asignada.');
      return;
    }

    setSaving(true);
    try {
      const cached = formCacheRef.current[String(selectedTestId)];
      const willComplete = currentFormComplete && !draftOnly;
      if (willComplete) {
        await resultEntryService.confirm(selectedTestId, buildPayloadFromDraft(cached));
        toast.success('Resultado completo guardado.');
      } else {
        await resultEntryService.saveDraft(selectedTestId, buildPayloadFromDraft(cached));
        toast.success('Avance guardado como borrador.');
      }
      if (cached?.formData?.prueba_muestra) {
        cached.dirty = false;
        cached.formData = {
          ...cached.formData,
          prueba_muestra: {
            ...cached.formData.prueba_muestra,
            estatus: willComplete ? 'completado' : 'en_proceso',
            completada: willComplete,
          },
        };
        setFormData(cached.formData);
      }
      updateLocalStatus(selectedTestId, willComplete ? 'completado' : 'en_proceso');
    } catch (error) {
      console.error(error);
      const msg = error?.response?.data?.detail || 'No se pudo guardar el resultado.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveAllResults = async () => {
    if (excelFile && excelPreview?.valid) {
      await applyExcel();
      return;
    }
    const pendingEntries = Object.entries(formCacheRef.current)
      .filter(([, draft]) => draft?.dirty);
    if (!pendingEntries.length) {
      toast.info('No hay cambios pendientes por guardar.');
      return;
    }

    setSaving(true);
    const statuses = {};
    try {
      for (const [testId, draft] of pendingEntries) {
        const complete = Boolean(draft.formData?.fields?.length)
          && draft.formData.fields.every((field) => isFilled(draft.valueMap?.[field.key]?.value));
        if (complete) {
          await resultEntryService.confirm(testId, buildPayloadFromDraft(draft));
          statuses[testId] = 'completado';
        } else {
          await resultEntryService.saveDraft(testId, buildPayloadFromDraft(draft));
          statuses[testId] = 'en_proceso';
        }
        draft.dirty = false;
        if (draft.formData?.prueba_muestra) {
          draft.formData.prueba_muestra = {
            ...draft.formData.prueba_muestra,
            estatus: statuses[testId],
            completada: complete,
          };
        }
      }
      setBatchDetail((current) => current ? {
        ...current,
        sample_tests: (current.sample_tests || []).map((item) => (
          statuses[item.id] ? { ...item, estatus: statuses[item.id] } : item
        )),
      } : current);
      const currentDraft = formCacheRef.current[String(selectedTestId)];
      if (currentDraft) setFormData(currentDraft.formData);
      toast.success(`${pendingEntries.length} resultado(s) guardados sin recargar el lote.`);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudieron guardar todos los resultados.');
    } finally {
      setSaving(false);
    }
  };

  const confirmAllResults = async () => {
    if (!selectedBatchId) return;
    setExcelLoadingMessage('Confirmando todos los resultados para revisión...');
    setExcelLoading(true);
    try {
      const data = await resultEntryService.confirmBatchResults(selectedBatchId);
      formCacheRef.current = {};
      const refreshed = await loadBatch(selectedBatchId, { preserveSelected: true });
      if (selectedTestId) await loadForm(selectedTestId);
      toast.success(data.detail || `${data.tests_completed || 0} resultados confirmados.`);
      if (refreshed?.sample_tests?.length && refreshed.sample_tests.every((item) => ['completado', 'aprobado'].includes(item.estatus))) {
        toast.info('El lote ya está listo. Puede continuar a Revisar.');
      }
    } catch (error) {
      console.error(error);
      const incomplete = error?.response?.data?.incomplete || [];
      const first = incomplete[0];
      const detail = first
        ? `${error.response.data.detail} ${first.muestra} · ${first.prueba}: ${first.campos_faltantes.join(', ')}.`
        : error?.response?.data?.detail || 'No se pudieron confirmar todos los resultados.';
      toast.error(detail);
    } finally {
      setExcelLoading(false);
      setExcelLoadingMessage('Procesando archivo Excel...');
    }
  };

  const downloadTemplate = async (mode) => {
    if (!selectedBatchId) {
      toast.warning('Seleccione un lote.');
      return;
    }

    try {
      setExcelLoadingMessage('Preparando la plantilla Excel...');
      setExcelLoading(true);
      const response = await resultEntryService.downloadTemplate(selectedBatchId, mode);
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plantilla_resultados_${selectedBatchId}_${mode}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      setExcelMenuOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo descargar la plantilla.');
    } finally {
      setExcelLoading(false);
      setExcelLoadingMessage('Procesando archivo Excel...');
    }
  };

  const previewExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelLoadingMessage('Validando el archivo y cargando los resultados...');
    setExcelLoading(true);
    try {
      const data = await resultEntryService.previewExcel(file);
      setExcelFile(file);
      setExcelPreview(data);
      if (data.valid) {
        excelPreviewValuesRef.current = data.values_by_test || {};
        Object.entries(formCacheRef.current).forEach(([testId, draft]) => {
          const importedValues = excelPreviewValuesRef.current[testId] || [];
          if (!importedValues.length) return;
          const importedValueMap = Object.fromEntries(importedValues.map((item) => [item.key, {
            value: item.value ?? '',
            observacion: item.observacion || '',
          }]));
          draft.valueMap = { ...normalizeValueMap(draft.formData?.current_result), ...importedValueMap };
        });
        const selectedDraft = formCacheRef.current[String(selectedTestId)];
        if (selectedDraft) setValueMap(selectedDraft.valueMap);
        toast.success('Archivo validado. Los valores ya están visibles para revisión.');
      } else {
        excelPreviewValuesRef.current = {};
        formCacheRef.current = {};
        if (selectedTestId) await loadForm(selectedTestId);
        toast.warning('El archivo tiene errores de validación.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudo validar el Excel.');
    } finally {
      setExcelLoading(false);
      setExcelLoadingMessage('Procesando archivo Excel...');
      event.target.value = '';
    }
  };

  const applyExcel = async () => {
    if (!excelFile || !excelPreview?.valid) return;
    const manualOverrides = Object.entries(formCacheRef.current)
      .filter(([, draft]) => draft?.dirty)
      .map(([testId, draft]) => ({ testId, payload: buildPayloadFromDraft(draft) }));
    setExcelLoadingMessage('Guardando los resultados como borradores...');
    setExcelLoading(true);
    try {
      const data = await resultEntryService.importExcel(excelFile);
      for (const override of manualOverrides) {
        await resultEntryService.saveDraft(override.testId, override.payload);
      }
      toast.success(data.detail || 'Resultados aplicados como borrador.');
      formCacheRef.current = {};
      excelPreviewValuesRef.current = {};
      setExcelFile(null);
      setExcelPreview(null);
      await loadBatch(selectedBatchId, { preserveSelected: true });
      if (selectedTestId) await loadForm(selectedTestId);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'No se pudieron aplicar los resultados del Excel.');
      if (error?.response?.data?.errors) {
        setExcelPreview({ ...error.response.data, valid: false });
      }
    } finally {
      setExcelLoading(false);
      setExcelLoadingMessage('Procesando archivo Excel...');
    }
  };

  return (
    <div className="resultPage">
      {excelLoading ? (
        <div className="excelLoadingOverlay" role="status" aria-live="assertive" aria-busy="true">
          <div className="excelLoadingCard">
            <div className="excelSpinner" aria-hidden="true" />
            <strong>{excelLoadingMessage}</strong>
            <span>Espere un momento. No cierre ni actualice esta página.</span>
          </div>
        </div>
      ) : null}
      <header className="resultTop">
        <div className="titleBlock">
          <button type="button" className="iconBtn" onClick={() => router.push(`/muestras/asignacion-pruebas${selectedBatchId ? `?lote=${selectedBatchId}` : ''}`)}>
            <ArrowLeft size={18} />
          </button>
          <div className="iconBtn static"><FileSpreadsheet size={20} /></div>
          <div>
            <h1>Ingreso de resultados</h1>
            <p>Ingrese resultados desde plataforma o valide una plantilla Excel oficial.</p>
          </div>
        </div>

        <div className="topActions">
          <button type="button" className="btn secondary" onClick={saveAllResults} disabled={saving || !selectedBatchId}>
            <Save size={16} />
            Guardar todo
          </button>
          <button
            type="button"
            className="btn red"
            onClick={confirmAllResults}
            disabled={saving || excelLoading || !selectedBatchId || stats.total === 0 || stats.proceso === 0}
            title={stats.proceso > 0 ? 'Confirmar todos los borradores completos para revisión.' : 'No hay borradores pendientes de confirmar.'}
          >
            <ClipboardCheck size={16} />
            Confirmar todo
          </button>
          <div className="excelMenu">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setExcelMenuOpen((current) => !current)}
              disabled={!selectedBatchId || excelLoading}
              aria-expanded={excelMenuOpen}
              aria-haspopup="menu"
            >
              <Download size={16} />
              Plantillas de carga
            </button>
            {excelMenuOpen && (
              <div className="excelMenuPanel" role="menu">
                <strong className="excelMenuTitle">Descargar plantilla para llenar</strong>
                <button type="button" role="menuitem" onClick={() => downloadTemplate('consolidado')}>Todos los resultados en una hoja</button>
                <button type="button" role="menuitem" onClick={() => downloadTemplate('por_muestra')}>Una hoja por muestra</button>
              </div>
            )}
          </div>
          <label className="btn red">
            <Upload size={16} />
            Cargar y validar
            <input type="file" accept=".xlsx" hidden onChange={previewExcel} />
          </label>
          <button
            type="button"
            className="btn secondary"
            onClick={() => router.push(`/muestras/revision-resultados${selectedBatchId ? `?lote=${selectedBatchId}` : ''}`)}
            disabled={!selectedBatchId || !canReview}
            title={!selectedBatchId || stats.total === 0 ? 'Seleccione un lote con pruebas.' : !canReview ? 'Complete todos los resultados antes de revisar.' : 'Revisar resultados'}
          >
            <ClipboardCheck size={16} />
            Revisar
          </button>
        </div>
      </header>

      <section className="lotLine">
        <Field label="Lote">
          {selectedBatchId ? (
            <div className="lockedLot">{selectedBatchId}</div>
          ) : (
            <button type="button" className="lockedLot action" onClick={() => router.push('/muestras/lotes')}>
              Seleccione un lote desde lotes
            </button>
          )}
        </Field>

        <LotInfo label="Cliente" value={batchDetail?.cliente_nombre || '-'} />
        <LotInfo label="Tipo gestión" value={batchDetail?.tipo_gestion_nombre || '-'} />
        <LotInfo label="Estado lote" value={batchDetail?.estado || '-'} />
        <LotInfo label="Faltantes" value={stats.pendientes} strong />
        <LotInfo label="En proceso" value={stats.proceso} strong />
        <LotInfo label="Completadas" value={stats.completadas} strong />
      </section>

      {excelPreview ? (
        <section className={`excelPreview ${excelPreview.valid ? 'ok' : 'bad'}`}>
          <strong>Validación de carga:</strong>
          <span>{excelLoading ? 'Procesando...' : `${excelPreview.rows_valid || 0} filas válidas · ${excelPreview.rows_error || 0} errores`}</span>
          {excelPreview.valid ? (
            <>
              <span>Los valores ya están visibles. Revíselos antes de guardarlos.</span>
              <button type="button" className="btn red compact" onClick={applyExcel} disabled={excelLoading}>
                Guardar {excelPreview.rows_valid || 0} valores como borradores
              </button>
            </>
          ) : null}
          {excelPreview.errors?.length ? (
            <details>
              <summary>Ver errores</summary>
              <ul>
                {excelPreview.errors.slice(0, 20).map((err, index) => (
                  <li key={`${err.sheet}-${err.row}-${index}`}>{err.sheet ? `${err.sheet} · ` : ''}Fila {err.row}: {err.message}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className="workGrid">
        <aside className="leftList">
          <div className="searchBox">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar muestra o prueba" />
          </div>
          <select className="sampleFilter" value={sampleFilter} onChange={(event) => setSampleFilter(event.target.value)}>
            <option value="">Todas las muestras</option>
            {sampleOptions.map((sampleId) => <option key={sampleId} value={sampleId}>{sampleId}</option>)}
          </select>

          <div className="testTree">
            {loadingBatch ? (
              <div className="emptyState">Cargando pruebas...</div>
            ) : groupedSampleTests.length ? groupedSampleTests.map(([sampleId, tests]) => (
              <div key={sampleId} className="sampleGroup">
                <div className="sampleHeader">{sampleId}</div>
                {tests.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`testItem ${String(item.id) === String(selectedTestId) ? 'active' : ''}`}
                    onClick={() => setSelectedTestId(String(item.id))}
                  >
                    <span>
                      <strong>{item.prueba?.acronimo || item.prueba?.nombre_variable}</strong>
                      <small>{item.prueba?.nombre_variable} · {item.condicion_configurada || 'Sin condición'}</small>
                    </span>
                    <em className={getStatusClass(item.estatus)}>{item.estatus || 'pendiente'}</em>
                  </button>
                ))}
              </div>
            )) : (
              <div className="emptyState">No hay pruebas asignadas para ingresar resultados.</div>
            )}
          </div>
          {filteredSampleTests.length ? (
            <div className="listPager">
              <button type="button" onClick={() => setTestListPage((page) => Math.max(1, page - 1))} disabled={testListPage <= 1} aria-label="Página anterior">
                <ChevronLeft size={16} />
              </button>
              <span>Página {testListPage} de {totalTestPages} · {filteredSampleTests.length} pruebas</span>
              <button type="button" onClick={() => setTestListPage((page) => Math.min(totalTestPages, page + 1))} disabled={testListPage >= totalTestPages} aria-label="Página siguiente">
                <ChevronRight size={16} />
              </button>
            </div>
          ) : null}
        </aside>

        <main className="resultPanel">
          <div className="panelHeader">
            <div>
              <h2>{selectedTest?.prueba?.nombre_variable || 'Seleccione una prueba'}</h2>
              <p>
                Muestra: <strong>{selectedTest?.muestra_id || selectedTest?.muestra || '-'}</strong>
                {' · '}
                Método: <strong>{selectedTest?.metodo_configurado_info?.codigo || selectedTest?.prueba?.metodo_detalle?.codigo || '-'}</strong>
                {' · '}
                Unidad: <strong>{selectedTest?.unidad_configurada || selectedTest?.prueba?.unidad_medida || '-'}</strong>
              </p>
            </div>
            <div className="panelNavigation">
              <button type="button" onClick={() => navigateTest(-1)} disabled={selectedTestPosition <= 0} aria-label="Prueba anterior"><ChevronLeft size={17} /></button>
              <span>{selectedTestPosition >= 0 ? selectedTestPosition + 1 : 0} / {filteredSampleTests.length}</span>
              <button type="button" onClick={() => navigateTest(1)} disabled={selectedTestPosition < 0 || selectedTestPosition >= filteredSampleTests.length - 1} aria-label="Prueba siguiente"><ChevronRight size={17} /></button>
              <span className={`statusBadge ${getStatusClass(selectedTest?.estatus)}`}>{selectedTest?.estatus || '-'}</span>
            </div>
          </div>

          {loadingForm ? (
            <div className="emptyState big">Cargando formulario...</div>
          ) : formData?.fields?.length ? (
            <>
              <div className="executionGrid">
                <label>
                  <span>Equipo de medición</span>
                  <select
                    value={executionConfig.equipo_prueba}
                    onChange={(e) => updateExecutionConfig((prev) => ({ ...prev, equipo_prueba: e.target.value, metodo_equipo: '' }))}
                  >
                    <option value="">Seleccione equipo</option>
                    {equipment.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
                  </select>
                </label>
                <label>
                  <span>Método usado</span>
                  <select
                    value={executionConfig.metodo_equipo}
                    onChange={(e) => updateExecutionConfig((prev) => ({ ...prev, metodo_equipo: e.target.value }))}
                  >
                    <option value="">Seleccione método</option>
                    {filteredMethods.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}
                  </select>
                </label>
              </div>

              <div className="resultTable">
                <div className="resultRow resultHead">
                  <div>Campo</div>
                  <div>Unidad</div>
                  <div>Valor</div>
                  <div>Observación</div>
                </div>

                {formData.fields.map((field) => (
                  <div className="resultRow" key={field.key}>
                    <div>
                      <strong>{field.label}</strong>
                      <small>{field.resultado_nombre}{field.division_nombre ? ` · ${field.division_nombre}` : ''}</small>
                    </div>
                    <div>{field.unidad || '-'}</div>
                    <div>
                      {Array.isArray(field.opciones) && field.opciones.length ? (
                        <select
                          value={valueMap[field.key]?.value ?? ''}
                          onChange={(e) => updateValue(field.key, 'value', e.target.value)}
                        >
                          <option value="">Seleccione</option>
                          {field.opciones.map((option) => {
                            const value = option.value ?? option.etiqueta ?? option.label ?? option;
                            const label = option.label ?? option.etiqueta ?? option.value ?? option;
                            return <option key={`${field.key}-${value}`} value={value}>{label}</option>;
                          })}
                        </select>
                      ) : field.tipo_dato === 'booleano' ? (
                        <select
                          value={valueMap[field.key]?.value ?? ''}
                          onChange={(e) => updateValue(field.key, 'value', e.target.value)}
                        >
                          <option value="">Seleccione</option>
                          <option value="true">Verdadero</option>
                          <option value="false">Falso</option>
                        </select>
                      ) : (
                        <input
                          type={['numerico', 'decimal'].includes(field.tipo_dato) ? 'number' : 'text'}
                          step="any"
                          value={valueMap[field.key]?.value ?? ''}
                          onChange={(e) => updateValue(field.key, 'value', e.target.value)}
                          placeholder="Valor"
                        />
                      )}
                    </div>
                    <div>
                      <input
                        value={valueMap[field.key]?.observacion ?? ''}
                        onChange={(e) => updateValue(field.key, 'observacion', e.target.value)}
                        placeholder="Observación"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <label className="obsBox">
                <span>Observaciones generales</span>
                <textarea value={observaciones} onChange={(e) => updateObservations(e.target.value)} />
              </label>

              <div className="actionLine">
                <button type="button" className="btn secondary" onClick={() => saveResult({ draftOnly: true })} disabled={saving}>
                  <Save size={16} />
                  Guardar borrador
                </button>
                <button type="button" className="btn red" onClick={() => saveResult()} disabled={saving || !currentFormComplete}>
                  <ClipboardCheck size={16} />
                  Confirmar resultado
                </button>
              </div>
            </>
          ) : (
            <div className="emptyState big">Seleccione una prueba asignada para ingresar resultados.</div>
          )}
        </main>
      </section>

      <style jsx global>{`
        .resultPage {
          background: transparent;
          color: white;
          padding: 0 0 18px;
        }

        .excelLoadingOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, .78);
          backdrop-filter: blur(3px);
          cursor: wait;
          pointer-events: all;
        }

        .excelLoadingCard {
          width: min(430px, 100%);
          min-height: 210px;
          border: 1px solid rgba(255, 255, 255, .18);
          border-radius: 18px;
          background: #171717;
          box-shadow: 0 24px 70px rgba(0, 0, 0, .65);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 28px;
          text-align: center;
        }

        .excelLoadingCard strong {
          font-size: 19px;
        }

        .excelLoadingCard span {
          color: #b8b8b8;
          font-size: 14px;
        }

        .excelSpinner {
          width: 54px;
          height: 54px;
          border: 5px solid rgba(255, 255, 255, .18);
          border-top-color: #ef232a;
          border-right-color: #ef232a;
          border-radius: 50%;
          animation: excelSpin .8s linear infinite;
        }

        @keyframes excelSpin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .excelSpinner { animation-duration: 1.6s; }
        }

        .resultTop {
          min-height: 54px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .titleBlock {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .titleBlock h1 {
          margin: 0;
          font-size: 26px;
        }

        .titleBlock p {
          margin: 3px 0 0;
          color: #c7c7c7;
          font-size: 14px;
        }

        .iconBtn {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          border: 1px solid #444;
          background: #111;
          color: white;
          display: inline-grid;
          place-items: center;
          cursor: pointer;
        }

        .iconBtn.static {
          cursor: default;
        }

        .topActions,
        .actionLine {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
        }

        .excelMenu {
          position: relative;
        }

        .excelMenuPanel {
          position: absolute;
          z-index: 30;
          top: calc(100% + 6px);
          right: 0;
          width: 220px;
          padding: 5px;
          border: 1px solid #3b3d43;
          background: #17181b;
          box-shadow: 0 14px 32px rgba(0, 0, 0, .35);
        }

        .excelMenuPanel button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #f3f3f3;
          padding: 9px 10px;
          text-align: left;
          cursor: pointer;
        }

        .excelMenuPanel button:hover,
        .excelMenuPanel button:focus-visible {
          background: #292b30;
          outline: none;
        }

        .excelMenuTitle {
          display: block;
          padding: 8px 10px 5px;
          color: #fca5a5;
          font-size: 12px;
        }

        .btn {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #444;
          background: #222;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .btn.red {
          background: #ef232a;
          border-color: #ef232a;
        }

        .btn.secondary {
          background: #111;
        }

        .btn.compact {
          min-height: 34px;
          padding: 0 12px;
        }

        .btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .lotLine,
        .excelPreview,
        .leftList,
        .resultPanel {
          border: 1px solid #3a3a3a;
          background: linear-gradient(180deg, rgba(27,27,27,.96), rgba(18,18,18,.96));
          border-radius: 12px;
        }

        .lotLine {
          display: grid;
          grid-template-columns: minmax(280px, 1.4fr) repeat(6, minmax(105px, 1fr));
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          margin-bottom: 10px;
        }

        .field span,
        .lotInfo label {
          display: block;
          color: #aeb6c1;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .09em;
          margin-bottom: 6px;
        }

        .field select,
        .resultRow input,
        .resultRow select,
        .executionGrid select,
        .obsBox textarea,
        .searchBox input {
          width: 100%;
          min-height: 38px;
          border-radius: 8px;
          border: 1px solid #454545;
          background: #080808;
          color: white;
          padding: 0 10px;
          outline: none;
        }

        .lotInfo .value {
          font-size: 15px;
        }

        .lockedLot {
          min-height: 38px;
          border: 1px solid #454545;
          background: #080808;
          color: #fff;
          border-radius: 8px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          font-weight: 900;
        }

        .lockedLot.action {
          cursor: pointer;
          color: #fecaca;
          border-color: rgba(239,35,42,.45);
        }

        .lotInfo .value.strong {
          font-size: 20px;
          font-weight: 950;
        }

        .excelPreview {
          padding: 10px 14px;
          margin-bottom: 10px;
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
        }

        .excelPreview.ok {
          border-color: rgba(34,197,94,.35);
        }

        .excelPreview.bad {
          border-color: rgba(239,68,68,.45);
        }

        .excelPreview ul {
          margin: 8px 0 0;
          padding-left: 18px;
        }

        .workGrid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }

        .leftList,
        .resultPanel {
          padding: 12px;
        }

        .searchBox {
          display: flex;
          gap: 8px;
          align-items: center;
          min-height: 38px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #454545;
          background: #080808;
          margin-bottom: 10px;
        }

        .searchBox input {
          border: 0;
          background: transparent;
          padding: 0;
          min-height: 0;
        }

        .sampleFilter {
          width: 100%;
          min-height: 38px;
          margin-bottom: 10px;
          border-radius: 8px;
          border: 1px solid #454545;
          background: #080808;
          color: white;
          padding: 0 10px;
        }

        .testTree {
          display: grid;
          gap: 9px;
        }

        .listPager,
        .panelNavigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .listPager {
          margin-top: 10px;
          color: #b9bec7;
          font-size: 12px;
        }

        .listPager button,
        .panelNavigation button {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #444;
          background: #101010;
          color: white;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .listPager button:disabled,
        .panelNavigation button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .panelNavigation {
          justify-content: flex-end;
          white-space: nowrap;
        }

        .sampleGroup {
          display: grid;
          gap: 5px;
        }

        .sampleHeader {
          color: #f87171;
          font-weight: 900;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          padding: 4px 2px;
        }

        .testItem {
          width: 100%;
          border: 1px solid #333;
          background: #111;
          color: white;
          border-radius: 9px;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          text-align: left;
          cursor: pointer;
        }

        .testItem.active {
          background: rgba(239,35,42,.12);
          border-color: rgba(239,35,42,.5);
        }

        .testItem strong,
        .testItem small {
          display: block;
        }

        .testItem small {
          color: #aaa;
          margin-top: 2px;
        }

        .testItem em,
        .statusBadge {
          font-style: normal;
          border-radius: 999px;
          border: 1px solid #444;
          padding: 4px 8px;
          font-size: 12px;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .ok {
          color: #bbf7d0;
          background: rgba(34,197,94,.13);
          border-color: rgba(34,197,94,.35) !important;
        }

        .draft {
          color: #fde68a;
          background: rgba(234,179,8,.14);
          border-color: rgba(234,179,8,.35) !important;
        }

        .bad {
          color: #fecaca;
          background: rgba(239,68,68,.14);
          border-color: rgba(239,68,68,.35) !important;
        }

        .pending {
          color: #e5e7eb;
          background: rgba(107,114,128,.14);
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          padding-bottom: 10px;
          border-bottom: 1px solid #333;
          margin-bottom: 10px;
        }

        .panelHeader h2 {
          margin: 0;
          font-size: 22px;
        }

        .panelHeader p {
          margin: 4px 0 0;
          color: #c0c0c0;
        }

        .resultTable {
          border: 1px solid #333;
          border-radius: 10px;
          overflow: hidden;
          background: #111;
        }

        .executionGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #333;
          border-radius: 10px;
          background: #111;
        }

        .executionGrid label {
          display: grid;
          gap: 6px;
        }

        .executionGrid span {
          color: #cfcfcf;
          font-weight: 800;
          font-size: 13px;
        }

        .resultRow {
          display: grid;
          grid-template-columns: minmax(220px, 1.4fr) 100px minmax(140px, .8fr) minmax(180px, 1fr);
          border-top: 1px solid #333;
          align-items: center;
        }

        .resultRow:first-child {
          border-top: 0;
        }

        .resultHead {
          background: #242424;
          color: #bdbdbd;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .resultRow > div {
          padding: 9px 10px;
          min-width: 0;
        }

        .resultRow strong,
        .resultRow small {
          display: block;
        }

        .resultRow small {
          color: #aaa;
          margin-top: 2px;
        }

        .resultRow input {
          min-height: 36px;
        }

        .obsBox {
          display: grid;
          gap: 6px;
          margin-top: 10px;
        }

        .obsBox span {
          color: #cfcfcf;
          font-weight: 800;
        }

        .obsBox textarea {
          min-height: 76px;
          padding: 10px;
          resize: vertical;
        }

        .actionLine {
          justify-content: flex-end;
          margin-top: 10px;
        }

        .emptyState {
          min-height: 110px;
          display: grid;
          place-items: center;
          text-align: center;
          color: #a3a3a3;
        }

        .emptyState.big {
          min-height: 320px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1250px) {
          .lotLine {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .workGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 800px) {
          .resultTop {
            flex-direction: column;
            align-items: flex-start;
          }

          .lotLine,
          .resultRow {
            grid-template-columns: 1fr;
          }

          .resultRow {
            padding: 8px;
            gap: 8px;
          }

          .resultRow > div {
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

const LotInfo = ({ label, value, strong = false }) => (
  <div className="lotInfo">
    <label>{label}</label>
    <div className={`value ${strong ? 'strong' : ''}`}>{value}</div>
  </div>
);
