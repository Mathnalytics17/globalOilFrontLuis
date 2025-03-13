import { useState, useEffect } from 'react';
import { FiSettings, FiMoreVertical } from 'react-icons/fi';
import NestedList from '../../views/activesTree/components';

const App = () => {
  const [estructura, setEstructura] = useState([]);
  const [fullData, setFullData] = useState([]);

  const fetchData = async () => {
    // Obtener todas las carpetas y máquinas
    const foldersResponse = await fetch('http://127.0.0.1:8000/api/folders/');
    if (foldersResponse.ok) {
      const foldersData = await foldersResponse.json();

      // Construir la estructura jerárquica
      const buildTree = (items, parentId = "root") => {
        return items
          .filter((item) => item.parentId === parentId)
          .map((item) => ({
            ...item,
            subitems: buildTree(items, item.id.toString()),
          }));
      };

      const tree = buildTree(foldersData);
      console.log('Árbol construido:', tree);
      setEstructura(tree);
      setFullData(tree); // Inicializar fullData con la estructura completa
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const findNestedItem = (path, data) => {
    return path.reduce((acc, index) => {
      if (!acc.subitems) acc.subitems = [];
      return acc.subitems[index];
    }, { subitems: data });
  };

  const handleAdd = async (path, newItem) => {
    const parent = findNestedItem(path.slice(0, -1), estructura);
    newItem.parentId = parent.id;

    const response = await fetch('http://127.0.0.1:8000/api/folders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newItem),
    });
    const data = await response.json();

    // Actualizar estructura y fullData
    setEstructura((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path.slice(0, -1), newData);
      parent.subitems.splice(path[path.length - 1] + 1, 0, data);
      return newData;
    });

    setFullData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path.slice(0, -1), newData);
      parent.subitems.splice(path[path.length - 1] + 1, 0, data);
      return newData;
    });
  };

  const handleAddChild = async (path, newItem) => {
    const parent = findNestedItem(path, estructura);
    newItem.parentId = parent.id;

    const response = await fetch('http://127.0.0.1:8000/api/folders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newItem),
    });
    const data = await response.json();

    // Actualizar estructura y fullData
    setEstructura((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path, newData);
      if (!parent.subitems) parent.subitems = [];
      parent.subitems.push(data);
      return newData;
    });

    setFullData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path, newData);
      if (!parent.subitems) parent.subitems = [];
      parent.subitems.push(data);
      return newData;
    });
  };

  const handleAddSibling = async (path, newItem) => {
    const parent = findNestedItem(path.slice(0, -1), estructura);
    newItem.parentId = parent.id;

    const response = await fetch('http://127.0.0.1:8000/api/folders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newItem),
    });
    const data = await response.json();

    // Actualizar estructura y fullData
    setEstructura((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path.slice(0, -1), newData);
      parent.subitems.splice(path[path.length - 1] + 1, 0, data);
      return newData;
    });

    setFullData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path.slice(0, -1), newData);
      parent.subitems.splice(path[path.length - 1] + 1, 0, data);
      return newData;
    });
  };

  const handleAddMachine = async (path, newItem) => {
    const parent = findNestedItem(path, estructura);
    newItem.parentId = parent.id;

    // Actualizar estructura y fullData
    setEstructura((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path, newData);
      if (!parent.subitems) parent.subitems = [];
      parent.subitems.push(newItem);
      return newData;
    });

    setFullData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path, newData);
      if (!parent.subitems) parent.subitems = [];
      parent.subitems.push(newItem);
      return newData;
    });
  };

  const handleDelete = async (path) => {
    const item = findNestedItem(path, estructura);
    await fetch(`http://127.0.0.1:8000/api/folders/${item.id}/`, {
      method: 'DELETE',
    });

    // Actualizar estructura y fullData
    setEstructura((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path.slice(0, -1), newData);
      parent.subitems.splice(path[path.length - 1], 1);
      return newData;
    });

    setFullData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parent = findNestedItem(path.slice(0, -1), newData);
      parent.subitems.splice(path[path.length - 1], 1);
      return newData;
    });
  };

  return (
    <div
      style={{
        fontFamily: 'Arial',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ color: '#333', marginBottom: '24px' }}>Árbol de activos</h1>
      <NestedList
        data={estructura} // Estructura completa del árbol
        fullData={fullData} // Estructura completa del árbol
        onAdd={handleAdd}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onAddMachine={handleAddMachine}
      />
    </div>
  );
};

export default App;