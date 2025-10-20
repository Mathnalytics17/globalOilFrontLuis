import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { Plus, X, Settings, Save, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import Axios from 'axios';
import { useAuth } from '../../../shared/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const ModalMuestra = ({
  show,
  onHide,
  onCreate,
  machines = [],
  lubricants = [],
  equipmentReferences = [],
  users = [],
  currentUser,
  folder
}) => {
  const [formData, setFormData] = useState({
    fecha_toma: '',
    lubricante: '',
    contacto_cliente: '',
    equipo_placa: '',
    referencia_equipo: '', // Este campo ahora será automático
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
  const [folders, setFolders] = useState([]);

  // Obtener datos del folder actual
  const empresaActual = folder?.compania_id?.id || folder?.compania_id;
  const equipoActual = folder?.machine?.id || folder?.machines?.id;
  const telefonoEmpresa = folder?.compania_info?.telefono || '';
  const nombreEquipo = folder?.name || 'Equipo actual';

  // Cargar folders para encontrar carpetas de máquinas
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const response = await Axios.get(`${API_URL}/folders/`);
        setFolders(response.data);
      } catch (error) {
        console.error('Error cargando folders:', error);
      }
    };

    if (show) {
      loadFolders();
    }
  }, [show]);

  // Resetear formulario cuando se muestra el modal - CORREGIDO
  useEffect(() => {
    if (show) {
      setFormData({
        fecha_toma: new Date().toISOString().slice(0, 16),
        lubricante: '',
        contacto_cliente: telefonoEmpresa,
        equipo_placa: '',
        referencia_equipo: equipoActual || '', // ✅ Se asigna automáticamente
        periodo_servicio_aceite: '',
        unidad_periodo_aceite: '',
        periodo_servicio_equipo: '',
        unidad_periodo_equipo: '',
        observaciones: '',
        tipo_equipo: '',
        cliente: empresaActual || ''
      });
      setCamposAdicionales([]);
    }
  }, [show, equipoActual, empresaActual, telefonoEmpresa]);

  // Función para encontrar la carpeta de una máquina - CORREGIDA
  const encontrarCarpetaMaquina = (maquinaId) => {
    console.log(console.log('Buscando carpeta para máquina ID:', maquinaId));
    if (!maquinaId) {
      console.warn('No se proporcionó ID de máquina');
      return null;
    }
    
    // Buscar la carpeta de la máquina actual
    
    console.log(folders.machine_info)
    const carpetaMaquina = folders.find(folder => 
      folder.machine === maquinaId || 
      (folder.machines && folder.machines.id === maquinaId) ||
      (folder.machine_info && folder.machine_info.id === maquinaId)
    );
    
    if (!carpetaMaquina) {
      console.warn(`No se encontró carpeta para la máquina ID: ${maquinaId}`);
      // Si no se encuentra, usar el folder actual como padre
      console.log('Usando carpeta actual como padre:', folder);
      return folder?.folder.machine_info.id;
    }
    console.log(carpetaMaquina)
    return carpetaMaquina.id;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleContactoChange = (e) => {
    const { value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      contacto_cliente: value
    }));
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
    setLoading(true);

    try {
      console.log('Iniciando envío de muestra...');

      // Validaciones
      if (!formData.lubricante) {
        toast.error('Por favor seleccione un lubricante');
        setLoading(false);
        return;
      }

      // ✅ La referencia de equipo ya está asignada automáticamente
      if (!formData.referencia_equipo) {
        toast.error('No se pudo determinar la referencia de equipo');
        setLoading(false);
        return;
      }

      console.log('Referencia equipo asignada automáticamente:', formData.referencia_equipo);

      // ✅ 1. Encontrar la carpeta de la máquina seleccionada
      const parentFolderId = encontrarCarpetaMaquina(parseInt(formData.referencia_equipo));
      console.log('Carpeta padre encontrada:', parentFolderId);
      
      if (!parentFolderId) {
        toast.error('No se pudo encontrar la carpeta de la máquina');
        setLoading(false);
        return;
      }

      // ✅ 2. Preparar datos principales de la muestra
      const muestraData = {
        ...formData,
        periodo_servicio_aceite: formData.periodo_servicio_aceite ? parseFloat(formData.periodo_servicio_aceite) : null,
        periodo_servicio_equipo: formData.periodo_servicio_equipo ? parseFloat(formData.periodo_servicio_equipo) : null,
        usuario_registro: user?.user?.id || currentUser?.id,
        campos_adicionales: camposAdicionales.reduce((acc, campo) => {
          if (campo.valor || campo.requerido) {
            acc[campo.nombre] = campo.valor || '';
          }
          return acc;
        }, {})
      };

      console.log('Enviando datos de muestra:', muestraData);

      // ✅ 3. Crear la muestra principal
      const response = await Axios.post(`${API_URL}/lubrication/samples/`, muestraData);
      const muestraCreada = response.data;
      console.log('Muestra creada:', muestraCreada);
  

      // ✅ 4. Preparar datos para la carpeta de muestra - CORREGIDO
      const folderData = {
        nombre: `Muestra-${muestraCreada.id}`,
        typeFolder: 'muestra',
        parentId: parentFolderId, // ✅ Se guarda dentro de la máquina
        id_parent_node: parentFolderId,
        compania: parseInt(formData.cliente),
        isMachine: false,
        is_pt_medida: true,
        muestra: muestraCreada.id,
        machine: parseInt(formData.referencia_equipo) // ✅ Referencia a la máquina
      };

      console.log('Enviando datos de carpeta:', folderData);

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
          usuario_creacion: user?.user?.id || currentUser?.id,
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
      
      // Llamar al callback onCreate
      if (onCreate) {
        onCreate(muestraCreada);
      }
      
      // Cerrar modal
      onHide();

    } catch (error) {
      console.error('Error completo:', error);
      const errorMessage = error.response?.data || error.message;
      toast.error(`Error al registrar muestra: ${JSON.stringify(errorMessage)}`);
    } finally {
      setLoading(false);
    }
  };

  // Estilos personalizados para el tema oscuro
  const darkStyles = `
    .modal-dark .modal-content {
      background-color: #1a1a1a;
      border: 1px solid #333;
      color: #fff;
    }
    .modal-dark .modal-header {
      background-color: #dc3545;
      border-bottom: 1px solid #333;
    }
    .modal-dark .modal-footer {
      border-top: 1px solid #333;
    }
    .modal-dark .form-control, 
    .modal-dark .form-select {
      background-color: #292929;
      border: 1px solid #444;
      color: #fff;
    }
    .modal-dark .form-control:focus, 
    .modal-dark .form-select:focus {
      background-color: #292929;
      border-color: #dc3545;
      box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
      color: #fff;
    }
    .modal-dark .form-label {
      color: #fff;
    }
    .modal-dark .alert-info {
      background-color: #1b3a4b;
      border-color: #2c5364;
      color: #a6d9f3;
    }
    .modal-dark fieldset {
      border-color: #444 !important;
    }
    .modal-dark legend {
      color: #d9d9d9;
    }
    .modal-dark .text-muted {
      color: #8b8b8b !important;
    }
  `;

  return (
    <>
      <style>{darkStyles}</style>
      <Modal
        show={show}
        onHide={onHide}
        centered
        backdrop="static"
        keyboard={false}
        size="lg"
        scrollable={true}
        dialogClassName="modal-dark"
      >
        <Modal.Header closeButton className="text-white">
          <Modal.Title>Registrar Nueva Muestra</Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Información predefinida */}
          <div className="alert alert-info mb-4">
            <strong>Empresa:</strong> {folder?.compania_info?.nombre || 'Empresa actual'}<br />
            <strong>Equipo:</strong> {nombreEquipo}<br />
            <strong>Contacto:</strong> {telefonoEmpresa || 'No disponible'}<br />
            <strong>Referencia Equipo:</strong> {formData.referencia_equipo || 'No asignada'}
          </div>

          {/* Botón para agregar campo */}
          <div className="d-flex justify-content-end mb-4">
            <button
              type="button"
              onClick={() => setMostrarAgregarCampo(!mostrarAgregarCampo)}
              disabled={loading}
              className="btn btn-outline-danger d-flex align-items-center gap-2"
            >
              <Plus size={16} />
              Agregar Campo
            </button>
          </div>

          {/* Modal interno para agregar campo */}
          {mostrarAgregarCampo && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
              <div className="modal-dialog modal-sm">
                <div className="modal-content" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                  <div className="modal-header border-bottom border-secondary">
                    <h6 className="modal-title text-white">Agregar Campo Personalizado</h6>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setMostrarAgregarCampo(false)}
                      disabled={loading}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <Form.Group className="mb-3">
                      <Form.Label className="text-white">Nombre del Campo *</Form.Label>
                      <Form.Control
                        type="text"
                        value={nuevoCampo.nombre}
                        onChange={(e) => setNuevoCampo({ ...nuevoCampo, nombre: e.target.value })}
                        placeholder="Ej: Temperatura"
                        disabled={loading}
                        style={{ backgroundColor: '#292929', border: '1px solid #444', color: '#fff' }}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="text-white">Tipo de Campo</Form.Label>
                      <Form.Select
                        value={nuevoCampo.tipo}
                        onChange={(e) => setNuevoCampo({ ...nuevoCampo, tipo: e.target.value })}
                        disabled={loading}
                        style={{ backgroundColor: '#292929', border: '1px solid #444', color: '#fff' }}
                      >
                        {tiposCampo.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        label="Campo requerido"
                        checked={nuevoCampo.requerido}
                        onChange={(e) => setNuevoCampo({ ...nuevoCampo, requerido: e.target.checked })}
                        disabled={loading}
                        className="text-white"
                      />
                    </Form.Group>
                  </div>
                  <div className="modal-footer border-top border-secondary">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setMostrarAgregarCampo(false)}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger d-flex align-items-center gap-1"
                      onClick={agregarCampo}
                      disabled={loading}
                    >
                      <Plus size={14} />
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Form onSubmit={handleSubmit} id="muestra-form">
            {/* Información de la Muestra */}
            <div className="row mb-4">
              <div className="col-12">
                <h6 className="text-white border-bottom border-secondary pb-2 mb-3">
                  Información de la Muestra
                </h6>
              </div>
              
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">
                    Fecha Toma de Muestra <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="fecha_toma"
                    value={formData.fecha_toma}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">
                    Lubricante <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="lubricante"
                    value={formData.lubricante}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="" className="text-muted">Seleccione un lubricante</option>
                    {lubricants.map(lub => (
                      <option key={lub.id} value={lub.id}>
                        {lub.referencia} - {lub.grado_viscosidad}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            {/* Información del Cliente */}
            <div className="row mb-4">
              <div className="col-12">
                <h6 className="text-white border-bottom border-secondary pb-2 mb-3">
                  Información del Cliente
                </h6>
              </div>

              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">
                    Contacto del Cliente <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="contacto_cliente"
                    value={formData.contacto_cliente}
                    onChange={handleContactoChange}
                    placeholder="Persona de contacto"
                    required
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    Se autocompleta con el teléfono de la empresa, pero puedes editarlo
                  </Form.Text>
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">Placa del Equipo</Form.Label>
                  <Form.Control
                    type="text"
                    name="equipo_placa"
                    value={formData.equipo_placa}
                    onChange={handleInputChange}
                    placeholder="Ej: EQ-001"
                    disabled={loading}
                  />
                </Form.Group>
              </div>
            </div>

            {/* ✅ REFERENCIA DE EQUIPO OCULTA - Se asigna automáticamente */}
            <input 
              type="hidden" 
              name="referencia_equipo" 
              value={formData.referencia_equipo} 
            />

            {/* Periodos de Servicio */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="border border-secondary rounded p-3">
                  <h6 className="text-white mb-3">Periodo Servicio Aceite</h6>
                  <div className="row">
                    <div className="col-7">
                      <Form.Control
                        type="number"
                        name="periodo_servicio_aceite"
                        value={formData.periodo_servicio_aceite}
                        onChange={handleInputChange}
                        placeholder="Ej: 250"
                        step="0.01"
                        min="0"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-5">
                      <Form.Select
                        name="unidad_periodo_aceite"
                        value={formData.unidad_periodo_aceite}
                        onChange={handleInputChange}
                        disabled={loading}
                      >
                        <option value="" className="text-muted">Unidad</option>
                        <option value="horas">Horas</option>
                        <option value="dias">Días</option>
                        <option value="km">Kilómetros</option>
                        <option value="millas">Millas</option>
                      </Form.Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="border border-secondary rounded p-3">
                  <h6 className="text-white mb-3">Periodo Servicio Equipo</h6>
                  <div className="row">
                    <div className="col-7">
                      <Form.Control
                        type="number"
                        name="periodo_servicio_equipo"
                        value={formData.periodo_servicio_equipo}
                        onChange={handleInputChange}
                        placeholder="Ej: 500"
                        step="0.01"
                        min="0"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-5">
                      <Form.Select
                        name="unidad_periodo_equipo"
                        value={formData.unidad_periodo_equipo}
                        onChange={handleInputChange}
                        disabled={loading}
                      >
                        <option value="" className="text-muted">Unidad</option>
                        <option value="horas">Horas</option>
                        <option value="dias">Días</option>
                        <option value="km">Kilómetros</option>
                        <option value="millas">Millas</option>
                      </Form.Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="row mb-4">
              <div className="col-12">
                <h6 className="text-white border-bottom border-secondary pb-2 mb-3">
                  Información Adicional
                </h6>
              </div>

              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">Tipo de Equipo/Uso</Form.Label>
                  <Form.Select
                    name="tipo_equipo"
                    value={formData.tipo_equipo}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="" className="text-muted">Seleccione tipo de equipo</option>
                    {equipmentReferences.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.descripcion}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="col-12">
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">Observaciones</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    placeholder="Observaciones adicionales..."
                    disabled={loading}
                  />
                </Form.Group>
              </div>
            </div>

            {/* Campos Adicionales Dinámicos */}
            {camposAdicionales.length > 0 && (
              <div className="border-top border-secondary pt-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Settings size={18} className="text-white" />
                  <h6 className="text-white mb-0">Campos Adicionales</h6>
                  <span className="badge bg-secondary ms-2">
                    {camposAdicionales.length}
                  </span>
                </div>

                <div className="row">
                  {camposAdicionales.map((campo, index) => (
                    <div key={campo.id} className="col-md-6 mb-3">
                      <Form.Group>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <Form.Label className="text-white mb-0 small">
                            {campo.nombre}
                            {campo.requerido && <span className="text-danger ms-1">*</span>}
                          </Form.Label>
                          <button
                            type="button"
                            onClick={() => eliminarCampo(campo.id)}
                            className="btn btn-outline-danger btn-sm"
                            disabled={loading}
                            style={{ padding: '0.1rem 0.3rem' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        
                        {campo.tipo === 'text' && (
                          <Form.Control
                            type="text"
                            value={campo.valor}
                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                            required={campo.requerido}
                            disabled={loading}
                            size="sm"
                          />
                        )}
                        
                        {campo.tipo === 'number' && (
                          <Form.Control
                            type="number"
                            value={campo.valor}
                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                            required={campo.requerido}
                            disabled={loading}
                            size="sm"
                          />
                        )}
                        
                        {campo.tipo === 'date' && (
                          <Form.Control
                            type="date"
                            value={campo.valor}
                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                            required={campo.requerido}
                            disabled={loading}
                            size="sm"
                          />
                        )}
                        
                        {campo.tipo === 'textarea' && (
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={campo.valor}
                            onChange={(e) => handleCampoAdicionalChange(index, e.target.value)}
                            required={campo.requerido}
                            disabled={loading}
                            size="sm"
                          />
                        )}
                      </Form.Group>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        
        <Modal.Footer>
          <div className="w-100 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              {camposAdicionales.length > 0 && (
                <span>{camposAdicionales.length} campo(s) personalizado(s)</span>
              )}
            </div>
            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onHide} 
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-danger d-flex align-items-center gap-2"
                form="muestra-form"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Cargando...</span>
                    </div>
                    Registrando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Registrar Muestra
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalMuestra;