import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { foldersService } from '@features/asset-tree/infrastructure/foldersService';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { authService } from '@features/auth/infrastructure/authService';

const CreateMachine = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [folders, setFolders] = useState([]);
  const [filteredFolders, setFilteredFolders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    componente: '',
    tipoAceite: '',
    frecuenciaCambio: '',
    frecuenciaAnalisis: '',
    numero_serie: '',
    codigo_equipo: '', // ✅ Ahora editable y más amigable
    empresa: '',
    carpeta: ''
  });

  // Generar código sugerido basado en el nombre
  const generateSuggestedCode = (nombre) => {
    if (!nombre.trim()) return '';
    
    // Tomar las primeras 3-4 letras del nombre y convertir a mayúsculas
    const prefix = nombre.substring(0, 4).toUpperCase().replace(/\s/g, '');
    
    // Añadir timestamp para hacerlo único
    const timestamp = Date.now().toString().slice(-4);
    
    return `${prefix}-${timestamp}`;
  };

  // Cargar empresas disponibles
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const [data, user] = await Promise.all([
          companiesService.list(),
          authService.getCurrentUser().catch(() => null),
        ]);
        setCurrentUser(user);
        const isGlobal = user?.role === 'GLOBAL' || user?.is_superuser || user?.is_staff;
        if (!isGlobal && user?.empresa_id) {
          setCompanies([{ id: user.empresa_id, nombre: user.empresa }]);
          setFormData((prev) => ({ ...prev, empresa: String(user.empresa_id) }));
        } else {
          setCompanies(data);
        }
      } catch (error) {
        toast.error('Error al cargar empresas');
      }
    };
    loadCompanies();
  }, []);

  // Cargar todas las carpetas
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const data = await foldersService.list();
        setFolders(data);
      } catch (error) {
        toast.error('Error al cargar carpetas');
      }
    };
    loadFolders();
  }, []);

  // Filtrar carpetas cuando se selecciona una empresa
  useEffect(() => {
    if (formData.empresa) {
      const companyFolders = folders.filter(folder => 
        folder.compania_id === parseInt(formData.empresa) || 
        folder.compania_info?.id === parseInt(formData.empresa)
      );
      setFilteredFolders(companyFolders);
      // Resetear selección de carpeta al cambiar empresa
      setFormData(prev => ({ ...prev, carpeta: '' }));
    } else {
      setFilteredFolders([]);
    }
  }, [formData.empresa, folders]);

  // Generar código sugerido cuando cambia el nombre
  useEffect(() => {
    if (formData.nombre && !formData.codigo_equipo) {
      const suggestedCode = generateSuggestedCode(formData.nombre);
      setFormData(prev => ({ ...prev, codigo_equipo: suggestedCode }));
    }
  }, [formData.nombre]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función recursiva para mostrar la jerarquía de carpetas
  const renderFolderOptions = (foldersList, level = 0) => {
    let options = [];
    
    // Primero agregar el folder root de la empresa
    const rootFolder = foldersList.find(f => f.typeFolder === 'root');
    if (rootFolder && level === 0) {
      options.push(
        <option key={rootFolder.id} value={rootFolder.id}>
          {rootFolder.name || rootFolder.nombre} (Root)
        </option>
      );
    }

    // Luego agregar carpetas normales y subcarpetas
    foldersList
      .filter(f => f.typeFolder === 'folder' && f.id_parent_node !== "-1")
      .forEach(folder => {
        const indent = '─ '.repeat(level);
        options.push(
          <option key={folder.id} value={folder.id}>
            {indent}📁 {folder.name || folder.nombre}
          </option>
        );
        
        // Buscar subcarpetas recursivamente
        const subFolders = foldersList.filter(f => 
          f.id_parent_node === folder.id.toString() && f.typeFolder === 'folder'
        );
        if (subFolders.length > 0) {
          options.push(...renderFolderOptions(subFolders, level + 1));
        }
      });

    return options;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (!formData.empresa) {
        throw new Error('La empresa es requerida');
      }
      if (!formData.carpeta) {
        throw new Error('La carpeta destino es requerida');
      }
      if (!formData.codigo_equipo.trim()) {
        throw new Error('El código de equipo es requerido');
      }

      // Validar formato del código de equipo
      const codeRegex = /^[A-Z0-9]{3,}-[A-Z0-9]{3,}$/;
      if (!codeRegex.test(formData.codigo_equipo)) {
        throw new Error('El código de equipo debe tener formato: ABC-123 (mínimo 3 caracteres, guión, mínimo 3 caracteres)');
      }

      // ✅ VALIDAR que carpeta sea un número (ID)
      const parentFolderId = parseInt(formData.carpeta);
      if (isNaN(parentFolderId)) {
        throw new Error('ID de carpeta inválido. Debe ser un número.');
      }


      // 1. Preparar datos para la máquina
      const machinePayload = {
        nombre: formData.nombre,
        descripcion: formData.numero_serie || '',
        empresa: parseInt(formData.empresa),
        componente: '',
        tipoAceite: '',
        frecuenciaCambio: formData.frecuenciaCambio ? Number(formData.frecuenciaCambio) : 0,
        frecuenciaAnalisis: formData.frecuenciaAnalisis ? Number(formData.frecuenciaAnalisis) : 0,
        numero_serie: formData.numero_serie,
        codigo_equipo: formData.codigo_equipo, // ✅ Usar el código ingresado por el usuario
      };


      // 2. Crear la máquina
      const machineResult = await machinesService.create(machinePayload);

      // 3. ✅ VERIFICAR que la carpeta padre existe
      const parentFolder = filteredFolders.find(f => f.id === parentFolderId);
      if (!parentFolder) {
        throw new Error(`No se encontró la carpeta padre con ID: ${parentFolderId}`);
      }

      // 4. Preparar datos para la carpeta (usando el ID numérico)
      const folderData = {
        nombre: formData.nombre,
        typeFolder: 'machine',
        id_parent_node: parentFolderId.toString(),
        compania: parseInt(formData.empresa),
        isMachine: true,
        machine: machineResult.id
      };


      // 5. Crear la carpeta
      await foldersService.create(folderData);
      
      toast.success('Máquina y carpeta creadas correctamente');
      router.push('/machines');
      
    } catch (error) {
      
      // Mostrar error más detallado
      let errorMessage = 'Error al crear máquina';
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = Object.values(error.response.data).flat().join(', ');
        } else {
          errorMessage = error.response.data.detail || error.response.data.message || errorMessage;
        }
      }
      
      toast.error(errorMessage || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para generar un nuevo código sugerido
  const generateNewCode = () => {
    const newCode = generateSuggestedCode(formData.nombre || 'MAQ');
    setFormData(prev => ({ ...prev, codigo_equipo: newCode }));
    toast.info('Nuevo código generado');
  };

  return (
    <div className="min-h-screen bg-[#292929] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Crear Nueva Máquina
          </h1>
          <p className="text-[#d9d9d9]">
            Complete los datos para crear una nueva máquina en el sistema
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#1a1a1a] rounded-lg shadow-2xl border border-[#333] p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Empresa */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Empresa <span className="text-red-500">*</span>
                </label>
                <select
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  required
                  disabled={currentUser && !(currentUser.role === 'GLOBAL' || currentUser.is_superuser || currentUser.is_staff)}
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                >
                  <option value="" className="text-gray-400">Seleccionar empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id} className="text-white bg-[#292929]">
                      {company.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Carpeta Destino */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Carpeta destino <span className="text-red-500">*</span>
                </label>
                <select
                  name="carpeta"
                  value={formData.carpeta}
                  onChange={handleChange}
                  required
                  disabled={!formData.empresa}
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="" className="text-gray-400">
                    {formData.empresa ? 'Seleccionar carpeta' : 'Primero seleccione una empresa'}
                  </option>
                  {renderFolderOptions(filteredFolders)}
                </select>
                <p className="text-xs text-gray-400">
                  Seleccione dónde crear la máquina en la estructura
                </p>
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Nombre de la máquina <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Ej: Compresor Principal"
                />
              </div>

              {/* Código de equipo - MEJORADO */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Código de equipo <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="codigo_equipo"
                    value={formData.codigo_equipo}
                    onChange={handleChange}
                    required
                    className="flex-1 px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Ej: COMP-001"
                    pattern="[A-Za-z0-9]{3,}-[A-Za-z0-9]{3,}"
                    title="Formato: ABC-123 (mínimo 3 caracteres, guión, mínimo 3 caracteres)"
                  />
                  <button
                    type="button"
                    onClick={generateNewCode}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
                    title="Generar nuevo código"
                  >
                    🔄
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Formato: ABC-123 | Se genera automáticamente basado en el nombre
                </p>
              </div>

              {false && (
              <>
              {/* Componente */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Componente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="componente"
                  value={formData.componente}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Ingrese el componente"
                />
              </div>

              {/* Tipo de aceite */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Tipo de aceite <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tipoAceite"
                  value={formData.tipoAceite}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Ingrese el tipo de aceite"
                />
              </div>

              {/* Frecuencia de cambio */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Frecuencia de cambio (horas) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="frecuenciaCambio"
                  value={formData.frecuenciaCambio}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Ej: 500"
                />
              </div>

              {/* Frecuencia de análisis */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Frecuencia de análisis (horas) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="frecuenciaAnalisis"
                  value={formData.frecuenciaAnalisis}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Ej: 250"
                />
              </div>

              </>
              )}

              {/* Número de serie */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Número de serie
                </label>
                <input
                  type="text"
                  name="numero_serie"
                  value={formData.numero_serie}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#292929] border border-[#444] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Ingrese el número de serie"
                />
              </div>

            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-[#333]">
              <button
                type="button"
                onClick={() => router.push('/machines')}
                disabled={loading}
                className="px-6 py-3 border border-[#444] text-white rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>Cancelar</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <span>Crear Máquina</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMachine;
