import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../shared/context/AuthContext';
import { toast } from 'react-toastify';

const CrearLimite = () => {
  const { api } = useAuth();
  const router = useRouter();
  const { prueba_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('viscosidad');
  const [contentTypes, setContentTypes] = useState([]);
  const [limitesExistentes, setLimitesExistentes] = useState({
    viscosidad: [],
    calidad: [],
    generico: [],
    elemento: []
  });
  const [tiposViscosidad, setTiposViscosidad] = useState([]);
  const [tiposCalidad, setTiposCalidad] = useState([]);
  const [secuenciasEspuma, setSecuenciasEspuma] = useState([]);

  // Estados para cada tipo de límite
  const [viscosidadData, setViscosidadData] = useState({
    v1: '',
    v2: '',
    vmin: '',
    vmax: '',
    iv1: '',
    iv2: ''
  });

  const [calidadData, setCalidadData] = useState({
    c1: '',
    c2: '',
    seq_espuma: '',
    chispa: '',
    valor: ''
  });

  const [genericoData, setGenericoData] = useState({
    nombre: '',
    valor: '',
    symbol_operation: '',
    type_operation: ''
  });

  const [elementoData, setElementoData] = useState({
    simbolo: '',
    nombre: '',
    valor: '',
    symbol_operation: ''
  });

  const [elementos, setElementos] = useState([]);

  const operaciones = [
    { value: '<', label: 'Menor que' },
    { value: '<=', label: 'Menor o igual' },
    { value: '=', label: 'Igual' },
    { value: '>=', label: 'Mayor o igual' },
    { value: '>', label: 'Mayor que' }
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Cargar content types
        const contentTypesResponse = await api.get('content/');
        setContentTypes(contentTypesResponse.data);

        // Cargar límites existentes, tipos de viscosidad y tipos de calidad
        const [
          viscosidadResponse, 
          calidadResponse, 
          genericoResponse, 
          elementoResponse, 
          tiposViscosidadResponse,
          tiposCalidadResponse,
          pruebasResponse
        ] = await Promise.all([
          api.get('limites-viscosidad/'),
          api.get('limites-calidad/'),
          api.get('limites-genericos/'),
          api.get('limites-elemento/'),
          api.get('tipos-viscosidad/'),
          api.get('tipos-calidad/'),
          api.get('lubrication/tests/')
        ]);

        setLimitesExistentes({
          viscosidad: viscosidadResponse.data,
          calidad: calidadResponse.data,
          generico: genericoResponse.data,
          elemento: elementoResponse.data,
        });

        setTiposViscosidad(tiposViscosidadResponse.data);
        setTiposCalidad(tiposCalidadResponse.data);

        // Filtrar secuencias de espuma de las pruebas
        const pruebaEspuma = pruebasResponse.data.find(prueba => 
          prueba.categoria === 'calidad' && prueba.codigo === 'ESP'
        );

        const secuencias = pruebaEspuma ? pruebaEspuma.pruebas_estructuradas : [];
        setSecuenciasEspuma(secuencias);

        // Cargar elementos existentes
        const elementosResponse = await api.get('elementos/');
        setElementos(elementosResponse.data);

      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        toast.error('Error al cargar datos iniciales');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [api]);

  const handleViscosidadChange = (e) => {
    const { name, value } = e.target;
    setViscosidadData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCalidadChange = (e) => {
    const { name, value } = e.target;
    setCalidadData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenericoChange = (e) => {
    const { name, value } = e.target;
    setGenericoData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleElementoChange = (e) => {
    const { name, value } = e.target;
    setElementoData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitViscosidad = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        v1: viscosidadData.v1,
        v2: viscosidadData.v2,
        vmin: viscosidadData.vmin ? parseFloat(viscosidadData.vmin) : null,
        vmax: viscosidadData.vmax ? parseFloat(viscosidadData.vmax) : null,
        iv1: viscosidadData.iv1 ? parseInt(viscosidadData.iv1) : null,
        iv2: viscosidadData.iv2 ? parseInt(viscosidadData.iv2) : null
      };

      const response = await api.post('limites-viscosidad/', dataToSend);
      toast.success('Límite de viscosidad creado exitosamente');
      
      if (prueba_id) {
        await asignarLimiteAPrueba(response.data.id, 'limiteviscosidad');
      } else {
        setLimitesExistentes(prev => ({
          ...prev,
          viscosidad: [...prev.viscosidad, response.data]
        }));
        setViscosidadData({ 
          v1: '', 
          v2: '', 
          vmin: '', 
          vmax: '', 
          iv1: '', 
          iv2: '' 
        });
      }
    } catch (error) {
      toast.error('Error al crear límite de viscosidad: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCalidad = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        c1: calidadData.c1,
        c2: calidadData.c2,
        seq_espuma: calidadData.seq_espuma,
        chispa: calidadData.chispa ? parseInt(calidadData.chispa) : null,
        valor: calidadData.valor
      };

      const response = await api.post('limites-calidad/', dataToSend);
      toast.success('Límite de calidad creado exitosamente');
      
      if (prueba_id) {
        await asignarLimiteAPrueba(response.data.id, 'limitecalidad');
      } else {
        setLimitesExistentes(prev => ({
          ...prev,
          calidad: [...prev.calidad, response.data]
        }));
        setCalidadData({ 
          c1: '', 
          c2: '', 
          seq_espuma: '', 
          chispa: '', 
          valor: '' 
        });
      }
    } catch (error) {
      toast.error('Error al crear límite de calidad: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGenerico = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...genericoData,
        valor: genericoData.valor ? parseFloat(genericoData.valor) : null
      };

      const response = await api.post('limites-genericos/', dataToSend);
      toast.success('Límite genérico creado exitosamente');
      
      if (prueba_id) {
        await asignarLimiteAPrueba(response.data.id, 'limitegenerico');
      } else {
        setLimitesExistentes(prev => ({
          ...prev,
          generico: [...prev.generico, response.data]
        }));
        setGenericoData({ nombre: '', valor: '', symbol_operation: '', type_operation: '' });
      }
    } catch (error) {
      toast.error('Error al crear límite genérico: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitElemento = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        simbolo: elementoData.simbolo,
        nombre: elementoData.nombre,
        valor: elementoData.valor ? parseFloat(elementoData.valor) : null,
        symbol_operation: elementoData.symbol_operation
      };

      const response = await api.post('elementos/', dataToSend);
      toast.success('Elemento creado exitosamente');
      
      if (prueba_id) {
        await asignarLimiteAPrueba(response.data.id, 'elementoanalisis');
      } else {
        setElementos(prev => [...prev, response.data]);
        setElementoData({ 
          simbolo: '', 
          nombre: '', 
          valor: '', 
          symbol_operation: '' 
        });
      }
    } catch (error) {
      toast.error('Error al crear elemento: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const asignarLimiteAPrueba = async (objectId, contentTypeModel) => {
    try {
      const contentType = contentTypes.find(ct => ct.model === contentTypeModel);
      if (!contentType) {
        throw new Error('Tipo de contenido no encontrado');
      }

      await api.post(`pruebas/${prueba_id}/asignar-limite/`, {
        content_type_id: contentType.id,
        object_id: objectId
      });

      toast.success('Límite asignado a la prueba exitosamente');
      router.push('/pruebas');
    } catch (error) {
      toast.error('Error al asignar límite: ' + (error.response?.data?.message || error.message));
    }
  };

  const asignarLimiteExistente = async (limiteId, contentTypeModel) => {
    try {
      const contentType = contentTypes.find(ct => ct.model === contentTypeModel);
      if (!contentType) {
        throw new Error('Tipo de contenido no encontrado');
      }

      await api.post(`pruebas/${prueba_id}/asignar-limite/`, {
        content_type_id: contentType.id,
        object_id: limiteId
      });

      toast.success('Límite existente asignado a la prueba exitosamente');
      router.push('/pruebas');
    } catch (error) {
      toast.error('Error al asignar límite: ' + (error.response?.data?.message || error.message));
    }
  };

  // Filtrar tipos de viscosidad por V1 y V2
  const tiposV1 = tiposViscosidad.filter(tipo => tipo.is_v_1);
  const tiposV2 = tiposViscosidad.filter(tipo => tipo.is_v_2);

  // Filtrar tipos de calidad por C1 y C2
  const tiposC1 = tiposCalidad.filter(tipo => tipo.is_c_1);
  const tiposC2 = tiposCalidad.filter(tipo => tipo.is_c_2);

  if (loading && !contentTypes.length) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-white mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {prueba_id ? 'Asignar Límite a Prueba' : 'Crear Nuevo Límite'}
          </h1>
          <p className="text-gray-400">
            {prueba_id 
              ? 'Selecciona o crea un límite para asociarlo a la prueba'
              : 'Crea nuevos límites que podrán ser asignados a pruebas'
            }
          </p>
        </div>

        <div className="bg-[#292929] rounded-lg mb-6 border border-gray-700">
          <div className="flex border-b border-gray-700 overflow-x-auto">
            {['viscosidad', 'calidad', 'generico', 'elemento'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-0 py-4 px-6 text-center font-medium whitespace-nowrap ${
                  activeTab === tab 
                    ? 'text-white border-b-2 border-red-600' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'viscosidad' && 'Límite Viscosidad'}
                {tab === 'calidad' && 'Límite Calidad'}
                {tab === 'generico' && 'Límite Genérico'}
                {tab === 'elemento' && 'Crear Elemento'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Mostrar límites existentes si estamos asignando a una prueba */}
            {prueba_id && limitesExistentes[activeTab].length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Límites Existentes de {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {limitesExistentes[activeTab].map((limite) => (
                    <div key={limite.id} className="bg-[#1a1a1a] border border-gray-600 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <span className="text-white font-medium">
                          {limite.v1 && limite.v2 
                            ? `${limite.v1} / ${limite.v2}`
                            : limite.c1 && limite.c2
                            ? `${limite.c1} / ${limite.c2}`
                            : limite.v1 || limite.v2 || limite.c1 || limite.c2 || limite.tipo || limite.nombre || (limite.elemento && `${limite.elemento.nombre} - ${limite.categoria.nombre}`) || 'Límite sin nombre'
                          }
                        </span>
                        {limite.valor && (
                          <span className="text-gray-400 text-sm ml-2">({limite.valor})</span>
                        )}
                      </div>
                      <button
                        onClick={() => asignarLimiteExistente(limite.id, `limite${activeTab}`)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Usar este
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-600 my-4 pt-4">
                  <p className="text-gray-400 text-center">O crea uno nuevo:</p>
                </div>
              </div>
            )}

            {/* Formulario de Viscosidad */}
            {activeTab === 'viscosidad' && (
              <form onSubmit={handleSubmitViscosidad}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Viscosidad 1 (V1) *</label>
                    <select
                      name="v1"
                      value={viscosidadData.v1}
                      onChange={handleViscosidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      required
                    >
                      <option value="">Seleccionar V1</option>
                      {tiposV1.map(tipo => (
                        <option key={tipo.id} value={tipo.nombre}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Viscosidad 2 (V2) *</label>
                    <select
                      name="v2"
                      value={viscosidadData.v2}
                      onChange={handleViscosidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      required
                    >
                      <option value="">Seleccionar V2</option>
                      {tiposV2.map(tipo => (
                        <option key={tipo.id} value={tipo.nombre}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Viscosidad Mínima</label>
                    <input
                      type="number"
                      step="0.01"
                      name="vmin"
                      value={viscosidadData.vmin}
                      onChange={handleViscosidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Viscosidad Máxima</label>
                    <input
                      type="number"
                      step="0.01"
                      name="vmax"
                      value={viscosidadData.vmax}
                      onChange={handleViscosidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Índice Viscosidad 1</label>
                    <input
                      type="number"
                      name="iv1"
                      value={viscosidadData.iv1}
                      onChange={handleViscosidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Índice Viscosidad 2</label>
                    <input
                      type="number"
                      name="iv2"
                      value={viscosidadData.iv2}
                      onChange={handleViscosidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => router.push(prueba_id ? '/pruebas' : '/configuracion')}
                    disabled={loading}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {prueba_id ? 'Crear y Asignar' : 'Crear Límite'}
                      </>
                    ) : (
                      prueba_id ? 'Crear y Asignar' : 'Crear Límite'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Formulario de Calidad */}
            {activeTab === 'calidad' && (
              <form onSubmit={handleSubmitCalidad}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Calidad 1 (C1) *</label>
                    <select
                      name="c1"
                      value={calidadData.c1}
                      onChange={handleCalidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      required
                    >
                      <option value="">Seleccionar C1</option>
                      {tiposC1.map(tipo => (
                        <option key={tipo.id} value={tipo.nombre}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Calidad 2 (C2) *</label>
                    <select
                      name="c2"
                      value={calidadData.c2}
                      onChange={handleCalidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      required
                    >
                      <option value="">Seleccionar C2</option>
                      {tiposC2.map(tipo => (
                        <option key={tipo.id} value={tipo.nombre}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Secuencia de Espuma</label>
                    <select
                      name="seq_espuma"
                      value={calidadData.seq_espuma}
                      onChange={handleCalidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">Seleccionar secuencia</option>
                      {secuenciasEspuma.map(secuencia => (
                        <option key={secuencia.id} value={secuencia.codigo}>
                          {secuencia.nombre} ({secuencia.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Chispa</label>
                    <input
                      type="number"
                      name="chispa"
                      value={calidadData.chispa}
                      onChange={handleCalidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor</label>
                    <input
                      type="text"
                      name="valor"
                      value={calidadData.valor}
                      onChange={handleCalidadChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Valor específico de calidad"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => router.push(prueba_id ? '/pruebas' : '/configuracion')}
                    disabled={loading}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {prueba_id ? 'Crear y Asignar' : 'Crear Límite'}
                      </>
                    ) : (
                      prueba_id ? 'Crear y Asignar' : 'Crear Límite'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Formulario Genérico */}
            {activeTab === 'generico' && (
              <form onSubmit={handleSubmitGenerico}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={genericoData.nombre}
                      onChange={handleGenericoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor"
                      value={genericoData.valor}
                      onChange={handleGenericoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Operación *</label>
                    <select
                      name="symbol_operation"
                      value={genericoData.symbol_operation}
                      onChange={handleGenericoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      required
                    >
                      <option value="">Seleccionar operación</option>
                      {operaciones.map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Operación</label>
                    <input
                      type="text"
                      name="type_operation"
                      value={genericoData.type_operation}
                      onChange={handleGenericoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Ej: equal, greater_than, etc."
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => router.push(prueba_id ? '/pruebas' : '/configuracion')}
                    disabled={loading}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {prueba_id ? 'Crear y Asignar' : 'Crear Límite'}
                      </>
                    ) : (
                      prueba_id ? 'Crear y Asignar' : 'Crear Límite'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Formulario de Elemento */}
            {activeTab === 'elemento' && (
              <form onSubmit={handleSubmitElemento}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Símbolo *</label>
                    <input
                      type="text"
                      name="simbolo"
                      value={elementoData.simbolo}
                      onChange={handleElementoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Ej: Ag, Al, Fe"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={elementoData.nombre}
                      onChange={handleElementoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Ej: Plata, Aluminio, Hierro"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor"
                      value={elementoData.valor}
                      onChange={handleElementoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Operación</label>
                    <select
                      name="symbol_operation"
                      value={elementoData.symbol_operation}
                      onChange={handleElementoChange}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">Seleccionar operación</option>
                      {operaciones.map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => router.push(prueba_id ? '/pruebas' : '/configuracion')}
                    disabled={loading}
                    className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {prueba_id ? 'Crear y Asignar' : 'Crear Elemento'}
                      </>
                    ) : (
                      prueba_id ? 'Crear y Asignar' : 'Crear Elemento'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrearLimite;