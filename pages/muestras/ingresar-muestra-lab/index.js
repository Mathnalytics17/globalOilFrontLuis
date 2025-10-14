import React, { useState, useEffect } from 'react';
import { Plus, X, Settings, RefreshCw, TestTube, Calendar, User, FileText } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import Axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const IngresoMuestra = () => {
  const { user } = useAuth();
  const [allSamples, setAllSamples] = useState([]);
  const [availableSamples, setAvailableSamples] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    muestra: '',
    fecha_recepcion: new Date().toISOString().slice(0, 16),
    usuario_recepcion: user?.id || '',
    observaciones: '',
    propiedades_adicionales: []
  });
  const [mostrarAgregarCampo, setMostrarAgregarCampo] = useState(false);
  const [nuevoCampo, setNuevoCampo] = useState({
    nombre: '',
    tipo: 'text',
    requerido: false
  });

  const tiposCampo = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Fecha' },
    { value: 'textarea', label: 'Texto largo' }
  ];

  // Cargar todas las muestras y usuarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [samplesRes, usersRes] = await Promise.all([
          Axios.get(`${API_URL}/lubrication/samples/`),
          Axios.get(`${API_URL}/users/`)
        ]);
        
        setAllSamples(samplesRes.data);
        setAvailableSamples(samplesRes.data.filter(sample => !sample.is_ingresado));
        setUsers(usersRes.data);
        
        // Setear usuario por defecto si no está seteado
        if (!formData.usuario_recepcion && user?.id) {
          setFormData(prev => ({ ...prev, usuario_recepcion: user.id }));
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleCampoAdicionalChange = (index, value) => {
    const updatedCampos = [...formData.propiedades_adicionales];
    updatedCampos[index].valor = value;
    setFormData(prev => ({
      ...prev,
      propiedades_adicionales: updatedCampos
    }));
  };

  const agregarCampo = () => {
    if (nuevoCampo.nombre.trim() === '') {
      toast.error('El nombre del campo es requerido');
      return;
    }

    const campo = {
      id: Date.now(),
      nombre: nuevoCampo.nombre.trim(),
      tipo: nuevoCampo.tipo,
      requerido: nuevoCampo.requerido,
      valor: ''
    };

    setFormData(prev => ({
      ...prev,
      propiedades_adicionales: [...prev.propiedades_adicionales, campo]
    }));
    setNuevoCampo({ nombre: '', tipo: 'text', requerido: false });
    setMostrarAgregarCampo(false);
    toast.success('Campo adicional agregado');
  };

  const eliminarCampo = (id) => {
    setFormData(prev => ({
      ...prev,
      propiedades_adicionales: prev.propiedades_adicionales.filter(campo => campo.id !== id)
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validar muestra seleccionada
      const selectedSample = allSamples.find(s => s.id === formData.muestra);
      if (!selectedSample) {
        toast.error('Muestra no encontrada');
        return;
      }

      if (selectedSample.is_ingresado) {
        toast.error('Esta muestra ya fue ingresada anteriormente');
        return;
      }

      // Validar campos requeridos
      if (!formData.muestra || !formData.fecha_recepcion || !formData.usuario_recepcion) {
        toast.error('Por favor complete todos los campos requeridos');
        return;
      }

      // Preparar payload para lab-entries
      const labEntryPayload = {
        muestra: formData.muestra,
        fecha_recepcion: formData.fecha_recepcion,
        usuario_recepcion: formData.usuario_recepcion,
        observaciones: formData.observaciones,
        propiedades: {}
      };

      // Procesar propiedades adicionales
      if (formData.propiedades_adicionales.length > 0) {
        formData.propiedades_adicionales.forEach(prop => {
          labEntryPayload.propiedades[prop.nombre] = prop.valor;
        });
      }

    // ✅ OPCIÓN 2: Usar Axios con headers manuales
    const token = localStorage.getItem('access_token');
    const response = await Axios.post(`${API_URL}/lubrication/lab-entries/`, labEntryPayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
      
      // 2. Actualizar el estado de la muestra en el backend
      await Axios.patch(`${API_URL}/lubrication/samples/${formData.muestra}/`, {
        is_ingresado: true,
        ingreso_lab: response.data.id
      });

      // 3. Refrescar los datos del servidor para garantizar consistencia
      const refreshedSamples = await Axios.get(`${API_URL}/lubrication/samples/`);
      setAllSamples(refreshedSamples.data);
      setAvailableSamples(refreshedSamples.data.filter(s => !s.is_ingresado));

      // Resetear formulario
      setFormData({
        muestra: '',
        fecha_recepcion: new Date().toISOString().slice(0, 16),
        usuario_recepcion: user?.id || '',
        observaciones: '',
        propiedades_adicionales: []
      });

      toast.success('Muestra ingresada al laboratorio exitosamente');

    } catch (error) {
      console.error('Error en el proceso:', error);
      toast.error('Error al registrar: ' + (error.response?.data?.message || error.message));
    }
  };

  const recargarDatos = async () => {
    setLoading(true);
    try {
      const [samplesRes, usersRes] = await Promise.all([
        Axios.get(`${API_URL}/lubrication/samples/`),
        Axios.get(`${API_URL}/users/`)
      ]);
      
      setAllSamples(samplesRes.data);
      setAvailableSamples(samplesRes.data.filter(sample => !sample.is_ingresado));
      setUsers(usersRes.data);
      toast.success('Datos actualizados');
    } catch (error) {
      console.error('Error recargando datos:', error);
      toast.error('Error al recargar datos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-[#292929] rounded-lg border border-[#333] p-8 text-center">
            <RefreshCw className="animate-spin mx-auto mb-4 text-red-500" size={32} />
            <p className="text-lg text-[#d9d9d9]">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (availableSamples.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-[#292929] rounded-lg border border-[#333] p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-6">Ingreso al Laboratorio</h1>
            <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-6 mb-6">
              <p className="text-lg text-yellow-200 mb-4">
                No hay muestras disponibles para ingresar al laboratorio
              </p>
              <button 
                onClick={recargarDatos}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg mx-auto transition-colors"
              >
                <RefreshCw size={20} />
                Recargar Datos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-[#292929] rounded-lg border border-[#333] p-8">
          {/* Header */}
          <div className="border-b border-[#444] pb-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Ingreso al Laboratorio
                </h1>
                <p className="text-[#d9d9d9] mt-3 text-lg">
                  Registre el ingreso de muestras al laboratorio
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarAgregarCampo(!mostrarAgregarCampo)}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-lg"
              >
                <Plus size={24} />
                Agregar Campo
              </button>
            </div>
          </div>

          {/* Modal para agregar nuevo campo */}
          {mostrarAgregarCampo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[#292929] rounded-lg p-6 w-96 border border-[#444]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Agregar Campo Personalizado</h3>
                  <button
                    onClick={() => setMostrarAgregarCampo(false)}
                    className="text-[#d9d9d9] hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Nombre del Campo *
                    </label>
                    <input
                      type="text"
                      value={nuevoCampo.nombre}
                      onChange={(e) => setNuevoCampo({...nuevoCampo, nombre: e.target.value})}
                      className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Ej: Temperatura ambiente"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Tipo de Campo
                    </label>
                    <select
                      value={nuevoCampo.tipo}
                      onChange={(e) => setNuevoCampo({...nuevoCampo, tipo: e.target.value})}
                      className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      {tiposCampo.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={nuevoCampo.requerido}
                      onChange={(e) => setNuevoCampo({...nuevoCampo, requerido: e.target.checked})}
                      className="mr-2 h-4 w-4"
                    />
                    <label className="text-sm text-white">Campo requerido</label>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => setMostrarAgregarCampo(false)}
                      className="px-4 py-2 border border-[#444] text-white rounded-lg hover:bg-[#333] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={agregarCampo}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-8">
            {/* Grid de información */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columna 1: Información de la Muestra */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-[#444] pb-3 flex items-center gap-2">
                  <TestTube size={20} className="text-red-500" />
                  Información de la Muestra
                </h3>
                
                <div className="flex flex-col">
                  <label className="text-base font-medium text-white mb-3">
                    ID de la Muestra *
                  </label>
                  <select
                    name="muestra"
                    value={formData.muestra}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="" className="text-gray-400">Seleccione una muestra</option>
                    {availableSamples.map(sample => (
                      <option key={sample.id} value={sample.id} className="text-white bg-[#292929]">
                        {sample.id} - {sample.equipo_placa || 'Sin placa'}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-[#888] mt-2">
                    {availableSamples.length} muestras disponibles
                  </p>
                </div>
              </div>

              {/* Columna 2: Información de Recepción */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-[#444] pb-3 flex items-center gap-2">
                  <Calendar size={20} className="text-red-500" />
                  Información de Recepción
                </h3>

                <div className="flex flex-col">
                  <label className="text-base font-medium text-white mb-3">
                    Fecha de Recepción *
                  </label>
                  <input
                    type="datetime-local"
                    name="fecha_recepcion"
                    value={formData.fecha_recepcion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-base font-medium text-white mb-3">
                    Usuario que registra *
                  </label>
                  <select
                    name="usuario_recepcion"
                    value={formData.usuario_recepcion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    disabled={!user?.is_superuser}
                  >
                    <option value="" className="text-gray-400">Seleccione un usuario</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id} className="text-white bg-[#292929]">
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  {!user?.is_superuser && (
                    <p className="text-sm text-yellow-400 mt-2">
                      Asignado automáticamente a su usuario
                    </p>
                  )}
                </div>
              </div>

              {/* Columna 3: Observaciones */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white border-b border-[#444] pb-3 flex items-center gap-2">
                  <FileText size={20} className="text-red-500" />
                  Observaciones
                </h3>

                <div className="flex flex-col">
                  <label className="text-base font-medium text-white mb-3">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                    placeholder="Ingrese observaciones relevantes sobre la recepción..."
                  />
                </div>
              </div>
            </div>

            {/* Campos Adicionales Dinámicos */}
            {formData.propiedades_adicionales.length > 0 && (
              <div className="border-t border-[#444] pt-8">
                <div className="flex items-center gap-2 mb-6">
                  <Settings size={24} className="text-red-500" />
                  <h3 className="text-xl font-semibold text-white">
                    Propiedades Adicionales
                  </h3>
                  <span className="text-sm text-[#888] bg-[#333] px-3 py-1 rounded">
                    {formData.propiedades_adicionales.length} campo(s) personalizado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.propiedades_adicionales.map((campo, index) => (
                    <div key={campo.id} className="flex flex-col relative group border border-[#444] rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-base font-medium text-white">
                          {campo.nombre}
                          {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <button
                          type="button"
                          onClick={() => eliminarCampo(campo.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      
                      {campo.tipo === 'text' && (
                        <input
                          type="text"
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required={campo.requerido}
                        />
                      )}
                      
                      {campo.tipo === 'number' && (
                        <input
                          type="number"
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required={campo.requerido}
                        />
                      )}
                      
                      {campo.tipo === 'date' && (
                        <input
                          type="date"
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required={campo.requerido}
                        />
                      )}
                      
                      {campo.tipo === 'textarea' && (
                        <textarea
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                          required={campo.requerido}
                        />
                      )}
                      
                      <span className="text-xs text-[#888] mt-2">
                        Tipo: {tiposCampo.find(t => t.value === campo.tipo)?.label}
                        {campo.requerido && ' • Requerido'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-between items-center pt-8 border-t border-[#444]">
              <div className="text-sm text-[#888]">
                {formData.propiedades_adicionales.length > 0 && (
                  <span>{formData.propiedades_adicionales.length} campo(s) personalizado(s) agregado(s)</span>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={recargarDatos}
                  className="flex items-center gap-2 px-6 py-3 border border-[#444] rounded-lg text-white font-medium hover:bg-[#333] transition-colors"
                >
                  <RefreshCw size={20} />
                  Recargar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-lg"
                >
                  Registrar Ingreso al Laboratorio
                </button>
              </div>
            </div>
          </form>

          {/* Nota informativa */}
          <div className="mt-8 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-sm text-red-200">
              <strong>Nota:</strong> Una vez ingresada al laboratorio, la muestra no podrá ser seleccionada nuevamente para ingreso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngresoMuestra;