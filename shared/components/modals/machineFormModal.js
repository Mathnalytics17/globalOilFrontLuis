import { useState } from 'react';
const buttonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px 6px',
  borderRadius: '4px',
  transition: 'background 0.2s',
  ':hover': {
    backgroundColor: '#f0f0f0'
  }
};


const MachineFormModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    componente: '',
    tipoAceite: '',
    frecuenciaCambio: '',
    frecuenciaAnalisis: '',
    numero_serie: '',
    codigo_equipo: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave(formData); // Ejecutar la función onSave con los datos del formulario
    onClose(); // Cerrar el modal
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      width: '600px',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>
      <h3>Agregar Máquina</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nombre:</label>
          <input
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Componente:</label>
          <input
            name="componente"
            value={formData.componente}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Tipo de Aceite:</label>
          <input
            name="tipoAceite"
            value={formData.tipoAceite}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Frecuencia de Cambio:</label>
          <input
            name="frecuenciaCambio"
            value={formData.frecuenciaCambio}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Frecuencia de Análisis:</label>
          <input
            name="frecuenciaAnalisis"
            value={formData.frecuenciaAnalisis}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Número de Serie:</label>
          <input
            name="numero_serie"
            value={formData.numero_serie}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Código de Equipo:</label>
          <input
            name="codigo_equipo"
            value={formData.codigo_equipo}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ ...buttonStyle, color: '#f44336' }}
          >
            CANCELAR
          </button>
          <button
            type="submit"
            style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: 'white' }}
          >
            GUARDAR
          </button>
        </div>
      </form>
    </div>
  );
};

export default MachineFormModal