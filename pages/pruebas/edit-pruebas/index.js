import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';

const EditarPrueba = () => {
  const { api } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pruebaData, setPruebaData] = useState(null);
  const [pruebasDisponibles, setPruebasDisponibles] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [allLimits, setAllLimits] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [selectedLimit, setSelectedLimit] = useState('');
  const [currentAssignedLimit, setCurrentAssignedLimit] = useState(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    metodo_referencia: '',
    unidad_medida: '',
    equipo_requerido: '',
    categoria: '',
    is_subPrueba: false,
    parent_node: -1,
    activo: true
  });

  // Fetch all initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch current prueba data
        const pruebaResponse = await api.get(`lubrication/tests/${id}/`);
        const currentPrueba = pruebaResponse.data;
        
        if (!currentPrueba) {
          toast.error('Prueba no encontrada');
          return;
        }

        setPruebaData(currentPrueba);
        
        // Set form data including parent information
        setFormData({
          codigo: currentPrueba.codigo || '',
          nombre: currentPrueba.nombre || '',
          descripcion: currentPrueba.descripcion || '',
          metodo_referencia: currentPrueba.metodo_referencia || '',
          unidad_medida: currentPrueba.unidad_medida || '',
          equipo_requerido: currentPrueba.equipo_requerido || '',
          categoria: currentPrueba.categoria || 'viscosidad',
          is_subPrueba: currentPrueba.is_subPrueba || false,
          parent_node: currentPrueba.parent_node || -1,
          activo: currentPrueba.activo !== undefined ? currentPrueba.activo : true
        });

        // Fetch all available tests for parent selection
        const pruebasResponse = await api.get('lubrication/tests/');
        // Filtrar solo pruebas que no son subpruebas y no son la misma prueba actual
        const pruebasPadre = pruebasResponse.data.filter(prueba => 
          !prueba.is_subPrueba && prueba.id.toString() !== id
        );
        setPruebasDisponibles(pruebasPadre);

        // Fetch content types
        const contentTypesResponse = await api.get('content/');
        setContentTypes(contentTypesResponse.data);

        // Fetch all limits from different endpoints
        const [calidadResponse, viscosidadResponse, genericoResponse, elementosResponse] = await Promise.all([
          api.get('limites-calidad/'),
          api.get('limites-viscosidad/'),
          api.get('limites-genericos/'),
          api.get('elementos/')
        ]);
        
        // Combine all limits with their types
        const combinedLimits = [
          ...calidadResponse.data.map(item => ({ 
            ...item, 
            type: 'limitecalidad',
            displayName: `${item.c1 || ''}${item.c2 ? '/' + item.c2 : ''}${item.valor ? ' - ' + item.valor : ''}` || 'Límite Calidad'
          })),
          ...viscosidadResponse.data.map(item => ({ 
            ...item, 
            type: 'limiteviscosidad',
            displayName: `${item.v1 || ''}${item.v2 ? '/' + item.v2 : ''}${item.vmin ? ' min:' + item.vmin : ''}${item.vmax ? ' max:' + item.vmax : ''}` || 'Límite Viscosidad'
          })),
          ...genericoResponse.data.map(item => ({ 
            ...item, 
            type: 'limitegenerico',
            displayName: item.nombre || 'Límite Genérico'
          })),
          ...elementosResponse.data.map(item => ({ 
            ...item, 
            type: 'elementoanalisis',
            displayName: `${item.simbolo} - ${item.nombre}${item.valor ? ' (' + item.valor + ')' : ''}`
          }))
        ];
        setAllLimits(combinedLimits);

        // Fetch current assigned limit using the PruebaLimite relationship
        try {
          const limiteAsignadoResponse = await api.get(`pruebas/${id}/limite-asignado/`);
          const assignedLimitData = limiteAsignadoResponse.data;
          
          if (assignedLimitData && !assignedLimitData.detail) {
            setCurrentAssignedLimit(assignedLimitData);
            
            // Find the actual limit object
            const limitObj = combinedLimits.find(limit => 
              limit.id === assignedLimitData.object_id && 
              contentTypesResponse.data.some(ct => 
                ct.id === assignedLimitData.content_type && 
                ct.model === limit.type
              )
            );
            
            if (limitObj) {
              setSelectedContentType(limitObj.type);
              setSelectedLimit(limitObj.id.toString());
            }
          }
        } catch (error) {
          // No hay límite asignado, es normal
          console.log('No hay límite asignado a esta prueba');
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error al cargar los datos: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, id]);

  // Filter limits by selected content type
  const filteredLimits = selectedContentType 
    ? allLimits.filter(limit => limit.type === selectedContentType)
    : [];

  // Get current limit details
  const currentLimitDetails = selectedLimit 
    ? filteredLimits.find(limit => limit.id.toString() === selectedLimit)
    : null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleIsSubPruebaChange = (e) => {
    const isSubPrueba = e.target.checked;
    setFormData(prev => ({
      ...prev,
      is_subPrueba: isSubPrueba,
      parent_node: isSubPrueba ? (prev.parent_node !== -1 ? prev.parent_node : '') : -1
    }));
  };

  const handleContentTypeChange = (e) => {
    setSelectedContentType(e.target.value);
    setSelectedLimit('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Preparar datos para enviar
      const submitData = {
        ...formData,
        parent_node: formData.is_subPrueba ? parseInt(formData.parent_node) : -1
      };

      // Update prueba
      await api.patch(`lubrication/tests/${id}/`, submitData);

      // Handle limit assignment/removal
      if (selectedLimit && selectedContentType) {
        // Assign new limit
        const contentType = contentTypes.find(ct => ct.model === selectedContentType);
        
        await api.post(`pruebas/${id}/asignar-limite/`, {
          content_type_id: contentType.id,
          object_id: parseInt(selectedLimit)
        });
        
        toast.success('Prueba y límite actualizados exitosamente');
      } else if (currentAssignedLimit && !selectedLimit) {
        // Remove existing limit
        await api.delete(`pruebas-limite/${currentAssignedLimit.id}/`);
        toast.success('Prueba actualizada y límite removido exitosamente');
      } else {
        toast.success('Prueba actualizada exitosamente');
      }

      router.push('/pruebas');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Error al actualizar prueba: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLimit = () => {
    setSelectedContentType('');
    setSelectedLimit('');
    setCurrentAssignedLimit(null);
  };

  if (loading || !pruebaData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-white mt-4">Cargando prueba...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.push('/pruebas')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Editar Prueba: {formData.codigo}
              </h1>
              <p className="text-gray-400 mt-2">
                {formData.nombre}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#292929] rounded-lg border border-gray-700 p-6">
          {/* Información Básica */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Información Básica</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoría
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  <option value="viscosidad">Viscosidad</option>
                  <option value="calidad">Calidad</option>
                  <option value="elementos">Elementos</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Método de Referencia */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Método de Referencia
                </label>
                <input
                  type="text"
                  name="metodo_referencia"
                  value={formData.metodo_referencia}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Unidad de Medida */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unidad de Medida
                </label>
                <input
                  type="text"
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Equipo Requerido */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Equipo Requerido
                </label>
                <input
                  type="text"
                  name="equipo_requerido"
                  value={formData.equipo_requerido}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-700 my-6"></div>

          {/* Configuración de Subprueba */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Configuración de Subprueba</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.is_subPrueba}
                      onChange={handleIsSubPruebaChange}
                      className="sr-only"
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors duration-200 ${
                      formData.is_subPrueba ? 'bg-red-500' : 'bg-gray-600'
                    }`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${
                      formData.is_subPrueba ? 'transform translate-x-6' : ''
                    }`}></div>
                  </div>
                  <span className="ml-3 text-white font-medium">
                    ¿Es una subprueba?
                  </span>
                </label>
              </div>

              {/* Información del Padre Actual */}
              {pruebaData.prueba_padre && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-blue-300 font-medium mb-1">Prueba Padre Actual</h4>
                      <p className="text-blue-400 text-sm">
                        <strong>{pruebaData.prueba_padre.codigo}</strong> - {pruebaData.prueba_padre.nombre}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {formData.is_subPrueba && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prueba Padre *
                  </label>
                  <select
                    name="parent_node"
                    value={formData.parent_node}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">Seleccione una prueba padre</option>
                    {pruebasDisponibles.map(prueba => (
                      <option key={prueba.id} value={prueba.id}>
                        {prueba.codigo} - {prueba.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Solo se muestran pruebas que no son subpruebas
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-700 my-6"></div>

          {/* Límite de la Prueba */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Límite de la Prueba</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Tipo de Límite */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Límite
                </label>
                <select
                  value={selectedContentType}
                  onChange={handleContentTypeChange}
                  className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="limitecalidad">Límite de Calidad</option>
                  <option value="limiteviscosidad">Límite de Viscosidad</option>
                  <option value="limitegenerico">Límite Genérico</option>
                  <option value="elementoanalisis">Elemento de Análisis</option>
                </select>
              </div>

              {/* Límites Disponibles */}
              {selectedContentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Límites Disponibles
                  </label>
                  <select
                    value={selectedLimit}
                    onChange={(e) => setSelectedLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">Seleccione un límite</option>
                    {filteredLimits.map(limit => (
                      <option key={limit.id} value={limit.id}>
                        {limit.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Información del Límite Seleccionado */}
            {currentLimitDetails && (
              <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Límite Seleccionado
                    </h3>
                    <div className="text-gray-300 space-y-1">
                      <p><strong>Nombre:</strong> {currentLimitDetails.displayName}</p>
                      <p><strong>Tipo:</strong> {selectedContentType}</p>
                      {currentLimitDetails.valor && <p><strong>Valor:</strong> {currentLimitDetails.valor}</p>}
                      {currentLimitDetails.symbol_operation && <p><strong>Operación:</strong> {currentLimitDetails.symbol_operation}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLimit}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Límite Actualmente Asignado */}
            {currentAssignedLimit && !selectedLimit && (
              <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Límite Actualmente Asignado
                    </h3>
                    <p className="text-blue-300">
                      Esta prueba ya tiene un límite asignado. Selecciona uno nuevo para reemplazarlo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLimit}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 my-6"></div>

          {/* Estado y Botones de Acción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Activo</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => router.push('/pruebas')}
                disabled={saving}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPrueba;