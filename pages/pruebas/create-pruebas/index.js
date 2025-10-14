import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';

const CrearPrueba = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState('');
  const [limits, setLimits] = useState([]);
  const [selectedLimit, setSelectedLimit] = useState('');
  const [currentLimit, setCurrentLimit] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    metodo_referencia: '',
    unidad_medida: '',
    categoria: 'viscosidad',
    is_subPrueba: false,
    parent_node: -1,
    activo: true
  });

  // Fetch content types
  useEffect(() => {
    const fetchContentTypes = async () => {
      try {
        const response = await api.get('content/');
        // Filtrar solo los tipos de límite que tenemos
        const allowedModels = ['limitecalidad', 'limiteviscosidad', 'limitegenerico', 'elementoanalisis'];
        const filteredContentTypes = response.data.filter(ct => 
          allowedModels.includes(ct.model)
        );
        setContentTypes(filteredContentTypes);
      } catch (error) {
        toast.error('Error al cargar tipos de contenido');
      }
    };
    fetchContentTypes();
  }, [api]);

  // Fetch limits when content type changes
  useEffect(() => {
    if (!selectedContentType) {
      setLimits([]);
      setSelectedLimit('');
      setCurrentLimit(null);
      return;
    }

    const fetchLimits = async () => {
      try {
        let endpoint = '';
        switch (selectedContentType) {
          case 'limitecalidad':
            endpoint = 'limites-calidad/';
            break;
          case 'limiteviscosidad':
            endpoint = 'limites-viscosidad/';
            break;
          case 'limitegenerico':
            endpoint = 'limites-genericos/';
            break;
          case 'elementoanalisis':
            endpoint = 'elementos/';
            break;
          default:
            return;
        }

        const response = await api.get(endpoint);
        setLimits(response.data);
      } catch (error) {
        toast.error('Error al cargar límites');
        setLimits([]);
      }
    };
    fetchLimits();
  }, [selectedContentType, api]);

  // Update current limit when selected limit changes
  useEffect(() => {
    if (selectedLimit && limits.length > 0) {
      const limit = limits.find(l => l.id == selectedLimit);
      setCurrentLimit(limit);
    } else {
      setCurrentLimit(null);
    }
  }, [selectedLimit, limits]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleIsSubPruebaChange = (e) => {
    const isSubPrueba = e.target.checked;
    setFormData({
      ...formData,
      is_subPrueba: isSubPrueba,
      parent_node: isSubPrueba ? '' : -1
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validaciones
    if (formData.is_subPrueba && !formData.parent_node) {
      toast.error('Debe seleccionar una prueba padre para la subprueba');
      setLoading(false);
      return;
    }

    try {
      // Preparar datos para enviar
      const submitData = {
        ...formData,
        parent_node: formData.is_subPrueba ? parseInt(formData.parent_node) : -1
      };

      // Create test
      const testResponse = await api.post('lubrication/tests/', submitData);
      const testId = testResponse.data.id;

      // Asignar límite si se seleccionó uno
      if (selectedLimit && selectedContentType) {
        const contentType = contentTypes.find(ct => ct.model === selectedContentType);
        
        await api.post(`pruebas/${testId}/asignar-limite/`, {
          content_type_id: contentType.id,
          object_id: parseInt(selectedLimit)
        });
      }

      toast.success('Prueba creada exitosamente');
      router.push('/pruebas');
    } catch (error) {
      console.error('Error details:', error);
      toast.error(error.response?.data?.message || 'Error al crear prueba');
    } finally {
      setLoading(false);
    }
  };

  const getLimitDisplayName = (limit) => {
    if (!limit) return '';
    
    if (limit.simbolo && limit.nombre) {
      return `${limit.simbolo} - ${limit.nombre}`;
    } else if (limit.v1 && limit.v2) {
      return `Viscosidad: ${limit.v1}/${limit.v2}`;
    } else if (limit.c1 && limit.c2) {
      return `Calidad: ${limit.c1}/${limit.c2}`;
    } else if (limit.nombre) {
      return `Genérico: ${limit.nombre}`;
    }
    return 'Límite sin nombre';
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-[#292929] rounded-lg shadow-lg mb-6 p-6 border border-[#292928]">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/pruebas')}
              className="text-white hover:text-red-400 mr-4 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Crear Nueva Prueba
            </h1>
          </div>
          <p className="text-gray-300 text-sm sm:text-base">
            Complete la información para crear una nueva prueba o subprueba en el sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#292929] rounded-lg shadow-lg border border-gray-700 p-6">
          {/* Información Básica */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 pb-3 border-b border-gray-700">
              Información Básica
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                  placeholder="Ingrese el código"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                  placeholder="Ingrese el nombre"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200 resize-vertical"
                  placeholder="Ingrese la descripción"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Método de Referencia
                </label>
                <input
                  type="text"
                  name="metodo_referencia"
                  value={formData.metodo_referencia}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                  placeholder="Ingrese el método"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unidad de Medida
                </label>
                <input
                  type="text"
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                  placeholder="Ingrese la unidad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoría
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                >
                  <option value="viscosidad">Viscosidad</option>
                  <option value="calidad">Calidad</option>
                  <option value="elementos">Elementos</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 my-6"></div>

          {/* Configuración de Subprueba */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Configuración de Subprueba
            </h2>

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

              {formData.is_subPrueba && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prueba Padre *
                  </label>
                  <select
                    name="parent_node"
                    value={formData.parent_node}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                  >
                    <option value="">Seleccione una prueba padre</option>
                    {/* Aquí cargarías las pruebas disponibles */}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-700 my-6"></div>

          {/* Límite de la Prueba */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Límite de la Prueba
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Límite
                </label>
                <select
                  value={selectedContentType}
                  onChange={(e) => setSelectedContentType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                >
                  <option value="">Seleccione tipo de límite</option>
                  {contentTypes.map(ct => (
                    <option key={ct.id} value={ct.model}>
                      {ct.model === 'limitecalidad' && 'Límite de Calidad'}
                      {ct.model === 'limiteviscosidad' && 'Límite de Viscosidad'}
                      {ct.model === 'limitegenerico' && 'Límite Genérico'}
                      {ct.model === 'elementoanalisis' && 'Elemento de Análisis'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedContentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Límite Disponible
                  </label>
                  <select
                    value={selectedLimit}
                    onChange={(e) => setSelectedLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                  >
                    <option value="">Seleccione un límite</option>
                    {limits.map(limit => (
                      <option key={limit.id} value={limit.id}>
                        {getLimitDisplayName(limit)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Información del Límite Seleccionado */}
            {currentLimit && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Información del Límite Seleccionado
                </h3>
                <div className="text-gray-300 space-y-1">
                  <p><strong>Tipo:</strong> {selectedContentType}</p>
                  <p><strong>Nombre:</strong> {getLimitDisplayName(currentLimit)}</p>
                  {currentLimit.valor && <p><strong>Valor:</strong> {currentLimit.valor}</p>}
                  {currentLimit.symbol_operation && <p><strong>Operación:</strong> {currentLimit.symbol_operation}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 my-6"></div>

          {/* Estado y Acciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-red-500 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                />
                <span className="ml-2 text-white font-medium">
                  Prueba Activa
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => router.push('/pruebas')}
                disabled={loading}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </div>
                ) : (
                  'Guardar Prueba'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearPrueba;