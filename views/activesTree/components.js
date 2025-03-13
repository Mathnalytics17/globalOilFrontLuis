import { useState } from 'react';
import { FiMoreVertical } from 'react-icons/fi';
import MachineFormModal from '../../shared/components/modals/machineFormModal';
import ConfigForm from '../../shared/components/forms/configForm';

const buttonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px 6px',
  borderRadius: '4px',
  transition: 'background 0.2s',
  ':hover': {
    backgroundColor: '#f0f0f0'
  }
};

const NestedList = ({ data = [], depth = 0, onAdd, onDelete, onAddChild, onAddSibling, onAddMachine, path = [] ,fullData=[]}) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [editingNode, setEditingNode] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [machineModalPath, setMachineModalPath] = useState([]);
  console.log(data)
  console.log('Full data:', fullData);
  const findNestedItem = (path, data) => {
    if (!data || !Array.isArray(data)) {
      console.error('Data no es un array válido');
      return undefined;
    }

    return path.reduce((acc, index) => {
      if (!acc || !acc.subitems || !Array.isArray(acc.subitems)) {
        console.error('Nodo no válido o subitems no es un array');
        return undefined;
      }
      return acc.subitems[index];
    }, { subitems: data });
  };

  const handleSaveMachine = async (machineData) => {
    console.log(machineModalPath)
    try {
      // Obtener el nodo padre usando el path
      const parent = findNestedItem(machineModalPath, data);
      if (!parent) {
        console.error('No se encontró el nodo padre');
        return;
      }
      console.log(machineData,parent)
      // 1. Guardar en la tabla `folders`
      const folderData = {
        nombre: machineData.nombre, // Nombre de la máquina
        compañia:parent.id,
        parentId: parent.id, // ID de la carpeta padre
        typeFolder: 2, // Tipo de carpeta para máquinas
        isMachine: true, // Indicar que es una máquina
      };

      const folderResponse = await fetch('http://127.0.0.1:8000/api/folders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folderData),
      });

      if (!folderResponse.ok) {
        throw new Error('Error al guardar la máquina en folders');
      }

      const folderDataResponse = await folderResponse.json();
      console.log(folderDataResponse)
      // 2. Guardar en la tabla `machines`
      const machineDataWithFolder = {
        ...machineData,
        carpeta: folderDataResponse.id, // ID de la carpeta creada
      };

      const machineResponse = await fetch('http://127.0.0.1:8000/api/machines/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(machineDataWithFolder),
      });

      if (!machineResponse.ok) {
        throw new Error('Error al guardar la máquina en machines');
      }

      const machineDataResponse = await machineResponse.json();

      // 3. Agregar la máquina al árbol
      const newItem = {
        ...folderDataResponse, // Usar los datos de la carpeta
        ...machineDataResponse, // Agregar los datos de la máquina
        subitems: [], // Las máquinas no tienen subitems
        isMachine: true, // Indicar que es una máquina
      };

      onAddMachine(machineModalPath, newItem); // Actualizar el estado local

      // Cerrar el modal
      setIsMachineModalOpen(false);
    } catch (error) {
      console.error('Error al guardar la máquina:', error);
    }
  };

  
  const toggleItem = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId], // Cambiar el estado de expandido/colapsado
    }));
  };

  const handleEdit = (node) => {
    setEditingNode(node);
    setMenuOpen(null);
  };

  const handleSave = (updatedData) => {
    // Aquí deberías implementar la lógica para guardar los cambios
    setEditingNode(null);
  };

  const handleAddChild = (index, isMachine = false, typeFolder = '', compañia = '') => {
    if (!data[index].isMachine) {
      const newItem = { nombre: "Nuevo sub-elemento", subitems: [], isMachine, typeFolder, compañia };
      onAddChild([...path, index], newItem);
      toggleItem(data[index].id);
    }
  };

  const handleAddSibling = (index, isMachine = false, typeFolder = '', compañia = '') => {
    const newItem = { nombre: "Nuevo elemento", subitems: [], isMachine, typeFolder, compañia };
    onAddSibling([...path, index], newItem);
  };

  const handleDelete = (index) => {
    onDelete([...path, index]);
    setMenuOpen(null);
  };

  const toggleMenu = (index) => {
    setMenuOpen(menuOpen === index ? null : index);
  };

  return (
    <div style={{ marginLeft: depth * 28 }}>
      {data.map((item, index) => {
        const currentPath = [...path, index];
        return (
          <div key={`${depth}-${index}`}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              margin: '4px 0',
              position: 'relative'
            }}>
              {depth > 0 && (
                <div style={{
                  position: 'absolute',
                  left: -20,
                  top: '50%',
                  width: 16,
                  height: '1px',
                  backgroundColor: '#666'
                }}></div>
              )}

              <div style={{ display: 'flex', gap: 4 }}>
                {item.subitems?.length > 0 && (
                  <button
                    onClick={() => toggleItem(item.id)}
                    style={buttonStyle}
                  >
                    {expandedItems[item.id] ? '▼' : '▶'}
                  </button>
                )}
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 8,
                fontWeight: depth === 0 ? 'bold' : 'normal'
              }}>
                <span style={{ 
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#666',
                  marginRight: 8
                }}></span>
                {item.nombre}
              </div>

              <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
                {!item.isMachine && depth > 0 && (
                  <button
                    onClick={() => handleAddSibling(index, false, 'folder', 1)}
                    style={{ ...buttonStyle, color: '#2196F3' }}
                  >
                    + Hermano
                  </button>
                )}
                {!item.isMachine && (
                  <button
                    onClick={() => handleAddChild(index, false, 'folder', 1)}
                    style={{ ...buttonStyle, color: '#2196F3' }}
                  >
                    + Carpeta
                  </button>
                )}
                {!item.isMachine && (
                  <button
                    onClick={() => {
                      setMachineModalPath([...path, index]); // Guardar la ruta del nodo padre
                      setIsMachineModalOpen(true); // Abrir el modal
                    }}
                    style={{ ...buttonStyle, color: '#2196F3' }}
                  >
                    + Máquina
                  </button>
                )}
                <button
                  onClick={() => toggleMenu(index)}
                  style={{ ...buttonStyle, marginRight: '8px' }}
                >
                  <FiMoreVertical />
                </button>
                {menuOpen === index && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: 'white',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    zIndex: 1000
                  }}>
                    <button
                      onClick={() => handleEdit({...item, path: currentPath})}
                      style={{ ...buttonStyle, display: 'block', width: '100%', textAlign: 'left' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      style={{ ...buttonStyle, display: 'block', width: '100%', textAlign: 'left', color: '#f44336' }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isMachineModalOpen && (
              <MachineFormModal
                onClose={() => setIsMachineModalOpen(false)}
                onSave={handleSaveMachine}
              />
            )}
            {editingNode?.path.join() === currentPath.join() && (
              <ConfigForm
                nodeData={editingNode}
                onClose={() => setEditingNode(null)}
                onSave={handleSave}
                type={item.isMachine ? 'machine' : 'folder'}
              />
            )}

            {expandedItems[item.id] && item.subitems?.length > 0 && (
              <NestedList
                data={item.subitems}
                depth={depth + 1}
                onAdd={onAdd}
                onDelete={onDelete}
                onAddChild={onAddChild}
                onAddSibling={onAddSibling}
                onAddMachine={onAddMachine}
                path={[...path, index]}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NestedList;