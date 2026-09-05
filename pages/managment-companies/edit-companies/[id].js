import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import RequirePermission from '@features/auth/presentation/RequirePermission';

const EditCompany = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    direccion: '',
    telefono: '',
    email: '',
    is_active: true
  });

  // Cargar datos de la compañía
  useEffect(() => {
    if (!id) return;

    const fetchCompany = async () => {
      try {
        const company = await companiesService.getById(id);
        setFormData({
          nombre: company.nombre || company.name || '',
          nit: company.nit || '',
          direccion: company.direccion || company.address || '',
          telefono: company.telefono || company.phone || '',
          email: company.email || '',
          is_active: company.is_active
        });
      } catch (error) {
        toast.error('Error al cargar compañía: ' + (error.response?.data?.message || error.message));
        router.push('/managment-companies');
      } finally {
        setInitialLoad(false);
      }
    };

    fetchCompany();
  }, [id]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (!formData.nombre.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (!formData.nit.trim()) {
        throw new Error('El NIT es requerido');
      }

      // Enviar a la API
      await companiesService.patch(id, formData);
      
      toast.success('Compañía actualizada correctamente');
      router.push('/managment-companies');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al actualizar compañía');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-[#292929] rounded-lg shadow-lg mb-6 p-6 border border-[#424242]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Editar Compañía</h1>
              <p className="text-gray-300 mt-1">Modifica la información de la compañía seleccionada</p>
            </div>
            <button
              onClick={() => router.push('/managment-companies')}
              className="px-4 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-[#292929] rounded-lg shadow-lg border border-[#424242] overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              
              {/* Fila 1: Nombre y NIT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    placeholder="Ingrese el nombre de la compañía"
                  />
                </div>

                {/* NIT */}
                <div>
                  <label htmlFor="nit" className="block text-sm font-medium text-gray-300 mb-2">
                    NIT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nit"
                    name="nit"
                    value={formData.nit}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    placeholder="Ingrese el NIT de la compañía"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label htmlFor="direccion" className="block text-sm font-medium text-gray-300 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  id="direccion"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                  placeholder="Ingrese la dirección de la compañía"
                />
              </div>

              {/* Fila 2: Teléfono y Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Teléfono */}
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    placeholder="Ingrese el teléfono de contacto"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    placeholder="Ingrese el email de contacto"
                  />
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-red-500 bg-gray-700 border-[#424242] rounded focus:ring-red-500 focus:ring-2"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-300">
                  Compañía activa
                </label>
              </div>

            </div>

            {/* Footer del formulario */}
            <div className="bg-gray-750 px-6 py-4 border-t border-[#424242]">
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/managment-companies')}
                  disabled={loading}
                  className="px-6 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Actualizar Compañía
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-[#292929] rounded-lg border border-[#424242] p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-white">Información importante</h3>
              <p className="text-sm text-gray-400 mt-1">
                Los campos marcados con <span className="text-red-500">*</span> son obligatorios. 
                Al desactivar una compañía, esta ya no estará disponible para asignar a nuevos usuarios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProtectedEditCompany(props) {
  return (
    <RequirePermission permissionsAny={['empresas.editar']}>
      <EditCompany {...props} />
    </RequirePermission>
  );
}
