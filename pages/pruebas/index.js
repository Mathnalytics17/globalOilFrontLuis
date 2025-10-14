import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';

const ListadoPruebas = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [pruebas, setPruebas] = useState([]);
  const [pruebasAgrupadas, setPruebasAgrupadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    activo: null,
    unidad: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pruebasExpandidas, setPruebasExpandidas] = useState(new Set());

  // Obtener pruebas
  const fetchPruebas = async () => {
    setLoading(true);
    try {
      const response = await api.get('lubrication/tests/');
      setPruebas(response.data);
      agruparPruebas(response.data);
    } catch (error) {
      toast.error('Error al cargar pruebas: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPruebas();
  }, []);

  // Función para agrupar pruebas usando is_subPrueba y parent_node
  const agruparPruebas = (datos) => {
    const gruposMap = new Map();
    const pruebasIndividuales = [];
    
    // Primero identificar todas las pruebas principales (no son subpruebas)
    datos.forEach(prueba => {
      if (!prueba.is_subPrueba) {
        gruposMap.set(prueba.id, {
          ...prueba,
          esGrupo: true,
          subpruebas: []
        });
      }
    });

    // Luego asignar las subpruebas a sus padres
    datos.forEach(prueba => {
      if (prueba.is_subPrueba && prueba.parent_node && prueba.parent_node !== -1) {
        const padre = gruposMap.get(prueba.parent_node);
        if (padre) {
          padre.subpruebas.push(prueba);
        } else {
          // Si no encuentra el padre, mostrar como individual
          pruebasIndividuales.push(prueba);
        }
      } else if (!prueba.is_subPrueba && !gruposMap.has(prueba.id)) {
        // Pruebas principales que no están en el map (por si acaso)
        gruposMap.set(prueba.id, {
          ...prueba,
          esGrupo: true,
          subpruebas: []
        });
      }
    });

    // Combinar grupos y pruebas individuales
    const resultado = [...gruposMap.values(), ...pruebasIndividuales];
    
    // Ordenar por código
    resultado.sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    setPruebasAgrupadas(resultado);
  };

  // Alternar expansión de grupo
  const toggleExpansion = (pruebaId) => {
    const nuevosExpandidos = new Set(pruebasExpandidas);
    if (nuevosExpandidos.has(pruebaId)) {
      nuevosExpandidos.delete(pruebaId);
    } else {
      nuevosExpandidos.add(pruebaId);
    }
    setPruebasExpandidas(nuevosExpandidos);
  };

  // "Eliminar" prueba (realmente desactivar)
  const handleDeletePrueba = async (pruebaId) => {
    setDeleting(true);
    try {
      await api.patch(`lubrication/tests/${pruebaId}/`, {
        activo: false
      });
      
      toast.success('Prueba desactivada correctamente');
      setDeleteConfirm(null);
      fetchPruebas();
    } catch (error) {
      console.error('Error completo:', error);
      toast.error('Error al desactivar prueba: ' + (error.response?.data?.message || error.message));
    } finally {
      setDeleting(false);
    }
  };

  // Activar prueba
  const handleActivarPrueba = async (pruebaId) => {
    try {
      await api.patch(`lubrication/tests/${pruebaId}/`, {
        activo: true
      });
      toast.success('Prueba activada correctamente');
      fetchPruebas();
    } catch (error) {
      toast.error('Error al activar prueba: ' + (error.response?.data?.message || error.message));
    }
  };

  // Aplicar filtros
  const filteredData = pruebasAgrupadas.filter(item => {
    const matchesSearch = 
      !searchTerm ||
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.metodo_referencia && item.metodo_referencia.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilters = 
      (filters.activo === null || item.activo === filters.activo) &&
      (!filters.unidad || item.unidad_medida === filters.unidad);

    return matchesSearch && matchesFilters;
  });

  // Obtener unidades únicas para filtro
  const unidadesUnicas = [...new Set(pruebas.map(p => p.unidad_medida).filter(Boolean))];

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      activo: null,
      unidad: null
    });
  };

  // Contadores para el resumen
  const activeCount = pruebas.filter(p => p.activo).length;
  const inactiveCount = pruebas.filter(p => !p.activo).length;

  // Renderizar fila de grupo
  const renderFilaGrupo = (grupo) => {
    const estaExpandido = pruebasExpandidas.has(grupo.id);
    const tieneSubpruebas = grupo.subpruebas && grupo.subpruebas.length > 0;

    return (
      <>
        <tr key={`grupo-${grupo.id}`} className="bg-gray-750 hover:bg-gray-700 transition-colors duration-150">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              {tieneSubpruebas && (
                <button
                  onClick={() => toggleExpansion(grupo.id)}
                  className="mr-2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <svg 
                    className={`w-4 h-4 transform transition-transform ${estaExpandido ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <div className="text-sm font-bold text-white flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {grupo.codigo}
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-200">{grupo.nombre}</div>
            {tieneSubpruebas && (
              <div className="text-xs text-gray-400 mt-1">
                {grupo.subpruebas.length} subprueba{grupo.subpruebas.length !== 1 ? 's' : ''}
              </div>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-400">{grupo.unidad_medida || '-'}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-400">{grupo.metodo_referencia || '-'}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              grupo.activo 
                ? 'bg-green-900 text-green-200' 
                : 'bg-red-900 text-red-200'
            }`}>
              {grupo.activo ? 'Activo' : 'Inactivo'}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => router.push(`/pruebas/detalle-prueba?id=${grupo.id}`)}
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 p-1 rounded"
                title="Ver detalle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>

              <button
                onClick={() => router.push(`/pruebas/edit-pruebas?id=${grupo.id}`)}
                className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 p-1 rounded"
                title="Editar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                onClick={() => router.push(`/pruebas/create-pruebas?parent=${grupo.id}`)}
                className="text-green-400 hover:text-green-300 transition-colors duration-200 p-1 rounded"
                title="Agregar subprueba"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {grupo.activo ? (
                <button
                  onClick={() => setDeleteConfirm(grupo)}
                  className="text-red-400 hover:text-red-300 transition-colors duration-200 p-1 rounded"
                  title="Desactivar prueba"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => handleActivarPrueba(grupo.id)}
                  className="text-green-400 hover:text-green-300 transition-colors duration-200 p-1 rounded"
                  title="Activar prueba"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Subpruebas */}
        {estaExpandido && tieneSubpruebas && grupo.subpruebas.map((subprueba) => (
          <tr key={subprueba.id} className="bg-gray-800 hover:bg-gray-750 transition-colors duration-150 border-l-4 border-blue-500">
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex items-center pl-8">
                <div className="text-sm font-medium text-gray-300 ml-2">
                  {subprueba.codigo}
                </div>
              </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-300">{subprueba.nombre}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-400">{subprueba.unidad_medida || '-'}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-400">{subprueba.metodo_referencia || '-'}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                subprueba.activo 
                  ? 'bg-green-900 text-green-200' 
                  : 'bg-red-900 text-red-200'
              }`}>
                {subprueba.activo ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => router.push(`/pruebas/detalle-prueba?id=${subprueba.id}`)}
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200 p-1 rounded"
                  title="Ver detalle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>

                <button
                  onClick={() => router.push(`/pruebas/edit-pruebas?id=${subprueba.id}`)}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 p-1 rounded"
                  title="Editar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {subprueba.activo ? (
                  <button
                    onClick={() => setDeleteConfirm(subprueba)}
                    className="text-red-400 hover:text-red-300 transition-colors duration-200 p-1 rounded"
                    title="Desactivar prueba"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivarPrueba(subprueba.id)}
                    className="text-green-400 hover:text-green-300 transition-colors duration-200 p-1 rounded"
                    title="Activar prueba"
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
      </>
    );
  };

  // Renderizar fila individual
  const renderFilaIndividual = (prueba) => (
    <tr key={prueba.id} className="hover:bg-gray-750 transition-colors duration-150">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-white">{prueba.codigo}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-300">{prueba.nombre}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-400">{prueba.unidad_medida || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-400">{prueba.metodo_referencia || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          prueba.activo 
            ? 'bg-green-900 text-green-200' 
            : 'bg-red-900 text-red-200'
        }`}>
          {prueba.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => router.push(`/pruebas/detalle-prueba?id=${prueba.id}`)}
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200 p-1 rounded"
            title="Ver detalle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          <button
            onClick={() => router.push(`/pruebas/edit-pruebas?id=${prueba.id}`)}
            className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200 p-1 rounded"
            title="Editar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {prueba.activo ? (
            <button
              onClick={() => setDeleteConfirm(prueba)}
              className="text-red-400 hover:text-red-300 transition-colors duration-200 p-1 rounded"
              title="Desactivar prueba"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => handleActivarPrueba(prueba.id)}
              className="text-green-400 hover:text-green-300 transition-colors duration-200 p-1 rounded"
              title="Activar prueba"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  // El resto del componente (header, filtros, etc.) se mantiene igual
  return (
    <div className="min-h-screen bg-[#1A1A1A] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-[#292929] rounded-lg shadow-lg mb-6 p-6 border border-[#424242]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestión de Pruebas</h1>
              <p className="text-gray-300 mt-1">Administra y gestiona todas las pruebas del sistema</p>
            </div>
            <button
              onClick={() => router.push('/pruebas/create-pruebas')}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Prueba
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
                  placeholder="Buscar pruebas por código, nombre o método..."
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
                  onClick={fetchPruebas}
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
                      onClick={() => setFilters({...filters, activo: null})}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                        filters.activo === null 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilters({...filters, activo: true})}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                        filters.activo === true 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Activas
                    </button>
                    <button
                      onClick={() => setFilters({...filters, activo: false})}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                        filters.activo === false 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      Inactivas
                    </button>
                  </div>

                  {unidadesUnicas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-gray-300 text-sm">Unidad:</span>
                      <button
                        onClick={() => setFilters({...filters, unidad: null})}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                          !filters.unidad 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        Todas
                      </button>
                      {unidadesUnicas.map(unidad => (
                        <button
                          key={unidad}
                          onClick={() => setFilters({...filters, unidad})}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                            filters.unidad === unidad 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {unidad}
                        </button>
                      ))}
                    </div>
                  )}

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
                <p className="text-gray-400 text-sm">Total de Pruebas</p>
                <p className="text-2xl font-bold text-white">{filteredData.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-[#292929] rounded-lg p-4 border border-[#424242]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pruebas Activas</p>
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
                <p className="text-gray-400 text-sm">Pruebas Inactivas</p>
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

      {/* Tabla de pruebas MODIFICADA */}
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
              <h3 className="mt-2 text-lg font-medium text-white">No se encontraron pruebas</h3>
              <p className="mt-1 text-gray-400">
                {pruebas.length === 0 ? 'No hay pruebas registradas en el sistema.' : 'No hay resultados que coincidan con los filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Código
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Unidad
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Método
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#292929] divide-y divide-gray-700">
                  {filteredData.map((item) => 
                    item.esGrupo ? renderFilaGrupo(item) : renderFilaIndividual(item)
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de confirmación de desactivación */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Confirmar Desactivación</h3>
              </div>
              
              <p className="text-gray-300 mb-4">
                ¿Está seguro de que desea desactivar la prueba <strong className="text-white">"{deleteConfirm.codigo} - {deleteConfirm.nombre}"</strong>?
              </p>
              
              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-yellow-200 text-sm">
                    <strong>Nota:</strong> La prueba no se eliminará del sistema, solo se desactivará. Podrá reactivarla en cualquier momento.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeletePrueba(deleteConfirm.id)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Desactivando...
                    </>
                  ) : (
                    'Desactivar Prueba'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListadoPruebas;