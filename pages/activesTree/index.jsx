import { useState, useEffect } from 'react';
import { FiSettings, FiMoreVertical } from 'react-icons/fi';
import RecursiveFolderDocumentStructure  from '../../views/activesTree/componentsRecursive';
import { Card, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
  return (
    <div>
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: 'none',
        }}
      >
        <Card.Header
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e9ecef',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h5 style={{ margin: 0, color: '#333' }}>Árbol de Activos</h5>
          <div>
            <FiSettings
              style={{ marginRight: '12px', cursor: 'pointer', color: '#6c757d' }}
            />
            <FiMoreVertical style={{ cursor: 'pointer', color: '#6c757d' }} />
          </div>
        </Card.Header>

        <Card.Body style={{ padding: '24px' }}>
          <RecursiveFolderDocumentStructure />
        </Card.Body>
      </Card>
    </div>
  );
};

export default App;