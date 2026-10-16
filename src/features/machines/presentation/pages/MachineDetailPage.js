import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Cpu, Settings, FileText, Pencil as Edit } from 'lucide-react';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { samplesService } from '@features/samples/infrastructure/samplesService';
import AppErrorState from '@shared/ui/AppErrorState';

const DetailMachine = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [machine, setMachine] = useState(null);
  const [muestras, setMuestras] = useState([]);

  // Cargar datos de la máquina
  useEffect(() => {
    if (!id) return;

    const fetchMachineData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch de la máquina principal
        const machineData = await machinesService.getById(id);
        setMachine(machineData);

        // Fetch de muestras asociadas a esta máquina
        try {
          const muestrasData = await samplesService.list({
            referencia_equipo: id
          });
          setMuestras(muestrasData);
        } catch (error) {
          setMuestras([]);
        }

      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMachineData();
  }, [id]);

  const handleEdit = () => {
    router.push(`/machines/edit-machine?id=${id}`);
  };

  const handleViewMuestra = (muestraId) => {
    router.push(`/muestras/muestra-details?muestra=${muestraId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="go-page">
        <div className="go-shell max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-[#202328] rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-[#202328] rounded"></div>
                <div className="h-48 bg-[#202328] rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-[#202328] rounded"></div>
                <div className="h-32 bg-[#202328] rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="go-page">
        <div className="go-shell max-w-6xl">
          <AppErrorState error={error} fallback="No fue posible cargar la máquina." onRetry={() => router.replace(router.asPath)} />
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="go-page">
        <div className="go-shell max-w-6xl"><AppErrorState error={{ response: { status: 404 } }} /></div>
      </div>
    );
  }

  return (
    <div className="go-page">
      {/* Header */}
      <div className="mb-6">
        <div className="go-shell max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Detalles de la Máquina</h1>
                <p className="text-[#969ca6]">Información completa del equipo</p>
              </div>
            </div>
            <button
              onClick={handleEdit}
              className="go-primary"
            >
              <Edit size={16} />
              <span>Editar Máquina</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="go-shell max-w-6xl p-6">
        {/* Información Principal */}
        <div className="go-card mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/[0.08]">
              <Cpu size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{machine.nombre}</h2>
              <p className="text-[#969ca6]">Código: {machine.codigo_equipo}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/[0.07] pb-2">
                Información Básica
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Nombre</span>
                  <span className="text-white font-medium">{machine.nombre}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Código de Equipo</span>
                  <span className="text-white font-medium">{machine.codigo_equipo}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Número de Serie</span>
                  <span className="text-white font-medium">{machine.numero_serie || 'No especificado'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Tipo de aceite</span>
                  <span className="text-white font-medium">{machine.tipoAceite || 'No especificado'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Frecuencias</span>
                  <span className="text-white font-medium">Cambio: {machine.frecuenciaCambio || '-'} · Análisis: {machine.frecuenciaAnalisis || '-'}</span>
                </div>

                <div className="hidden justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Estado</span>
                  <span className={`font-medium px-2 py-1 rounded ${
                    machine.estado === 'activo' 
                      ? 'go-status-on' 
                      : machine.estado === 'inactivo'
                      ? 'go-status-off'
                      : 'go-badge go-badge-warning'
                  }`}>
                    {machine.estado || 'activo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-white/[0.07] pb-2">
                Información Adicional
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Empresa</span>
                  <span className="text-white font-medium">{machine.empresa || 'No especificada'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">ID de Máquina</span>
                  <span className="text-white font-medium">{machine.id}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Fecha de Creación</span>
                  <span className="text-white font-medium">{formatDate(machine.created_at)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-white/[0.07]">
                  <span className="text-[#969ca6]">Última Actualización</span>
                  <span className="text-white font-medium">{formatDate(machine.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        {machine.descripcion && (
          <div className="go-card mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText size={20} className="text-[#e2646a]" />
              Descripción
            </h3>
            <p className="text-[#969ca6] whitespace-pre-wrap">{machine.descripcion}</p>
          </div>
        )}

        {/* Muestras Asociadas */}
        <div className="go-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings size={20} className="text-[#e2646a]" />
            Muestras Asociadas ({muestras.length})
          </h3>
          
          {muestras.length > 0 ? (
            <div className="space-y-3">
              {muestras.map((muestra) => (
                <div 
                  key={muestra.id} 
                  className="border border-white/[0.07] rounded-lg p-4 hover:border-red-500 transition-colors cursor-pointer"
                  onClick={() => handleViewMuestra(muestra.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">{muestra.id}</h4>
                      <p className="text-[#969ca6] text-sm">
                        Fecha de toma: {formatDate(muestra.fecha_toma)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[#969ca6] text-sm">Estado:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        muestra.estado === 'completado' 
                          ? 'go-status-on' 
                          : muestra.estado === 'pendiente'
                          ? 'go-badge go-badge-warning'
                          : 'go-badge go-badge-neutral'
                      }`}>
                        {muestra.estado || 'En proceso'}
                      </span>
                    </div>
                  </div>
                  {muestra.observaciones && (
                    <p className="text-[#969ca6] text-sm mt-2 line-clamp-2">
                      {muestra.observaciones}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#969ca6]">
              <p>No hay muestras asociadas a esta máquina</p>
              <button
                onClick={() => router.push(`/muestras/crear?maquina=${id}`)}
                className="mt-4 go-primary"
              >
                Crear Primera Muestra
              </button>
            </div>
          )}
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="rounded-lg border border-white/[0.07] bg-[#17191c] p-4 text-center">
            <div className="text-2xl font-bold text-[#e2646a] mb-2">{muestras.length}</div>
            <div className="text-[#969ca6] text-sm">Total Muestras</div>
          </div>
          
          <div className="rounded-lg border border-white/[0.07] bg-[#17191c] p-4 text-center">
            <div className="text-2xl font-bold text-[#6bb68a] mb-2">
              {muestras.filter(m => m.estado === 'completado').length}
            </div>
            <div className="text-[#969ca6] text-sm">Muestras Completadas</div>
          </div>
          
          <div className="rounded-lg border border-white/[0.07] bg-[#17191c] p-4 text-center">
            <div className="text-2xl font-bold text-[#d4a454] mb-2">
              {muestras.filter(m => m.estado === 'pendiente').length}
            </div>
            <div className="text-[#969ca6] text-sm">Muestras Pendientes</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailMachine;
