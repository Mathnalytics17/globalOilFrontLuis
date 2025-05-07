import Card from 'react-bootstrap/Card';
import { useState, useEffect } from 'react';
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { ChevronRightIcon, FolderIcon, DocumentIcon, TrashIcon, PlusIcon, PencilIcon, Battery0Icon } from '@heroicons/react/16/solid';
import ModalCreationFile from '@components/modals/modalCreationFile';
import ModalMuestra from '@components/modals/modelCreationPtMedida';
import ModalAddResults from '@components/modals/modalAddResults';
import ModalEditarMuestra from '@components/modals/modalEditPtMedida';
import Button from 'react-bootstrap/Button';
import { useFetch } from '@hooks/useFetch';
import Axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import { PenLine, Trash2, PlusCircle } from "lucide-react";
import { useAuth } from '../../shared/context/AuthContext'; // Asegúrate de importar tu contexto de autenticación
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Verificar y crear carpetas raíz
const CheckAndCreateRootFolders = async (companies) => {
  for (const company of companies) {
    const res = await Axios.get(`${API_URL}/folders/?compania_id=${company.id}&typeFolder=root&nombre=${company.nombre}`);
    const carpetas = (await Axios.get(`${API_URL}/folders/`)).data;

    if (res?.data[0]?.compania == company.id) {
      console.log('está la carpeta');
    } else {
      console.log('no está');
      await Axios.post(`${API_URL}/folders/`, {
        nombre: company.nombre,
        typeFolder: 'root',
        compania: company.id,
        parentId: 1,
        isMachine: false,
      });
    }
  }
};

// Obtener la estructura inicial de carpetas
const initialStructure = async () => {
  try {
    const carpetas = (await Axios.get(`${API_URL}/folders/`)).data;
    console.log(carpetas);

    const buildStructure = (folders, parentId = '-1') => {
      return folders
        .filter((folder) => folder.id_parent_node == parentId)
        .map((folder) => {
          const isFolder = folder.typeFolder === 'folder' || folder.typeFolder === 'root';
          const isMachine = folder.typeFolder === 'machine';
          const isPtoMedida = folder.typeFolder === 'pto_medida';
    
          const structure = {
            id_node: folder.id,
            id_parent_node: folder.id_parent_node,
            name: folder.nombre,
            typeFolder: folder.typeFolder,
            compania_id: folder.compania_id,
          };
    
          if (isFolder) {
            structure.folders = buildStructure(folders, folder.id.toString());
          } else if (isMachine) {
            structure.ptMedida = folders
              .filter((f) => f.typeFolder === 'pto_medida' && f.id_parent_node == folder.id)
              .map((pt) => {
                // Verificar si es el punto de medida específico que debe tener is_ingresado: true
                const isSpecificPtMedida = pt.muestras && pt.muestras.id === "M20250007";
                
                return {
                  id_node: pt.id,
                  id_parent_node: pt.id_parent_node,
                  name: pt.nombre,
                  typeFolder: pt.typeFolder,
                  valor: pt.valor || 'algo',
                  is_ingresado: isSpecificPtMedida ? pt.muestras.is_ingresado : false
                };
              });
          }
    
          return structure;
        });
    };
    const nestedStructure = buildStructure(carpetas);
    console.log(JSON.stringify(nestedStructure, null, 2));
    return nestedStructure;
  } catch (error) {
    console.error('Error fetching initial structure:', error);
    return [];
  }
};

const RecursiveFolderDocumentStructure = () => {
  const [initialStructureData, setInitialStructureData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);
 
  const { user } = useAuth();

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  console.log(user);

  // 1. Función simple para obtener compañías
  const GetCompanies = async () => {
    try {
      
      if (!token) {
        throw new Error('No hay token disponible');
      }
      
      const res = await Axios.get(`${API_URL}/companies/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return res.data;
    } catch (err) {
      console.error('Error en GetCompanies:', err);
      throw err;
    }
  };

  // 2. Hook useFetch para obtener compañías (solo se ejecuta una vez)
  const {
    fetch: getCompanies,
    loading: loadingGetCompanies,
    error: errorGetCompanies,
    data: dataGetCompanies,
  } = useFetch({ 
    service: GetCompanies, 
    init: true
  });

  // 3. Efecto para cargar la estructura inicial
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        console.log(dataGetCompanies)
        // Solo cargamos compañías si no hay datos ni error
        if (!dataGetCompanies && !errorGetCompanies) {
          const companies = await getCompanies();
          console.log('companies',companies)
          if (companies?.length > 0) {
            await CheckAndCreateRootFolders(companies);
          }
        }
        
        // Cargamos la estructura de carpetas
        const structure = await initialStructure();
        setInitialStructureData(structure);
        
      } catch (err) {
        setError('Error al cargar la estructura');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Eliminamos dependencias para que solo se ejecute una vez

  // 4. Función para recargar la estructura
  const reloadStructure = async () => {
    try {
      setLoading(true);
      const data = await initialStructure();
      setInitialStructureData(data);
    } catch (err) {
      setError('Error al recargar la estructura');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando estructura...</div>;
  if (error) return <div>Error: {error}</div>;
  if (errorGetCompanies) return <div>Error al cargar compañías: {errorGetCompanies.message}</div>;

  return (
    <div style={{ fontFamily: 'Arial', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="p-8 max-w-sm mx-auto">
        <ul>
          {initialStructureData.map((folder) => (
            <Folder 
              folder={folder} 
              key={folder.id_node} 
              reloadStructure={reloadStructure} 
            />
          ))}
        </ul>
      </div>
    </div>
  );
};
const Folder = ({ folder, reloadStructure }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPtMedidaOpen, setIsPtMedidaOpen] = useState(false);
  const [isOpenModalFolder, setIsOpenModalFolder] = useState(false);
  const [isAddResultPtoMedida, setIsAddResultPtoMedida] = useState(false);
  const [isOpenModalPtMedida, setIsOpenModalPtMedida] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [machines, setMachines] = useState([]);
  const [lubricants, setLubricants] = useState([]);
  const [equipmentReferences, setReferences] = useState([]);
  const [users, setUsers] = useState([]);
  const [showEditModal,setShowEditModal]=useState(false)
  const [muestraData,setMuestraData]=useState([])
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [showLabConfirmation, setShowLabConfirmation] = useState(false);
  const [labRecepcionData, setLabRecepcionData] = useState({
    fecha_recepcion: '',
    condiciones_entrega: '',
    campos_adicionales: null
  });
  
  const [currentMuestraId, setCurrentMuestraId] = useState(null);
  const {user}=useAuth()
  const token = localStorage.getItem('access_token');
  const currentUser= user
  // Cargar datos al montar el componente
  useEffect(() => {
    // Ejemplo con fetch:
    const loadData = async () => {
      const [machinesRes, lubsRes, refsRes,usersRefs] = await Promise.all([
        Axios.get(`${API_URL}/machines/`,{
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000 // 10 segundos de timeout
        }).then(res => res.data),
        Axios.get(`${API_URL}/lubrication/lubricants/`,{
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000 // 10 segundos de timeout
        }).then(res => res.data),
        Axios.get(`${API_URL}/lubrication/equipment-references/`,{
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000 // 10 segundos de timeout
        }).then(res => res.data),
        Axios.get(`${API_URL}/users/`,{
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000 // 10 segundos de timeout
        }).then(res => res.data),
        
      ]);
      
      setMachines(machinesRes);
      setLubricants(lubsRes);
      setReferences(refsRes);
      setUsers(usersRefs)
    
    };
  
    loadData();
  }, []);


  const handleCreateFile = async (data,nombre, typeFolder, parentId) => {
    console.log(typeFolder,parentId,data)
    const folderData = {
      nombre: nombre,
      typeFolder: typeFolder || 'folder',
      parentId: parentId,
      compania: 1,
      id_parent_node: parentId,
    };
    console.log
  
    try {
      
      const response = await Axios.post(`${API_URL}/folders/`, JSON.stringify(folderData), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000 // 10 segundos de timeout
      });
      console.log(response)
      if (!response.statusText=="Created") {
        throw new Error('Error al crear la carpeta/máquina');
      }
  
      const result = await response.data;
      console.log('Carpeta/máquina creada:', result);
      reloadStructure();
      
      if (typeFolder === "machine") {
        const machineData = {
          nombre: data.nombre,
          componente: data.componente,
          tipoAceite: data.tipoAceite,
          frecuenciaCambio:data.frecuenciaCambio,
          frecuenciaAnalisis: data.frecuenciaAnalisis,
          numero_serie: data.numero_serie,
          codigo_equipo:data.codigo_equipo,
        };
        const token = localStorage.getItem('access_token');
        const machineResponse = await Axios.post(`${API_URL}/machines/`, JSON.stringify(machineData), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000 // 10 segundos de timeout
        });
       
  
        if (!machineResponse.statusText=="Created") {
          throw new Error('Error al crear la máquina');
        }
  
        const machineResult = await machineResponse.json();
        console.log('Máquina creada:', machineResult);
        reloadStructure();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };


  const handleDeletePtosMedida = async (muestraId) => {
  if (window.confirm("¿Está seguro que desea eliminar esta muestra?")) {
    try {
      await axios.delete(`${API_URL}/lubrication/samples/${muestraId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      alert("Muestra eliminada correctamente");
      // Actualizar la lista de muestras
      fetchMuestras();
    } catch (error) {
      console.error("Error al eliminar muestra:", error);
      alert("Error al eliminar la muestra");
    }
  }
};

const handleAddResults = (muestraId) => {
  window.location.href = `http://localhost:3000/muestras/ensayos-muestra?muestra=${muestraId}`;
};

  const handleConfirmLabIngreso = async (idMuestra) => {
    try {
      if (!labRecepcionData.fecha_recepcion) {
        alert("La fecha de recepción es obligatoria");
        return;
      }
      console.log(idMuestra)
      const ingresoData = {
        muestra: idMuestra,
        fecha_recepcion: labRecepcionData.fecha_recepcion,
        usuario_recepcion: currentUser.id,
        condiciones_entrega: labRecepcionData.condiciones_entrega,
        campos_adicionales: labRecepcionData.campos_adicionales
      };
  
      const response = await axios.post(`${API_URL}/lubrication/lab-entries/`, ingresoData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      // Actualizar el estado de la muestra a is_ingresado=true
      await axios.patch(`${API_URL}/lubrication/samples/${idMuestra}/`, {
        is_ingresado: true
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      alert("Muestra ingresada al laboratorio correctamente");
      setShowLabConfirmation(false);
      // Actualizar la lista de muestras
      
    } catch (error) {
      console.error("Error al ingresar muestra al laboratorio:", error);
      alert("Error al ingresar la muestra al laboratorio");
    }
  };
  const handleCreatePtoMedida = async (
    data,
    parentId
  ) => {
    console.log(data)
    try {
      // 1. Primero creamos la muestra de lubricante
      const oilAnalysisData = {
        fecha_toma: data.fecha_muestreo || new Date().toISOString(),
        lubricante: data.lubricante || '',
        Equipo: data.Maquina || data.equipo || 1,
        contacto_cliente: data.contacto_cliente || '',
        equipo_placa: data.equipo_placa || '',
        referencia_equipo: data.referencia_equipo || null,
        periodo_servicio_aceite: data.periodo_servicio_aceite ? parseFloat(data.horas_km_aceite) : null,
        unidad_periodo_aceite: data.unidad_periodo_aceite || 'horas',
        periodo_servicio_equipo: data.periodo_servicio_equipo ? parseFloat(data.horas_km_equipo) : null,
        unidad_periodo_equipo: data.unidad_periodo_equipo || 'horas',
        usuario_registro: currentUser.id,
      };
    
      console.log('Datos para crear muestra:', oilAnalysisData);
    
      // POST para crear la muestra
      const muestraResponse = await axios.post(`${API_URL}/lubrication/samples/`, oilAnalysisData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
    
      console.log("Muestra de lubricante creada:", muestraResponse.data);
    
      // Extraemos el ID de la muestra recién creada
      const sampleId = muestraResponse.data.id;
      if (!sampleId) {
        throw new Error('No se pudo obtener el ID de la muestra creada');
      }
    
      // 2. Ahora creamos la carpeta usando el ID de la muestra como nombre
      const folderData = {
        nombre: sampleId.toString(), // Usamos el ID de la muestra como nombre
        typeFolder: "pto_medida",
        parentId: parentId,
        compania: 1,
        id_parent_node: parentId,
      };
    
      console.log('Datos para crear carpeta:', folderData);
    
      // POST para crear la carpeta
      const folderResponse = await axios.post(`${API_URL}/folders/`, folderData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
    
      console.log("Carpeta creada:", folderResponse.data);
    
      return {
        folder: folderResponse.data,
        oilAnalysis: muestraResponse.data,
      };
    
    } catch (error) {
      console.error("Error en el proceso completo:", error);
      throw error; // Re-lanzamos el error para manejarlo en el componente
    }
  };

  const handleCreatePuntoMedida = async (data, parentId) => {
    try {
      const result = await handleCreatePtoMedida(data, parentId);
      console.log("Punto de medida creado exitosamente:", result);
    } catch (error) {
      console.error("Error al crear el punto de medida:", error);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar "${folder.name}"?`);
    if (!confirmDelete) return;
  
    console.log('Eliminar:', folder.name);
  
    try {
      const response = await fetch(`${API_URL}/folders/${folder.id_node}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error('Error al eliminar la carpeta o punto de medida');
      }
  
      const result = await response;
      console.log('Carpeta o punto de medida eliminado:', result);
      reloadStructure();
        
    } catch (error) {
      console.error('Error:', error);
    }
  };

  


  const handleEdit = () => {
    console.log('Editar:', folder.name);
  };
  


  const handleEditPtosMedida = async (parent_id) => {
    console.log('Editar:', parent_id);
    setShowEditModal(true)
    const muestraData= await Axios.get(`${API_URL}/lubrication/samples/${parent_id}/`,{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    })
    
    setMuestraData(muestraData.data)
    console.log(muestraData)
    return muestraData
  };

  const handleUpdateMuestra = (muestraActualizada) => {
    // Lógica para actualizar la muestra en tu estado o backend
    console.log('Muestra actualizada:', muestraActualizada);
    setShowEditModal(false);
  };

console.log(folder)
  return (
    <li className="list-unstyled my-5" key={folder.name}>
      <div className="d-flex items-center gap-3" >
        {folder.folders && folder.folders.length > 0 && (
          <Button 
          variant="link"
          style={{
            padding: 2,
            border: 0,
            outline: 'none'
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronRightIcon
            style={{
              width: '20px',
              height: '20px',
              color: 'white',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        </Button>
        )}

        {folder.folders ? (
          <FolderIcon
            style={{ width: '20px', height: '20px' }}
            className={`text-sky-500 ${folder.folders.length === 0 ? 'ml-[22px]' : ''}`}
          />
        ) : (
          <PenLine style={{ width: "20px", height: "20px" }} />
        )}

        {folder.name}

        {folder.ptMedida && folder.ptMedida.length > 0 && (
          <Button  variant="link"
          style={{
            padding: 0,
            border: 0,
            outline: 'none'
          }} 
          onClick={() => setIsPtMedidaOpen(!isPtMedidaOpen)}>
            <ChevronRightIcon
              style={{
                width: '20px',
                height: '20px',
                color: '#6b7280',
                transform: isPtMedidaOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          </Button>
        )}
       
          {folder.folders ? (
            <>
              <div className="d-flex align-items-center gap-1">
            {/* Botón para crear carpeta */}
            <Button 
              variant="outline-primary" 
              onClick={() => setShowModal(true)}
              className="d-flex align-items-center gap-1"
              size="sm"
              style={{
                padding: 0,
                border: 0,
                outline: 'none'
              }} 
            >
              <i className="bi bi-folder-plus"></i>
              <span role="img" aria-label="create-carpeta">📁</span> 
            </Button>
            
            {/* Botón para crear máquina */}
            <Button 
              variant="outline-success" 
              onClick={() => setShowModal(true)}
              className="d-flex align-items-center gap-1"
              size="sm"
              style={{
                padding: 0,
                border: 0,
                outline: 'none'
              }} 
            >
              <i className="bi bi-pc-display-horizontal"></i>
              <span role="img" aria-label="create-machine">⚙️</span> 
            </Button>

            {/* Modal (se mantiene igual) */}
            <ModalCreationFile
              show={showModal}
              onHide={() => setShowModal(false)}
              onCreate={(machineData,nombre, typeFolder,parentId) =>  handleCreateFile(machineData, nombre, typeFolder, folder.id_node)}
            
            />
         
              <Button  variant="link"
          style={{
            padding: 0,
            border: 0,
            outline: 'none'
          }}onClick={handleEdit}>
                <PencilIcon style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
              </Button>
              <Button  variant="link"
          style={{
            padding: 0,
            border: 0,
            outline: 'none'
          }} onClick={handleDelete}>
                <TrashIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />
              </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="link"
          style={{
            padding: 0,
            border: 0,
            outline: 'none'
          }}onClick={() => setIsOpenModalFolder(true)} >
                <PlusIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              </Button>
           
              <ModalMuestra
                show={isOpenModalFolder}
                onHide={() => setIsOpenModalFolder(false)}
                onCreate={(data) => handleCreatePuntoMedida(data, folder.id_node)}
                machines= {machines}
                lubricants= {lubricants}
                equipmentReferences={equipmentReferences}
                users={users}
                currentUser={currentUser}
              />

      <ModalEditarMuestra
              show={showEditModal }
              onHide={(shouldShow) => setShowEditModal(shouldShow)}
              onUpdate={handleUpdateMuestra}
             // onCreate={() => handleEditPtosMedida(folder.id_node)}
              machines={machines}
              lubricants={lubricants}
              equipmentReferences={equipmentReferences}
              users={users}
              currentUser={currentUser}
              muestraData={muestraData} // Datos de la muestra a editar
            />
              <Button 
            variant="link"
            style={{
              padding: 0,
              border: 0,
              outline: 'none'
            }}
            onClick={() => handleEditPtosMedida(folder.id_node)}
          >
            <PencilIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
          </Button>
              <Button variant="link"
          style={{
            padding: 0,
            border: 0,
            outline: 'none'
          }}
          onClick={handleDelete}>
                <TrashIcon style={{ width: '20px', height: '20px', color: '#b91c1c' }} />
              </Button>
            </>
          )}
       
      </div>

      {isPtMedidaOpen && folder.ptMedida && folder.ptMedida.length > 0 && (
  <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
    {folder.ptMedida.map((pt, index) => (
      <li key={index} style={{ listStyle: 'none' }}>
        <span className="flex items-center space-x-2">
          {pt.name} {pt.is_ingresado}

          {/* Botón de Edición */}
          <Button
            variant="link"
            size="sm"
            style={{ padding: 0, border: 0, outline: 'none' }}
            onClick={() => handleEditPtosMedida(pt.name)}
          >
            <PenLine size={16} />
          </Button>

          {/* Botón de Eliminación */}
          <Button
            variant="link"
            size="sm"
            style={{ padding: 0, border: 0, outline: 'none' }}
            onClick={() => handleDeletePtosMedida(pt.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={16} />
          </Button>

          {/* Botón para Ingresar al Laboratorio - Solo visible si NO está ingresado */}
          {pt.is_ingresado=== false && (
            <Button
              variant="link"
              size="sm"
              style={{ padding: 0, border: 0, outline: 'none' }}
              onClick={() => {
                setCurrentMuestraId(pt.nombre);
                setShowLabConfirmation(true);
              }}
              className="text-blue-500 hover:text-blue-700"
              title="Ingresar muestra al laboratorio"
            >
              <PenLine size={16} /> {/* Icono de tubo de ensayo */}
            </Button>
          )}

          {/* Botón de Agregar Resultados - Solo visible si ESTÁ ingresado */}
          {pt.is_ingresado === true && (
            <Button
              variant="link"
              size="sm"
              style={{
                padding: 0,
                border: 0,
                outline: 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                window.location.href = `http://localhost:3000/muestras/ensayos-muestra?muestra=${pt.name}`;
              }}
              className="text-green-500 hover:text-green-700"
              title="Agregar resultados de análisis"
            >
              <PlusCircle size={16} />
            </Button>
          )}

          {/* Modal de Confirmación para Ingreso a Laboratorio */}
          <Modal show={showLabConfirmation} onHide={() => setShowLabConfirmation(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Confirmar Ingreso a Laboratorio</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha de Recepción *</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={labRecepcionData.fecha_recepcion || ''}
                    onChange={(e) => setLabRecepcionData({
                      ...labRecepcionData,
                      fecha_recepcion: e.target.value
                    })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Condiciones de Entrega</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={labRecepcionData.condiciones_entrega || ''}
                    onChange={(e) => setLabRecepcionData({
                      ...labRecepcionData,
                      condiciones_entrega: e.target.value
                    })}
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowLabConfirmation(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => handleConfirmLabIngreso(pt.name)}>
                Confirmar Ingreso
              </Button>
            </Modal.Footer>
          </Modal>
        </span>
      </li>
    ))}
  </ul>
)}
      {isOpen && folder.folders && (
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          {folder.folders.map((subFolder) => (
            <Folder folder={subFolder} key={subFolder.id_node} reloadStructure={reloadStructure} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default RecursiveFolderDocumentStructure;