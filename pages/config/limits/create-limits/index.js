import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
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
  Cancel
} from '@mui/icons-material';

const CreateLimit = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [parameters, setParameters] = useState([]);
  const [equipments, setEquipments] = useState([]);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    parametro: '',
    equipo: '',
    limite_inferior: '',
    limite_superior: '',
    severidad: 'medio'
  });

  // Cargar parámetros y equipos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paramsRes, equipRes] = await Promise.all([
          api.get('parametros/'),
          api.get('equipos/')
        ]);
        setParameters(paramsRes.data);
        setEquipments(equipRes.data);
      } catch (error) {
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
      }
    };

    fetchData();
  }, []);

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
      if (!formData.parametro) {
        throw new Error('Debe seleccionar un parámetro');
      }
      if (!formData.limite_inferior && !formData.limite_superior) {
        throw new Error('Debe especificar al menos un límite');
      }

      // Preparar payload
      const payload = {
        ...formData,
        limite_inferior: formData.limite_inferior || null,
        limite_superior: formData.limite_superior || null,
        equipo: formData.equipo || null
      };

      // Enviar a la API
      await api.post('limites/', payload);
      
      toast.success('Límite creado correctamente');
      router.push('/limites');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al crear límite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Crear Nuevo Límite
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Parámetro */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Parámetro *</InputLabel>
                <Select
                  name="parametro"
                  value={formData.parametro}
                  label="Parámetro *"
                  onChange={handleChange}
                  required
                >
                  {parameters.map(param => (
                    <MenuItem key={param.id} value={param.id}>
                      {param.nombre} ({param.unidad})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Equipo (opcional) */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Equipo (opcional)</InputLabel>
                <Select
                  name="equipo"
                  value={formData.equipo}
                  label="Equipo (opcional)"
                  onChange={handleChange}
                >
                  <MenuItem value="">Todos los equipos</MenuItem>
                  {equipments.map(equipo => (
                    <MenuItem key={equipo.id} value={equipo.id}>
                      {equipo.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Límite inferior */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Límite inferior (opcional)"
                name="limite_inferior"
                type="number"
                value={formData.limite_inferior}
                onChange={handleChange}
                inputProps={{ step: "0.01" }}
              />
            </Grid>

            {/* Límite superior */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Límite superior (opcional)"
                name="limite_superior"
                type="number"
                value={formData.limite_superior}
                onChange={handleChange}
                inputProps={{ step: "0.01" }}
              />
            </Grid>

            {/* Severidad */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Severidad</InputLabel>
                <Select
                  name="severidad"
                  value={formData.severidad}
                  label="Severidad"
                  onChange={handleChange}
                >
                  <MenuItem value="bajo">Bajo</MenuItem>
                  <MenuItem value="medio">Medio</MenuItem>
                  <MenuItem value="alto">Alto</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Botones */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => router.push('/limites')}
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
                  Guardar Límite
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default CreateLimit;