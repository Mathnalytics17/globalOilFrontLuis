

const ConfigForm = ({ nodeData, onClose, onSave, type }) => {
  const [formData, setFormData] = useState(nodeData);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
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
      width: '400px'
    }}>
      <h3>Configuración del Nodo</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nombre:</label>
          <input
            value={formData.nombre || ''}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            style={{ width: '100%' }}
          />
        </div>

        {type === 'machine' && (
          <div style={{ marginBottom: '15px' }}>
            <label>Muestras de Aceite:</label>
            <input
              type="number"
              value={formData.oilSamples || 0}
              onChange={(e) => setFormData({...formData, oilSamples: e.target.value})}
              style={{ width: '100%' }}
            />
          </div>
        )}

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

export default ConfigForm;