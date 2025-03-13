import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

interface ModalAddResultsProps {
  show: boolean;
  onHide: () => void;
  onAddResults: (data: {
    observaciones: string;
    indicadores: string;
    analisis_id: string; // ID del nodo padre (punto de medida)
  }) => void;
}

const ModalAddResults: React.FC<ModalAddResultsProps> = ({
  show,
  onHide,
  onAddResults,
}) => {
  const [observaciones, setObservaciones] = useState(""); // Observaciones del análisis
  const [indicadores, setIndicadores] = useState(""); // Indicadores del análisis
  const [analisis_id, setAnalisisId] = useState(""); // ID del nodo padre (punto de medida)

  const handleAddResults = () => {
    if (observaciones.trim() === "" || indicadores.trim() === "" || analisis_id.trim() === "") {
      alert("Todos los campos son obligatorios.");
      return;
    }

    // Llama a la función onAddResults con los datos
    onAddResults({
      observaciones,
      indicadores,
      analisis_id,
    });

    onHide(); // Cierra el modal
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      keyboard={false}
      size="lg"
      style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1050 }}
    >
      <Modal.Header
        closeButton
        style={{
          backgroundColor: "#1976d2",
          color: "#ffffff",
          borderBottom: "none",
        }}
      >
        <Modal.Title>Agregar resultados de análisis</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          backgroundColor: "#f5f5f5",
          padding: "24px",
        }}
      >
        <Form>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Ingrese observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Indicadores</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Ingrese los indicadores"
              value={indicadores}
              onChange={(e) => setIndicadores(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>ID del análisis (punto de medida)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el ID del análisis"
              value={analisis_id}
              onChange={(e) => setAnalisisId(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer
        style={{
          backgroundColor: "#f5f5f5",
          borderTop: "none",
          padding: "16px 24px",
        }}
      >
        <Button
          variant="secondary"
          onClick={onHide}
          style={{
            backgroundColor: "#6c757d",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleAddResults}
          style={{
            backgroundColor: "#1976d2",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
          }}
        >
          Agregar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalAddResults;