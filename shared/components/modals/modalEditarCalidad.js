// components/limites/modals/ModalEditarCalidad.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';

const ModalEditarCalidad = ({ limite, onClose, onSave }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tiposCalidad, setTiposCalidad] = useState([]);
  const [secuenciasEspuma, setSecuenciasEspuma] = useState([]);
  const [formData, setFormData] = useState({
    c1: '',
    c2: '',
    seq_espuma: '',
    chispa: '',
    valor: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tiposResponse, pruebasResponse] = await Promise.all([
          api.get('tipos-calidad/'),
          api.get('lubrication/tests/')
        ]);

        setTiposCalidad(tiposResponse.data);

        // Filtrar secuencias de espuma
        const pruebaEspuma = pruebasResponse.data.find(prueba => 
          prueba.categoria === 'calidad' && prueba.codigo === 'ESP'
        );
        const secuencias = pruebaEspuma ? pruebaEspuma.pruebas_estructuradas : [];
        setSecuenciasEspuma(secuencias);

      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };

    fetchData();
    
    if (limite) {
      setFormData({
        c1: limite.c1 || '',
        c2: limite.c2 || '',
        seq_espuma: limite.seq_espuma || '',
        chispa: limite.chispa || '',
        valor: limite.valor || ''
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
        c1: formData.c1,
        c2: formData.c2,
        seq_espuma: formData.seq_espuma,
        chispa: formData.chispa ? parseInt(formData.chispa) : null,
        valor: formData.valor
      };

      await api.patch(`limites-calidad/${limite.id}/`, dataToSend);
      toast.success('Límite de calidad actualizado exitosamente');
      onSave();
    } catch (error) {
      toast.error('Error al actualizar límite: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const tiposC1 = tiposCalidad.filter(tipo => tipo.is_c_1);
  const tiposC2 = tiposCalidad.filter(tipo => tipo.is_c_2);

  if (!limite) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[#292929] rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#292929]">
          <h2 className="text-xl font-bold text-white">
            Editar Límite de Calidad
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
                Calidad 1 (C1) *
              </label>
              <select
                name="c1"
                value={formData.c1}
                onChange={handleChange}
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Calidad 2 (C2) *
              </label>
              <select
                name="c2"
                value={formData.c2}
                onChange={handleChange}
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Secuencia de Espuma
              </label>
              <select
                name="seq_espuma"
                value={formData.seq_espuma}
                onChange={handleChange}
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chispa
              </label>
              <input
                type="number"
                name="chispa"
                value={formData.chispa}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor
              </label>
              <input
                type="text"
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="Valor específico de calidad"
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

export default ModalEditarCalidad;