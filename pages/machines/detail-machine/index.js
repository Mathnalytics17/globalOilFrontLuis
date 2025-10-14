import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import Axios from 'axios';
import { ArrowLeft, Cpu, Calendar, Settings, FileText, Edit } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
        const machineResponse = await Axios.get(`${API_URL}/machines/${id}/`);
        const machineData = machineResponse.data;
        setMachine(machineData);

        // Fetch de muestras asociadas a esta máquina
        try {
          const muestrasResponse = await Axios.get(`${API_URL}/lubrication/samples/`, {
            params: {
              referencia_equipo: id
            }
          });
          setMuestras(muestrasResponse.data);
        } catch (error) {
          console.error('Error cargando muestras:', error);
          setMuestras([]);
        }

      } catch (error) {
        console.error('Error cargando máquina:', error);
        setError('No se pudo cargar la información de la máquina');
        toast.error('Error al cargar los datos de la máquina');
      } finally {
        setLoading(false);
      }
    };

    fetchMachineData();
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.push(`/maquinas/editar/${id}`);
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
      <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-[#292929] rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-[#292929] rounded"></div>
                <div className="h-48 bg-[#292929] rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-[#292929] rounded"></div>
                <div className="h-32 bg-[#292929] rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Error al cargar</h2>
            <p className="text-[#d9d9d9] mb-4">{error}</p>
            <button
              onClick={handleBack}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold text-white mb-2">Máquina no encontrada</h2>
          <p className="text-[#d9d9d9] mb-4">La máquina solicitada no existe.</p>
          <button
            onClick={handleBack}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
      {/* Header */}
      <div className="bg-[#292929] border-b border-[#333]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-[#d9d9d9] hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Volver</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Detalles de la Máquina</h1>
                <p className="text-[#d9d9d9]">Información completa del equipo</p>
              </div>
            </div>
            <button
              onClick={handleEdit}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200 flex items-center gap-2"
            >
              <Edit size={16} />
              <span>Editar Máquina</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Información Principal */}
        <div className="bg-[#292929] rounded-lg shadow-2xl border border-[#333] p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
              <Cpu size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{machine.nombre}</h2>
              <p className="text-[#d9d9d9]">Código: {machine.codigo_equipo}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-[#444] pb-2">
                Información Básica
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">Nombre</span>
                  <span className="text-white font-medium">{machine.nombre}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">Código de Equipo</span>
                  <span className="text-white font-medium">{machine.codigo_equipo}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">Número de Serie</span>
                  <span className="text-white font-medium">{machine.numero_serie || 'No especificado'}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">Estado</span>
                  <span className={`font-medium px-2 py-1 rounded ${
                    machine.estado === 'activo' 
                      ? 'bg-green-600 text-white' 
                      : machine.estado === 'inactivo'
                      ? 'bg-red-600 text-white'
                      : 'bg-yellow-600 text-white'
                  }`}>
                    {machine.estado || 'activo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-[#444] pb-2">
                Información Adicional
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">Empresa</span>
                  <span className="text-white font-medium">{machine.empresa || 'No especificada'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">ID de Máquina</span>
                  <span className="text-white font-medium">{machine.id}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">Fecha de Creación</span>
                  <span className="text-white font-medium">{formatDate(machine.created_at)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[#444]">
                  <span className="text-[#d9d9d9]">Última Actualización</span>
                  <span className="text-white font-medium">{formatDate(machine.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        {machine.descripcion && (
          <div className="bg-[#292929] rounded-lg border border-[#333] p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText size={20} className="text-red-500" />
              Descripción
            </h3>
            <p className="text-[#d9d9d9] whitespace-pre-wrap">{machine.descripcion}</p>
          </div>
        )}

        {/* Muestras Asociadas */}
        <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings size={20} className="text-red-500" />
            Muestras Asociadas ({muestras.length})
          </h3>
          
          {muestras.length > 0 ? (
            <div className="space-y-3">
              {muestras.map((muestra) => (
                <div 
                  key={muestra.id} 
                  className="border border-[#444] rounded-lg p-4 hover:border-red-500 transition-colors cursor-pointer"
                  onClick={() => handleViewMuestra(muestra.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-white font-medium">{muestra.id}</h4>
                      <p className="text-[#d9d9d9] text-sm">
                        Fecha de toma: {formatDate(muestra.fecha_toma)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[#d9d9d9] text-sm">Estado:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        muestra.estado === 'completado' 
                          ? 'bg-green-600 text-white' 
                          : muestra.estado === 'pendiente'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {muestra.estado || 'En proceso'}
                      </span>
                    </div>
                  </div>
                  {muestra.observaciones && (
                    <p className="text-[#d9d9d9] text-sm mt-2 line-clamp-2">
                      {muestra.observaciones}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#d9d9d9]">
              <p>No hay muestras asociadas a esta máquina</p>
              <button
                onClick={() => router.push(`/muestras/crear?maquina=${id}`)}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Crear Primera Muestra
              </button>
            </div>
          )}
        </div>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-[#292929] rounded-lg border border-[#333] p-4 text-center">
            <div className="text-2xl font-bold text-red-500 mb-2">{muestras.length}</div>
            <div className="text-[#d9d9d9] text-sm">Total Muestras</div>
          </div>
          
          <div className="bg-[#292929] rounded-lg border border-[#333] p-4 text-center">
            <div className="text-2xl font-bold text-green-500 mb-2">
              {muestras.filter(m => m.estado === 'completado').length}
            </div>
            <div className="text-[#d9d9d9] text-sm">Muestras Completadas</div>
          </div>
          
          <div className="bg-[#292929] rounded-lg border border-[#333] p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500 mb-2">
              {muestras.filter(m => m.estado === 'pendiente').length}
            </div>
            <div className="text-[#d9d9d9] text-sm">Muestras Pendientes</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailMachine;