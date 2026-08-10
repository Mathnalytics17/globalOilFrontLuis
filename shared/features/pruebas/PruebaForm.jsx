import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Copy,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { testsService } from '@features/technical-config/infrastructure/testsService';
import apiClient from '@infrastructure/api/apiClient';
import { getApiErrorMessage } from "./apiErrors";
import {
  buildPruebaPayload,
  emptyResultado,
  getDivisionPreview,
  makeTempId,
  normalizePruebaForForm,
} from "./pruebaPayloadUtils";

const initialForm = {
  nombre_variable: "",
  condicion: "",
  condicion_catalogo: "",
  acronimo: "",
  unidad_medida: "",
  unidad_catalogo: "",
  activo: true,
  submetodos_tecnicos: [],
  resultados: [emptyResultado(1)],
};

const commonSeparators = ["/", "-", "+", "@", ":", "|"];

const PruebaForm = ({ mode = "create", id }) => {
  const router = useRouter();
  const [units, setUnits] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [scales, setScales] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openResult, setOpenResult] = useState(0);
  const [dragItem, setDragItem] = useState(null);
  const [catalogModal, setCatalogModal] = useState(null);
  const [unitForm, setUnitForm] = useState({ nombre: "", simbolo: "", magnitud: "" });
  const [conditionForm, setConditionForm] = useState({ nombre: "", magnitud: "temperatura", valor: "", unidad: "" });

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const init = async () => {
    setLoading(true);
    setError("");
    try {
      const [unitsResponse, conditionsResponse, scalesResponse, prueba] = await Promise.all([
        apiClient.get("/technical-catalogs/units/", { params: { activo: "true" } }),
        apiClient.get("/technical-catalogs/conditions/", { params: { activo: "true" } }),
        apiClient.get("/technical-config/comparison-scales/", { params: { activo: "true" } }).catch(() => ({ data: [] })),
        mode === "edit" && id ? testsService.getById(id) : Promise.resolve(null),
      ]);
      setUnits(Array.isArray(unitsResponse.data) ? unitsResponse.data : unitsResponse.data?.results || []);
      setConditions(Array.isArray(conditionsResponse.data) ? conditionsResponse.data : conditionsResponse.data?.results || []);
      setScales(Array.isArray(scalesResponse.data) ? scalesResponse.data : scalesResponse.data?.results || []);

      if (prueba) {
        const normalized = normalizePruebaForForm(prueba);
        setForm({
          ...initialForm,
          ...normalized,
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo cargar el catálogo técnico."));
    } finally {
      setLoading(false);
    }
  };

  const unitLabel = (unit) => [unit.simbolo, unit.nombre].filter(Boolean).join(" · ");
  const conditionLabel = (condition) => {
    const unit = condition.unidad_info?.simbolo || "";
    const value = condition.valor !== undefined && condition.valor !== null ? String(condition.valor).replace(/\.?0+$/, "") : "";
    return [condition.nombre, value || unit ? `(${[value, unit].filter(Boolean).join(" ")})` : ""].filter(Boolean).join(" ");
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const createUnit = async () => {
    if (!unitForm.nombre.trim() || !unitForm.simbolo.trim()) return setError("Nombre y símbolo son obligatorios.");
    try {
      const response = await apiClient.post("/technical-catalogs/units/", { ...unitForm, activo: true });
      setUnits((current) => [...current, response.data]);
      setUnitForm({ nombre: "", simbolo: "", magnitud: "" });
      setCatalogModal(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo crear la unidad."));
    }
  };

  const createCondition = async () => {
    if (!conditionForm.nombre.trim() || !conditionForm.valor || !conditionForm.unidad) return setError("Complete nombre, valor y unidad.");
    try {
      const response = await apiClient.post("/technical-catalogs/conditions/", { ...conditionForm, activo: true });
      setConditions((current) => [...current, response.data]);
      setField("condicion_catalogo", response.data.id);
      setConditionForm({ nombre: "", magnitud: "temperatura", valor: "", unidad: "" });
      setCatalogModal(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo crear la condición."));
    }
  };
  const setResults = (updater) =>
    setForm((prev) => ({ ...prev, resultados: typeof updater === "function" ? updater(prev.resultados) : updater }));

  const updateResult = (resultIndex, patch) => {
    setResults((list) => list.map((result, index) => (index === resultIndex ? { ...result, ...patch } : result)));
  };

  const updateDivision = (resultIndex, divisionIndex, patch) => {
    const result = form.resultados[resultIndex];
    if (!result) return;
    updateResult(resultIndex, {
      divisiones: result.divisiones.map((division, index) =>
        index === divisionIndex ? { ...division, ...patch } : division
      ),
    });
  };

  const addResult = () => {
    setResults((list) => [...list, emptyResultado(list.length + 1)]);
    setOpenResult(form.resultados.length);
  };

  const duplicateResult = (resultIndex) => {
    const source = form.resultados[resultIndex];
    if (!source) return;
    const copy = JSON.parse(JSON.stringify(source));
    copy.localId = makeTempId("res");
    copy.temp_id = makeTempId("res_tmp");
    copy.nombre = `${copy.nombre || "Resultado"} copia`;
    copy.divisiones = (copy.divisiones || []).map((division) => {
      const componentIdMap = new Map();
      const separatorIdMap = new Map();
      const componentes = (division.componentes || []).map((component) => {
        const nextId = makeTempId("cmp");
        componentIdMap.set(String(component.temp_id || component.localId), nextId);
        return { ...component, localId: nextId, temp_id: nextId, originalId: null };
      });
      const separadores = (division.separadores || []).map((separator) => {
        const nextId = makeTempId("sep");
        separatorIdMap.set(String(separator.temp_id || separator.localId), nextId);
        return { ...separator, localId: nextId, temp_id: nextId, originalId: null };
      });
      const disposiciones = (division.disposiciones || []).map((disposition) => {
        const nextId = makeTempId("disp");
        return {
          ...disposition,
          localId: nextId,
          temp_id: nextId,
          items: (disposition.items || []).map((item, itemIndex) => ({
            ...item,
            componente: item.tipo === "componente"
              ? componentIdMap.get(String(item.componente)) || null
              : null,
            separador: item.tipo === "separador"
              ? separatorIdMap.get(String(item.separador)) || null
              : null,
            orden: itemIndex + 1,
          })).filter((item) => (item.tipo === "componente" ? item.componente : item.separador)),
        };
      });
      const divisionId = makeTempId("div");
      return {
        ...division,
        localId: divisionId,
        temp_id: divisionId,
        componentes,
        separadores,
        disposiciones,
      };
    });
    setResults((list) => [...list, copy]);
    setOpenResult(form.resultados.length);
  };

  const removeResult = (resultIndex) => {
    if (form.resultados.length === 1) return setError("Debe existir al menos un resultado.");
    setResults((list) => list.filter((_, index) => index !== resultIndex));
    setOpenResult(0);
  };

  const addComponent = (resultIndex, divisionIndex) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    const id = makeTempId("cmp");
    const components = division.componentes || [];
    updateDivision(resultIndex, divisionIndex, {
      componentes: [
        ...components,
        {
          localId: id,
          temp_id: id,
          nombre: "",
          acronimo: "",
          unidad_medida: "",
          unidad_catalogo: "",
          tipo_dato: "numerico",
          escala_comparacion: "",
          opciones_resultado: null,
          etiqueta_verdadero: "Sí",
          etiqueta_falso: "No",
          requiere_valor: true,
          permite_observacion: true,
          orden: components.length + 1,
          activo: true,
        },
      ],
    });
  };

  const updateComponent = (resultIndex, divisionIndex, componentId, patch) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    updateDivision(resultIndex, divisionIndex, {
      componentes: division.componentes.map((component) =>
        component.temp_id === componentId ? { ...component, ...patch } : component
      ),
    });
  };

  const removeComponent = (resultIndex, divisionIndex, componentId) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    updateDivision(resultIndex, divisionIndex, {
      componentes: division.componentes.filter((component) => component.temp_id !== componentId),
      disposiciones: division.disposiciones.map((disposition) => ({
        ...disposition,
        items: disposition.items.filter((item) => !(item.tipo === "componente" && item.componente === componentId)),
      })),
    });
  };

  const addSeparator = (resultIndex, divisionIndex, symbol = "/") => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    const id = makeTempId("sep");
    const separators = division.separadores || [];
    updateDivision(resultIndex, divisionIndex, {
      separadores: [...separators, { localId: id, temp_id: id, simbolo: symbol, orden: separators.length + 1, activo: true }],
    });
  };

  const updateSeparator = (resultIndex, divisionIndex, separatorId, patch) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    updateDivision(resultIndex, divisionIndex, {
      separadores: division.separadores.map((separator) =>
        separator.temp_id === separatorId ? { ...separator, ...patch } : separator
      ),
    });
  };

  const removeSeparator = (resultIndex, divisionIndex, separatorId) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    updateDivision(resultIndex, divisionIndex, {
      separadores: division.separadores.filter((separator) => separator.temp_id !== separatorId),
      disposiciones: division.disposiciones.map((disposition) => ({
        ...disposition,
        items: disposition.items.filter((item) => !(item.tipo === "separador" && item.separador === separatorId)),
      })),
    });
  };

  const ensureMainDisposition = (division) => {
    if (division?.disposiciones?.length) return division.disposiciones;
    return [{ localId: makeTempId("disp"), temp_id: makeTempId("disp"), nombre: "Disposición principal", orden: 1, activo: true, items: [] }];
  };

  const addToDisposition = (resultIndex, divisionIndex, item) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    const dispositions = ensureMainDisposition(division);
    const next = dispositions.map((disp, index) =>
      index === 0 ? { ...disp, items: [...(disp.items || []), { ...item, orden: (disp.items || []).length + 1 }] } : disp
    );
    updateDivision(resultIndex, divisionIndex, { disposiciones: next });
  };

  const removeDispositionItem = (resultIndex, divisionIndex, itemIndex) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    const next = ensureMainDisposition(division).map((disp, index) =>
      index === 0 ? { ...disp, items: disp.items.filter((_, current) => current !== itemIndex) } : disp
    );
    updateDivision(resultIndex, divisionIndex, { disposiciones: next });
  };

  const reorderDisposition = (resultIndex, divisionIndex, from, to) => {
    if (from === to || from == null || to == null) return;
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return;
    const dispositions = ensureMainDisposition(division);
    const items = [...(dispositions[0]?.items || [])];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    updateDivision(resultIndex, divisionIndex, {
      disposiciones: dispositions.map((disp, index) => (index === 0 ? { ...disp, items } : disp)),
    });
  };

  const validate = () => {
    if (!form.nombre_variable.trim()) return "El nombre variable es obligatorio.";
    if (!form.acronimo.trim()) return "El acronimo es obligatorio.";
    for (const result of form.resultados) {
      if (!result.nombre.trim()) return "Todos los resultados deben tener nombre.";
      const divisions = result.divisiones || [];
      if (!divisions.length) return `El resultado ${result.nombre || "principal"} debe tener una estructura.`;
      for (const division of divisions) {
        if (!division?.componentes?.length) return `El resultado ${result.nombre || "principal"} debe tener al menos un campo en cada seccion.`;
        if (division.componentes.some((component) => !component.nombre.trim())) return "Todos los campos deben tener nombre.";
        const scaleWithoutCatalog = division.componentes.find((component) => component.tipo_dato === "escala" && !component.escala_comparacion);
        if (scaleWithoutCatalog) return `El campo ${scaleWithoutCatalog.nombre || "sin nombre"} es de tipo escala y debe tener una escala seleccionada.`;
      }
    }
    return null;
  };

  const save = async () => {
    setError("");
    setSuccess("");
    const validationError = validate();
    if (validationError) return setError(validationError);

    setSaving(true);
    try {
      const payload = buildPruebaPayload(form);
      if (mode === "edit") await testsService.update(id, payload);
      else await testsService.create(payload);
      setSuccess("Prueba guardada correctamente.");
      setTimeout(() => router.push("/configuracion-tecnica/pruebas"), 500);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo guardar la prueba."));
    } finally {
      setSaving(false);
    }
  };

  const renderDispositionToken = (resultIndex, divisionIndex, item, itemIndex) => {
    const division = form.resultados[resultIndex]?.divisiones?.[divisionIndex];
    if (!division) return null;
    const source = item.tipo === "componente"
      ? division.componentes.find((component) => component.temp_id === item.componente)
      : division.separadores.find((separator) => separator.temp_id === item.separador);
    const label = item.tipo === "componente" ? source?.acronimo || source?.nombre || "?" : source?.simbolo || "?";

    return (
      <span
        key={`${item.tipo}-${itemIndex}`}
        className={`token ${item.tipo}`}
        draggable
        onDragStart={() => setDragItem(itemIndex)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => reorderDisposition(resultIndex, divisionIndex, dragItem, itemIndex)}
      >
        <GripVertical size={13} />
        {label}
        <button type="button" onClick={() => removeDispositionItem(resultIndex, divisionIndex, itemIndex)}><X size={13} /></button>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="go-page">
        <div className="go-shell"><div className="empty-state">Cargando catálogo técnico...</div></div>
        <style jsx global>{styles}</style>
      </div>
    );
  }

  return (
    <div className="go-page">
      <div className="go-shell">
        <div className="topbar-form">
          <button className="back-link" type="button" onClick={() => router.push("/configuracion-tecnica/pruebas")}><ArrowLeft size={18} /> Volver</button>
          <button className="save-button" type="button" onClick={save} disabled={saving}><Save size={18} /> {saving ? "Guardando..." : "Guardar prueba"}</button>
        </div>

        <header className="hero-form">
          <p>CATÁLOGO DE PRUEBAS</p>
          <h1>{mode === "edit" ? "Editar prueba" : "Crear prueba"}</h1>
          <span>Define la prueba y su estructura de resultados. El equipo y el metodo se seleccionan al ingresar resultados.</span>
        </header>

        {error && <div className="toast error"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}
        {success && <div className="toast success"><CheckCircle size={18} /><span>{success}</span></div>}

        <section className="card info-card">
          <div className="card-head">
            <div><h2>Información de la prueba</h2><p>Campos básicos y selección técnica.</p></div>
          </div>

          <div className="field-grid">
            <label>Nombre variable *<input value={form.nombre_variable} onChange={(event) => setField("nombre_variable", event.target.value)} placeholder="Ej: Espuma" /></label>
            <label>Acrónimo *<input value={form.acronimo} onChange={(event) => setField("acronimo", event.target.value)} placeholder="Ej: ESP" /></label>
            <label>Condición
              <select value={form.condicion_catalogo || ""} onChange={(event) => setField("condicion_catalogo", event.target.value)}>
                <option value="">Sin condición</option>
                {conditions.map((condition) => <option key={condition.id} value={condition.id}>{conditionLabel(condition)}</option>)}
              </select>
              <button className="inline-create" type="button" onClick={() => setCatalogModal("condition")}><Plus size={14} /> Crear condición</button>
            </label>
          </div>
        </section>

        <section className="card results-card">
          <div className="card-head result-head">
            <div><h2>Resultados de la prueba</h2><p>Defina cada resultado y los campos que se capturan en laboratorio.</p></div>
            <div className="result-head-actions">
              <button className="add-button" type="button" onClick={addResult}><Plus size={16} /> Agregar resultado</button>
            </div>
          </div>

          <div className="results-stack">
            {form.resultados.map((result, resultIndex) => (
              <article key={result.localId} className={`result-panel ${openResult === resultIndex ? "open" : ""}`}>
                <button type="button" className="result-summary" onClick={() => setOpenResult(openResult === resultIndex ? -1 : resultIndex)}>
                  <div><span>Resultado {resultIndex + 1}</span><strong>{result.nombre || "Sin nombre"}</strong></div>
                  <small>{(result.divisiones || []).reduce((total, division) => total + (division.componentes || []).length, 0)} campo(s)</small>
                </button>

                {openResult === resultIndex && (
                  <div className="result-body">
                    <div className="result-fields">
                      <label>Nombre del resultado<input value={result.nombre} onChange={(event) => updateResult(resultIndex, { nombre: event.target.value })} placeholder="Ej: Espuma" /></label>
                      <label>Acrónimo<input value={result.acronimo || ""} onChange={(event) => updateResult(resultIndex, { acronimo: event.target.value })} placeholder="Opcional" /></label>
                      <label>Unidad del resultado
                        <div className="unit-result-control">
                          <select value={result.unidad_catalogo || ""} onChange={(event) => {
                            const unit = units.find((item) => String(item.id) === String(event.target.value));
                            updateResult(resultIndex, { unidad_catalogo: event.target.value, unidad_medida: unit?.simbolo || "" });
                          }}>
                            <option value="">Sin unidad</option>
                            {units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}
                          </select>
                          <button type="button" className="only-icon" title="Crear unidad" aria-label="Crear unidad" onClick={() => setCatalogModal("unit")}><Plus size={16} /></button>
                        </div>
                      </label>
                      <div className="inline-actions">
                        <button type="button" onClick={() => duplicateResult(resultIndex)}><Copy size={15} /> Duplicar</button>
                        <button type="button" className="danger" onClick={() => removeResult(resultIndex)}><Trash2 size={15} /> Eliminar</button>
                      </div>
                    </div>

                    <div className="division-list-pro">
                      {(result.divisiones || []).map((division, divisionIndex) => (
                        <div key={division.localId} className="division-panel simple-mode">
                          {(result.divisiones || []).length > 1 && (
                            <div className="division-top">
                              <div className="division-title">
                                <span>Seccion {divisionIndex + 1}</span>
                                <strong>{division.nombre || `Seccion ${divisionIndex + 1}`}</strong>
                              </div>
                            </div>
                          )}

                          <div className="edit-grid">
                            <div className="left-editor">
                              <div className="mini-row"><h3>Campos del resultado</h3><button type="button" onClick={() => addComponent(resultIndex, divisionIndex)}><Plus size={14} /> Agregar campo</button></div>
                              <div className="component-stack">
                                {(division.componentes || []).map((component, componentIndex) => (
                                  <div key={component.temp_id} className="component-line">
                                    <span>{componentIndex + 1}</span>
                                    <input value={component.nombre} onChange={(event) => updateComponent(resultIndex, divisionIndex, component.temp_id, { nombre: event.target.value })} placeholder="Nombre" />
                                    <input value={component.acronimo || ""} onChange={(event) => updateComponent(resultIndex, divisionIndex, component.temp_id, { acronimo: event.target.value })} placeholder="Acronimo" />
                                    <select value={component.tipo_dato || "numerico"} onChange={(event) => updateComponent(resultIndex, divisionIndex, component.temp_id, { tipo_dato: event.target.value, escala_comparacion: "" })}>
                                      <option value="numerico">Numérico</option>
                                      <option value="booleano">Booleano</option>
                                      <option value="escala">Escala</option>
                                      <option value="comentario">Comentario</option>
                                    </select>
                                    {component.tipo_dato === "comentario" && <span className="field-note">Texto subjetivo</span>}
                                    {component.tipo_dato === "booleano" && (
                                      <div className="boolean-labels">
                                        <input value={component.etiqueta_verdadero || ""} onChange={(event) => updateComponent(resultIndex, divisionIndex, component.temp_id, { etiqueta_verdadero: event.target.value })} placeholder="Etiqueta verdadero" />
                                        <input value={component.etiqueta_falso || ""} onChange={(event) => updateComponent(resultIndex, divisionIndex, component.temp_id, { etiqueta_falso: event.target.value })} placeholder="Etiqueta falso" />
                                      </div>
                                    )}
                                    {component.tipo_dato === "escala" && (
                                      <select value={component.escala_comparacion || ""} onChange={(event) => updateComponent(resultIndex, divisionIndex, component.temp_id, { escala_comparacion: event.target.value })}>
                                        <option value="">Seleccione escala</option>
                                        {scales.map((scale) => <option key={scale.id} value={scale.id}>{scale.nombre}</option>)}
                                      </select>
                                    )}
                                    <button type="button" onClick={() => addToDisposition(resultIndex, divisionIndex, { tipo: "componente", componente: component.temp_id })}>Usar</button>
                                    <button type="button" className="only-icon danger" onClick={() => removeComponent(resultIndex, divisionIndex, component.temp_id)}><Trash2 size={14} /></button>
                                  </div>
                                ))}
                              </div>

                              <div className="separators-zone">
                                <div className="mini-row"><h3>Separadores</h3><small>Uselos cuando el resultado tenga varios valores, por ejemplo 4um / 6um / 14um.</small></div>
                                <div className="quick-seps">{commonSeparators.map((symbol) => <button key={symbol} type="button" onClick={() => addSeparator(resultIndex, divisionIndex, symbol)}>{symbol}</button>)}</div>
                                <div className="separator-stack">
                                  {(division.separadores || []).map((separator) => (
                                    <div key={separator.temp_id} className="separator-line">
                                      <input value={separator.simbolo} onChange={(event) => updateSeparator(resultIndex, divisionIndex, separator.temp_id, { simbolo: event.target.value })}/>
                                      <button type="button" onClick={() => addToDisposition(resultIndex, divisionIndex, { tipo: "separador", separador: separator.temp_id })}>Usar</button>
                                      <button type="button" className="only-icon danger" onClick={() => removeSeparator(resultIndex, divisionIndex, separator.temp_id)}><Trash2 size={14}/></button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="right-preview">
                              <h3>Disposición</h3>
                              <p>Ordena los elementos arrastrando las fichas.</p>
                              <div className="dropbox">
                                {(ensureMainDisposition(division)[0]?.items || []).length ? ensureMainDisposition(division)[0].items.map((item, itemIndex) => renderDispositionToken(resultIndex, divisionIndex, item, itemIndex)) : <span className="empty-disposition">Sin elementos</span>}
                              </div>
                              <div className="preview-box"><span>Vista previa</span><strong>{getDivisionPreview(division)}</strong></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {catalogModal ? (
          <div className="catalog-modal-backdrop" role="presentation" onMouseDown={() => setCatalogModal(null)}>
            <section className="catalog-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
              <div className="catalog-modal-head"><h2>{catalogModal === "unit" ? "Nueva unidad" : "Nueva condición"}</h2><button type="button" onClick={() => setCatalogModal(null)}><X size={20} /></button></div>
              {catalogModal === "unit" ? (
                <div className="modal-fields">
                  <label>Nombre *<input value={unitForm.nombre} onChange={(event) => setUnitForm({ ...unitForm, nombre: event.target.value })} /></label>
                  <label>Símbolo *<input value={unitForm.simbolo} onChange={(event) => setUnitForm({ ...unitForm, simbolo: event.target.value })} /></label>
                  <label>Magnitud<input value={unitForm.magnitud} onChange={(event) => setUnitForm({ ...unitForm, magnitud: event.target.value })} placeholder="Ej: volumen" /></label>
                  <button className="save-button" type="button" onClick={createUnit}>Crear unidad</button>
                </div>
              ) : (
                <div className="modal-fields">
                  <label>Nombre *<input value={conditionForm.nombre} onChange={(event) => setConditionForm({ ...conditionForm, nombre: event.target.value })} /></label>
                  <label>Valor *<input type="number" value={conditionForm.valor} onChange={(event) => setConditionForm({ ...conditionForm, valor: event.target.value })} /></label>
                  <label>Unidad *<select value={conditionForm.unidad} onChange={(event) => setConditionForm({ ...conditionForm, unidad: event.target.value })}><option value="">Seleccione</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}</select></label>
                  <button className="save-button" type="button" onClick={createCondition}>Crear condición</button>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
      <style jsx global>{styles}</style>
    </div>
  );
};

const styles = `
.go-page{min-height:100vh;background:#08090c;color:#fff;padding:30px 22px 70px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.go-shell{width:min(1360px,100%);margin:0 auto}.topbar-form{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:22px}.back-link{display:inline-flex;align-items:center;gap:9px;background:transparent;border:0;color:#cbd5e1;font-size:16px;cursor:pointer}.save-button,.add-button,.division-add{border:0;border-radius:14px;background:#ef2b2d;color:#fff;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer}.save-button{padding:15px 24px;font-size:16px;box-shadow:0 20px 42px rgba(239,43,45,.22)}.save-button:disabled{opacity:.65;cursor:not-allowed}.hero-form{margin-bottom:24px}.hero-form p{margin:0 0 8px;color:#ff4d4f;font-weight:950;letter-spacing:.22em;font-size:13px}.hero-form h1{margin:0;font-size:42px;line-height:1.05}.hero-form span{display:block;margin-top:10px;color:#aeb7c7;font-size:17px}.card{border:1px solid #30323b;background:linear-gradient(180deg,#18191f,#111217);border-radius:24px;padding:26px;box-shadow:0 22px 60px rgba(0,0,0,.28);margin-bottom:22px}.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:20px}.card-head h2{margin:0;font-size:25px}.card-head p{margin:6px 0 0;color:#9aa4b5}.field-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:22px}label{display:flex;flex-direction:column;gap:8px;color:#dce1ea;font-weight:850;font-size:14px}input{width:100%;box-sizing:border-box;border:1px solid #363944;background:#0d0e12;color:#fff;border-radius:14px;padding:13px 15px;font:inherit;outline:none;min-height:48px}input:focus{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.13)}.selector-layout{display:grid;grid-template-columns:1fr 1fr;gap:18px}.selector-block{border:1px solid #30323b;background:#101116;border-radius:20px;padding:18px}.mini-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.mini-title strong{font-size:17px}.mini-title small{color:#9aa4b5;text-align:right}.choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.choice-card{position:relative;text-align:left;border:1px solid #343743;background:#171820;color:#fff;border-radius:16px;padding:14px 40px 14px 14px;min-height:92px;cursor:pointer;transition:.15s}.choice-card:hover{border-color:#ef4444;transform:translateY(-1px)}.choice-card.active{background:#32171b;border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.12)}.choice-card span{display:block;color:#aeb7c7;font-size:12px;margin-bottom:8px}.choice-card strong{display:block;font-size:15px;line-height:1.25}.choice-card small{display:block;color:#9aa4b5;margin-top:8px}.choice-card svg{position:absolute;right:14px;top:14px;color:#ff4d4f}.empty-note{border:1px dashed #41444f;border-radius:16px;color:#9aa4b5;padding:24px;text-align:center}.submethods-panel{border:1px solid #30323b;background:#101116;border-radius:20px;padding:18px;margin-top:18px}.pill-grid{display:flex;flex-wrap:wrap;gap:10px}.pill{border:1px solid #353844;background:#171820;color:#dce1ea;border-radius:999px;padding:10px 14px;font-weight:850;display:inline-flex;align-items:center;gap:7px;cursor:pointer}.pill.active{background:#ef2b2d;border-color:#ef2b2d;color:#fff}.result-head{align-items:center}.add-button{padding:12px 16px}.results-stack{display:flex;flex-direction:column;gap:14px}.result-panel{border:1px solid #30323b;background:#101116;border-radius:20px;overflow:hidden}.result-summary{width:100%;border:0;background:#171820;color:#fff;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;text-align:left;cursor:pointer}.result-summary span{display:block;color:#ff4d4f;font-size:12px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.result-summary strong{display:block;margin-top:4px;font-size:20px}.result-summary small{color:#9aa4b5}.result-body{padding:18px}.result-fields{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;margin-bottom:18px}.inline-actions{display:flex;gap:8px}.inline-actions button,.icon-text,.component-line button,.separator-line button{border:1px solid #383b46;background:#22242c;color:#fff;border-radius:12px;padding:10px 12px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-weight:850}.danger{color:#fecaca!important;background:#2a1418!important;border-color:#7f1d1d!important}.division-list-pro{display:flex;flex-direction:column;gap:14px}.division-panel{border:1px solid #31343f;background:#14151b;border-radius:18px;padding:16px}.division-top{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:12px}.division-title span{display:block;color:#9aa4b5;font-size:12px}.division-title strong{font-size:18px}.division-actions{display:flex;align-items:center;gap:10px}.tiny-check{flex-direction:row;align-items:center;color:#cbd5e1}.tiny-check input{width:auto;min-height:auto}.division-name{margin-bottom:14px}.edit-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px}.left-editor,.right-preview{border:1px solid #30323b;background:#0d0e12;border-radius:16px;padding:14px}.mini-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.mini-row h3,.right-preview h3{margin:0;font-size:16px}.mini-row button{border:1px solid #383b46;background:#22242c;color:#fff;border-radius:11px;padding:8px 10px;display:inline-flex;gap:6px;align-items:center;cursor:pointer}.mini-row small{color:#9aa4b5}.component-stack{display:flex;flex-direction:column;gap:9px}.component-line{display:grid;grid-template-columns:30px minmax(150px,1fr) minmax(100px,.7fr) minmax(120px,.65fr) minmax(140px,.8fr) auto auto;gap:8px;align-items:center}.component-line span{color:#9aa4b5;text-align:center}.only-icon{padding:10px!important}.separators-zone{border-top:1px solid #292c35;margin-top:16px;padding-top:14px}.quick-seps{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.quick-seps button{width:42px;height:38px;border:1px solid #383b46;background:#22242c;color:#fff;border-radius:10px;cursor:pointer;font-weight:950}.separator-stack{display:flex;flex-direction:column;gap:8px}.separator-line{display:grid;grid-template-columns:80px auto auto;gap:8px}.right-preview p{color:#9aa4b5;margin:6px 0 12px}.dropbox{border:1px dashed #4b5563;background:#090a0d;border-radius:14px;min-height:84px;padding:12px;display:flex;flex-wrap:wrap;gap:9px;align-content:flex-start}.empty-disposition{width:100%;display:grid;place-items:center;color:#7d8797;min-height:58px}.token{display:inline-flex;align-items:center;gap:7px;border-radius:11px;padding:9px 10px;font-weight:950;cursor:grab}.token.componente{background:#f4f4f5;color:#111827}.token.separador{background:#292b33;color:#fff;border:1px solid #3b3e49}.token button{background:transparent;border:0;color:inherit;display:flex;cursor:pointer;padding:0}.preview-box{margin-top:12px;border:1px solid #30323b;background:#15161c;border-radius:14px;padding:14px}.preview-box span{display:block;color:#9aa4b5;font-size:12px;margin-bottom:6px}.preview-box strong{font-size:22px;word-break:break-word}.division-add{margin-top:14px;width:100%;padding:13px 14px;background:#22242c;border:1px dashed #565b68}.toast{border-radius:15px;padding:14px 16px;display:flex;align-items:center;gap:10px;margin-bottom:16px;font-weight:850}.toast button{margin-left:auto;background:transparent;border:0;color:inherit;display:flex;cursor:pointer}.toast.error{background:#3b1418;border:1px solid #7f1d1d;color:#fecaca}.toast.success{background:#052e1a;border:1px solid #166534;color:#bbf7d0}.empty-state{border:1px solid #30323b;background:#15161c;border-radius:20px;padding:28px;color:#cbd5e1}@media(max-width:1180px){.field-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.selector-layout,.edit-grid{grid-template-columns:1fr}.right-preview{order:-1}.choice-grid{grid-template-columns:1fr}.result-fields{grid-template-columns:1fr 1fr}.inline-actions{grid-column:1/-1}}@media(max-width:720px){.go-page{padding:18px 12px 50px}.topbar-form{flex-direction:column;align-items:stretch}.save-button{width:100%}.hero-form h1{font-size:34px}.card{padding:16px;border-radius:18px}.field-grid,.result-fields{grid-template-columns:1fr}.card-head,.division-top{flex-direction:column;align-items:stretch}.component-line{grid-template-columns:1fr 1fr}.component-line span{display:none}.separator-line{grid-template-columns:1fr}.division-actions{flex-wrap:wrap}.result-summary{align-items:flex-start;gap:10px}.selector-block{padding:14px}}
select{width:100%;box-sizing:border-box;border:1px solid #363944;background:#0d0e12;color:#fff;border-radius:14px;padding:13px 15px;font:inherit;outline:none;min-height:48px}select:focus{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.13)}
.inline-create{border:0;background:transparent;color:#ff6264;display:inline-flex;align-items:center;gap:6px;font-weight:800;cursor:pointer;padding:2px 0}.unit-result-control{display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:8px;align-items:center}.unit-result-control .only-icon{height:42px}.unit-explanation{border:1px solid #30323b;background:#101116;border-radius:14px;padding:13px 15px;display:flex;flex-direction:column;gap:5px}.unit-explanation span,.field-note{color:#9aa4b5;font-size:12px}.boolean-labels{display:grid;grid-template-columns:1fr 1fr;gap:6px}.catalog-modal-backdrop{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:18px}.catalog-modal{width:min(520px,100%);background:#17181d;border:1px solid #3a3d47;border-radius:18px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.55)}.catalog-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.catalog-modal-head h2{margin:0}.catalog-modal-head button{border:0;background:transparent;color:#fff;cursor:pointer}.modal-fields{display:grid;gap:14px}.modal-fields .save-button{margin-top:6px}.component-line{grid-template-columns:30px minmax(140px,1fr) minmax(90px,.55fr) 125px minmax(130px,.8fr) auto auto}.component-line>*{min-width:0}
`;

export default PruebaForm;
