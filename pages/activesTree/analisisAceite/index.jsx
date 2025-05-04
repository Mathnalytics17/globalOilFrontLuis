import { useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Modal,
  TextField,
  Grid,
} from "@mui/material";

// Estilos para el modal
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 1200,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: "90vh",
  overflowY: "auto",
};

// Datos de ejemplo
const empresas = [
  { id: 1, nombre: "Empresa A" },
  { id: 2, nombre: "Empresa B" },
  { id: 3, nombre: "Empresa C" },
];

const initialAnalisisAceite = [
  {
    id: 1,
    empresaId: 1,
    fechaRecepcion: "2023-10-01",
    idInterna: "ABC123",
    dias: 10,
    oa: "OA123",
    enviado: false,
    fechaMuestreo: "2023-09-25",
    lubricante: "Lubricante X",
    viscosidadAceite: "120 cSt",
    especificacionDesempeño: "ISO 100",
    sistemaEnUso: "Motor",
    periodoServicioAceiteCantidad: 500,
    periodoServicioAceiteUnidad: "Horas",
    cliente: "Cliente 1",
    contacto: "contacto@cliente1.com",
    equipo: "Equipo 1",
    placa: "XYZ-123",
    periodoServicioEquipo: "2000 Horas",
    apariencia: "Normal",
    olor: "Normal",
    viscosidadCinematica40: "120 cSt",
    viscosidadCinematica100: "50 cSt",
    indiceViscosidad: "95",
    puntoChispa: "200°C",
    densidad: "0.89 g/cm³",
    nitracion: "0.1%",
    oxidacion: "0.2%",
    hollin: "0.05%",
    sulfatacion: "0.03%",
    tan: "1.2 mgKOH/g",
    tbn: "8.5 mgKOH/g",
    agua: "0.01%",
    nivelContaminacion: "Bajo",
    espumaSeqI: "10 ml",
    espumaSeqII: "5 ml",
    espumaSeqIII: "2 ml",
    elementos: {
      Ag: "0.01 ppm",
      Al: "0.02 ppm",
      B: "0.03 ppm",
      Ba: "0.04 ppm",
      Ca: "0.05 ppm",
      Cd: "0.01 ppm",
      Cr: "0.02 ppm",
      Cu: "0.03 ppm",
      Fe: "0.04 ppm",
      K: "0.05 ppm",
      Li: "0.01 ppm",
      Mg: "0.02 ppm",
      Mn: "0.03 ppm",
      Mo: "0.04 ppm",
      Na: "0.05 ppm",
      Ni: "0.01 ppm",
      P: "0.02 ppm",
      Pb: "0.03 ppm",
      Sb: "0.04 ppm",
      Si: "0.05 ppm",
      Sn: "0.01 ppm",
      Ti: "0.02 ppm",
      V: "0.03 ppm",
      Zn: "0.04 ppm",
    },
    observaciones: "Sin observaciones",
    diasLaborales: 5,
  },
];

export default function AnalisisAceite() {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [analisisSeleccionado, setAnalisisSeleccionado] = useState(null);
  const [analisisAceite, setAnalisisAceite] = useState(initialAnalisisAceite);

  // Filtrar análisis por empresa seleccionada
  const analisisFiltrados = empresaSeleccionada
    ? analisisAceite.filter((a) => a.empresaId.toString() === empresaSeleccionada)
    : [];

  // Abrir modal para editar o crear un análisis
  const handleOpenModal = (analisis = null) => {
    setAnalisisSeleccionado(analisis || {});
    setModalOpen(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setAnalisisSeleccionado(null);
  };

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnalisisSeleccionado((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar cambios en los elementos
  const handleElementosChange = (e) => {
    const { name, value } = e.target;
    setAnalisisSeleccionado((prev) => ({
      ...prev,
      elementos: {
        ...prev.elementos,
        [name]: value,
      },
    }));
  };

  // Guardar los cambios del análisis
  const handleSave = () => {
    if (analisisSeleccionado.id) {
      // Editar análisis existente
      setAnalisisAceite((prev) =>
        prev.map((a) =>
          a.id === analisisSeleccionado.id ? analisisSeleccionado : a
        )
      );
    } else {
      // Crear nuevo análisis
      const newAnalisis = {
        ...analisisSeleccionado,
        id: Date.now(), // Generar un ID único
        empresaId: parseInt(empresaSeleccionada),
      };
      setAnalisisAceite((prev) => [...prev, newAnalisis]);
    }
    handleCloseModal();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Análisis de Aceite por Empresa
      </Typography>

      {/* Selector de empresa */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="empresa-label">Seleccionar Empresa</InputLabel>
        <Select
          labelId="empresa-label"
          value={empresaSeleccionada}
          label="Seleccionar Empresa"
          onChange={(e) => setEmpresaSeleccionada(e.target.value)}
        >
          {empresas.map((empresa) => (
            <MenuItem key={empresa.id} value={empresa.id.toString()}>
              {empresa.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Tabla de análisis */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Fecha Recepción</TableCell>
              <TableCell>ID Interna</TableCell>
              <TableCell>Días</TableCell>
              <TableCell>OA</TableCell>
              <TableCell>Enviado?</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {analisisFiltrados.map((analisis) => (
              <TableRow key={analisis.id}>
                <TableCell>{analisis.id}</TableCell>
                <TableCell>{analisis.fechaRecepcion}</TableCell>
                <TableCell>{analisis.idInterna}</TableCell>
                <TableCell>{analisis.dias}</TableCell>
                <TableCell>{analisis.oa}</TableCell>
                <TableCell>{analisis.enviado ? "Sí" : "No"}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpenModal(analisis)}
                  >
                    Enviar Resultados
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Botón para crear nuevo análisis */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpenModal()}
        sx={{ mt: 2 }}
      >
        Crear Nuevo Análisis
      </Button>

      {/* Modal para editar/crear análisis */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            {analisisSeleccionado?.id ? "Editar Análisis" : "Crear Análisis"}
          </Typography>
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Grid container spacing={2}>
              {/* Campos principales */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Fecha Recepción"
                  name="fechaRecepcion"
                  value={analisisSeleccionado?.fechaRecepcion || ""}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ID Interna"
                  name="idInterna"
                  value={analisisSeleccionado?.idInterna || ""}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Días"
                  name="dias"
                  value={analisisSeleccionado?.dias || ""}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="OA"
                  name="oa"
                  value={analisisSeleccionado?.oa || ""}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              {/* Agrega más campos según sea necesario */}
            </Grid>

            {/* Elementos */}
            <Typography variant="h6" gutterBottom>
              Elementos
            </Typography>
            <Grid container spacing={2}>
              {analisisSeleccionado?.elementos && Object.entries(analisisSeleccionado.elementos).map(
                ([key, value]) => (
                  <Grid item xs={12} md={4} key={key}>
                    <TextField
                      label={key}
                      name={key}
                      value={value}
                      onChange={handleElementosChange}
                      fullWidth
                    />
                  </Grid>
                )
              )}
            </Grid>

            {/* Botón de guardar */}
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              sx={{ mt: 2 }}
            >
              Guardar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}