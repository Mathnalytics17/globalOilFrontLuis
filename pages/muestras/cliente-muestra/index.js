import React, { useState, useEffect } from 'react';
import { Plus, X, Settings, Save, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import Axios from 'axios';
import { useAuth } from '../../../shared/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const ClienteMuestra = () => {
  const [formData, setFormData] = useState({
    fecha_toma: '',
    lubricante: '',
    contacto_cliente: '',
    equipo_placa: '',
    referencia_equipo: '',
    periodo_servicio_aceite: '',
    unidad_periodo_aceite: '',
    periodo_servicio_equipo: '',
    unidad_periodo_equipo: '',
    observaciones: '',
    tipo_equipo: '',
    cliente: ''
  });

  const user = useAuth();
  const [camposAdicionales, setCamposAdicionales] = useState([]);
  const [mostrarAgregarCampo, setMostrarAgregarCampo] = useState(false);
  const [nuevoCampo, setNuevoCampo] = useState({
    nombre: '',
    tipo: 'text',
    requerido: false
  });
  const [loading, setLoading] = useState(false);
  const [lubricantes, setLubricantes] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [maquinasFiltradas, setMaquinasFiltradas] = useState([]);
  const [tipoEquipo, setTipoEquipo] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [folders, setFolders] = useState([]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const [lubricantesRes, maquinasRes, typeEquiposRes, clientesRes, foldersRes] = await Promise.all([
        Axios.get(`${API_URL}/lubrication/lubricants/`),
        Axios.get(`${API_URL}/machines/`),
        Axios.get(`${API_URL}/lubrication/equipment-types/`),
        Axios.get(`${API_URL}/companies/`),
        Axios.get(`${API_URL}/folders/`)
      ]);

      setLubricantes(lubricantesRes.data);
      setMaquinas(maquinasRes.data);
      setMaquinasFiltradas(maquinasRes.data);
      setTipoEquipo(typeEquiposRes.data);
      setClientes(clientesRes.data);
      setFolders(foldersRes.data);

    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar datos iniciales');
    }
  };

  // Función para encontrar la carpeta de una máquina
  const encontrarCarpetaMaquina = (maquinaId) => {
    console.log(folders,maquinaId)
    const carpetaMaquina = folders.find(folder => 
      folder.machine === maquinaId || folder.machines === maquinaId
    );
    console.log(carpetaMaquina)
    if (!carpetaMaquina) {
      console.warn(`No se encontró carpeta para la máquina ID: ${maquinaId}`);
      return null;
    }
    
    return carpetaMaquina.id;
  };

  // Función para manejar cambio de cliente
  const handleClienteChange = (e) => {
    const clienteId = e.target.value;
    
    setFormData(prevState => ({
      ...prevState,
      cliente: clienteId,
      referencia_equipo: ''
    }));

    if (clienteId) {
      const clienteSeleccionado = clientes.find(cliente => cliente.id.toString() === clienteId);
      
      if (clienteSeleccionado && clienteSeleccionado.maquinas) {
        const maquinasDelCliente = maquinas.filter(maquina => 
          clienteSeleccionado.maquinas.some(m => m.id === maquina.id)
        );
        setMaquinasFiltradas(maquinasDelCliente);
        
        if (clienteSeleccionado.telefono) {
          setFormData(prevState => ({
            ...prevState,
            contacto_cliente: clienteSeleccionado.telefono
          }));
        }
      } else {
        setMaquinasFiltradas(maquinas);
      }
    } else {
      setMaquinasFiltradas(maquinas);
    }
  };

  const handleContactoChange = (e) => {
    const { value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      contacto_cliente: value
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cliente') {
      handleClienteChange(e);
    } else if (name === 'contacto_cliente') {
      handleContactoChange(e);
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
  };

  const handleCampoAdicionalChange = (index, value) => {
    const updatedCampos = [...camposAdicionales];
    updatedCampos[index].valor = value;
    setCamposAdicionales(updatedCampos);
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

    setCamposAdicionales([...camposAdicionales, campo]);
    setNuevoCampo({ nombre: '', tipo: 'text', requerido: false });
    setMostrarAgregarCampo(false);
    toast.success('Campo adicional agregado');
  };

  const eliminarCampo = (id) => {
    setCamposAdicionales(camposAdicionales.filter(campo => campo.id !== id));
    toast.info('Campo eliminado');
  };

  const tiposCampo = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Fecha' },
    { value: 'textarea', label: 'Texto largo' }
  ];

