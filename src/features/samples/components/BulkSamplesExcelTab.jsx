import React, { useMemo, useRef, useState } from "react";
import { Download, UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle, Table2, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";

import { sampleBatchExcelService } from "@features/samples/infrastructure/sampleBatchExcelService";

const MAX_EXCEL_SIZE_BYTES = 10 * 1024 * 1024;
const PREVIEW_ROW_LIMIT = 300;

const toSelectValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const isUnknownValue = (value) =>
  ['desconocido', 'desconocida', 'n/a', 'na', 'no aplica', 'sin dato'].includes(normalizeText(value));

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["si", "sí", "true", "1", "x", "desconocido", "desconocida"].includes(normalizeText(value));
  return Boolean(value);
};

const normalizeImportedMuestra = (row) => {
  const data = row.data || {};
  const tipoMuestra = data.tipo_muestra || data.tipo || data.tipo_producto || 'aceite';
  const isGrasa = normalizeText(tipoMuestra) === 'grasa';
  const aditivoRaw = data.aditivo ?? data.aditivo_id ?? data.grasa_aditivo ?? data.grasa_aditivo_id ?? data.campos_adicionales?.aditivo ?? '';
  const espesanteRaw = data.espesante ?? data.espesante_id ?? data.grasa_espesante ?? data.grasa_espesante_id ?? data.campos_adicionales?.espesante ?? '';

  return {
    ...data,
    tempId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    fecha_toma: typeof data.fecha_toma === "string" ? data.fecha_toma.slice(0, 16) : data.fecha_toma || "",
    tipo_muestra: isGrasa ? "grasa" : "aceite",
    condicion: data.condicion || "usada",
    referencia_equipo: toSelectValue(data.referencia_equipo),
    equipo_placa: data.equipo_placa || data.placa_manual || data.placa || "",
    periodo_servicio_aceite: data.periodo_servicio_aceite ?? data.periodo_aceite ?? "",
    unidad_periodo_aceite: data.unidad_periodo_aceite || data.unidad_aceite || "horas",
    periodo_servicio_equipo: data.periodo_servicio_equipo ?? data.periodo_equipo ?? "",
    unidad_periodo_equipo: data.unidad_periodo_equipo || data.unidad_equipo || "horas",
    fabricante: data.fabricante || data.campos_adicionales?.fabricante || "",
    referencia_marca: data.referencia_marca || data.referencia || data.marca || "",
    observaciones: data.observaciones || data.observacion || "",
    grado_viscosidad: data.grado_viscosidad || data.grado_viscosidad_id || "",
    grado_viscosidad_desconocido: toBoolean(data.grado_viscosidad_desconocido),
    nivel_desempeno: data.nivel_desempeno || data.nivel_desempeno_id || "",
    nivel_desempeno_desconocido: toBoolean(data.nivel_desempeno_desconocido),
    uso: data.uso || data.uso_id || "",
    uso_desconocido: toBoolean(data.uso_desconocido),
    nlgi: data.nlgi || data.nlgi_id || "",
    nlgi_desconocido: toBoolean(data.nlgi_desconocido),
    aditivo: isUnknownValue(aditivoRaw) ? "" : aditivoRaw || "",
    aditivo_desconocido: isGrasa && (!aditivoRaw || isUnknownValue(aditivoRaw) || toBoolean(data.aditivo_desconocido)),
    espesante: isUnknownValue(espesanteRaw) ? "" : espesanteRaw || "",
    espesante_desconocido: isGrasa && (!espesanteRaw || isUnknownValue(espesanteRaw) || toBoolean(data.espesante_desconocido)),
    atributos_tecnicos: data.atributos_tecnicos || {},
  };
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (!data) return "No se pudo procesar el archivo.";
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (Array.isArray(data.message)) return data.message.join(" ");

  return "No se pudo procesar el archivo. Revise la consola.";
};

