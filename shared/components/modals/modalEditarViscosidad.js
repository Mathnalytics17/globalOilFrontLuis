// components/limites/modals/ModalEditarViscosidad.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';

const ModalEditarViscosidad = ({ limite, onClose, onSave }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tiposViscosidad, setTiposViscosidad] = useState([]);
  const [formData, setFormData] = useState({
    v1: '',
    v2: '',
    vmin: '',
    vmax: '',
    iv1: '',
    iv2: ''
  });

  useEffect(() => {
    const fetchTiposViscosidad = async () => {
      try {
        const response = await api.get('tipos-viscosidad/');
        setTiposViscosidad(response.data);
      } catch (error) {
        console.error('Error cargando tipos de viscosidad:', error);
      }
    };

    fetchTiposViscosidad();
    
    if (limite) {
      setFormData({
        v1: limite.v1 || '',
        v2: limite.v2 || '',
        vmin: limite.vmin || '',
        vmax: limite.vmax || '',
        iv1: limite.iv1 || '',
        iv2: limite.iv2 || ''
      });
    }
  }, [api, limite]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        v1: formData.v1,
        v2: formData.v2,
        vmin: formData.vmin ? parseFloat(formData.vmin) : null,
        vmax: formData.vmax ? parseFloat(formData.vmax) : null,
        iv1: formData.iv1 ? parseInt(formData.iv1) : null,
        iv2: formData.iv2 ? parseInt(formData.iv2) : null
      };

      await api.patch(`limites-viscosidad/${limite.id}/`, dataToSend);
      toast.success('Límite de viscosidad actualizado exitosamente');
      onSave();
    } catch (error) {
      toast.error('Error al actualizar límite: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const tiposV1 = tiposViscosidad.filter(tipo => tipo.is_v_1);
  const tiposV2 = tiposViscosidad.filter(tipo => tipo.is_v_2);

  if (!limite) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[#292929] rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#292929]">
          <h2 className="text-xl font-bold text-white">
            Editar Límite de Viscosidad
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Viscosidad 1 (V1) *
              </label>
              <select
                name="v1"
                value={formData.v1}
                onChange={handleChange}
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Viscosidad 2 (V2) *
              </label>
              <select
                name="v2"
                value={formData.v2}
                onChange={handleChange}
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Viscosidad Mínima
              </label>
              <input
                type="number"
                step="0.01"
                name="vmin"
                value={formData.vmin}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Viscosidad Máxima
              </label>
              <input
                type="number"
                step="0.01"
                name="vmax"
                value={formData.vmax}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Índice Viscosidad 1
              </label>
              <input
                type="number"
                name="iv1"
                value={formData.iv1}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Índice Viscosidad 2
              </label>
              <input
                type="number"
                name="iv2"
                value={formData.iv2}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarViscosidad;