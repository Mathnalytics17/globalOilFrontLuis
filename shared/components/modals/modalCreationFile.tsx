import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

interface ModalCreationFileProps {
  show: boolean;
  onHide: () => void;
  onCreate: (type: string, name: string, machineData?: any) => void; // Cambia la firma para aceptar datos adicionales
}

const ModalCreationFile: React.FC<ModalCreationFileProps> = ({
  show,
  onHide,
  onCreate,
}) => {
  const [type, setType] = useState("folder"); // Tipo por defecto: carpeta
  const [name, setName] = useState(""); // Nombre de la carpeta/máquina

  // Campos adicionales para máquinas
  const [componente, setComponente] = useState("");
  const [tipoAceite, setTipoAceite] = useState("");
  const [frecuenciaCambio, setFrecuenciaCambio] = useState("");
  const [frecuenciaAnalisis, setFrecuenciaAnalisis] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [codigoEquipo, setCodigoEquipo] = useState("");

  const handleCreate = () => {
    if (name.trim() === "") {
      alert("El nombre no puede estar vacío.");
      return;
    }

    const data = {
      name,
      type,
    
      // Campos adicionales para máquinas
      ...(type === "machine" && {
        componente,
        tipoAceite,
        frecuenciaCambio: Number(frecuenciaCambio), // Convertir a número
        frecuenciaAnalisis: Number(frecuenciaAnalisis), // Convertir a número
        numero_serie: numeroSerie,
        codigo_equipo: codigoEquipo,
      }),
    };

    // Llama a la función onCreate con el tipo, el nombre y los datos adicionales
    onCreate( name, type,data);
    onHide(); // Cierra el modal

    // Limpiar campos después de crear
    setType("folder");
    setName("");
    setComponente("");
    setTipoAceite("");
    setFrecuenciaCambio("");
    setFrecuenciaAnalisis("");
    setNumeroSerie("");
    setCodigoEquipo("");
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      keyboard={false}
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
        <Modal.Title>Crear {type === "machine" ? "Máquina" : "Carpeta"}</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          backgroundColor: "#f5f5f5",
          padding: "24px",
        }}
      >
        <Form>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Tipo</Form.Label>
            <Form.Select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                // Limpiar campos adicionales cuando se cambia el tipo
                if (e.target.value !== "machine") {
                  setComponente("");
                  setTipoAceite("");
                  setFrecuenciaCambio("");
                  setFrecuenciaAnalisis("");
                  setNumeroSerie("");
                  setCodigoEquipo("");
                }
              }}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            >
              <option value="folder">Carpeta</option>
              <option value="machine">Máquina</option>
              
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Nombre</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            />
          </Form.Group>

          {/* Campos adicionales para máquinas */}
          {type === "machine" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Componente</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el componente"
                  value={componente}
                  onChange={(e) => setComponente(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Tipo de aceite</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el tipo de aceite"
                  value={tipoAceite}
                  onChange={(e) => setTipoAceite(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Frecuencia de cambio</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Ingrese la frecuencia de cambio"
                  value={frecuenciaCambio}
                  onChange={(e) => setFrecuenciaCambio(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Frecuencia de análisis</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Ingrese la frecuencia de análisis"
                  value={frecuenciaAnalisis}
                  onChange={(e) => setFrecuenciaAnalisis(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Número de serie</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el número de serie"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Código de equipo</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el código de equipo"
                  value={codigoEquipo}
                  onChange={(e) => setCodigoEquipo(e.target.value)}
                />
              </Form.Group>
            </>
          )}
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
          onClick={handleCreate}
          style={{
            backgroundColor: "#1976d2",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
          }}
        >
          Crear
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalCreationFile;