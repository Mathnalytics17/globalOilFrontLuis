import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, Cpu, Trash2, MapPin } from 'lucide-react';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { foldersService } from '@features/asset-tree/infrastructure/foldersService';
import { machinesService } from '@features/machines/infrastructure/machinesService';

const EditMachine = () => {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para datos adicionales
  const [companies, setCompanies] = useState([]);
  const [folders, setFolders] = useState([]);
  const [filteredFolders, setFilteredFolders] = useState([]);
  const [currentMachineFolder, setCurrentMachineFolder] = useState(null);
  const [currentParentFolder, setCurrentParentFolder] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    numero_serie: '',
    codigo_equipo: '',
    empresa: '',
    carpeta: ''
  });

  // Cargar empresas
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await companiesService.list();
        setCompanies(data);
      } catch (error) {
        toast.error('Error al cargar empresas');
      }
    };
    fetchCompanies();
  }, []);

  // Cargar todas las carpetas y encontrar la ubicación actual
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const allFolders = await foldersService.list();
        setFolders(allFolders);
        
        // Buscar la carpeta de la máquina
        if (id) {
          const machineFolder = allFolders.find(folder => 
            folder.machine === parseInt(id) || folder.machine_info?.id === parseInt(id)
          );
          setCurrentMachineFolder(machineFolder);
          
          if (machineFolder) {
            
            const parentId = machineFolder.id_parent_node;
            if (parentId) {
              const parentFolder = allFolders.find(folder => 
                folder.id.toString() === parentId.toString() || 
                folder.id_node === parentId.toString()
              );
              setCurrentParentFolder(parentFolder);
              
              // Establecer la carpeta actual en el formulario
              setFormData(prev => ({
                ...prev,
                carpeta: parentId
              }));
            }
          }
        }
      } catch (error) {
        toast.error('Error al cargar carpetas');
      }
    };
    fetchFolders();
  }, [id]);

  // Filtrar carpetas cuando se selecciona una empresa
  useEffect(() => {
    if (formData.empresa) {
      const companyFolders = folders.filter(folder => 
        folder.compania_id === parseInt(formData.empresa) || 
        folder.compania_info?.id === parseInt(formData.empresa) ||
        folder.compania === parseInt(formData.empresa)
      );
      setFilteredFolders(companyFolders);
    } else {
      setFilteredFolders([]);
    }
  }, [formData.empresa, folders]);

  // Cargar datos de la máquina
  useEffect(() => {
    if (!id) return;

    const fetchMachine = async () => {
      try {
        setLoading(true);
        setError(null);

        const machineData = await machinesService.getById(id);
        
        setFormData(prev => ({
          ...prev,
          nombre: machineData.nombre || '',
          descripcion: machineData.descripcion || '',
          numero_serie: machineData.numero_serie || '',
          codigo_equipo: machineData.codigo_equipo || '',
          empresa: machineData.empresa || ''
          // La carpeta se establece en el efecto de folders
        }));

      } catch (error) {
        setError('No se pudo cargar la información de la máquina');
        toast.error('Error al cargar los datos de la máquina');
      } finally {
        setLoading(false);
      }
    };

    fetchMachine();
  }, [id]);

  // Función recursiva para mostrar la jerarquía de carpetas
  const renderFolderOptions = (foldersList, level = 0, parentId = null) => {
    let options = [];
    
    // Encontrar carpetas que pertenecen al parent actual
    const currentFolders = foldersList.filter(folder => {
      if (level === 0) {
        // En el nivel 0, mostrar root y carpetas sin parent
        return folder.typeFolder === 'root' || 
               (folder.typeFolder === 'folder' && (!folder.id_parent_node || folder.id_parent_node === "-1"));
      } else {
        // En niveles superiores, mostrar carpetas con el parent correspondiente
        return folder.id_parent_node === parentId?.toString();
      }
    });

    currentFolders.forEach(folder => {
      const indent = '─ '.repeat(level);
      const folderName = folder.name || folder.nombre || 'Sin nombre';
      
      // Determinar el valor único del folder
      const folderValue = folder.id_node || folder.id;
      
      // Verificar si esta carpeta es la carpeta padre actual
      const isCurrentParent = currentParentFolder && 
        (currentParentFolder.id.toString() === folderValue.toString() || 
         currentParentFolder.id_node === folderValue.toString());
      
      if (folder.typeFolder === 'root') {
        options.push(
          <option key={`root-${folderValue}`} value={folderValue}>
            {indent}🏢 {folderName} (Raíz) {isCurrentParent && '📍'}
          </option>
        );
      } else if (folder.typeFolder === 'machine') {
        // No mostrar carpetas de máquina como opciones de destino
        return;
      } else {
        options.push(
          <option key={folderValue} value={folderValue}>
            {indent}📁 {folderName} {isCurrentParent && '📍'}
          </option>
        );
      }
      
      // Buscar subcarpetas recursivamente (excluyendo carpetas de máquina)
      const subFolders = foldersList.filter(f => 
        f.id_parent_node === folderValue.toString() && 
        f.typeFolder !== 'machine'
      );
      if (subFolders.length > 0) {
        options.push(...renderFolderOptions(foldersList, level + 1, folderValue));
      }
    });

    return options;
  };

  // Obtener la ruta completa de la ubicación actual
  const getCurrentLocationPath = () => {
    if (!currentParentFolder) return 'No asignada';
    
    const path = [];
    let currentFolder = currentParentFolder;
    
    while (currentFolder) {
      path.unshift(currentFolder.nombre || currentFolder.name);
      
      const parentId = currentFolder.id_parent_node;
      if (!parentId || parentId === "-1") break;
      
      currentFolder = folders.find(f => 
        f.id.toString() === parentId.toString() || 
        f.id_node === parentId.toString()
      );
      
      // Prevenir loops infinitos
      if (path.length > 10) break;
    }
    
    return path.join(' / ');
  };

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Si cambia la empresa, resetear la carpeta seleccionada
    if (name === 'empresa') {
      setFormData(prev => ({
        ...prev,
        empresa: value,
        carpeta: ''
      }));
    }
  };

  // Función para actualizar la ubicación de la máquina en folders
  const updateMachineLocation = async (newParentFolderId) => {
    if (!currentMachineFolder) {
      return null;
    }

    try {
      const folderUpdateData = {
        nombre: formData.nombre,
        id_parent_node: newParentFolderId,
        compania: parseInt(formData.empresa),
        typeFolder: 'machine',
        isMachine: true,
        machine: parseInt(id)
      };


      return await foldersService.update(currentMachineFolder.id, folderUpdateData);
    } catch (error) {
      throw error;
    }
  };

  // Función para crear una nueva carpeta de máquina si no existe
  const createMachineFolder = async (parentFolderId) => {
    try {
      const folderData = {
        nombre: formData.nombre,
        typeFolder: 'machine',
        id_parent_node: parentFolderId,
        compania: parseInt(formData.empresa),
        isMachine: true,
        machine: parseInt(id)
      };


      return await foldersService.create(folderData);
    } catch (error) {
      throw error;
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (!formData.codigo_equipo.trim()) {
        throw new Error('El código de equipo es requerido');
      }
      if (!formData.empresa) {
        throw new Error('La empresa es requerida');
      }

      // Preparar datos para enviar a machines
      const machinePayload = {
        ...formData,
        empresa: parseInt(formData.empresa)
      };


      // 1. Actualizar la máquina
      await machinesService.update(id, machinePayload);

      // 2. Actualizar o crear la carpeta de la máquina si se seleccionó una carpeta
      if (formData.carpeta) {
        if (currentMachineFolder) {
          // Actualizar carpeta existente
          await updateMachineLocation(formData.carpeta);
          toast.success('Máquina y ubicación actualizadas correctamente');
        } else {
          // Crear nueva carpeta de máquina
          await createMachineFolder(formData.carpeta);
          toast.success('Máquina creada y ubicación asignada correctamente');
        }
      } else {
        toast.success('Máquina actualizada correctamente');
      }

      // Recargar la página para ver los cambios
      setTimeout(() => {
        router.push(`/machines`);
      }, 1000);

    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          error.message || 
                          'Error al actualizar máquina';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Manejar eliminación
  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta máquina? Esta acción eliminará también su carpeta y no se puede deshacer.')) {
      return;
    }

    try {
      // Primero eliminar la carpeta de la máquina si existe
      if (currentMachineFolder) {
        await foldersService.remove(currentMachineFolder.id);
      }

      // Luego eliminar la máquina
      await machinesService.remove(id);
      
      toast.success('Máquina y carpeta eliminadas correctamente');
      router.push('/maquinas');
    } catch (error) {
      toast.error('Error al eliminar la máquina');
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-[#292929] rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 gap-6">
              <div className="h-64 bg-[#292929] rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Error al cargar</h2>
            <p className="text-[#d9d9d9] mb-4">{error}</p>
            <button
              onClick={handleBack}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
      {/* Header */}
      <div className="bg-[#292929] border-b border-[#333]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-[#d9d9d9] hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Volver</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Editar Máquina</h1>
                <p className="text-[#d9d9d9]">Modificar información del equipo y su ubicación</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
        
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de la Máquina */}
          <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Cpu size={24} className="text-red-500" />
              Información de la Máquina
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nombre de la Máquina *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                  placeholder="Ej: Compresor Principal"
                />
              </div>

              {/* Código de Equipo */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Código de Equipo *
                </label>
                <input
                  type="text"
                  name="codigo_equipo"
                  value={formData.codigo_equipo}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                  placeholder="Ej: EQ-001"
                />
              </div>

              {/* Número de Serie */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Número de Serie
                </label>
                <input
                  type="text"
                  name="numero_serie"
                  value={formData.numero_serie}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ej: SN123456789"
                />
              </div>

              {/* Estado */}
              <div style={{ display: 'none' }}>
                <label className="block text-sm font-medium text-white mb-2">
                  Estado
                </label>
                <select
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="reparacion">En Reparación</option>
                </select>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                  placeholder="Descripción detallada de la máquina, características técnicas, etc."
                />
              </div>
            </div>
          </div>

          {/* Información de Empresa y Carpeta */}
          <div className="bg-[#292929] rounded-lg border border-[#333] p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <MapPin size={24} className="text-red-500" />
              Ubicación y Organización
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Empresa - Selector */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Empresa *
                </label>
                <select
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Seleccionar empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#888] mt-1">
                  Seleccione la empresa a la que pertenece la máquina
                </p>
              </div>

              {/* Carpeta - Selector */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Ubicación en Estructura
                </label>
                <select
                  name="carpeta"
                  value={formData.carpeta}
                  onChange={handleChange}
                  disabled={!formData.empresa}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.empresa ? 'Seleccionar ubicación' : 'Primero seleccione una empresa'}
                  </option>
                  {renderFolderOptions(filteredFolders)}
                </select>
                <p className="text-xs text-[#888] mt-1">
                  {formData.empresa 
                    ? '📍 Indica la ubicación actual - Seleccione nueva ubicación si desea mover la máquina' 
                    : 'Seleccione una empresa para ver las ubicaciones disponibles'
                  }
                </p>
              </div>

              {/* Información de ubicación actual */}
              {currentParentFolder && (
                <div className="md:col-span-2 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-300">
                    <MapPin size={16} />
                    <span className="font-medium">Ubicación Actual:</span>
                  </div>
                  <p className="text-sm text-blue-200 mt-1">
                    <strong>Ruta completa:</strong> {getCurrentLocationPath()}
                  </p>
                  <p className="text-sm text-blue-200 mt-1">
                    <strong>Carpeta actual:</strong> {currentParentFolder.nombre || currentParentFolder.name}
                  </p>
                  <p className="text-xs text-blue-300 mt-1">
                    <strong>Parent ID:</strong> {currentParentFolder.id_parent_node} |
                    <strong> ID:</strong> {currentParentFolder.id}
                  </p>
                </div>
              )}

              {/* ID de la Máquina (solo lectura) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  ID de la Máquina
                </label>
                <input
                  type="text"
                  value={id}
                  className="w-full px-4 py-2 bg-[#333] border border-[#444] rounded-lg text-[#888] cursor-not-allowed"
                  readOnly
                  disabled
                />
                <p className="text-xs text-[#888] mt-1">Este campo no se puede modificar</p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center pt-6 border-t border-[#333]">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2 border border-[#444] text-white rounded-lg hover:bg-[#333] transition-colors"
            >
              Cancelar
            </button>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleDelete}
                className="px-6 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Eliminar Máquina
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMachine;
