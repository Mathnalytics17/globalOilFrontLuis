import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

interface ModalCreationPtMedidaProps {
  show: boolean;
  onHide: () => void;
  onCreate: (data: {
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
    Maquina_id?: string;
  }) => void;
}

const ModalCreationPtMedida: React.FC<ModalCreationPtMedidaProps> = ({
  show,
  onHide,
  onCreate,
}) => {
  // Estados para los campos principales
  const [name, setName] = useState(""); // Nombre del punto de medida
  const [unidadMedida, setUnidadMedida] = useState(""); // Unidad de medida
  const [valorActual, setValorActual] = useState(""); // Valor actual

  // Estados para los nuevos campos
  const [id, setId] = useState("");
  const [propietario, setPropietario] = useState("");
  const [fecha_muestreo, setFechaMuestreo] = useState("");
  const [nombre_equipo, setNombreEquipo] = useState("");
  const [modelo, setModelo] = useState("");
  const [horas_km_aceite, setHorasKmAceite] = useState("");
  const [id_placa, setIdPlaca] = useState("");
  const [lugar_trabajo, setLugarTrabajo] = useState("");
  const [horas_km_equipo, setHorasKmEquipo] = useState("");
  const [ref_aceite, setRefAceite] = useState("");
  const [no_interno_lab, setNoInternoLab] = useState("");
  const [fecha_recepcion, setFechaRecepcion] = useState("");
  const [Maquina_id, setMaquinaId] = useState("");

  const handleCreate = () => {
    // Validar campos obligatorios
    if (name.trim() === "" || unidadMedida.trim() === "" || valorActual.trim() === "") {
      alert("Los campos 'Nombre', 'Unidad de medida' y 'Valor actual' son obligatorios.");
      return;
    }

    // Crear el objeto con todos los campos
    const data = {
      name,
      unidadMedida,
      valorActual,
      id,
      propietario,
      fecha_muestreo,
      nombre_equipo,
      modelo,
      horas_km_aceite,
      id_placa,
      lugar_trabajo,
      horas_km_equipo,
      ref_aceite,
      no_interno_lab,
      fecha_recepcion,
      Maquina_id,
    };

    // Llama a la función onCreate con todos los datos
    onCreate(data);
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
        <Modal.Title>Crear punto de medida</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          backgroundColor: "#f5f5f5",
          padding: "24px",
        }}
      >
        <Form>
          {/* Campos principales */}
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
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Unidad de medida</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese la unidad de medida"
              value={unidadMedida}
              onChange={(e) => setUnidadMedida(e.target.value)}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Valor actual</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el valor actual"
              value={valorActual}
              onChange={(e) => setValorActual(e.target.value)}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            />
          </Form.Group>

          {/* Campos adicionales */}
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Propietario</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el propietario"
              value={propietario}
              onChange={(e) => setPropietario(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Fecha de muestreo</Form.Label>
            <Form.Control
              type="date"
              value={fecha_muestreo}
              onChange={(e) => setFechaMuestreo(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Nombre del equipo</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el nombre del equipo"
              value={nombre_equipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Modelo</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Horas/KM aceite</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese las horas/KM del aceite"
              value={horas_km_aceite}
              onChange={(e) => setHorasKmAceite(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>ID Placa</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el ID de la placa"
              value={id_placa}
              onChange={(e) => setIdPlaca(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Lugar de trabajo</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el lugar de trabajo"
              value={lugar_trabajo}
              onChange={(e) => setLugarTrabajo(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Horas/KM equipo</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese las horas/KM del equipo"
              value={horas_km_equipo}
              onChange={(e) => setHorasKmEquipo(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Referencia de aceite</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese la referencia del aceite"
              value={ref_aceite}
              onChange={(e) => setRefAceite(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Número interno laboratorio</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el número interno del laboratorio"
              value={no_interno_lab}
              onChange={(e) => setNoInternoLab(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>Fecha de recepción</Form.Label>
            <Form.Control
              type="date"
              value={fecha_recepcion}
              onChange={(e) => setFechaRecepcion(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "bold", color: "#333" }}>ID Máquina</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ingrese el ID de la máquina"
              value={Maquina_id}
              onChange={(e) => setMaquinaId(e.target.value)}
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

export default ModalCreationPtMedida;