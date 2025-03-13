import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Modal,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";

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
  id?: number;
  name: string;
  email: string;
}

// Datos de ejemplo
const initialUsers: Usuario[] = [
  { id: 1, name: "Juan Pérez", email: "juan@example.com" },
  { id: 2, name: "María Gómez", email: "maria@example.com" },
  { id: 3, name: "Carlos Rodríguez", email: "carlos@example.com" },
];

export default function UserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Abrir modal para crear o editar usuario
  const handleOpenModal = (user: Usuario | null = null) => {
    if (user) {
      setEditingUser(user);
      setName(user.name);
      setEmail(user.email);
    } else {
      setEditingUser(null);
      setName("");
      setEmail("");
    }
    setModalOpen(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setName("");
    setEmail("");
  };

  // Manejar la creación/edición de usuarios
  const handleSubmit = () => {
    if (editingUser) {
      // Editar usuario existente
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === editingUser.id ? { ...user, name, email } : user
        )
      );
    } else {
      // Crear nuevo usuario
      const newUser = {
        id: Date.now(), // Generar un ID único
        name,
        email,
      };
      setUsers((prevUsers) => [...prevUsers, newUser]);
    }
    handleCloseModal();
  };

  // Eliminar usuario
  const handleDelete = (id: number) => {
    setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
  };

  return (
    <Card sx={{ maxWidth: 800, margin: "auto", mt: 4, p: 2, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Administración de Usuarios
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleOpenModal()}
          sx={{ mb: 2 }}
        >
          Crear Usuario
        </Button>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenModal(user)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(user.id!)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Modal para crear/editar usuarios */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            {editingUser ? "Editar Usuario" : "Crear Usuario"}
          </Typography>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <TextField
              label="Nombre"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              label="Email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              type="email"
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button onClick={handleCloseModal} sx={{ mr: 2 }}>
                Cancelar
              </Button>
              <Button type="submit" variant="contained" color="primary">
                {editingUser ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </Card>
  );
}