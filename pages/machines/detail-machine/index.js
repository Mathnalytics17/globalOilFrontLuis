import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../shared/context/AuthContext';
import { toast } from 'react-toastify';
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
  Cancel,
  BackHand,
  ArrowBackSharp
} from '@mui/icons-material';

const  DetailMachine = () => {
  const { api } = useAuth();
  const router = useRouter();
  console.log(router)
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    componente: '',
    tipoAceite: '',
    frecuenciaCambio: '',
    frecuenciaAnalisis: '',
    numero_serie: '',
    codigo_equipo: '',
    estado: 'activo'
  });

  // Cargar datos de la máquina
  useEffect(() => {
    if (!id) return;

    const fetchMachine = async () => {
      try {
        const response = await api.get(`machines/${id}/`);
        const machineData = response.data;
        
        setFormData({
          nombre: machineData.nombre || '',
          componente: machineData.componente || '',
          tipoAceite: machineData.tipoAceite || '',
          frecuenciaCambio: machineData.frecuenciaCambio || '',
          frecuenciaAnalisis: machineData.frecuenciaAnalisis || '',
          numero_serie: machineData.numero_serie || '',
          codigo_equipo: machineData.codigo_equipo || '',
          estado: machineData.activo ? 'activo' : 'inactivo'
        });
      } catch (error) {
        toast.error('Error al cargar máquina: ' + (error.response?.data?.message || error.message));
        router.push('/maquinas');
      } finally {
        setInitialLoad(false);
      }
    };

    fetchMachine();
  }, [id]);

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
      const response = await api.put(`machines/${id}/`, payload);
      
      toast.success('Máquina actualizada correctamente');
      router.push('/maquinas');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al actualizar máquina');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Ver Maquina
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
                disabled
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
                disabled
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
                disabled
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
                disabled
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
                disabled
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
                disabled
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
                disabled
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
                  disabled
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
                  startIcon={<ArrowBackSharp />}
                  onClick={() => router.push('/machines')}
                  disabled={loading}
                >
                 Atras
                </Button>
               
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default DetailMachine;