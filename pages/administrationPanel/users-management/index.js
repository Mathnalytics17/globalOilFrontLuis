import { useEffect, useState } from "react";
import Axios from "axios";
import { Pencil, ToggleRight, ToggleLeft, Save, X, Building, UserPlus } from "lucide-react";
import { useRouter } from "next/router";

export default function UserManagement() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Estados para modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedCompany, setSelectedCompany] = useState("");
  const [saving, setSaving] = useState(false);

  // Obtener usuarios
  const GetUsers = async () => {
    try {
      const res = await Axios.get(`${API_URL}/users/`);
      return res.data;
    } catch (err) {
      console.error("Error en users:", err);
      throw err;
    }
  };

  // Obtener empresas
  const GetCompanies = async () => {
    try {
      const res = await Axios.get(`${API_URL}/companies/`);
      return res.data;
    } catch (err) {
      console.error("Error al obtener empresas:", err);
      throw err;
    }
  };

  // Actualizar usuario
  const updateUser = async (userId, userData) => {
    try {
      const res = await Axios.put(`${API_URL}/users/${userId}/`, userData);
      return res.data;
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      throw err;
    }
  };

  // CORREGIDO: Asignar empresa a usuario
  const assignCompanyToUser = async (userId, companyId) => {
    try {
      const res = await Axios.patch(`${API_URL}/users/${userId}/`, {
        empresa_id: companyId // Cambiado de company_id a empresa_id
      });
      return res.data;
    } catch (err) {
      console.error("Error al asignar empresa:", err);
      throw err;
    }
  };

  // Cambiar estado del usuario
  const toggleUserStatus = async (userId, isActive) => {
    try {
      const res = await Axios.patch(`${API_URL}/users/${userId}/`, {
        is_active: !isActive
      });
      return res.data;
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, companiesData] = await Promise.all([
          GetUsers(),
          GetCompanies()
        ]);
        setUsers(usersData);
        setCompanies(companiesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mostrar mensaje de éxito temporal
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Abrir modal de edición
  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || '',
      phone: user.phone || '',
      email: user.email || ''
    });
    setEditModalOpen(true);
  };

  // Abrir modal para asignar empresa
  const handleAssignCompany = (user) => {
    setSelectedUser(user);
    // Pre-seleccionar la empresa actual del usuario si existe
    const currentCompanyId = user.empresa_id || 
                           (user.empresa && user.empresa.id) || 
                           (Array.isArray(user.empresa) && user.empresa[0] && user.empresa[0].id);
    setSelectedCompany(currentCompanyId || "");
    setCompanyModalOpen(true);
  };

  // Abrir modal de advertencia
  const handleToggleStatus = (user) => {
    setSelectedUser(user);
    setWarningModalOpen(true);
  };

  // NUEVO: Redirigir a la página de registro
  const handleCreateUser = () => {
    router.push('/users/signUp?mode=administrator');
  };

  // Guardar cambios de edición
  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      
      const updatedUser = await updateUser(selectedUser.id, editForm);
      
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      setEditModalOpen(false);
      setSelectedUser(null);
      showSuccess('Usuario actualizado correctamente');
      
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      setError('Error al actualizar el usuario: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // CORREGIDO: Guardar asignación de empresa
  const handleSaveCompany = async () => {
    try {
      if (!selectedCompany) {
        setError('Por favor seleccione una empresa');
        return;
      }

      setSaving(true);
      
      // Usar la función corregida
      const updatedUser = await assignCompanyToUser(selectedUser.id, selectedCompany);
      
      // Actualizar el estado local con el usuario actualizado
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      setCompanyModalOpen(false);
      setSelectedUser(null);
      setSelectedCompany("");
      showSuccess('Empresa asignada correctamente');
      
    } catch (err) {
      console.error("Error al asignar empresa:", err);
      if (err.response?.data) {
        // Mostrar errores específicos del backend
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.values(errorData).flat().join(', ');
          setError('Error al asignar la empresa: ' + errorMessages);
        } else {
          setError('Error al asignar la empresa: ' + (errorData || err.message));
        }
      } else {
        setError('Error al asignar la empresa: ' + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // Confirmar cambio de estado
  const handleConfirmStatusChange = async () => {
    try {
      setSaving(true);
      
      const updatedUser = await toggleUserStatus(selectedUser.id, selectedUser.is_active);
      
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? updatedUser : user
      ));
      
      setWarningModalOpen(false);
      setSelectedUser(null);
      showSuccess(`Usuario ${updatedUser.is_active ? 'activado' : 'desactivado'} correctamente`);
      
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      setError('Error al cambiar el estado del usuario: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Función auxiliar para obtener el nombre de la empresa
  const getCompanyName = (user) => {
    if (!user.empresa && !user.empresa_id) return 'Sin empresa';
    
    // Si empresa es un string, devolverlo directamente
    if (typeof user.empresa === 'string') return user.empresa;
    
    // Si empresa es un array, obtener los nombres
    if (Array.isArray(user.empresa)) {
      return user.empresa.map(emp => emp.name || emp.nombre || emp).join(', ');
    }
    
    // Si empresa es un objeto
    if (user.empresa && typeof user.empresa === 'object') {
      return user.empresa.name || user.empresa.nombre || 'Empresa asignada';
    }
    
    // Si solo tenemos empresa_id, buscar en la lista de empresas
    if (user.empresa_id) {
      const company = companies.find(c => c.id === user.empresa_id);
      return company ? (company.nombre || company.name) : `Empresa ID: ${user.empresa_id}`;
    }
    
    return 'Sin empresa';
  };

  if (loading) return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="text-red-500 text-lg text-center">
        <div className="mb-4">Error: {error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1A1A1A] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-[#292929] rounded-lg shadow-lg mb-6 p-6 border border-[#424242]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestión de Usuarios</h1>
              <p className="text-gray-300 mt-1">Administra y gestiona todos los usuarios del sistema</p>
            </div>
            
            {/* NUEVO: Botón Crear Usuario */}
            <button
              onClick={handleCreateUser}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium flex items-center justify-center"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Crear Usuario
            </button>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900 border border-green-700 text-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="bg-[#292929] rounded-lg shadow-lg border border-[#424242] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email Verificado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#292929] divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-750 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white">{user.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {user.first_name} {user.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{user.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {getCompanyName(user)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{user.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-red-900 text-red-200'
                      }`}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.email_verified 
                          ? 'bg-green-900 text-green-200' 
                          : 'bg-yellow-900 text-yellow-200'
                      }`}>
                        {user.email_verified ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-400 hover:text-blue-300 transition-colors duration-200 p-1 rounded"
                          title="Editar usuario"
                          disabled={saving}
                        >
                          <Pencil size={18} />
                        </button>
                        
                        <button
                          onClick={() => handleAssignCompany(user)}
                          className="text-purple-400 hover:text-purple-300 transition-colors duration-200 p-1 rounded"
                          title="Asignar empresa"
                          disabled={saving}
                        >
                          <Building size={18} />
                        </button>

                        <button 
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1 rounded transition-colors duration-200 ${
                            user.is_active 
                              ? 'text-green-400 hover:text-green-300' 
                              : 'text-red-400 hover:text-red-300'
                          }`}
                          title={user.is_active ? "Desactivar usuario" : "Activar usuario"}
                          disabled={saving}
                        >
                          {user.is_active ? (
                            <ToggleRight size={20} />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {users.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <p className="text-lg font-medium">No hay usuarios registrados</p>
                        <p className="text-sm mt-1">No se encontraron usuarios en el sistema</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Edición */}
        {editModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#292929] rounded-lg max-w-md w-full p-6 border border-[#424242]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Editar Usuario</h2>
                <button 
                  onClick={() => setEditModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                  disabled={saving}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rol
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    disabled={saving}
                  >
                    <option value="GLOBAL">Administrador</option>
                    <option value="USER">Usuario</option>
                    <option value="OPERATOR">Operario</option>
                    <option value="LABORATORISTA">Laboratorista</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Asignar Empresa */}
        {companyModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#292929] rounded-lg max-w-md w-full p-6 border border-[#424242]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Asignar Empresa</h2>
                <button 
                  onClick={() => setCompanyModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                  disabled={saving}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-gray-300 mb-4">
                    Asignar empresa al usuario: <strong className="text-white">{selectedUser?.first_name} {selectedUser?.last_name}</strong>
                  </p>
                  
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Seleccionar Empresa
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-[#424242] rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-200"
                    disabled={saving}
                  >
                    <option value="">Seleccione una empresa</option>
                    {companies.filter(company => company.is_active).map(company => (
                      <option key={company.id} value={company.id}>
                        {company.nombre || company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setCompanyModalOpen(false)}
                  className="px-4 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCompany}
                  disabled={saving || !selectedCompany}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Asignando...
                    </>
                  ) : (
                    <>
                      <Building size={18} />
                      Asignar Empresa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Advertencia */}
        {warningModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#292929] rounded-lg max-w-md w-full p-6 border border-[#424242]">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedUser.is_active ? 'Desactivar Usuario' : 'Activar Usuario'}
                </h2>
                
                <p className="text-gray-300 mb-4">
                  ¿Está seguro que desea {selectedUser.is_active ? 'desactivar' : 'activar'} al usuario{' '}
                  <strong className="text-white">{selectedUser.first_name} {selectedUser.last_name}</strong>?
                </p>
                
                <p className="text-yellow-400 text-sm mb-6">
                  {selectedUser.is_active 
                    ? 'El usuario no podrá acceder al sistema hasta que sea reactivado.'
                    : 'El usuario podrá acceder al sistema nuevamente.'
                  }
                </p>
                
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setWarningModalOpen(false)}
                    className="px-4 py-2 border border-[#424242] text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmStatusChange}
                    disabled={saving}
                    className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 ${
                      selectedUser.is_active 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : null}
                    {selectedUser.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}