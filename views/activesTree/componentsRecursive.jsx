import Card from 'react-bootstrap/Card';
import { useState, useEffect } from 'react';
import { ChevronRightIcon, FolderIcon, DocumentIcon, TrashIcon, PlusIcon, PencilIcon, Battery0Icon } from '@heroicons/react/16/solid';
import ModalCreationFile from '@components/modals/modalCreationFile';
import ModalCreationPtMedida from '@components/modals/modelCreationPtMedida';
import ModalAddResults from '@components/modals/modalAddResults';
import Button from 'react-bootstrap/Button';
import { useFetch } from '@hooks/useFetch';
import Axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import { PenLine, Trash2, PlusCircle } from "lucide-react";

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
              .map((pt) => ({
                id_node: pt.id,
                id_parent_node: pt.id_parent_node,
                name: pt.nombre,
                typeFolder: pt.typeFolder,
                valor: pt.valor || 'algo',
              }));
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

  const GetCompanies = async () => {
    const res = await Axios.get(`${API_URL}/companies/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      }
    });
    return res.data;
  };

  const reloadStructure = async () => {
    try {
      console.log("Recargando estructura...");
      const data = await initialStructure();
      console.log("Datos recibidos:", data);
  
      setInitialStructureData(data);
    } catch (err) {
      setError('Error al recargar la estructura');
      console.error(err);
    }
  };
  
  const {
    fetch: getCompanies,
    loading: loadingGetCompanies,
    error: errorGetCompanies,
    data: dataGetCompanies,
  } = useFetch({ service: GetCompanies, init: true });

  useEffect(() => {
    console.log('Datos obtenidos de GetCompanies:', dataGetCompanies);
    if (dataGetCompanies) {
      CheckAndCreateRootFolders(dataGetCompanies);
    }
  }, [dataGetCompanies]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await initialStructure();
        setInitialStructureData(data);
      } catch (err) {
        setError('Failed to load folder structure');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ fontFamily: 'Arial', padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="p-8 max-w-sm mx-auto">
        <ul>
          {initialStructureData.map((folder) => (
            <Folder folder={folder} 
            key={folder.id_node} 
            reloadStructure={reloadStructure} />
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleCreateFile = async (nombre, typeFolder, parentId) => {
    console.log(typeFolder)
    const data = {
      nombre: nombre,
      typeFolder: typeFolder,
      parentId: parentId,
      compania: 1,
      id_parent_node: parentId,
    };
  
    try {
      const response = await fetch(`${API_URL}/folders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        throw new Error('Error al crear la carpeta/máquina');
      }
  
      const result = await response.json();
      console.log('Carpeta/máquina creada:', result);
      reloadStructure();
      
      if (typeFolder === "machine") {
        const machineData = {
          nombre: nombre,
          componente: "Componente predeterminado",
          tipoAceite: "Tipo de aceite predeterminado",
          frecuenciaCambio: 100,
          frecuenciaAnalisis: 200,
          numero_serie: "123456",
          codigo_equipo: uuidv4(),
        };
  
        const machineResponse = await fetch(`${API_URL}/machines/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(machineData),
        });
  
        if (!machineResponse.ok) {
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

  const handleCreatePtoMedida = async (
    data,
    parentId
  ) => {
    try {
      const folderData = {
        nombre: data.name,
        typeFolder: "pto_medida",
        parentId: parentId,
        compania: 1,
        id_parent_node: parentId,
      };

      const oilAnalysisData = {
        name: data.name,
        unidadMedida: data.unidadMedida,
        valorActual: data.valorActual,
        id: data.id,
        propietario: data.propietario,
        fecha_muestreo: data.fecha_muestreo,
        nombre_equipo: data.nombre_equipo,
        modelo: data.modelo,
        horas_km_aceite: data.horas_km_aceite,
        id_placa: data.id_placa,
        lugar_trabajo: data.lugar_trabajo,
        horas_km_equipo: data.horas_km_equipo,
        ref_aceite: data.ref_aceite,
        no_interno_lab: data.no_interno_lab,
        fecha_recepcion: data.fecha_recepcion,
        Maquina: data.Maquina_id,
      };

      const folderResponse = await axios.post(`${API_URL}/folders/`, folderData);
      console.log("Carpeta creada:", folderResponse.data);

      const oilAnalysisResponse = await axios.post(`${API_URL}/oilAnalysis/`, oilAnalysisData);
      console.log("Análisis de lubricante creado:", oilAnalysisResponse.data);

      return {
        folder: folderResponse.data,
        oilAnalysis: oilAnalysisResponse.data,
      };
    } catch (error) {
      console.error("Error al crear el punto de medida:", error);
      throw error;
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

  const handleAddResultsPtoMedida = async (data) => {
    try {
      const folderData = {
        nombre: `Resultados de análisis - ${data.analisis_id}`,
        typeFolder: "resultado_analisis",
        parent_id: data.analisis_id,
        compania:1,
      };

      const resultsOilAnalysisData = {
        observaciones: data.observaciones,
        indicadores: data.indicadores,
        analisis: data.analisis_id,
      };

      const folderResponse = await axios.post(`${API_URL}/folders/`, folderData);
      console.log("Carpeta creada:", folderResponse.data);

      const resultsOilAnalysisResponse = await axios.post(`${API_URL}/resultsOilAnalysis/`, resultsOilAnalysisData);
      console.log("Resultados de análisis creados:", resultsOilAnalysisResponse.data);

      return {
        folder: folderResponse.data,
        resultsOilAnalysis: resultsOilAnalysisResponse.data,
      };
    } catch (error) {
      console.error("Error al agregar resultados de análisis:", error);
      throw error;
    }
  };

  const handleAddResults = async (data) => {
    try {
      const result = await handleAddResultsPtoMedida(data);
      console.log("Resultados de análisis agregados exitosamente:", result);
    } catch (error) {
      console.error("Error al agregar resultados de análisis:", error);
    }
  };

  const handleEdit = () => {
    console.log('Editar:', folder.name);
  };
  
  const handleDeletePtosMedida = () => {
    console.log('Eliminar:', folder.name);
  };

  const handleEditPtosMedida = () => {
    console.log('Editar:', folder.name);
  };

  return (
    <li className="my-1.5" key={folder.name}>
      <span className="flex items-center gap-1.5">
        {folder.folders && folder.folders.length > 0 && (
          <Button 
          variant="link"
          style={{
            padding: 0,
            border: 0,
            outline: 'none'
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronRightIcon
            style={{
              width: '20px',
              height: '20px',
              color: 'black',
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
        <div className="flex gap-1.5">
          {folder.folders ? (
            <>
              <div>
                <Button   
           onClick={() => setShowModal(true)}>Crear carpeta/máquina</Button>
                <ModalCreationFile
                  show={showModal}
                  onHide={() => setShowModal(false)}
                  onCreate={(nombre, typeFolder) => handleCreateFile(nombre, typeFolder, folder.id_node)}
                />
              </div>
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
            </>
          ) : (
            <>
              <Button onClick={() => setIsOpenModalFolder(true)}>
                <PlusIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              </Button>
           
              <ModalCreationPtMedida
                show={isOpenModalFolder}
                onHide={() => setIsOpenModalFolder(false)}
                onCreate={(data) => handleCreatePuntoMedida(data, folder.id_node)}
              />
              <Button onClick={handleEditPtosMedida}>
                <PencilIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              </Button>
              <Button onClick={handleDelete}>
                <TrashIcon style={{ width: '20px', height: '20px', color: '#b91c1c' }} />
              </Button>
            </>
          )}
        </div>
      </span>

      {isPtMedidaOpen && folder.ptMedida && folder.ptMedida.length > 0 && (
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          {folder.ptMedida.map((pt, index) => (
            <li key={index} style={{ listStyle: 'none' }}>
              <span className="flex items-center space-x-2">
                {pt.name} - {pt.unidadMedida} {}

                <Button
                  onClick={() => handleEditPtosMedida()}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <PenLine size={16} />
                </Button>

                <Button
                  onClick={() => handleDeletePtosMedida()}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </Button>
                <Button
                  onClick={() => {
                    console.log("Abriendo modal...");
                    setIsAddResultPtoMedida(true);
                  }}
                  className="text-green-500 hover:text-green-700"
                  title="Agregar resultados de análisis"
                >
                  <PlusCircle size={16} />
                </Button>

                <ModalAddResults
                  show={isAddResultPtoMedida}
                  onHide={() => setIsAddResultPtoMedida(false)}
                  onAddResults={handleAddResults}
                />
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