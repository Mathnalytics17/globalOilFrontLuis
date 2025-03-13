import Card from 'react-bootstrap/Card';
import { useState, useEffect } from 'react';
import { ChevronRightIcon, FolderIcon, DocumentIcon, TrashIcon, PlusIcon, PencilIcon,Battery0Icon} from '@heroicons/react/16/solid';
import ModalCreationFile from '@components/modals/modalCreationFile';
import ModalCreationPtMedida from '@components/modals/modelCreationPtMedida';
import ModalAddResults from '@components/modals/modalAddResults';
import Button from 'react-bootstrap/Button';
import { useFetch } from '@hooks/useFetch';
import Axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import axios from "axios"; // O usa fetch si prefieres

import { PenLine,Trash2,PlusCircle } from "lucide-react";

interface ptMedida {
  name: string;
  unidadMedida?: string;
}

interface Folder {
  id_node: string;
  id_parent_node: string;
  name: string;
  folders?: Folder[];
  ptMedida?: ptMedida[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Verificar y crear carpetas raíz
const CheckAndCreateRootFolders = async (companies) => {
  for (const company of companies) {
    // Verificar si la compañía ya tiene una carpeta raíz
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
        parentId: 1, // Carpeta raíz no tiene parentId
        isMachine: false,
      });
    }
  }
};

