import Card from 'react-bootstrap/Card';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { ChevronRightIcon, FolderIcon, DocumentIcon, TrashIcon, PlusIcon, PencilIcon, Battery0Icon } from '@heroicons/react/16/solid';
import ModalCreationFile from '@components/modals/modalCreationFile';
import ModalMuestra from '@components/modals/modelCreationPtMedida';
import ModalEditarMuestra from './modals/modalEditPtMedida';
import ModalAddResults from '@components/modals/modalAddResults';
import Button from 'react-bootstrap/Button';
import { useFetch } from '@hooks/useFetch';
import Axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import { PenLine, Trash2, PlusCircle, Eye, TestTube, Cpu } from "lucide-react";
import { useAuth } from '../../shared/context/AuthContext';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
import { FolderPlus, SquarePlus, FilePlus } from "lucide-react";
import { useSafeApi } from '../hooks/safeApi';

// Componente Skeleton para carga moderna
const FolderSkeleton = () => (
  <div className="animate-pulse flex items-center gap-3 my-4">
    <div className="w-5 h-5 bg-gray-600 rounded"></div>
    <div className="w-6 h-6 bg-gray-700 rounded"></div>
    <div className="flex-1">
      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
    </div>
    <div className="flex gap-2">
      <div className="w-6 h-6 bg-gray-700 rounded"></div>
      <div className="w-6 h-6 bg-gray-700 rounded"></div>
    </div>
  </div>
);

const H1Skeleton = () => (
  <div className="animate-pulse flex items-center gap-3 my-4">
    <h1 className="w-5 h-5 bg-gray-600 rounded"></h1>
  </div>
);

const TextSkeleton = () => (
  <div className="animate-pulse flex items-center gap-3 my-4">
    <div className="w-full h-5 bg-gray-600 rounded"></div>
  </div>
);

const CardSkeleton = () => (
  <div className="animate-pulse w-full">
    <div className="w-1/3 h-5 bg-gray-200 rounded mb-6"></div>
    <H1Skeleton />
    <TextSkeleton />
    <div className="space-y-4 mt-6">
      <FolderSkeleton />
      <FolderSkeleton />
      <FolderSkeleton />
    </div>
    <div className="pl-8 space-y-4 mt-4">
      <FolderSkeleton />
      <FolderSkeleton />
    </div>
  </div>
);

const StructureSkeleton = () => (
  <div className="space-y-6 p-6">
    <CardSkeleton/>
  </div>
);

// Error component moderno
const ErrorMessage = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
      <span className="text-2xl">⚠️</span>
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Error al cargar</h3>
    <p className="text-gray-300 mb-4">{message}</p>
    <button
      onClick={onRetry}
      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition duration-200"
    >
      Reintentar
    </button>
  </div>
);

