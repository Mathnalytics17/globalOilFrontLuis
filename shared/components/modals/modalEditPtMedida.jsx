import React, { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

const UNIDADES_PERIODO = [
  {value: 'horas', label: 'Horas'},
  {value: 'dias', label: 'Días'},
  {value: 'semanas', label: 'Semanas'},
  {value: 'meses', label: 'Meses'},
];

const ModalEditarMuestra = ({
  show,
  onHide,
  onUpdate,
  machines,
  lubricants,
  equipmentReferences,
  users,
  currentUser,
  muestraData // Datos de la muestra a editar
}) => {
  // Estado inicial con los datos de la muestra existente
  const [formData, setFormData] = useState({
    id: '',
    fecha_toma: '',
    lubricante: '',
    equipo: '',
    contacto_cliente: '',
    equipo_placa: '',
    referencia_equipo: '',
    periodo_servicio_aceite: '',
    unidad_periodo_aceite: '',
    periodo_servicio_equipo: '',
    unidad_periodo_equipo: '',
    campos_adicionales: {},
    usuario_registro: '',
    is_ingresado: false,
    is_aprobado: false,
    was_checked: ''
  });

  // Estado para los campos adicionales
  const [additionalFields, setAdditionalFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  console.log(muestraData)
  // Cargar datos iniciales cuando cambia muestraData o show
  useEffect(() => {
    if (show && muestraData) {
      setFormData({
        ...muestraData,
        // Asegurar que los valores nulos o undefined sean strings vacíos
        periodo_servicio_aceite: muestraData.periodo_servicio_aceite ?? '',
        unidad_periodo_aceite: muestraData.unidad_periodo_aceite ?? '',
        periodo_servicio_equipo: muestraData.periodo_servicio_equipo ?? '',
        unidad_periodo_equipo: muestraData.unidad_periodo_equipo ?? '',
        lubricante:muestraData.lubricante.referencia ?? ''       ,
        // Formatear fecha si es necesario
        fecha_toma: muestraData.fecha_toma ? muestraData.fecha_toma.slice(0, 16) : new Date().toISOString().slice(0, 16),
        was_checked: muestraData.was_checked ? muestraData.was_checked.slice(0, 10) : new Date().toISOString().slice(0, 10)
      });

      // Cargar campos adicionales
      if (muestraData.campos_adicionales) {
        const fields = Object.entries(muestraData.campos_adicionales).map(([name, value]) => ({
          name,
          value
        }));
        setAdditionalFields(fields);
      } else {
        setAdditionalFields([]);
      }
    }
  }, [show, muestraData]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? e.target.checked : value
    }));
  };

  // Manejar cambios en campos adicionales
  const handleAdditionalFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      campos_adicionales: {
        ...prev.campos_adicionales,
        [fieldName]: value
      }
    }));
  };

  // Agregar nuevo campo
  const addNewField = () => {
    if (newFieldName.trim() === '') return;
    
    const fieldName = newFieldName.trim();
    const fieldValue = newFieldValue;
    
    setAdditionalFields(prev => [...prev, { name: fieldName, value: fieldValue }]);
    handleAdditionalFieldChange(fieldName, fieldValue);
    
    // Resetear los inputs
    setNewFieldName('');
    setNewFieldValue('');
  };

  // Eliminar campo adicional
  const removeField = (fieldName) => {
    setAdditionalFields(prev => prev.filter(field => field.name !== fieldName));
    
    // Eliminar del objeto campos_adicionales
    setFormData(prev => {
      const newAdditionalFields = { ...prev.campos_adicionales };
      delete newAdditionalFields[fieldName];
      return {
        ...prev,
        campos_adicionales: newAdditionalFields
      };
    });
  };

  // Validar y enviar el formulario
  const handleSubmit = () => {
    // Validaciones básicas
    if (!formData.fecha_toma || !formData.lubricante || !formData.equipo) {
      alert("Los campos 'Fecha de toma', 'Lubricante' y 'Equipo' son obligatorios.");
      return;
    }

    // Crear objeto con los datos formateados
    const sampleData = {
      ...formData,
      periodo_servicio_aceite: formData.periodo_servicio_aceite ? parseFloat(formData.periodo_servicio_aceite) : null,
      periodo_servicio_equipo: formData.periodo_servicio_equipo ? parseFloat(formData.periodo_servicio_equipo) : null
    };

    onUpdate(sampleData);
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      keyboard={false}
      size="lg"
      scrollable={true}
    >
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>Editar Muestra</Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Form>
          {/* Sección 1: Información Básica */}
          <fieldset className="mb-4 p-3 border rounded">
            <legend className="w-auto px-2">Información Básica</legend>
            
            <Form.Group className="mb-3">
              <Form.Label>ID Muestra</Form.Label>
              <Form.Control
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                readOnly
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fecha de Toma *</Form.Label>
              <Form.Control
                type="datetime-local"
                name="fecha_toma"
                value={formData.fecha_toma}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Lubricante *</Form.Label>
              <Form.Select
                name="lubricante"
                value={formData.lubricante}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un lubricante</option>
                {lubricants.map(lub => (
                  <option key={lub.id} value={lub.id}>{lub.referencia}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Equipo *</Form.Label>
              <Form.Select
                name="equipo"
                value={formData.equipo}
                onChange={handleChange}
                required
              >
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>{machine.nombre}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contacto del Cliente</Form.Label>
              <Form.Control
                type="text"
                name="contacto_cliente"
                value={formData.contacto_cliente}
                onChange={handleChange}
              />
            </Form.Group>
          </fieldset>

          {/* Sección 2: Información del Equipo */}
          <fieldset className="mb-4 p-3 border rounded">
            <legend className="w-auto px-2">Detalles del Equipo</legend>
            
            <Form.Group className="mb-3">
              <Form.Label>Placa del Equipo</Form.Label>
              <Form.Control
                type="text"
                name="equipo_placa"
                value={formData.equipo_placa}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Referencia del Equipo</Form.Label>
              <Form.Select
                name="referencia_equipo"
                value={formData.referencia_equipo}
                onChange={handleChange}
              >
                <option value="">Seleccione una referencia</option>
                {equipmentReferences.map(ref => (
                  <option key={ref.id} value={ref.id}>{ref.codigo}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </fieldset>

          {/* Sección 3: Periodos de Servicio */}
          <fieldset className="mb-4 p-3 border rounded">
            <legend className="w-auto px-2">Periodos de Servicio</legend>
            
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Periodo Servicio Aceite</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      name="periodo_servicio_aceite"
                      value={formData.periodo_servicio_aceite}
                      onChange={handleChange}
                    />
                    <Form.Select
                      name="unidad_periodo_aceite"
                      value={formData.unidad_periodo_aceite}
                      onChange={handleChange}
                    >
                      <option value="">Unidad</option>
                      {UNIDADES_PERIODO.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </Form.Select>
                  </div>
                </Form.Group>
              </div>
              
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Periodo Servicio Equipo</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      name="periodo_servicio_equipo"
                      value={formData.periodo_servicio_equipo}
                      onChange={handleChange}
                    />
                    <Form.Select
                      name="unidad_periodo_equipo"
                      value={formData.unidad_periodo_equipo}
                      onChange={handleChange}
                    >
                      <option value="">Unidad</option>
                      {UNIDADES_PERIODO.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </Form.Select>
                  </div>
                </Form.Group>
              </div>
            </div>
          </fieldset>

          {/* Sección 4: Información Adicional */}
          <fieldset className="mb-4 p-3 border rounded">
            <legend className="w-auto px-2">Información Adicional</legend>

            <Form.Group className="mb-3">
              <Form.Label>Fecha de Revisión</Form.Label>
              <Form.Control
                type="date"
                name="was_checked"
                value={formData.was_checked}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Ingresado"
                name="is_ingresado"
                checked={formData.is_ingresado}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Aprobado"
                name="is_aprobado"
                checked={formData.is_aprobado}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Usuario Registro</Form.Label>
              <Form.Select
                name="usuario_registro"
                value={formData.usuario_registro}
                onChange={handleChange}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.email}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </fieldset>

          <fieldset className="mb-4 p-3 border rounded">
            <legend className="w-auto px-2">Campos Adicionales</legend>
            
            {/* Lista de campos adicionales existentes */}
            {additionalFields.map((field, index) => (
              <Form.Group key={index} className="mb-3">
                <div className="d-flex align-items-center gap-2">
                  <Form.Control
                    type="text"
                    value={field.name}
                    readOnly
                    className="flex-grow-1"
                  />
                  <Form.Control
                    type="text"
                    value={formData.campos_adicionales[field.name] || ''}
                    onChange={(e) => handleAdditionalFieldChange(field.name, e.target.value)}
                    placeholder="Valor"
                  />
                  <Button
                    variant="danger"
                    onClick={() => removeField(field.name)}
                    size="sm"
                  >
                    ×
                  </Button>
                </div>
              </Form.Group>
            ))}

            {/* Formulario para agregar nuevo campo */}
            <Form.Group className="mb-3">
              <div className="d-flex align-items-center gap-2">
                <Form.Control
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Nombre del campo"
                  className="flex-grow-1"
                />
                <Form.Control
                  type="text"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  placeholder="Valor"
                />
                <Button
                  variant="success"
                  onClick={addNewField}
                  disabled={!newFieldName.trim()}
                  size="sm"
                >
                  +
                </Button>
              </div>
            </Form.Group>
          </fieldset>
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Guardar Cambios
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalEditarMuestra;