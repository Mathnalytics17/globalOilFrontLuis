import { useState, useEffect } from 'react';
import { FiSettings, FiMoreVertical } from 'react-icons/fi';
import RecursiveFolderDocumentStructure from '../../views/activesTree/componentsRecursive';
import { Card, Container } from 'react-bootstrap'; // Usamos Card de React Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap

const App = () => {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        padding: '24px',
        maxWidth: '1200px', // Aumentamos el ancho máximo
        margin: '0 auto',
        backgroundColor: '#f8f9fa', // Fondo suave
      }}
    >
      {/* Título */}
      <h1 style={{ color: '#333', marginBottom: '24px', textAlign: 'center' }}>
        Árbol de Activos
      </h1>

      {/* Contenedor principal con Card */}
      <Container>
        <Card
          style={{
            borderRadius: '12px', // Bordes redondeados
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // Sombra suave
            border: 'none', // Sin borde
          }}
        >
          {/* Encabezado del Card */}
          <Card.Header
            style={{
              backgroundColor: '#ffffff', // Fondo blanco
              borderBottom: '1px solid #e9ecef', // Borde inferior sutil
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: '12px 12px 0 0', // Bordes redondeados solo arriba
            }}
          >
            <h5 style={{ margin: 0, color: '#333' }}>Estructura de Carpetas</h5>
            <div>
              <FiSettings
                style={{ marginRight: '12px', cursor: 'pointer', color: '#6c757d' }}
              />
              <FiMoreVertical style={{ cursor: 'pointer', color: '#6c757d' }} />
            </div>
          </Card.Header>

          {/* Cuerpo del Card */}
          <Card.Body style={{ padding: '24px' }}>
            <RecursiveFolderDocumentStructure />
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default App;