// Obtener la estructura inicial de carpetas
const initialStructure = async (): Promise<Folder[]> => {
  try {
    const carpetas = (await Axios.get(`${API_URL}/folders/`)).data;
    console.log(carpetas);

    const buildStructure = (folders, parentId = '-1') => {
      return folders
        .filter((folder) => folder.id_parent_node == parentId) // Filtrar por parentId
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
            // Si es una carpeta, construir subcarpetas recursivamente
            structure.folders = buildStructure(folders, folder.id.toString());
          } else if (isMachine) {
            // Si es una máquina, buscar los puntos de medida asociados
            structure.ptMedida = folders
              .filter((f) => f.typeFolder === 'pto_medida' && f.id_parent_node == folder.id)
              .map((pt) => ({
                id_node: pt.id,
                id_parent_node: pt.id_parent_node,
                name: pt.nombre,
                typeFolder: pt.typeFolder,
                valor: pt.valor || 'algo', // Valor por defecto si no está definido
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
  const [initialStructureData, setInitialStructureData] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Obtener la lista de compañías
  const GetCompanies = async () => {
    const res = await Axios.get(`${API_URL}/companies/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  };
  // Función para recargar la estructura de carpetas
   // Función para recargar la estructura de carpetas
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
  
  // Uso de la función con los datos del `fetch`
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

  // Fetch initial structure on component mount
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

const Folder = ({ folder, reloadStructure }: { folder: Folder; reloadStructure: () => void }) => {
  const [isOpen, setIsOpen] = useState(false); // Estado para expandir/contraer carpetas
  const [isPtMedidaOpen, setIsPtMedidaOpen] = useState(false); // Estado para expandir/contraer puntos de medida
  const [isOpenModalFolder, setIsOpenModalFolder] = useState(false);
  const [isAddResultPtoMedida, setIsAddResultPtoMedida] = useState(false);
  const [isOpenModalPtMedida, setIsOpenModalPtMedida] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleCreateFile = async (nombre: string, typeFolder: string, parentId: string) => {
    console.log(typeFolder)
    const data = {
      nombre: nombre, // Nombre de la carpeta/máquina
      typeFolder: typeFolder, // Tipo: "folder" o "machine"
      parentId: parentId, // ID del nodo padre (seleccionado)
      compania: 1, // ID de la compañía (puede venir del estado o props)
      id_parent_node: parentId, // ID del nodo padre (seleccionado)
    };
  
    try {
      // Crear la carpeta o máquina en la ruta /api/folders/
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
      // Si es una máquina, crear también en /api/machines/
      if (typeFolder === "machine") {
        const machineData = {
          nombre: nombre, // Nombre de la máquina
          componente: "Componente predeterminado", // Puedes obtener este valor del modal
          tipoAceite: "Tipo de aceite predeterminado", // Puedes obtener este valor del modal
          frecuenciaCambio: 100, // Puedes obtener este valor del modal
          frecuenciaAnalisis: 200, // Puedes obtener este valor del modal
          numero_serie: "123456", // Puedes obtener este valor del modal
          codigo_equipo: uuidv4(), // Puedes obtener este valor del modal
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
        // Recargar la estructura después de crear
      reloadStructure();
      }
  
      // Aquí puedes actualizar el estado de la aplicación o recargar la estructura
    } catch (error) {
      console.error('Error:', error);
    }
  };






// Función para crear un punto de medida
const handleCreatePtoMedida = async (
  data: {
    name: string;
    unidadMedida: string;
    valorActual: string;
    id?: string;
    propietario?: string;
    fecha_muestreo?: string;
    nombre_equipo?: string;
    modelo?: string;
    horas_km_aceite?: string;
    id_placa?: string;
    lugar_trabajo?: string;
    horas_km_equipo?: string;
    ref_aceite?: string;
    no_interno_lab?: string;
    fecha_recepcion?: string;
    Maquina?: string;
  },
  parentId: number // Se agrega el parentId como parámetro
) => {
  try {
    // Datos para la carpeta (ajusta según lo que necesites)
    const folderData = {
      nombre: data.name,
      typeFolder: "pto_medida", // Tipo de carpeta
      parentId: parentId, // Se usa el parentId recibido
      compania: 1,
      id_parent_node: parentId, // Se asegura de asignar el ID correctamente
    };

    // Datos para el análisis de lubricante
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

    // Primera solicitud POST a /api/folders/
    const folderResponse = await axios.post(`${API_URL}/folders/`, folderData);
    console.log("Carpeta creada:", folderResponse.data);

    // Segunda solicitud POST a /api/oilAnalysis/
    const oilAnalysisResponse = await axios.post(`${API_URL}/oilAnalysis/`, oilAnalysisData);
    console.log("Análisis de lubricante creado:", oilAnalysisResponse.data);

    // Retornar las respuestas si es necesario
    return {
      folder: folderResponse.data,
      oilAnalysis: oilAnalysisResponse.data,
    };
  } catch (error) {
    console.error("Error al crear el punto de medida:", error);
    throw error; // Lanza el error para manejarlo en el componente
  }
};

// Función para manejar la creación del punto de medida
const handleCreatePuntoMedida = async (data, parentId) => {
  try {
    const result = await handleCreatePtoMedida(data, parentId);
    console.log("Punto de medida creado exitosamente:", result);
    // Aquí puedes mostrar un mensaje de éxito o redirigir al usuario
  } catch (error) {
    console.error("Error al crear el punto de medida:", error);
    // Aquí puedes mostrar un mensaje de error al usuario
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
      // Recargar la estructura después de eliminar
      reloadStructure();
        
    } catch (error) {
      console.error('Error:', error);
    }
  };


// Función para agregar resultados de análisis
const handleAddResultsPtoMedida = async (data: {
  observaciones: string;
  indicadores: string;
  analisis_id: string; // ID del nodo padre (punto de medida)
}) => {
  try {
    // Datos para la carpeta
    const folderData = {
      nombre: `Resultados de análisis - ${data.analisis_id}`, // Nombre de la carpeta
      typeFolder: "resultado_analisis", // Tipo de carpeta
      parent_id: data.analisis_id, // ID del nodo padre (punto de medida)
      compania:1,
    };

    // Datos para los resultados del análisis
    const resultsOilAnalysisData = {
      observaciones: data.observaciones,
      indicadores: data.indicadores,
      analisis: data.analisis_id, // ID del nodo padre (punto de medida)
    };

    // Primera solicitud POST a /api/folders/
    const folderResponse = await axios.post(`${API_URL}/folders/`, folderData);
    console.log("Carpeta creada:", folderResponse.data);

    // Segunda solicitud POST a /api/resultsOilAnalysis/
    const resultsOilAnalysisResponse = await axios.post(`${API_URL}/resultsOilAnalysis/`, resultsOilAnalysisData);
    console.log("Resultados de análisis creados:", resultsOilAnalysisResponse.data);

    // Retornar las respuestas si es necesario
    return {
      folder: folderResponse.data,
      resultsOilAnalysis: resultsOilAnalysisResponse.data,
    };
  } catch (error) {
    console.error("Error al agregar resultados de análisis:", error);
    throw error; // Lanza el error para manejarlo en el componente
  }
};
const handleAddResults = async (data) => {
  try {
    const result = await handleAddResultsPtoMedida(data);
    console.log("Resultados de análisis agregados exitosamente:", result);
    // Aquí puedes mostrar un mensaje de éxito o redirigir al usuario
  } catch (error) {
    console.error("Error al agregar resultados de análisis:", error);
    // Aquí puedes mostrar un mensaje de error al usuario
  }
};


  const handleEdit = () => {
    console.log('Editar:', folder.name);
    // Lógica para editar la carpeta o punto de medida
  };
  
  const handleDeletePtosMedida = () => {
    console.log('Eliminar:', folder.name);
    // Lógica para eliminar la carpeta o punto de medida
  };

 
  const handleEditPtosMedida = () => {
    console.log('Editar:', folder.name);
    // Lógica para editar la carpeta o punto de medida
  };


 
  return (
    <li className="my-1.5" key={folder.name}>
      <span className="flex items-center gap-1.5">
        {/* Botón para expandir/contraer carpetas */}
        {folder.folders && folder.folders.length > 0 && (
          <button onClick={() => setIsOpen(!isOpen)}>
            <ChevronRightIcon
              style={{
                width: '20px',
                height: '20px',
                color: '#6b7280',
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', // Rotación condicional
              }}
            />
          </button>
        )}

        {/* Ícono de carpeta o documento */}
        {folder.folders ? (
          <FolderIcon
            style={{ width: '20px', height: '20px' }}
            className={`text-sky-500 ${folder.folders.length === 0 ? 'ml-[22px]' : ''}`}
          />
        ) : (
          <PenLine style={{ width: "20px", height: "20px" }} />
        )}

        {/* Nombre de la carpeta */}
        {folder.name}

        {/* Botón para expandir/contraer puntos de medida */}
        {folder.ptMedida && folder.ptMedida.length > 0 && (
          <button onClick={() => setIsPtMedidaOpen(!isPtMedidaOpen)}>
            <ChevronRightIcon
              style={{
                width: '20px',
                height: '20px',
                color: '#6b7280',
                transform: isPtMedidaOpen ? 'rotate(90deg)' : 'rotate(0deg)', // Rotación condicional
              }}
            />
          </button>
        )}
        <div className="flex gap-1.5">
          {folder.folders ? (
            <>
              <div>
                <Button onClick={() => setShowModal(true)}>Crear carpeta/máquina</Button>
                <ModalCreationFile
                  show={showModal}
                  onHide={() => setShowModal(false)}
                  onCreate={(nombre, typeFolder) => handleCreateFile(nombre, typeFolder, folder.id_node)} // Pasar el id del nodo seleccionado
                />
              </div>
              <button onClick={handleEdit}>
                <PencilIcon style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
              </button>
              <button onClick={handleDelete}>
                <TrashIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />
              </button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsOpenModalFolder(true)}>
                <PlusIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              </Button>
           
              <ModalCreationPtMedida
                show={isOpenModalFolder}
                onHide={() => setIsOpenModalFolder(false)}
                onCreate={(data) => handleCreatePuntoMedida(data, folder.id_node)} // Pasando el parentId
              />
              <button onClick={handleEditPtosMedida}>
                <PencilIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
              </button>
              <button onClick={handleDelete}>
                <TrashIcon style={{ width: '20px', height: '20px', color: '#b91c1c' }} />
              </button>
            </>
          )}
        </div>
      </span>

      {/* Mostrar puntos de medida si están expandidos */}
      {isPtMedidaOpen && folder.ptMedida && folder.ptMedida.length > 0 && (
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>

          
          {folder.ptMedida.map((pt, index) => (
            
            <li key={index} style={{ listStyle: 'none' }}>
              
                <span className="flex items-center space-x-2">
                  {pt.name} - {pt.unidadMedida} {}

                  <button
                    onClick={() => handleEditPtosMedida()}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <PenLine size={16} />
                  </button>

                  <button
                    onClick={() => handleDeletePtosMedida()}
                    className="text-red-500 hover:text-red-700"
                  >
                            <Trash2 size={16} />
                          </button>
                          <button
                        onClick={() => {
                          console.log("Abriendo modal..."); // 🔍 Verificar si se ejecuta
                          setIsAddResultPtoMedida(true);
                        }}
                        className="text-green-500 hover:text-green-700"
                        title="Agregar resultados de análisis"
                      >
                        <PlusCircle size={16} />
                      </button>

                     
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

      {/* Mostrar subcarpetas si están expandidas */}
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