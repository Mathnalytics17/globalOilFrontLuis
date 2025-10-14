// components/limites/modals/ModalEditarElemento.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';

const ModalEditarElemento = ({ elemento, onClose, onSave }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    simbolo: '',
    nombre: '',
    valor: '',
    symbol_operation: ''
  });

  const operaciones = [
    { value: '<', label: 'Menor que' },
    { value: '<=', label: 'Menor o igual' },
    { value: '=', label: 'Igual' },
    { value: '>=', label: 'Mayor o igual' },
    { value: '>', label: 'Mayor que' }
  ];

  useEffect(() => {
    if (elemento) {
      setFormData({
        simbolo: elemento.simbolo || '',
        nombre: elemento.nombre || '',
        valor: elemento.valor || '',
        symbol_operation: elemento.symbol_operation || ''
      });
    }
  }, [elemento]);

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
        simbolo: formData.simbolo,
        nombre: formData.nombre,
        valor: formData.valor ? parseFloat(formData.valor) : null,
        symbol_operation: formData.symbol_operation
      };

      await api.patch(`elementos/${elemento.id}/`, dataToSend);
      toast.success('Elemento actualizado exitosamente');
      onSave();
    } catch (error) {
      toast.error('Error al actualizar elemento: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!elemento) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[#292929] rounded-lg border border-gray-700 w-full max-w-md">
        {/* Header del Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Editar Elemento
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Símbolo *
              </label>
              <input
                type="text"
                name="simbolo"
                value={formData.simbolo}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
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
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor
              </label>
              <input
                type="number"
                step="0.01"
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Operación
              </label>
              <select
                name="symbol_operation"
                value={formData.symbol_operation}
                onChange={handleChange}
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

export default ModalEditarElemento;