const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('✅ handleSubmit ejecutándose'); // Debug
    setLoading(true);

    try {
      console.log('📦 Datos del formulario:', formData); // Debug
      console.log('🔧 Campos adicionales:', camposAdicionales); // Debug
      // Validar que se haya seleccionado una máquina
      if (!formData.referencia_equipo) {
        toast.error('Por favor seleccione una referencia de equipo');
        setLoading(false);
        return;
      }

      // ✅ 1. Encontrar la carpeta de la máquina seleccionada
      const parentFolderId = encontrarCarpetaMaquina(parseInt(formData.referencia_equipo));
      console.log(parentFolderId)
      if (!parentFolderId) {
        toast.error('No se pudo encontrar la carpeta de la máquina seleccionada');
        setLoading(false);
        return;
      }

      // ✅ 2. Preparar datos principales de la muestra
      const muestraData = {
        ...formData,
        periodo_servicio_aceite: formData.periodo_servicio_aceite ? parseFloat(formData.periodo_servicio_aceite) : null,
        periodo_servicio_equipo: formData.periodo_servicio_equipo ? parseFloat(formData.periodo_servicio_equipo) : null,
        usuario_registro: user.user.id,
        campos_adicionales: camposAdicionales.reduce((acc, campo) => {
          if (campo.valor) {
            acc[campo.nombre] = campo.valor;
          }
          return acc;
        }, {})
      };

      // ✅ 3. Crear la muestra principal
      const response = await Axios.post(`${API_URL}/lubrication/samples/`, muestraData);
      const muestraCreada = response.data;
      console.log(muestraCreada.id)

      // ✅ 4. Preparar datos para la carpeta de muestra
      const folderData = {
        nombre: muestraCreada.id.toString(), // Usar el ID de la muestra como nombre
        typeFolder: 'muestra',
        parentId: parentFolderId,
        id_parent_node: parentFolderId,
        compania: parseInt(formData.cliente),
        isMachine: false,
        is_pt_medida: true, // ✅ Marcar como punto de medida
        muestra: muestraCreada.id, // ✅ Asociar a la muestra
        machine: parseInt(formData.referencia_equipo) // Asociar también a la máquina
      };

      // ✅ 5. Crear la carpeta de muestra
      await Axios.post(`${API_URL}/folders/`, folderData);

      // ✅ 6. Crear campos extras si existen
      if (camposAdicionales.length > 0) {
        const camposExtrasData = camposAdicionales.map(campo => ({
          tabla_relacionada: 'muestra',
          objeto_id: muestraCreada.id,
          nombre_campo: campo.nombre,
          tipo_campo: campo.tipo,
          etiqueta: campo.nombre,
          valor_texto: campo.tipo === 'text' || campo.tipo === 'textarea' ? campo.valor : null,
          valor_numero: campo.tipo === 'number' ? parseFloat(campo.valor) || null : null,
          valor_fecha: campo.tipo === 'date' ? campo.valor : null,
          requerido: campo.requerido,
          estado: 'activo',
          usuario_creacion: user.user.id,
          orden: camposAdicionales.indexOf(campo)
        }));

        const camposConValor = camposExtrasData.filter(campo => 
          campo.valor_texto || campo.valor_numero || campo.valor_fecha
        );

        if (camposConValor.length > 0) {
          await Axios.post(`${API_URL}/api/extra-fields/bulk-create/`, {
            campos: camposConValor
          });
        }
      }

      toast.success('Muestra y carpeta registradas exitosamente');
      
      // Resetear formulario
      setFormData({
        fecha_toma: '',
        lubricante: '',
        contacto_cliente: '',
        equipo_placa: '',
        referencia_equipo: '',
        periodo_servicio_aceite: '',
        unidad_periodo_aceite: '',
        periodo_servicio_equipo: '',
        unidad_periodo_equipo: '',
        observaciones: '',
        tipo_equipo: '',
        cliente: ''
      });
      setCamposAdicionales([]);
      setMaquinasFiltradas(maquinas);

    } catch (error) {
      console.error('Error completo:', error);
      const errorMessage = error.response?.data || error.message;
      toast.error(`Error al registrar muestra: ${JSON.stringify(errorMessage)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#292929] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Registro de Muestra
          </h1>
          <p className="text-[#d9d9d9]">
            Complete la información requerida para el registro de la muestra
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#1a1a1a] rounded-lg shadow-2xl border border-[#333] p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              Formulario de Muestra
            </h2>
            <button
              type="button"
              onClick={() => setMostrarAgregarCampo(!mostrarAgregarCampo)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              disabled={loading}
            >
              <Plus size={20} />
              Agregar Campo
            </button>
          </div>

          {/* Modal para agregar campo */}
          {mostrarAgregarCampo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[#1a1a1a] rounded-lg p-6 w-96 shadow-xl border border-[#333]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Agregar Campo Personalizado
                  </h3>
                  <button
                    onClick={() => setMostrarAgregarCampo(false)}
                    className="text-[#d9d9d9] hover:text-white"
                    disabled={loading}
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
                      onChange={(e) => setNuevoCampo({ ...nuevoCampo, nombre: e.target.value })}
                      className="w-full px-4 py-2 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Ej: Temperatura de operación"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Tipo de Campo
                    </label>
                    <select
                      value={nuevoCampo.tipo}
                      onChange={(e) => setNuevoCampo({ ...nuevoCampo, tipo: e.target.value })}
                      className="w-full px-4 py-2 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={loading}
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
                      onChange={(e) => setNuevoCampo({ ...nuevoCampo, requerido: e.target.checked })}
                      className="mr-2"
                      disabled={loading}
                    />
                    <label className="text-sm text-white">Campo requerido</label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => setMostrarAgregarCampo(false)}
                      className="px-4 py-2 border border-[#444] text-white rounded-lg hover:bg-[#333] transition-colors"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={agregarCampo}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      disabled={loading}
                    >
                      <Plus size={16} />
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de la Muestra */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#333] pb-2">
                  Información de la Muestra
                </h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Fecha Toma de Muestra <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="fecha_toma"
                    value={formData.fecha_toma}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Lubricante <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="lubricante"
                    value={formData.lubricante}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    disabled={loading}
                  >
                    <option value="" className="text-gray-400">Seleccione un lubricante</option>
                    {lubricantes.map(lub => (
                      <option key={lub.id} value={lub.id} className="text-white bg-[#292929]">
                        {lub.referencia} - {lub.grado_viscosidad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Referencia Equipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="referencia_equipo"
                    value={formData.referencia_equipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    disabled={loading}
                  >
                    <option value="" className="text-gray-400">Seleccione un equipo</option>
                    {maquinasFiltradas.map(maquina => (
                      <option key={maquina.id} value={maquina.id} className="text-white bg-[#292929]">
                        {maquina.nombre} - {maquina.codigo_equipo}
                      </option>
                    ))}
                  </select>
                  {formData.cliente && maquinasFiltradas.length === 0 && (
                    <p className="text-sm text-yellow-400 mt-1">
                      Este cliente no tiene máquinas asociadas
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#333] pb-2">
                  Información del Cliente
                </h3>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Cliente <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="cliente"
                    value={formData.cliente}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                    disabled={loading}
                  >
                    <option value="" className="text-gray-400">Seleccione un cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id} className="text-white bg-[#292929]">
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Contacto del Cliente <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contacto_cliente"
                    value={formData.contacto_cliente}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Persona de contacto"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Se autocompleta con el teléfono del cliente, pero puedes editarlo
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Placa del Equipo
                  </label>
                  <input
                    type="text"
                    name="equipo_placa"
                    value={formData.equipo_placa}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ej: EQ-001"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Información del Servicio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#333] pb-2">
                  Periodo de Servicio del Aceite
                </h3>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Periodo
                  </label>
                  <input
                    type="number"
                    name="periodo_servicio_aceite"
                    value={formData.periodo_servicio_aceite}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ej: 250"
                    step="0.01"
                    min="0"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Unidades
                  </label>
                  <select
                    name="unidad_periodo_aceite"
                    value={formData.unidad_periodo_aceite}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="" className="text-gray-400">Seleccione unidades</option>
                    <option value="horas" className="text-white bg-[#292929]">Horas</option>
                    <option value="dias" className="text-white bg-[#292929]">Días</option>
                    <option value="km" className="text-white bg-[#292929]">Kilómetros</option>
                    <option value="millas" className="text-white bg-[#292929]">Millas</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-[#333] pb-2">
                  Periodo de Servicio del Equipo
                </h3>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Periodo
                  </label>
                  <input
                    type="number"
                    name="periodo_servicio_equipo"
                    value={formData.periodo_servicio_equipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ej: 500"
                    step="0.01"
                    min="0"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Unidades
                  </label>
                  <select
                    name="unidad_periodo_equipo"
                    value={formData.unidad_periodo_equipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="" className="text-gray-400">Seleccione unidades</option>
                    <option value="horas" className="text-white bg-[#292929]">Horas</option>
                    <option value="dias" className="text-white bg-[#292929]">Días</option>
                    <option value="km" className="text-white bg-[#292929]">Kilómetros</option>
                    <option value="millas" className="text-white bg-[#292929]">Millas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-[#333] pb-2">
                Información Adicional
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Tipo de Equipo/Uso
                  </label>
                  <select
                    name="tipo_equipo"
                    value={formData.tipo_equipo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="" className="text-gray-400">Seleccione tipo de equipo</option>
                    {tipoEquipo.map(tipo => (
                      <option key={tipo.id} value={tipo.id} className="text-white bg-[#292929]">
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                  placeholder="Observaciones adicionales..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* Campos Adicionales Dinámicos */}
            {camposAdicionales.length > 0 && (
              <div className="border-t border-[#333] pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings size={20} className="text-[#d9d9d9]" />
                  <h3 className="text-lg font-semibold text-white">
                    Campos Adicionales
                  </h3>
                  <span className="text-sm text-gray-400 bg-[#333] px-2 py-1 rounded">
                    {camposAdicionales.length} campo(s) personalizado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {camposAdicionales.map((campo, index) => (
                    <div key={campo.id} className="flex flex-col relative group">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-white">
                          {campo.nombre}
                          {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <button
                          type="button"
                          onClick={() => eliminarCampo(campo.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                          disabled={loading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      {campo.tipo === 'text' && (
                        <input
                          type="text"
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required={campo.requerido}
                          disabled={loading}
                        />
                      )}
                      
                      {campo.tipo === 'number' && (
                        <input
                          type="number"
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required={campo.requerido}
                          disabled={loading}
                        />
                      )}
                      
                      {campo.tipo === 'date' && (
                        <input
                          type="date"
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required={campo.requerido}
                          disabled={loading}
                        />
                      )}
                      
                      {campo.tipo === 'textarea' && (
                        <textarea
                          value={campo.valor}
                          onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required={campo.requerido}
                          disabled={loading}
                        />
                      )}
                      
                      <span className="text-xs text-gray-400 mt-1">
                        Tipo: {tiposCampo.find(t => t.value === campo.tipo)?.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-between items-center pt-6 border-t border-[#333]">
              <div className="text-sm text-gray-400">
                {camposAdicionales.length > 0 && (
                  <span>{camposAdicionales.length} campo(s) personalizado(s) agregado(s)</span>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  className="px-6 py-3 border border-[#444] text-white rounded-lg hover:bg-[#333] transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>Registrar Muestra</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClienteMuestra;