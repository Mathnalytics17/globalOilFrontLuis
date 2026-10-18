import { useEffect, useMemo, useState } from "react";
import { appDialog } from '@shared/ui/AppDialogProvider';
import { useRouter } from "next/router";
import {
  Pencil as Edit,
  FlaskConical,
  AlertCircle,
  ClipboardCheck,
  FileSpreadsheet,
  RefreshCw,
  ShieldOff,
  History,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-toastify";

import DataTable from "@shared/ui/DataTable";
import { sampleBatchesService } from "@features/samples/infrastructure/sampleBatchesService";
import { samplesService } from "@features/samples/infrastructure/samplesService";
import PageHeader from "@shared/ui/PageHeader";
import MetricStrip from "@shared/ui/MetricStrip";
import OverflowMenu from "@shared/ui/OverflowMenu";

const estadoLoteLabels = {
  borrador: "Borrador",
  registrado: "Registrado",
  recibido: "Recibido",
  en_laboratorio: "En laboratorio",
  en_analisis: "En análisis",
  parcial: "Parcial",
  resultados_completos: "Resultados completos",
  revisado: "Revisado",
  reportado: "Reportado",
  cancelado: "Cancelado",
};

const estadoMuestraLabels = {
  invalidada: "Invalidada",
  registrada: "Registrada",
  en_laboratorio: "En laboratorio",
  en_analisis: "En análisis",
  resultados_ingresados: "Resultados ingresados",
  revisada: "Revisada",
  reportada: "Reportada",
};

const getMuestraEstado = (muestra) => {
  if (muestra.estado_operativo === "invalidada") return "invalidada";
  if (muestra.is_revisado) return "revisada";
  if (muestra.is_resultado_ingresado) return "resultados_ingresados";
  if (muestra.is_ingresado) return "en_laboratorio";
  return "registrada";
};

const getMuestraProgress = (muestra) => {
  const pruebas = muestra.pruebas_estructuradas || [];
  const resultados = muestra.resultados || [];

  const totalPruebas = pruebas.length || resultados.length || 0;
  const totalResultados = resultados.length || 0;

  if (muestra.is_revisado) {
    return {
      porcentaje: 100,
      label: "Revisada",
    };
  }

  if (muestra.is_resultado_ingresado) {
    return {
      porcentaje: 80,
      label: "Resultados ingresados",
    };
  }

  if (muestra.is_ingresado) {
    return {
      porcentaje: 40,
      label: totalPruebas
        ? `${totalResultados}/${totalPruebas} resultados`
        : "En laboratorio",
    };
  }

  return {
    porcentaje: 0,
    label: "Pendiente",
  };
};

const getConfirmedTestsCount = (lote) => {
  const progress = lote?.progreso_pruebas || {};
  const fromProgress = Number(progress.asignadas || 0);
  if (fromProgress) return fromProgress;
  const muestras = Array.isArray(lote?.muestras) ? lote.muestras : [];
  return muestras.reduce((total, muestra) => {
    const pruebas = Array.isArray(muestra.pruebas_asignadas) ? muestra.pruebas_asignadas : [];
    return total + pruebas.filter((item) => item.estado_asignacion === "confirmada" || item.estado_asignacion === undefined).length;
  }, 0);
};

const getTotalSamples = (lote) => Number(lote?.total_muestras ?? lote?.progreso?.total ?? lote?.muestras?.length ?? 0);

const serverCapability = (lote, key) => lote?.acciones_disponibles?.[key];

const canEnterLab = (lote) => {
  const configured = serverCapability(lote, 'ingresar_laboratorio');
  if (typeof configured === 'boolean') return configured;
  return getTotalSamples(lote) > 0 &&
    !["cancelado", "reportado", "en_laboratorio", "en_analisis", "parcial", "resultados_completos", "revisado"].includes(lote?.estado);
};

const canAssignTests = (lote) => {
  const configured = serverCapability(lote, 'asignar_pruebas');
  if (typeof configured === 'boolean') return configured;
  return !["cancelado", "reportado", "resultados_completos", "revisado"].includes(lote?.estado) &&
    ["en_laboratorio", "en_analisis", "parcial"].includes(lote?.estado);
};

const canEnterResults = (lote) => {
  const configured = serverCapability(lote, 'ingresar_resultados');
  if (typeof configured === 'boolean') return configured;
  return getConfirmedTestsCount(lote) > 0 &&
    !["cancelado", "reportado", "registrado", "borrador", "recibido"].includes(lote?.estado) &&
    ["en_laboratorio", "en_analisis", "parcial"].includes(lote?.estado);
};


const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-gray-300 mb-2">
      {label}
    </span>

    {children}

    {error && (
      <span className="mt-2 flex items-center gap-1 text-xs text-red-400">
        {error}
      </span>
    )}
  </label>
);

const auditActionLabels = {
  "lote.creado": "Lote creado",
  "lote.actualizado": "Información del lote actualizada",
  "lote.cancelado": "Lote cancelado",
  "lote.reabierto": "Lote reabierto",
  "lote.recibido_laboratorio": "Lote recibido en laboratorio",
  "lote.ingreso_laboratorio_revertido": "Ingreso a laboratorio revertido",
  "lote.pruebas_sincronizadas": "Pruebas configuradas",
  "lote.revision_completada": "Revisión del lote completada",
  "lote.muestras_agregadas": "Muestras agregadas",
  "lote.reportes_generados": "Reportes del lote generados",
  "muestra.creada": "Muestra creada",
  "muestra.actualizada": "Muestra actualizada",
  "muestra.invalidada": "Muestra invalidada",
  "muestra.reactivada": "Muestra reactivada",
  "muestra.punto_muestreo_asignado": "Punto de medición asignado",
  "resultado.registrado": "Resultado registrado",
  "resultado.actualizado": "Resultado actualizado",
  "resultado.invalidado": "Resultado invalidado",
  "resultado.corregido": "Resultado corregido",
  "resultado.revisado": "Resultado revisado",
  "interpretacion.guardada": "Interpretación guardada",
  "reporte.generado": "Reporte generado",
  "reporte.enviado_aprobacion": "Reporte enviado a aprobación",
  "reporte.aprobado": "Reporte aprobado",
  "reporte.publicado_cliente": "Reporte publicado al cliente",
  "reporte.ocultado_cliente": "Reporte retirado del cliente",
  "reporte.enviado_correo": "Reporte enviado por correo",
  "reporte.envio_fallido": "Falló el envío del reporte",
  "reporte.anulado": "Reporte anulado",
  "lote.reportes_enviados_correo": "Reportes del lote enviados por correo",
  "lote.envio_reportes_fallido": "Falló el envío de reportes del lote",
};

const auditFieldLabels = {
  estado: "Estado",
  estatus: "Estado",
  valor: "Resultado",
  unidad: "Unidad",
  completada: "Completado",
  is_revisada: "Revisado",
  fecha_envio: "Fecha de envío",
  fecha_recepcion: "Fecha de recepción",
  observaciones: "Observaciones",
  aplicar_limites: "Aplicar límites",
};

const formatAuditValue = (value) => {
  if (value === null || value === undefined || value === "") return "Sin valor";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const AuditChanges = ({ before = {}, after = {} }) => {
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));

  if (!fields.length) return null;

  return (
    <details className="mt-3 text-xs">
      <summary className="inline-flex cursor-pointer items-center gap-1 text-gray-300 hover:text-white">
        <ChevronDown size={14} /> Ver valores registrados
      </summary>
      <div className="mt-2 grid gap-2 rounded-lg border border-white/[0.07] bg-black/20 p-3">
        {fields.map((field) => (
          <div key={field} className="grid grid-cols-1 gap-1 sm:grid-cols-[130px_1fr_1fr] sm:gap-3">
            <span className="font-semibold text-gray-400">{auditFieldLabels[field] || field}</span>
            <span className="text-red-200 break-words">Antes: {formatAuditValue(before[field])}</span>
            <span className="text-emerald-200 break-words">Después: {formatAuditValue(after[field])}</span>
          </div>
        ))}
      </div>
    </details>
  );
};

const DetalleLoteMuestrasPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [timeline, setTimeline] = useState({ results: [], count: 0, next: null });
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelinePage, setTimelinePage] = useState(1);

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  useEffect(() => {
    if (!id) return;
    fetchLote();
  }, [id]);

  const fetchLote = async () => {
    setLoading(true);

    try {
      const [lotResult, timelineResult] = await Promise.allSettled([
        sampleBatchesService.getById(id),
        sampleBatchesService.timeline(id),
      ]);
      if (lotResult.status !== "fulfilled") throw lotResult.reason;
      setLote(lotResult.value);
      if (timelineResult.status === "fulfilled") {
        setTimeline(timelineResult.value);
        setTimelinePage(1);
      } else {
        console.error("No se pudo cargar la actividad del lote", timelineResult.reason);
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar el lote");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTimeline = async () => {
    if (!timeline.next || timelineLoading) return;
    setTimelineLoading(true);
    try {
      const nextPage = timelinePage + 1;
      const data = await sampleBatchesService.timeline(id, { page: nextPage });
      setTimeline((current) => ({
        ...data,
        results: [...current.results, ...data.results],
      }));
      setTimelinePage(nextPage);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar más actividad del lote.");
    } finally {
      setTimelineLoading(false);
    }
  };

  const toggleSampleValidity = async (sample) => {
    const invalid = sample.estado_operativo === "invalidada";
    const reason = await appDialog.prompt(`Indique el motivo para ${invalid ? "reactivar" : "invalidar"} la muestra ${sample.id}:`);
    if (!reason?.trim()) return;
    setActionLoading(true);
    try {
      if (invalid) await samplesService.reactivate(sample.id, reason.trim());
      else await samplesService.invalidate(sample.id, reason.trim());
      toast.success(invalid ? "Muestra reactivada." : "Muestra invalidada sin borrar su historial.");
      await fetchLote();
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.reason?.[0] || "No se pudo cambiar el estado de la muestra.");
    } finally {
      setActionLoading(false);
    }
  };

  const muestras = lote?.muestras || [];

  const resumen = useMemo(() => {
    return muestras.reduce(
      (acc, muestra) => {
        acc.total += 1;

        if (muestra.estado_operativo === "invalidada") {
          acc.invalidadas += 1;
        } else if (muestra.is_revisado) {
          acc.revisadas += 1;
        } else if (muestra.is_resultado_ingresado) {
          acc.resultados += 1;
        } else if (muestra.is_ingresado) {
          acc.enLaboratorio += 1;
        } else {
          acc.pendientes += 1;
        }

        if (muestra.tipo_muestra === "aceite") acc.aceites += 1;
        if (muestra.tipo_muestra === "grasa") acc.grasas += 1;

        return acc;
      },
      {
        total: 0,
        pendientes: 0,
        enLaboratorio: 0,
        resultados: 0,
        revisadas: 0,
        invalidadas: 0,
        aceites: 0,
        grasas: 0,
      }
    );
  }, [muestras]);

  const filteredMuestras = useMemo(() => {
    return muestras.filter((muestra) => {
      const estado = getMuestraEstado(muestra);

      const matchesEstado =
        estadoFilter === "todos" || estado === estadoFilter;

      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        muestra.id?.toLowerCase().includes(term) ||
        muestra.equipo_placa?.toLowerCase().includes(term);

      return matchesEstado && matchesSearch;
    });
  }, [muestras, search, estadoFilter]);

  const columns = [
    {
      id: "id",
      label: "ID MUESTRA",
      minWidth: 130,
      render: (row) => (
        <span className="font-mono font-bold text-red-400">{row.id}</span>
      ),
    },
    {
      id: "tipo_muestra",
      label: "TIPO",
      minWidth: 100,
      render: (row) => (
        <span className="capitalize">
          {row.tipo_muestra === "grasa" ? "Grasa" : "Aceite"}
        </span>
      ),
    },
    {
      id: "condicion",
      label: "CONDICIÓN",
      minWidth: 110,
      render: (row) => (
        <span className="capitalize">
          {row.condicion === "nueva" ? "Nueva" : "Usada"}
        </span>
      ),
    },
    {
      id: "fecha_toma",
      label: "FECHA TOMA",
      minWidth: 150,
      render: (row) =>
        row.fecha_toma
          ? new Date(row.fecha_toma).toLocaleString("es-CO")
          : "-",
    },
    {
      id: "referencia_marca",
      label: "REFERENCIA / MARCA",
      minWidth: 180,
      render: (row) => <span>{row.referencia_marca || "-"}</span>,
    },
    {
      id: "equipo",
      label: "EQUIPO",
      minWidth: 160,
      render: (row) => {
        if (row.condicion === "nueva") {
          return <span className="text-gray-400">No aplica</span>;
        }

        return (
          <div>
            <p className="text-white">
              {row.referencia_equipo_nombre ||
                row.referencia_equipo?.nombre ||
                row.equipo_placa ||
                "-"}
            </p>
            {row.equipo_placa && (
              <p className="text-xs text-gray-400">Placa: {row.equipo_placa}</p>
            )}
          </div>
        );
      },
    },
    {
      id: "estado",
      label: "ESTADO",
      minWidth: 160,
      render: (row) => {
        const estado = getMuestraEstado(row);

        return (
          <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-700 text-white border border-gray-600">
            {estadoMuestraLabels[estado] || estado}
          </span>
        );
      },
    },
    {
      id: "progreso",
      label: "PROGRESO",
      minWidth: 180,
      render: (row) => {
        const progress = getMuestraProgress(row);

        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">{progress.label}</span>
              <span className="text-white">{progress.porcentaje}%</span>
            </div>

            <div className="w-full h-2 bg-gray-700 rounded-full">
              <div
                className="h-2 bg-red-600 rounded-full"
                style={{ width: `${progress.porcentaje}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  const actions = [
    {
      id: "edit-sample",
      icon: <Edit size={16} />,
      tooltip: "Editar muestra",
      handler: (row) => router.push(`/muestras/lotes/${lote.id}/muestras/${row.id}`),
      color: "text-yellow-300 hover:text-yellow-200",
    },
    {
      id: "toggle-sample-validity",
      icon: <ShieldOff size={16} />,
      tooltip: "Invalidar o reactivar muestra",
      handler: toggleSampleValidity,
      color: "text-red-300 hover:text-red-200",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen text-white p-5 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-300">
          <RefreshCw className="animate-spin" size={22} />
          Cargando lote...
        </div>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="min-h-screen text-white p-5 flex items-center justify-center">
        <div className="bg-[#141518] border border-white/[0.07] rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={42} />
          <h1 className="text-2xl font-bold mb-2">Lote no encontrado</h1>
          <p className="text-gray-400 mb-5">
              No fue posible encontrar la información solicitada.
          </p>
          <button
            onClick={() => router.push("/muestras/lotes")}
            className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg font-semibold"
          >
            Volver a lotes
          </button>
        </div>
      </div>
    );
  }

  const progresoLote = lote.progreso || {
    porcentaje: 0,
    label: "0/0 procesadas",
  };

  const workflowActions = [
    { key: 'lab', label: 'Ingresar lote', icon: FlaskConical, enabled: canEnterLab(lote), onClick: () => router.push(`/muestras/laboratorio?lote=${lote.id}`) },
    { key: 'assign', label: 'Asignar pruebas', icon: ClipboardCheck, enabled: canAssignTests(lote), onClick: () => router.push(`/muestras/asignacion-pruebas?lote=${lote.id}`) },
    { key: 'results', label: 'Ingresar resultados', icon: FileSpreadsheet, enabled: canEnterResults(lote), onClick: () => router.push(`/muestras/resultados?lote=${lote.id}`) },
  ];
  const primaryWorkflowAction = [...workflowActions].reverse().find((action) => action.enabled);
  const overflowWorkflowActions = workflowActions.filter((action) => action.key !== primaryWorkflowAction?.key);

  const PrimaryWorkflowIcon = primaryWorkflowAction?.icon;

  return (
    <div className="go-page batch-detail-v2">
      {actionLoading ? (
        <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm grid place-items-center cursor-wait" role="status" aria-busy="true">
          <div className="go-card px-10 py-8 text-center">
            <RefreshCw className="animate-spin mx-auto mb-4 text-red-500" size={36} />
            <strong>Actualizando la muestra...</strong>
            <p className="text-gray-400 text-sm mt-2">Espere un momento. No cierre esta página.</p>
          </div>
        </div>
      ) : null}
      <div className="go-shell space-y-5">
        <PageHeader
          title={`Lote ${lote.id}`}
          subtitle="Consulte la información general, el avance operativo y las muestras asociadas."
          actions={(
            <>
              {primaryWorkflowAction ? (
                <button type="button" className="go-primary" onClick={primaryWorkflowAction.onClick}>
                  <PrimaryWorkflowIcon size={16} /> {primaryWorkflowAction.label}
                </button>
              ) : null}
              <OverflowMenu
                items={[
                  { label: 'Editar información general', icon: Edit, onClick: () => router.push(`/muestras/lotes/${lote.id}/editar`) },
                  { separator: true },
                  ...overflowWorkflowActions.map((action) => ({
                    label: action.label,
                    icon: action.icon,
                    disabled: !action.enabled,
                    onClick: action.onClick,
                  })),
                ]}
              />
            </>
          )}
        />

        <section className="go-card space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div>
              <h2 className="text-xl font-bold">Información general del lote</h2>
              <p className="text-gray-400 text-sm mt-1">
                Datos principales de la entrega.
              </p>
            </div>

            <div className="min-w-[220px]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{progresoLote.label}</span>
                <span className="text-white">{progresoLote.porcentaje}%</span>
              </div>

              <div className="w-full h-2 bg-gray-700 rounded-full">
                <div
                  className="h-2 bg-red-600 rounded-full"
                  style={{ width: `${progresoLote.porcentaje}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InfoItem label="Código lote" value={lote.id} />
            <InfoItem
              label="Tipo cliente"
              value={
                lote.tipo_cliente === "ocasional"
                  ? "Cliente ocasional"
                  : "Cliente registrado"
              }
            />
            <InfoItem
              label="Cliente"
              value={
                lote.cliente_nombre ||
                lote.cliente_ocasional_nombre ||
                lote.cliente_empresa ||
                "-"
              }
            />
            <InfoItem label="Contacto" value={lote.contacto_nombre || "-"} />

              <InfoItem label="Teléfono" value={lote.contacto_telefono || "-"} />
            <InfoItem label="Correo" value={lote.contacto_email || "-"} />
            <InfoItem
                label="Fecha envío"
              value={
                lote.fecha_envio
                  ? new Date(lote.fecha_envio).toLocaleDateString("es-CO")
                  : "-"
              }
            />
            <InfoItem
                label="Fecha recepción"
              value={
                lote.fecha_recepcion
                  ? new Date(lote.fecha_recepcion).toLocaleDateString("es-CO")
                  : "-"
              }
            />

              <InfoItem label="Tipo gestión" value={lote.tipo_gestion || "-"} />
            <InfoItem
              label="Estado"
              value={estadoLoteLabels[lote.estado] || lote.estado}
            />
            <InfoItem
              label="Fecha registro"
              value={
                lote.fecha_registro
                  ? new Date(lote.fecha_registro).toLocaleString("es-CO")
                  : "-"
              }
            />
            <InfoItem label="Usuario registro" value={lote.usuario_registro || "-"} />

            <div className="md:col-span-4">
              <InfoItem
                label="Observaciones"
                value={lote.observaciones || "Sin observaciones"}
              />
            </div>
          </div>
        </section>

        <MetricStrip
          items={[
            { label: 'Total muestras', value: resumen.total },
            { label: 'Pendientes', value: resumen.pendientes },
            { label: 'En laboratorio', value: resumen.enLaboratorio },
            { label: 'Resultados', value: resumen.resultados },
            { label: 'Revisadas', value: resumen.revisadas },
            { label: 'Invalidadas', value: resumen.invalidadas },
            { label: 'Tipos', value: `${resumen.aceites} A / ${resumen.grasas} G` },
          ]}
        />

        <section className="go-card">
          <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
                <History size={20} />
              </span>
              <div>
                <h2 className="text-xl font-bold">Actividad y trazabilidad</h2>
                <p className="text-sm text-gray-400">Cambios relevantes registrados durante el ciclo del lote.</p>
              </div>
            </div>
            <span className="text-sm text-gray-400">{timeline.count} evento{timeline.count === 1 ? "" : "s"}</span>
          </div>

          <div className="relative mt-5 space-y-4 before:absolute before:bottom-3 before:left-[9px] before:top-3 before:w-px before:bg-white/[0.10]">
            {timeline.results.length ? timeline.results.map((event) => (
              <article key={event.id} className="relative pl-8">
                <span className="absolute left-0 top-2 h-[19px] w-[19px] rounded-full border-4 border-[#17191c] bg-red-500" />
                <div className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{auditActionLabels[event.accion] || event.accion}</h3>
                      {event.detalle ? <p className="mt-1 text-sm text-gray-300">{event.detalle}</p> : null}
                    </div>
                    <time className="shrink-0 text-xs text-gray-500">
                      {event.creado_en ? new Date(event.creado_en).toLocaleString("es-CO") : "Sin fecha"}
                    </time>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {event.actor_nombre || "Sistema"}{event.muestra ? ` · Muestra ${event.muestra}` : ""}
                  </p>
                  {event.motivo ? <p className="mt-2 rounded bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Motivo: {event.motivo}</p> : null}
                  <AuditChanges before={event.estado_anterior} after={event.estado_nuevo} />
                </div>
              </article>
            )) : (
              <div className="relative pl-8 text-sm text-gray-400">
                Aún no hay actividad consolidada para este lote. Los cambios nuevos aparecerán aquí.
              </div>
            )}
          </div>

          {timeline.next ? (
            <button type="button" onClick={loadMoreTimeline} disabled={timelineLoading} className="go-secondary mt-5 disabled:cursor-not-allowed disabled:opacity-60">
              {timelineLoading ? "Cargando actividad..." : "Cargar actividad anterior"}
            </button>
          ) : null}
        </section>

        <section className="go-card p-0 overflow-hidden">
          <div className="p-5 border-b border-white/[0.07] space-y-4">
            <div>
              <h2 className="text-xl font-bold">Muestras del Lote</h2>
              <p className="text-gray-400 text-sm mt-1">
                Consulte y gestione las muestras asociadas a este lote.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID, referencia o equipo"
                className="input-dark md:col-span-2"
              />

              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="input-dark"
              >
                <option value="todos">Todos los estados</option>
                <option value="registrada">Registrada</option>
                <option value="en_laboratorio">En laboratorio</option>
                <option value="resultados_ingresados">
                  Resultados ingresados
                </option>
                <option value="revisada">Revisada</option>
                <option value="invalidada">Invalidada</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredMuestras}
            actions={actions}
            loading={false}
            emptyMessage="No hay muestras en este lote"
            pagination
            sx={{
              backgroundColor: '#191a1d',
              color: '#f5f5f5',
              boxShadow: 'none',
              borderRadius: 0,
              '& .MuiTableContainer-root': { overflowX: 'auto' },
              '& .MuiTable-root': { minWidth: 1120 },
              '& .MuiTableCell-root': {
                color: '#e8e8ea',
                borderColor: '#34363d',
                backgroundColor: '#191a1d',
                padding: '12px 14px',
                fontSize: '0.82rem',
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                color: '#b9bdc6',
                backgroundColor: '#242529',
                fontWeight: 700,
              },
              '& .MuiTableSortLabel-root, & .MuiTableSortLabel-root.Mui-active, & .MuiTableSortLabel-icon': {
                color: '#e8e8ea !important',
              },
              '& .MuiTableRow-root:hover .MuiTableCell-root': {
                backgroundColor: '#222328',
              },
              '& .MuiTablePagination-root': {
                color: '#d8d9dc',
                borderTop: '1px solid #34363d',
                backgroundColor: '#191a1d',
              },
              '& .MuiIconButton-root': { color: '#d8d9dc' },
            }}
          />
        </section>
      </div>

      <style jsx global>{`
        .input-dark {
          width: 100%;
          background: #17191c;
          border: 1px solid #444;
          color: white;
          border-radius: 0.5rem;
          padding: 0.75rem;
          outline: none;
        }

        .input-dark:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 1px #dc2626;
        }

        .input-dark::placeholder {
          color: #777;
        }
      `}</style>
    </div>

  );
};

const InfoItem = ({ label, value }) => (
  <div className="border-b border-[#303238] py-3">
    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{label}</p>
    <p className="text-white font-medium break-words">{value}</p>
  </div>
);

const SummaryCard = ({ title, value }) => (
  <div className="bg-[#191a1d] border border-white/[0.07] rounded-lg p-4">
    <p className="text-gray-400 text-sm">{title}</p>
    <p className="text-2xl font-bold text-white mt-2">{value}</p>
  </div>
);

export default DetalleLoteMuestrasPage;