const BulkSamplesExcelTab = ({ form, state, onStateChange, onUseRows }) => {
  const inputRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // El estado pesado del flujo Excel vive en la página padre.
  // Así no se pierde el archivo, la vista previa ni las filas validadas al cambiar entre tabs.
  const selectedFile = state?.selectedFile || null;
  const preview = state?.preview || null;
  const appliedRowsCount = state?.appliedRowsCount || 0;

  const patchState = (patch) => {
    onStateChange?.((prev) => ({ ...(prev || {}), ...patch }));
  };

  const validRows = useMemo(() => (preview?.rows || []).filter((row) => row.is_valid), [preview]);
  const invalidRows = useMemo(() => (preview?.rows || []).filter((row) => !row.is_valid), [preview]);
  const visiblePreviewRows = useMemo(() => (preview?.rows || []).slice(0, PREVIEW_ROW_LIMIT), [preview]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await sampleBatchExcelService.downloadTemplate({
        cliente_empresa: form?.tipo_cliente === "registrado" ? form?.cliente_empresa || undefined : undefined,
      });
      toast.success("Plantilla generada correctamente");
    } catch (error) {
      console.error(error?.response?.data || error);
      toast.error(getErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  const applyValidRowsToLot = (rows) => {
    const normalized = rows.map(normalizeImportedMuestra);
    onUseRows(normalized);
    patchState({ appliedRowsCount: normalized.length });
    return normalized.length;
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.warning("Seleccione un archivo primero");
      return;
    }

    setUploading(true);
    patchState({ preview: null, appliedRowsCount: 0 });

    try {
      const data = await sampleBatchExcelService.preview(selectedFile);
      patchState({ preview: data });

      const rows = data?.rows || [];
      const valid = rows.filter((row) => row.is_valid);

      if (valid.length > 0) {
        applyValidRowsToLot(valid);
      }

      if (data.error_rows > 0) {
        toast.warning(`Archivo leído con ${data.error_rows} filas con errores. Se cargaron ${valid.length} filas válidas al lote.`);
      } else {
        toast.success(`Archivo validado correctamente. ${valid.length} muestra(s) cargada(s) al lote.`);
      }
    } catch (error) {
      console.error(error?.response?.data || error);
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleUseRows = () => {
    if (!validRows.length) {
      toast.warning("No hay filas válidas para cargar");
      return;
    }

    const loaded = applyValidRowsToLot(validRows);
    toast.success(`${loaded} muestras cargadas en el lote`);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#222] border border-[#333] rounded-xl p-5 lg:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-red-600/20 text-red-300 flex items-center justify-center mb-4">
            <FileSpreadsheet size={24} />
          </div>
          <h3 className="font-bold text-lg">1. Generar plantilla</h3>
          <p className="text-sm text-gray-400 mt-2">
            Descarga un Excel protegido con listas desplegables alimentadas desde configuración técnica.
          </p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 font-semibold"
          >
            <Download size={18} />
            {downloading ? "Generando..." : "Descargar Excel"}
          </button>
        </div>

        <div className="bg-[#222] border border-[#333] rounded-xl p-5 lg:col-span-2">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center mb-4">
            <UploadCloud size={24} />
          </div>
          <h3 className="font-bold text-lg">2. Subir y validar</h3>
          <p className="text-sm text-gray-400 mt-2">
            Solo se aceptan plantillas generadas por el sistema. El backend valida token, estructura, columnas y catálogos.
          </p>

          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
                  toast.warning("Solo se aceptan archivos .xlsx generados por el sistema.");
                  e.target.value = "";
                  patchState({ selectedFile: null, preview: null, appliedRowsCount: 0 });
                  return;
                }
                if (file && file.size > MAX_EXCEL_SIZE_BYTES) {
                  toast.warning("El archivo supera el tama?o m?ximo permitido de 10 MB.");
                  e.target.value = "";
                  patchState({ selectedFile: null, preview: null, appliedRowsCount: 0 });
                  return;
                }
                patchState({ selectedFile: file, preview: null, appliedRowsCount: 0 });
              }}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold"
            >
              <UploadCloud size={18} />
              Seleccionar archivo
            </button>

            <div className="flex-1 min-h-[48px] rounded-lg border border-[#444] bg-[#292929] px-4 py-3 text-sm text-gray-300 truncate">
              {selectedFile ? selectedFile.name : "Ningún archivo seleccionado"}
            </div>

            <button
              type="button"
              disabled={!selectedFile || uploading}
              onClick={handlePreview}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 font-semibold"
            >
              <RefreshCcw size={18} />
              {uploading ? "Validando..." : "Validar"}
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="bg-[#222] border border-[#333] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#333] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Table2 size={20} />
                Vista previa de importación
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {preview.total_rows} filas leídas · {preview.valid_rows} válidas · {preview.error_rows} con errores
                {appliedRowsCount > 0 ? ` · ${appliedRowsCount} cargada(s) al lote` : ""}
                {preview.truncated ? ` · Se procesaron hasta ${preview.max_import_rows} filas por seguridad` : ""}
              </p>
              {(preview.rows || []).length > PREVIEW_ROW_LIMIT ? (
                <p className="text-xs text-gray-500 mt-1">
                  La tabla muestra las primeras {PREVIEW_ROW_LIMIT} filas para mantener la vista fluida. Las filas válidas se cargan completas al lote.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleUseRows}
              disabled={!validRows.length}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-50 font-semibold"
            >
              <CheckCircle size={18} />
Volver a cargar filas válidas
            </button>
          </div>

          {invalidRows.length > 0 && (
            <div className="m-5 p-4 rounded-lg border border-yellow-700/60 bg-yellow-900/20 text-yellow-100">
              <div className="flex gap-2 font-semibold mb-2">
                <AlertCircle size={18} />
                Hay filas con errores
              </div>
              <p className="text-sm text-yellow-200/80">
                Corrige el Excel y vuelve a subirlo, o carga únicamente las filas válidas.
              </p>
            </div>
          )}

          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-sm">
              <thead className="bg-[#2f2f2f] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left">Fila</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3 text-left">Tipo</th>
                  <th className="px-3 py-3 text-left">Condición</th>
                  <th className="px-3 py-3 text-left">Fabricante</th>
                  <th className="px-3 py-3 text-left">Referencia</th>
                  <th className="px-3 py-3 text-left">Errores</th>
                </tr>
              </thead>
              <tbody>
                {visiblePreviewRows.map((row) => (
                  <tr key={row.row_number} className="border-t border-[#333] hover:bg-[#2a2a2a]">
                    <td className="px-3 py-3">{row.row_number}</td>
                    <td className="px-3 py-3">
                      {row.is_valid ? (
                        <span className="inline-flex items-center gap-1 text-green-300"><CheckCircle size={14} /> Válida</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-300"><AlertCircle size={14} /> Revisar</span>
                      )}
                    </td>
                    <td className="px-3 py-3 capitalize">{row.data?.tipo_muestra || "-"}</td>
                    <td className="px-3 py-3 capitalize">{row.data?.condicion || "-"}</td>
                    <td className="px-3 py-3">{row.data?.fabricante || "-"}</td>
                    <td className="px-3 py-3">{row.data?.referencia_marca || "-"}</td>
                    <td className="px-3 py-3 break-words">
                      {row.errors?.length ? (
                        <ul className="list-disc pl-4 text-yellow-200 space-y-1">
                          {row.errors.map((error, index) => <li key={index}>{error}</li>)}
                        </ul>
                      ) : (
                        <span className="text-gray-400">Sin errores</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkSamplesExcelTab;
