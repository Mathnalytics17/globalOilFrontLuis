import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Save,
  Cancel
} from '@mui/icons-material';

const CreateMachine = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    componente: '',
    tipoAceite: '',
    frecuenciaCambio: '',
    frecuenciaAnalisis: '',
    numero_serie: '',
    codigo_equipo: uuidv4(),
    estado: 'activo'
  });

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (!formData.componente.trim()) {
        throw new Error('El componente es requerido');
      }
      if (!formData.tipoAceite.trim()) {
        throw new Error('El tipo de aceite es requerido');
      }
      if (!formData.frecuenciaCambio || isNaN(formData.frecuenciaCambio)) {
        throw new Error('Frecuencia de cambio debe ser un número válido');
      }
      if (!formData.frecuenciaAnalisis || isNaN(formData.frecuenciaAnalisis)) {
        throw new Error('Frecuencia de análisis debe ser un número válido');
      }

      // Preparar datos para enviar
      const payload = {
        ...formData,
        frecuenciaCambio: Number(formData.frecuenciaCambio),
        frecuenciaAnalisis: Number(formData.frecuenciaAnalisis),
        activo: formData.estado === 'activo'
      };

      // Enviar a la API
      const response = await api.post('machines/', payload);
      
      toast.success('Máquina creada correctamente');
      router.push('/machines');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al crear máquina');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Crear Nueva Máquina
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Nombre */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de la máquina"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* Código de equipo */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código de equipo"
                name="codigo_equipo"
                value={formData.codigo_equipo}
                onChange={handleChange}
                InputProps={{
                  readOnly: true,
                }}
                helperText="Generado automáticamente"
              />
            </Grid>

            {/* Componente */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Componente"
                name="componente"
                value={formData.componente}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* Tipo de aceite */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tipo de aceite"
                name="tipoAceite"
                value={formData.tipoAceite}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* Frecuencia de cambio */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Frecuencia de cambio (horas)"
                name="frecuenciaCambio"
                type="number"
                value={formData.frecuenciaCambio}
                onChange={handleChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* Frecuencia de análisis */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Frecuencia de análisis (horas)"
                name="frecuenciaAnalisis"
                type="number"
                value={formData.frecuenciaAnalisis}
                onChange={handleChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>

            {/* Número de serie */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Número de serie"
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleChange}
              />
            </Grid>

            {/* Estado */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  name="estado"
                  value={formData.estado}
                  label="Estado"
                  onChange={handleChange}
                >
                  <MenuItem value="activo">Activo</MenuItem>
                  <MenuItem value="inactivo">Inactivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Botones */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => router.push('/machines')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  disabled={loading}
                >
                  Guardar Máquina
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default CreateMachine;