import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { v4 as uuidv4 } from 'uuid';

const ModalCreationFile = ({ show, onHide, onCreate, parentId }) => {
  const [type, setType] = useState("folder");
  const [name, setName] = useState("");
  const [componente, setComponente] = useState("");
  const [tipoAceite, setTipoAceite] = useState("");
  const [frecuenciaCambio, setFrecuenciaCambio] = useState("");
  const [frecuenciaAnalisis, setFrecuenciaAnalisis] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [codigoEquipo, setCodigoEquipo] = useState("");
  console.log(type)
  const handleCreate = () => {
    if (!name.trim()) {
      alert("El nombre no puede estar vacío.");
      return;
    }

    if (type === "machine") {
      if (!componente || !tipoAceite || !frecuenciaCambio || !frecuenciaAnalisis) {
        alert("Por favor complete todos los campos requeridos para la máquina.");
        return;
      }
    }

    const machineData = type === "machine" ? {
      nombre: name,
      componente:componente,
      tipoAceite:tipoAceite,
      frecuenciaCambio: Number(frecuenciaCambio),
      frecuenciaAnalisis: Number(frecuenciaAnalisis),
      numero_serie: numeroSerie || "N/A",
      codigo_equipo: codigoEquipo || uuidv4()
    } : null;

    onCreate( machineData, name,type, parentId);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setComponente("");
    setTipoAceite("");
    setFrecuenciaCambio("");
    setFrecuenciaAnalisis("");
    setNumeroSerie("");
    setCodigoEquipo("");
    setType("folder");
    
    onHide();
  };

  return (
    <Modal show={show} onHide={resetForm} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton style={{ backgroundColor: "#1976d2", color: "white" }}>
        <Modal.Title>Crear {type === "machine" ? "Máquina" : "Carpeta"}</Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ backgroundColor: "#f5f5f5" }}>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="form-control"
            >
              <option value="folder">Carpeta</option>
              <option value="machine">Máquina</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              type="text"
              placeholder={`Ingrese el nombre de ${type === "machine" ? "la máquina" : "la carpeta"}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          {type === "machine" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Componente</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el componente"
                  value={componente}
                  onChange={(e) => setComponente(e.target.value)}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Tipo de aceite</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el tipo de aceite"
                  value={tipoAceite}
                  onChange={(e) => setTipoAceite(e.target.value)}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Frecuencia de cambio (horas)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="Ej: 100"
                  value={frecuenciaCambio}
                  onChange={(e) => setFrecuenciaCambio(e.target.value)}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Frecuencia de análisis (horas)</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="Ej: 200"
                  value={frecuenciaAnalisis}
                  onChange={(e) => setFrecuenciaAnalisis(e.target.value)}
                  required
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Número de serie (opcional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el número de serie"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Código de equipo (opcional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Se generará automáticamente si está vacío"
                  value={codigoEquipo}
                  onChange={(e) => setCodigoEquipo(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: "#f5f5f5" }}>
        <Button variant="secondary" onClick={resetForm}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleCreate}>
          Crear
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalCreationFile;