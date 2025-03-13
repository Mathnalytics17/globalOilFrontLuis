import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";

// Estilos para el modal
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

// Tipos para los datos del usuario
interface Usuario {
  id?: string;
  empresa: string;
  rol: string;
}

// Props del modal
interface UsuarioModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (usuario: Usuario) => void;
  usuario?: Usuario;
  empresas: { id: string; nombre: string }[];
  roles: { id: string; nombre: string }[];
}

const UsuarioModal: React.FC<UsuarioModalProps> = ({
  open,
  onClose,
  onSubmit,
  usuario,
  empresas,
  roles,
}) => {
  // Estado para los campos del formulario
  const [empresa, setEmpresa] = useState(usuario?.empresa || "");
  const [rol, setRol] = useState(usuario?.rol || "");

  // Manejar cambios en los campos
  const handleEmpresaChange = (event: SelectChangeEvent) => {
    setEmpresa(event.target.value as string);
  };

  const handleRolChange = (event: SelectChangeEvent) => {
    setRol(event.target.value as string);
  };

  // Manejar el envío del formulario
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({ empresa, rol });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2" gutterBottom>
          {usuario ? "Editar Usuario" : "Crear Usuario"}
        </Typography>
        <form onSubmit={handleSubmit}>
          {/* Campo Empresa */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="empresa-label">Empresa</InputLabel>
            <Select
              labelId="empresa-label"
              value={empresa}
              label="Empresa"
              onChange={handleEmpresaChange}
              required
            >
              {empresas.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Campo Rol */}
          <FormControl fullWidth margin="normal">
            <InputLabel id="rol-label">Rol</InputLabel>
            <Select
              labelId="rol-label"
              value={rol}
              label="Rol"
              onChange={handleRolChange}
              required
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Botones de acción */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button onClick={onClose} sx={{ mr: 2 }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {usuario ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default UsuarioModal;