// ✅ FUNCIÓN OPTIMIZADA: Obtener estructura desde el nuevo endpoint
const initialStructure = async () => {
  try {
    const response = await Axios.get(`${API_URL}/actives-tree/basic-structure/`);
    
    if (response.data.success) {
      console.log('🏗️ Estructura optimizada cargada:', response.data.structure);
      
      // Transformar la estructura para que sea compatible con el frontend existente
      const transformStructure = (folders) => {
        return folders.map(folder => ({
          id_node: folder.id,
          id_parent_node: folder.id_parent_node,
          name: folder.nombre,
          typeFolder: folder.typeFolder,
          compania_id: folder.compania_info?.id || folder.compania,
          compania_info: folder.compania_info,
          machines: folder.machine_info, // ← Cambiar de machine_info a machines
          muestra: folder.muestra_info?.id || folder.muestra, // ← Mantener compatibilidad
          muestra_info: folder.muestra_info, // ← Información completa de muestra
          folders: folder.subfolders ? transformStructure(folder.subfolders) : [] // ← Cambiar subfolders a folders
        }));
      };
      
      return transformStructure(response.data.structure);
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching optimized structure:', error);
    throw error;
  }
};

const RecursiveFolderDocumentStructure = () => {
  const { safeApiCall } = useSafeApi();
  const [initialStructureData, setInitialStructureData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // ✅ ELIMINADO: Ya no necesitamos CheckAndCreateRootFolders ni GetCompanies
  // porque el nuevo endpoint maneja todo automáticamente

  // 3. Efecto para cargar la estructura inicial - OPTIMIZADO
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ✅ SOLO 1 PASO: Cargar estructura optimizada
        const structure = await initialStructure();
        setInitialStructureData(structure);

      } catch (err) {
        console.error('❌ Error en loadInitialData:', err);
        setError(err.message || 'Error al cargar la estructura');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 4. Función para recargar la estructura
  const reloadStructure = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await initialStructure();
      setInitialStructureData(data);
    } catch (err) {
      setError('Error al recargar la estructura');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <StructureSkeleton />;
  if (error) return <ErrorMessage message={error} onRetry={reloadStructure} />;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Estructura de Activos</h1>
          <p className="text-gray-400">Gestión jerárquica de equipos y puntos de medida</p>
        </div>
        
        <div className="bg-[#292929] rounded-xl shadow-2xl p-6">
          <ul className="space-y-2">
            {initialStructureData.map((folder) => (
              <Folder 
                folder={folder} 
                key={folder.id_node} 
                reloadStructure={reloadStructure} 
              />
            ))}
          </ul>
          
          {initialStructureData.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderIcon className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No hay estructura cargada</h3>
              <p className="text-gray-500">Comienza creando tu primera carpeta o equipo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



const Folder = ({ folder, reloadStructure }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenModalFolder, setIsOpenModalFolder] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [machines, setMachines] = useState([]);
  const [lubricants, setLubricants] = useState([]);
  const [equipmentReferences, setReferences] = useState([]);
  const [users, setUsers] = useState([]);
  const [editFormData, setEditFormData] = useState({});
  const { user } = useAuth();
  const currentUser = user;

  // Cargar datos necesarios (se mantiene igual)
  useEffect(() => {
    const loadData = async () => {
      const [lubsRes, refsRes, usersRefs] = await Promise.all([
        Axios.get(`${API_URL}/lubrication/lubricants/`).then(res => res.data),
        Axios.get(`${API_URL}/lubrication/equipment-references/`).then(res => res.data),
        Axios.get(`${API_URL}/users/`).then(res => res.data),
      ]);
      
      setLubricants(lubsRes);
      setReferences(refsRes);
      setUsers(usersRefs);
    };
  
    loadData();
  }, []);

  // Cargar datos específicos cuando se abre el modal de edición (se mantiene igual)
  useEffect(() => {
    if (showEditModal && folder.typeFolder === 'machine') {
      const loadMachineData = async () => {
        console.log(folder)
        try {
          const response = await Axios.get(`${API_URL}/machines/${folder.machines.id}/`);
          setEditFormData(response.data);
        } catch (error) {
          console.error('Error cargando datos de máquina:', error);
        }
      };
      loadMachineData();
    } else if (showEditModal && folder.typeFolder === 'muestra') {
      const loadMuestraData = async () => {
        try {
          const response = await Axios.get(`${API_URL}/lubrication/samples/${folder.muestra}/`);
          setEditFormData(response.data);
        } catch (error) {
          console.error('Error cargando datos de muestra:', error);
        }
      };
      loadMuestraData();
    }
  }, [showEditModal, folder]);

  // LOGICA CREACION DE FOLDER Y MAQUINA (se mantiene igual)
  const handleCreateFile = async (data, nombre, typeFolder, parentId, compania_id) => {
    const folderData = {
      nombre: nombre,
      typeFolder: typeFolder || 'folder',
      parentId: parentId,
      id_parent_node: parentId,
      compania: compania_id,
      isMachine: typeFolder === 'machine'
    };

    try {
      const response = await Axios.post(`${API_URL}/folders/`, folderData);
      const result = response.data;

      if (typeFolder === "machine") {
        const machineData = {
          nombre: data.nombre,
          descripcion: data.descripcion,
          empresa: compania_id,
        };
        
        const machineResponse = await Axios.post(`${API_URL}/machines/`, machineData);
        const machineResult = machineResponse.data;

        await Axios.patch(`${API_URL}/folders/${result.id}/`, {
          machine: machineResult.id
        });
      }
      
      reloadStructure();
      
    } catch (error) {
      console.error('Error completo:', error);
      alert(`Error al crear: ${error.response?.data?.detail || error.message}`);
    }
  };

  // LOGICA ELIMINACION (se mantiene igual)
  const handleDelete = async () => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar "${folder.name}"?`);
    if (!confirmDelete) return;
   
    try {
      if (folder.typeFolder === 'machine' && folder.machines) {
        await Axios.delete(`${API_URL}/machines/${folder.machines.id}/`);
      }
      await Axios.delete(`${API_URL}/folders/${folder.id_node}/`);
      reloadStructure();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  // Función para manejar cuando se crea una muestra (se mantiene igual)
  const handleMuestraCreada = (muestraCreada) => {
    toast.success('Punto de medida creado exitosamente');
    reloadStructure();
    setIsOpenModalFolder(false);
  };

  // Función para guardar edición (se mantiene igual)
  const handleSaveEdit = async () => {
    try {
      if (folder.typeFolder === 'machine') {
        await Axios.put(`${API_URL}/machines/${folder.machines.id}/`, editFormData);
        toast.success('Máquina actualizada correctamente');
      } else if (folder.typeFolder === 'muestra') {
        await Axios.put(`${API_URL}/lubrication/samples/${folder.muestra}/`, editFormData);
        toast.success('Muestra actualizada correctamente');
      }
      reloadStructure();
      setShowEditModal(false);
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar los cambios');
    }
  };

  // Función para navegar a vista completa (se mantiene igual)
  const handleNavigateToFullView = () => {
    if (folder.typeFolder === 'machine') {
      window.location.href = `/machines/detail-machine?id=${folder.machines.id}`;
    } else if (folder.typeFolder === 'muestra') {
      window.location.href = `/machines/edit-machine?id=${folder.muestra}`;
    }
  };

  // Función para navegar a edición completa (se mantiene igual)
  const handleNavigateToFullEdit = () => {
    if (folder.typeFolder === 'machine') {
      window.location.href = `/machines/edit-machine?id=${folder.machines.id}`;
    } else if (folder.typeFolder === 'muestra') {
      window.location.href = `/muestras/editar-muestra?muestra=${folder.muestra}`;
    }
  };

  // Manejar cambios en el formulario de edición (se mantiene igual)
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Determinar el icono según el tipo de carpeta (se mantiene igual)
  const getFolderIcon = () => {
    switch (folder.typeFolder) {
      case 'root':
      case 'folder':
        return <FolderIcon style={{ width: "20px", height: "20px" }} className="text-sky-500" />;
      case 'machine':
        return <PenLine style={{ width: "20px", height: "20px" }} className="text-green-500" />;
      case 'muestra':
        return <TestTube style={{ width: "20px", height: "20px" }} className="text-yellow-500" />;
      default:
        return <FolderIcon style={{ width: "20px", height: "20px" }} className="text-gray-500" />;
    }
  };

  // Determinar qué botones mostrar según el tipo de carpeta (se mantiene igual)
  const renderActionButtons = () => {
    switch (folder.typeFolder) {
      case 'root':
      case 'folder':
        return (
          <div className="d-flex align-items-center gap-1">
            <Button
              variant="outline-primary"
              onClick={() => setShowModal(true)}
              className="d-flex align-items-center gap-1"
              size="sm"
              style={{ padding: 0, border: 0, outline: "none" }}
              title="Crear carpeta o máquina"
            >
              <FolderPlus className="w-4 h-4 text-blue-400" />
            </Button>
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={handleDelete}
            >
              <TrashIcon style={{ width: "20px", height: "20px", color: "#ef4444" }} />
            </Button>
          </div>
        );
      
      case 'machine':
        return (
          <div className="d-flex align-items-center gap-1">
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={() => setIsOpenModalFolder(true)}
              title="Crear punto de medida"
            >
              <PlusIcon style={{ width: "20px", height: "20px", color: "#f59e0b" }} />
            </Button>
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={() => setShowViewModal(true)}
              title="Ver máquina"
            >
              <Eye style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
            </Button>
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={() => setShowEditModal(true)}
              title="Editar máquina"
            >
              <PencilIcon style={{ width: "20px", height: "20px", color: "#10b981" }} />
            </Button>
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={handleDelete}
            >
              <TrashIcon style={{ width: "20px", height: "20px", color: "#b91c1c" }} />
            </Button>
          </div>
        );
      
      case 'muestra':
        return (
          <div className="d-flex align-items-center gap-1">
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={() => setShowViewModal(true)}
              title="Ver muestra"
            >
              <Eye style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
            </Button>
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={() => setShowEditModal(true)}
              title="Editar muestra"
            >
              <PencilIcon style={{ width: "20px", height: "20px", color: "#10b981" }} />
            </Button>
            <Button
              variant="link"
              style={{ padding: 0, border: 0, outline: "none" }}
              onClick={handleDelete}
            >
              <TrashIcon style={{ width: "20px", height: "20px", color: "#b91c1c" }} />
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Determinar si se debe mostrar el botón de expandir (se mantiene igual)
  const shouldShowExpandButton = () => {
    return folder.folders && folder.folders.length > 0;
  };

  return (
    <li className="list-none my-3">
      <div className="flex items-center gap-3 p-3 hover:bg-[#3a3a3a] rounded-lg transition duration-200 group">
        {/* Botón para expandir/contraer */}
        {shouldShowExpandButton() && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-[#4a4a4a] rounded transition"
          >
            <ChevronRightIcon
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          </button>
        )}

        {/* Icono según tipo de carpeta */}
        {getFolderIcon()}

        {/* Nombre de la carpeta */}
        <span className={`${!shouldShowExpandButton() && folder.typeFolder !== 'muestra' ? "ml-[22px]" : ""}`}>
          {folder.name}
        </span>

        {/* Botones de acción */}
        {renderActionButtons()}
      </div>

      {/* Modal para crear carpeta/máquina */}
      <ModalCreationFile
        show={showModal}
        onHide={() => setShowModal(false)}
        onCreate={(machineData, nombre, typeFolder, parentId) =>
          handleCreateFile(
            machineData,
            nombre,
            typeFolder,
            folder.id_node,
            folder.compania_id?.id || folder.compania_id
          )
        }
        compania_id={folder.compania_id?.id || folder.compania_id}
      />

      {/* Modal para crear muestra */}
      <ModalMuestra
        show={isOpenModalFolder}
        onHide={() => setIsOpenModalFolder(false)}
        onCreate={handleMuestraCreada}
        machines={machines}
        lubricants={lubricants}
        equipmentReferences={equipmentReferences}
        users={users}
        currentUser={currentUser}
        folder={folder}
      />

      {/* Modal de Vista (Ver) */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            {folder.typeFolder === 'machine' ? 'Ver Máquina' : 'Ver Muestra'} - {folder.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            {folder.typeFolder === 'machine' ? (
              <div>
                <h6>Información de la Máquina</h6>
                <p><strong>Nombre:</strong> {folder.name}</p>
                <p><strong>Empresa:</strong> {folder.compania_info?.nombre}</p>
                <p><strong>ID:</strong> {folder.machines?.id}</p>
                {/* Aquí puedes agregar más campos de solo lectura */}
              </div>
            ) : (
              <div>
                <h6>Información de la Muestra</h6>
                <p><strong>Nombre:</strong> {folder.name}</p>
                <p><strong>ID Muestra:</strong> {folder.muestra}</p>
                <p><strong>Máquina:</strong> {folder.machines?.nombre}</p>
                {/* Aquí puedes agregar más campos de solo lectura */}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={handleNavigateToFullView}>
            Ir a Vista Completa
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Edición */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-warning text-dark">
          <Modal.Title>
            {folder.typeFolder === 'machine' ? 'Editar Máquina' : 'Editar Muestra'} - {folder.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {folder.typeFolder === 'machine' ? (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nombre de la Máquina</Form.Label>
                <Form.Control
                  type="text"
                  name="nombre"
                  value={editFormData.nombre || ''}
                  onChange={handleEditFormChange}
                  placeholder="Nombre de la máquina"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="descripcion"
                  value={editFormData.descripcion || ''}
                  onChange={handleEditFormChange}
                  placeholder="Descripción de la máquina"
                />
              </Form.Group>
              {/* Agregar más campos según tu modelo de máquina */}
            </Form>
          ) : (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Observaciones</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="observaciones"
                  value={editFormData.observaciones || ''}
                  onChange={handleEditFormChange}
                  placeholder="Observaciones de la muestra"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Contacto del Cliente</Form.Label>
                <Form.Control
                  type="text"
                  name="contacto_cliente"
                  value={editFormData.contacto_cliente || ''}
                  onChange={handleEditFormChange}
                  placeholder="Contacto del cliente"
                />
              </Form.Group>
              {/* Agregar más campos según tu modelo de muestra */}
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button variant="outline-primary" onClick={handleNavigateToFullEdit}>
            Edición Avanzada
          </Button>
          <Button variant="warning" onClick={handleSaveEdit}>
            Guardar Cambios
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Renderizar subcarpetas */}
      {isOpen && folder.folders && (
        <ul style={{ paddingLeft: "20px", marginTop: "10px" }}>
          {folder.folders.map((subFolder) => (
            <Folder
              folder={subFolder}
              key={subFolder.id_node}
              reloadStructure={reloadStructure}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default RecursiveFolderDocumentStructure;