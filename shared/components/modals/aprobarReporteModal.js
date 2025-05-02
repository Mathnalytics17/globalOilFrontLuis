import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const AprobarReporteModal = ({ show, handleClose, handleSubmit }) => {
    const [formData, setFormData] = useState({
        consolidarInformacion: "",
        reporteFormato: "",
        consecutivoReporte: "",
        fechaEmision: "",
        personaAprueba: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleSubmit(formData);
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Aprobar Reporte</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={onSubmit}>
                    <Form.Group controlId="consolidarInformacion">
                        <Form.Label>Consolidar la información</Form.Label>
                        <Form.Control
                            type="text"
                            name="consolidarInformacion"
                            value={formData.consolidarInformacion}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group controlId="reporteFormato">
                        <Form.Label>El reporte según el formato suministrado</Form.Label>
                        <Form.Control
                            type="text"
                            name="reporteFormato"
                            value={formData.reporteFormato}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group controlId="consecutivoReporte">
                        <Form.Label>Consecutivo de reporte</Form.Label>
                        <Form.Control
                            type="text"
                            name="consecutivoReporte"
                            value={formData.consecutivoReporte}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group controlId="fechaEmision">
                        <Form.Label>Fecha de emisión de reporte</Form.Label>
                        <Form.Control
                            type="date"
                            name="fechaEmision"
                            value={formData.fechaEmision}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group controlId="personaAprueba">
                        <Form.Label>Persona que aprueba el reporte</Form.Label>
                        <Form.Control
                            type="text"
                            name="personaAprueba"
                            value={formData.personaAprueba}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Button variant="primary" type="submit" className="mt-3">
                        Enviar
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default AprobarReporteModal;