import { appDialog } from '@shared/ui/AppDialogProvider';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { Save, Cpu, Trash2, MapPin, Gauge, Pencil, X, RotateCcw } from 'lucide-react';
import { companiesService } from '@features/companies/infrastructure/companiesService';
import { foldersService } from '@features/asset-tree/infrastructure/foldersService';
import { machinesService } from '@features/machines/infrastructure/machinesService';
import { assetTreeService } from '@features/asset-tree/infrastructure/assetTreeService';
import DataTable from '@shared/ui/DataTable';
import AppErrorState from '@shared/ui/AppErrorState';

const EMPTY_SAMPLING_POINT = {
  nombre: '',
  codigo: '',
  descripcion: '',
  lubricante: '',
  lubricante_catalogo: '',
  lubricante_fabricante: '',
  lubricante_referencia: '',
  frecuencia_cambio: '',
  unidad_frecuencia_cambio: 'horas',
  frecuencia_analisis: '',
  unidad_frecuencia_analisis: 'horas',
};

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
  const [samplingPoints, setSamplingPoints] = useState([]);
  const [showInactivePoints, setShowInactivePoints] = useState(false);
  const [pointStatusSaving, setPointStatusSaving] = useState(null);
  const [lubricants, setLubricants] = useState([]);
  const [pointForm, setPointForm] = useState(EMPTY_SAMPLING_POINT);
  const [editingPointId, setEditingPointId] = useState(null);
  const [pointSaving, setPointSaving] = useState(false);
  
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

  const loadSamplingPoints = async () => {
    if (!id) return;
    try {
      const [points, catalog] = await Promise.all([
        assetTreeService.listSamplingPoints({ machine: id, page_size: 1000, include_inactive: 'true' }),
        assetTreeService.listLubricants({ page_size: 1000 }),
      ]);
      setSamplingPoints(points);
      setLubricants(catalog);
    } catch (loadError) {
      console.error(loadError);
      toast.error('No se pudieron cargar los puntos de medida de la máquina.');
    }
  };

  useEffect(() => {
    loadSamplingPoints();
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
        // The page state explains inaccessible/missing resources without a
        // second toast that looks like a technical failure.
        setError(error);
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

  const resetPointForm = () => {
    setPointForm(EMPTY_SAMPLING_POINT);
    setEditingPointId(null);
  };

  const handlePointChange = (event) => {
    const { name, value } = event.target;
    setPointForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSaveSamplingPoint = async () => {
    if (!pointForm.nombre.trim()) {
      toast.error('El nombre del punto de medida es obligatorio.');
      return;
    }

    setPointSaving(true);
    try {
      let lubricantId = pointForm.lubricante_catalogo || null;
      if (pointForm.lubricante_fabricante.trim() || pointForm.lubricante_referencia.trim()) {
        if (!pointForm.lubricante_fabricante.trim() || !pointForm.lubricante_referencia.trim()) {
          toast.error('Para crear un lubricante indique fabricante y referencia / marca.');
          setPointSaving(false);
          return;
        }
        const lubricant = await assetTreeService.createLubricant({
          fabricante: pointForm.lubricante_fabricante.trim(),
          referencia: pointForm.lubricante_referencia.trim(),
        });
        lubricantId = lubricant.id;
      }
      const { lubricante_fabricante, lubricante_referencia, ...pointFields } = pointForm;
      const payload = {
        ...pointFields,
        maquina: Number(id),
        lubricante_catalogo: lubricantId,
        frecuencia_cambio: pointForm.frecuencia_cambio === '' ? null : Number(pointForm.frecuencia_cambio),
        frecuencia_analisis: pointForm.frecuencia_analisis === '' ? null : Number(pointForm.frecuencia_analisis),
      };
      if (editingPointId) {
        await assetTreeService.updateSamplingPoint(editingPointId, payload);
        toast.success('Punto de medida actualizado.');
      } else {
        await assetTreeService.createSamplingPoint(payload);
        toast.success('Punto de medida creado.');
      }
      resetPointForm();
      await loadSamplingPoints();
    } catch (saveError) {
      const message = saveError.response?.data?.nombre?.[0]
        || saveError.response?.data?.detail
        || 'No se pudo guardar el punto de medida.';
      toast.error(message);
    } finally {
      setPointSaving(false);
    }
  };

  const handleEditSamplingPoint = (point) => {
    setEditingPointId(point.id);
    setPointForm({
      nombre: point.nombre || '', codigo: point.codigo || '', descripcion: point.descripcion || '',
      lubricante: point.lubricante || '', frecuencia_cambio: point.frecuencia_cambio ?? '',
      lubricante_catalogo: point.lubricante_catalogo ? String(point.lubricante_catalogo) : '',
      lubricante_fabricante: '', lubricante_referencia: '',
      unidad_frecuencia_cambio: point.unidad_frecuencia_cambio || 'horas',
      frecuencia_analisis: point.frecuencia_analisis ?? '',
      unidad_frecuencia_analisis: point.unidad_frecuencia_analisis || 'horas',
    });
    document.getElementById('puntos-medida')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeactivateSamplingPoint = async (point) => {
    if (!await appDialog.confirm(`¿Desactivar el punto de medida “${point.nombre}”? Sus muestras históricas se conservarán.`)) return;
    try {
      await assetTreeService.removeSamplingPoint(point.id);
      toast.success('Punto de medida desactivado.');
      if (editingPointId === point.id) resetPointForm();
      await loadSamplingPoints();
    } catch (removeError) {
      toast.error(removeError.response?.data?.detail || 'No se pudo desactivar el punto de medida.');
    }
  };

  const handleReactivateSamplingPoint = async (point) => {
    if (!await appDialog.confirm(`¿Reactivar el punto de medida “${point.nombre}”? Volverá a estar disponible para nuevas muestras.`)) return;
    setPointStatusSaving(point.id);
    try {
      await assetTreeService.reactivateSamplingPoint(point.id);
      toast.success('Punto de medida reactivado.');
      await loadSamplingPoints();
    } catch (reactivateError) {
      toast.error(reactivateError.response?.data?.detail || 'No se pudo reactivar el punto de medida.');
    } finally {
      setPointStatusSaving(null);
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
      const { carpeta, ...machineFields } = formData;
      const machinePayload = {
        ...machineFields,
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
    if (!await appDialog.confirm('¿Estás seguro de que deseas eliminar esta máquina? Esta acción eliminará también su carpeta y no se puede deshacer.')) {
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
      router.push('/machines');
    } catch (error) {
      toast.error('Error al eliminar la máquina');
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="go-page">
        <div className="go-shell max-w-5xl">
          <div className="animate-pulse">
            <div className="h-8 bg-[#202328] rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 gap-6">
              <div className="h-64 bg-[#202328] rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="go-page">
        <div className="go-shell max-w-5xl">
          <AppErrorState error={error} fallback="No fue posible cargar la máquina." onRetry={() => router.replace(router.asPath)} onBack={() => router.push('/machines')} backLabel="Volver a máquinas" />
        </div>
      </div>
    );
  }

  return (
    <div className="go-page">
      {/* Header */}
      <div className="mb-6">
        <div className="go-shell max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Editar Máquina</h1>
                <p className="text-[#969ca6]">Modificar información del equipo y su ubicación</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
        
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="go-shell max-w-5xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de la Máquina */}
          <div className="go-card">
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
                  className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ej: SN123456789"
                />
              </div>

              {/* Estado */}
              <div style={{ display: 'none' }}>
                <label className="block text-sm font-medium text-white mb-2">
                  Estado
                </label>
                <select
                  className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-vertical"
                  placeholder="Descripción detallada de la máquina, características técnicas, etc."
                />
              </div>
            </div>
          </div>

          {/* Puntos de medida: la unidad operativa para crear muestras de aceite */}
          <section id="puntos-medida" className="go-card scroll-mt-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Gauge size={24} className="text-red-500" />
                  Puntos de medida
                </h2>
                <p className="text-sm text-[#b9bec8] mt-2 max-w-2xl">
                  Cada muestra se registra contra uno de estos puntos. Una misma máquina puede tener varios, cada uno con su lubricante y frecuencias.
                </p>
              </div>
              <span className="self-start rounded-full border border-white/[0.07] bg-[#17191c] px-3 py-1 text-sm text-[#cfd3d8]">
                {samplingPoints.filter((point) => point.activo !== false).length} activo(s)
              </span>
            </div>

            <div className="mb-6">
              <label className="mb-4 inline-flex items-center gap-2 text-sm text-[#cfd3d8]">
                <input type="checkbox" checked={showInactivePoints} onChange={(event) => setShowInactivePoints(event.target.checked)} />
                Mostrar puntos inactivos
              </label>
              <DataTable
                data={samplingPoints.filter((point) => showInactivePoints || point.activo !== false)}
                rowKey="id"
                pagination
                minWidth={720}
                emptyMessage="Esta máquina aún no tiene puntos de medida. Cree el primero a continuación."
                columns={[
                  { id: 'nombre', label: 'Punto', mobileTitle: true, minWidth: 180, render: (point) => <div><div className="font-medium text-white">{point.nombre}</div>{point.descripcion && <div className="mt-1 text-xs text-[#a9afba]">{point.descripcion}</div>}</div> },
                  { id: 'codigo', label: 'Código', render: (point) => point.codigo || '—' },
                  { id: 'lubricante', label: 'Lubricante', render: (point) => point.lubricante || '—' },
                  { id: 'frecuencia_cambio', label: 'Cambio', render: (point) => point.frecuencia_cambio ? `${point.frecuencia_cambio} ${point.unidad_frecuencia_cambio || ''}` : '—' },
                  { id: 'frecuencia_analisis', label: 'Análisis', render: (point) => point.frecuencia_analisis ? `${point.frecuencia_analisis} ${point.unidad_frecuencia_analisis || ''}` : '—' },
                  { id: 'estado', label: 'Estado', render: (point) => point.activo === false ? 'Inactivo' : 'Activo' },
                  { id: 'acciones', label: 'Acciones', sortable: false, mobileActions: true, render: (point) => <div className="flex justify-end gap-1.5">{point.activo === false ? <button type="button" onClick={(event) => { event.stopPropagation(); handleReactivateSamplingPoint(point); }} disabled={pointStatusSaving === point.id} className="go-mini icon-only" title="Reactivar punto" aria-label={`Reactivar ${point.nombre}`}><RotateCcw size={15} /></button> : <><button type="button" onClick={(event) => { event.stopPropagation(); handleEditSamplingPoint(point); }} className="go-mini icon-only" title="Editar punto"><Pencil size={15} /></button><button type="button" onClick={(event) => { event.stopPropagation(); handleDeactivateSamplingPoint(point); }} className="go-mini icon-only text-red-300" title="Desactivar punto"><Trash2 size={15} /></button></>}</div> },
                ]}
              />
            </div>

            <div className="border-t border-[#3a3a3a] pt-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-semibold text-white">{editingPointId ? 'Editar punto de medida' : 'Nuevo punto de medida'}</h3>
                {editingPointId && <button type="button" onClick={resetPointForm} className="inline-flex items-center gap-1 text-sm text-[#cdd2dc] hover:text-white"><X size={15} /> Cancelar edición</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-white mb-2">Nombre *</label><input name="nombre" value={pointForm.nombre} onChange={handlePointChange} placeholder="Ej: Reductor lado entrada" className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white" /></div>
                <div><label className="block text-sm font-medium text-white mb-2">Código del punto</label><input name="codigo" value={pointForm.codigo} onChange={handlePointChange} placeholder="Ej: PM-RED-01" className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white" /></div>
                <div><label className="block text-sm font-medium text-white mb-2">Lubricante predeterminado</label><select name="lubricante_catalogo" value={pointForm.lubricante_catalogo} onChange={handlePointChange} className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white"><option value="">Sin lubricante de catálogo</option>{lubricants.map((item) => <option key={item.id} value={item.id}>{item.fabricante} · {item.referencia}</option>)}</select><div className="mt-2 grid grid-cols-2 gap-2"><input name="lubricante_fabricante" value={pointForm.lubricante_fabricante} onChange={handlePointChange} placeholder="Nuevo: fabricante" className="w-full px-3 py-2 bg-[#141518] border border-[#353940] rounded-md text-white text-sm" /><input name="lubricante_referencia" value={pointForm.lubricante_referencia} onChange={handlePointChange} placeholder="Nueva: referencia / marca" className="w-full px-3 py-2 bg-[#141518] border border-[#353940] rounded-md text-white text-sm" /></div><p className="mt-1 text-xs text-gray-500">Si no existe, complete ambos campos: se crea y se asigna a este punto.</p></div>
                <div><label className="block text-sm font-medium text-white mb-2">Frecuencia de cambio</label><div className="grid grid-cols-[1fr_130px] gap-2"><input type="number" min="0" name="frecuencia_cambio" value={pointForm.frecuencia_cambio} onChange={handlePointChange} className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white" /><select name="unidad_frecuencia_cambio" value={pointForm.unidad_frecuencia_cambio} onChange={handlePointChange} className="px-3 py-2 bg-[#141518] border border-[#353940] rounded-md text-white"><option value="horas">Horas</option><option value="días">Días</option><option value="meses">Meses</option></select></div></div>
                <div><label className="block text-sm font-medium text-white mb-2">Frecuencia de análisis</label><div className="grid grid-cols-[1fr_130px] gap-2"><input type="number" min="0" name="frecuencia_analisis" value={pointForm.frecuencia_analisis} onChange={handlePointChange} className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white" /><select name="unidad_frecuencia_analisis" value={pointForm.unidad_frecuencia_analisis} onChange={handlePointChange} className="px-3 py-2 bg-[#141518] border border-[#353940] rounded-md text-white"><option value="horas">Horas</option><option value="días">Días</option><option value="meses">Meses</option></select></div></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-white mb-2">Descripción</label><textarea name="descripcion" value={pointForm.descripcion} onChange={handlePointChange} rows={3} placeholder="Ubicación o condición de toma de la muestra" className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white resize-vertical" /></div>
              </div>
              <div className="mt-4 flex justify-end"><button type="button" onClick={handleSaveSamplingPoint} disabled={pointSaving} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">{pointSaving ? 'Guardando...' : editingPointId ? 'Actualizar punto' : 'Crear punto de medida'}</button></div>
            </div>
          </section>

          {/* Información de Empresa y Carpeta */}
          <div className="go-card">
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
                  className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 bg-[#141518] border border-[#353940] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="md:col-span-2 rounded-lg border border-white/[0.07] bg-[#17191c] p-3">
                  <div className="flex items-center gap-2 text-[#aeb4bd]">
                    <MapPin size={16} />
                    <span className="font-medium">Ubicación Actual:</span>
                  </div>
                  <p className="text-sm text-[#969ca6] mt-1">
                    <strong>Ruta completa:</strong> {getCurrentLocationPath()}
                  </p>
                  <p className="text-sm text-[#969ca6] mt-1">
                    <strong>Carpeta actual:</strong> {currentParentFolder.nombre || currentParentFolder.name}
                  </p>
                  <p className="text-xs text-[#aeb4bd] mt-1">
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
                  className="w-full rounded-md border border-white/[0.07] bg-[#202328] px-3 py-2 text-[#777d86] cursor-not-allowed"
                  readOnly
                  disabled
                />
                <p className="text-xs text-[#888] mt-1">Este campo no se puede modificar</p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-between items-center pt-6 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={handleBack}
              className="go-ghost"
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
