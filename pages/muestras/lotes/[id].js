import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Edit,
  FlaskConical,
  AlertCircle,
  ClipboardCheck,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

import DataTable from "@components/dataTableGen";
import { sampleBatchesService } from "@features/samples/infrastructure/sampleBatchesService";

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
  registrada: "Registrada",
  en_laboratorio: "En laboratorio",
  en_analisis: "En análisis",
  resultados_ingresados: "Resultados ingresados",
  revisada: "Revisada",
  reportada: "Reportada",
};

const getMuestraEstado = (muestra) => {
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
const DetalleLoteMuestrasPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");

  useEffect(() => {
    if (!id) return;
    fetchLote();
  }, [id]);

  const fetchLote = async () => {
    setLoading(true);

    try {
      const data = await sampleBatchesService.getById(id);
      setLote(data);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar el lote");
    } finally {
      setLoading(false);
    }
  };

  const muestras = lote?.muestras || [];

  const resumen = useMemo(() => {
    return muestras.reduce(
      (acc, muestra) => {
        acc.total += 1;

        if (muestra.is_revisado) {
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
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 text-center">
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

  return (
    <div className="min-h-screen text-white p-4 md:p-5">
      <div className="max-w-[1500px] mx-auto space-y-4">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/muestras/lotes")}
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4"
            >
              <ArrowLeft size={18} />
              Volver a lotes
            </button>

            <h1 className="text-2xl font-bold">Detalle del lote {lote.id}</h1>
            <p className="text-gray-300 mt-2">
              Visualice la información general del lote y gestione sus muestras
              asociadas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push(`/muestras/lotes/${lote.id}/editar`)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[#444] bg-[#202124] hover:bg-[#292a2e] rounded-md text-sm font-semibold"
            >
              <Edit size={18} />
              Editar información general
            </button>



            <button
              onClick={() => router.push(`/muestras/laboratorio?lote=${lote.id}`)}
              disabled={!canEnterLab(lote)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[#62531c] bg-[#292515] hover:bg-[#332d18] disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-sm font-semibold"
              title={canEnterLab(lote) ? "Ingresar lote a laboratorio" : "No disponible en este estado"}
            >
              <FlaskConical size={18} />
              Ingresar lote
            </button>

            <button
              onClick={() => router.push(`/muestras/asignacion-pruebas?lote=${lote.id}`)}
              disabled={!canAssignTests(lote)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[#444] bg-[#202124] hover:bg-[#292a2e] disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-sm font-semibold"
              title={canAssignTests(lote) ? "Asignar pruebas" : "Primero ingrese el lote al laboratorio"}
            >
              <ClipboardCheck size={18} />
              Asignar pruebas
            </button>

            <button
              onClick={() => router.push(`/muestras/resultados?lote=${lote.id}`)}
              disabled={!canEnterResults(lote)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#f5222d] hover:bg-[#d91d27] disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-sm font-semibold"
              title={canEnterResults(lote) ? "Ingresar resultados" : "Primero asigne y confirme pruebas"}
            >
              <FileSpreadsheet size={18} />
              Ingresar resultados
            </button>

          </div>
        </header>

        <section className="bg-[#191a1d] border border-[#333] rounded-lg p-5 space-y-4">
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

        <section className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <SummaryCard title="Total muestras" value={resumen.total} />
          <SummaryCard title="Pendientes" value={resumen.pendientes} />
          <SummaryCard title="En laboratorio" value={resumen.enLaboratorio} />
          <SummaryCard title="Resultados" value={resumen.resultados} />
          <SummaryCard title="Revisadas" value={resumen.revisadas} />
          <SummaryCard
            title="Tipos"
            value={`${resumen.aceites} A / ${resumen.grasas} G`}
          />
        </section>

        <section className="bg-[#191a1d] border border-[#333] rounded-lg overflow-hidden">
          <div className="p-5 border-b border-[#333] space-y-4">
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
          background: #292929;
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
  <div className="bg-[#191a1d] border border-[#333] rounded-lg p-4">
    <p className="text-gray-400 text-sm">{title}</p>
    <p className="text-2xl font-bold text-white mt-2">{value}</p>
  </div>
);

export default DetalleLoteMuestrasPage;
