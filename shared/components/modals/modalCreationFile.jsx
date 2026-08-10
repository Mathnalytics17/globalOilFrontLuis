import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

const ModalCreationFile = ({ show, onHide, onCreate }) => {
  const [type, setType] = useState("folder");
  const [name, setName] = useState("");
  const [descripcion, setDescripcion] = useState("");


  const handleCreate = () => {
    if (!name.trim()) {
      alert("El nombre no puede estar vacío.");
      return;
    }

    if (type === "machine") {
      if (!name || !descripcion) {
        alert("Por favor complete todos los campos requeridos para la máquina.");
        return;
      }
    }

    const machineData = type === "machine" ? {
      nombre: name,
      descripcion: descripcion,
      isMachine:true,
    } : null;

    onCreate(machineData, name, type);
    resetForm();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  const resetForm = () => {
    setName("");
    setDescripcion("");
    setType("folder");
    onHide();
  };

  return (
    <Modal show={show} onHide={resetForm} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton style={{ backgroundColor: "#292929", color: "#ffffff", borderBottom: "1px solid #444" }}>
        <Modal.Title>Crear {type === "machine" ? "Máquina" : "Carpeta"}</Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
        <Form onKeyPress={handleKeyPress}>
          <Form.Group className="mb-3">
            <Form.Label style={{ color: "#e0e0e0" }}>Tipo</Form.Label>
            <Form.Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="form-control"
              style={{ 
                backgroundColor: "#333", 
                color: "#fff", 
                border: "1px solid #555" 
              }}
            >
              <option value="folder">Carpeta</option>
              <option value="machine">Máquina</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label style={{ color: "#e0e0e0" }}>Nombre</Form.Label>
            <Form.Control
              type="text"
              placeholder={`Ingrese el nombre de ${type === "machine" ? "la máquina" : "la carpeta"}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ 
                backgroundColor: "#333", 
                color: "#fff", 
                border: "1px solid #555"
              }}
            />
          </Form.Group>

          {type === "machine" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label style={{ color: "#e0e0e0" }}>Descripción</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese la descripción"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  style={{ 
                    backgroundColor: "#333", 
                    color: "#fff", 
                    border: "1px solid #555" 
                  }}
                />
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: "#1a1a1a", borderTop: "1px solid #444" }}>
        <Button 
          variant="secondary" 
          onClick={resetForm}
          style={{ 
            backgroundColor: "#555", 
            border: "1px solid #666",
            color: "#fff"
          }}
        >
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleCreate}
          style={{ 
            backgroundColor: "#dc2626", 
            border: "1px solid #dc2626",
            color: "#fff"
          }}
        >
          Crear
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalCreationFile;
