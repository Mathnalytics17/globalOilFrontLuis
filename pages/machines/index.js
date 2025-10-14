import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';

const MaquinasTable = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: 'todos',
    showInactive: false
  });
  const [showFilters, setShowFilters] = useState(false);

  // Obtener máquinas
  const fetchMaquinas = async () => {
    setLoading(true);
    try {
      const response = await api.get('machines/');
      setMaquinas(response.data);
    } catch (error) {
      toast.error('Error al cargar máquinas: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaquinas();
  }, []);

  // Manejar eliminación
  const handleDeleteMachine = async (maquina) => {
    if (window.confirm(`¿Estás seguro de ${maquina.activo ? 'desactivar' : 'activar'} la máquina "${maquina.nombre}"?`)) {
      try {
        await api.delete(`machines/${maquina.id}/`);
        toast.success(`Máquina ${maquina.activo ? 'desactivada' : 'activada'} correctamente`);
        fetchMaquinas();
      } catch (error) {
        toast.error('Error al modificar máquina: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Aplicar filtros
  const filteredData = maquinas.filter(maquina => {
    // Filtro de búsqueda general
    const matchesSearch = 
      !searchTerm ||
      (maquina.id && maquina.id.toString().includes(searchTerm.toLowerCase())) ||
      (maquina.nombre && maquina.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (maquina.codigo_equipo && maquina.codigo_equipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (maquina.numero_serie && maquina.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtros adicionales
    const matchesStatus = 
      filters.estado === 'todos' || 
      (filters.estado === 'activo' && maquina.activo) ||
      (filters.estado === 'inactivo' && !maquina.activo);

    return matchesSearch && matchesStatus;
  });

  // Contadores para el resumen
  const activeCount = maquinas.filter(m => m.activo).length;
  const inactiveCount = maquinas.filter(m => !m.activo).length;

  // Limpiar filtros
  const clearFilters = () => {
    setFilters({ estado: 'todos', showInactive: false });
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-[#292929] rounded-lg shadow-lg mb-6 p-6 border border-[#424242]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestión de Máquinas</h1>
              <p className="text-gray-300 mt-1">Administra y gestiona todas las máquinas del sistema</p>
            </div>
            <button
              onClick={() => router.push('/machines/create-machine')}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Máquina
            </button>
          </div>

          {/* Barra de búsqueda y controles */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar máquinas por ID, nombre, código o serie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium flex items-center ${
                    showFilters 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : 'border-[#424242] text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtros
                </button>

                <button
                  onClick={fetchMaquinas}
                  className="px-4 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                  title="Recargar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel de filtros avanzados */}
            {showFilters && (
              <div className="bg-gray-700 border border-[#424242] rounded-lg p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <span className="text-white font-medium text-sm">Filtros Avanzados:</span>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="text-gray-300 text-sm">Estado:</span>
                    <button
                      onClick={() => setFilters({...filters, estado: 'todos'})}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                        filters.estado === 'todos' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilters({...filters, estado: 'activo'})}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                        filters.estado === 'activo' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Activas
                    </button>
                    <button
                      onClick={() => setFilters({...filters, estado: 'inactivo'})}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                        filters.estado === 'inactivo' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Inactivas
                    </button>
                  </div>

                  <button 
                    onClick={clearFilters}
                    className="px-3 py-1 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors duration-200 text-sm font-medium flex items-center ml-auto"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#292929] rounded-lg p-4 border border-[#424242]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Máquinas</p>
                <p className="text-2xl font-bold text-white">{filteredData.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#292929] rounded-lg p-4 border border-[#424242]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Máquinas Activas</p>
                <p className="text-2xl font-bold text-green-400">{activeCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#292929] rounded-lg p-4 border border-[#424242]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Máquinas Inactivas</p>
                <p className="text-2xl font-bold text-red-400">{inactiveCount}</p>
              </div>
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de máquinas */}
        <div className="bg-[#292929] rounded-lg shadow-lg border border-[#424242] overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-white">No se encontraron máquinas</h3>
              <p className="mt-1 text-gray-400">
                {maquinas.length === 0 ? 'No hay máquinas registradas en el sistema.' : 'No hay resultados que coincidan con los filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      ID Máquina
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Código Equipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Número de Serie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Componente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tipo de Aceite
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Frecuencias
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#292929] divide-y divide-gray-700">
                  {filteredData.map((maquina) => (
                    <tr key={maquina.id} className="hover:bg-gray-750 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-white">{maquina.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{maquina.nombre || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{maquina.codigo_equipo || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{maquina.numero_serie || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{maquina.componente || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{maquina.tipoAceite || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">
                          <div>Cambio: {maquina.frecuenciaCambio || '-'} hrs</div>
                          <div>Análisis: {maquina.frecuenciaAnalisis || '-'} hrs</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          maquina.activo 
                            ? 'bg-green-900 text-green-200' 
                            : 'bg-red-900 text-red-200'
                        }`}>
                          {maquina.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => router.push(`/machines/detail-machine?id=${maquina.id}`)}
                            className="text-blue-400 hover:text-blue-300 transition-colors duration-200 p-1 rounded"
                            title="Ver detalle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => router.push(`/machines/edit-machine?id=${maquina.id}`)}
                            className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 p-1 rounded"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {maquina.activo ? (
                            <button
                              onClick={() => handleDeleteMachine(maquina)}
                              className="text-red-400 hover:text-red-300 transition-colors duration-200 p-1 rounded"
                              title="Desactivar máquina"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteMachine(maquina)}
                              className="text-green-400 hover:text-green-300 transition-colors duration-200 p-1 rounded"
                              title="Activar máquina"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaquinasTable;