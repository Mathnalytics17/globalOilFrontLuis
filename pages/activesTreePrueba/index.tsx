import React, { useState } from "react";
import ModalCreationFile from '@components/modals/modalCreationFile';
import Button from "react-bootstrap/Button";

const MyComponent = () => {
  const [showModal, setShowModal] = useState(false);

  const handleCreateFile = (type: string, name: string) => {
    console.log("Crear:", type, name);
    // Lógica para crear la carpeta/máquina
  };

  return (
    <div>
      <Button onClick={() => setShowModal(true)}>
        Crear carpeta/máquina
      </Button>
      <ModalCreationFile
        show={showModal}
        onHide={() => setShowModal(false)}
        onCreate={handleCreateFile}
      />
    </div>
  );
};

export default MyComponent;