import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
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
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Save,
  Cancel
} from '@mui/icons-material';

const EditCompany = () => {
  const { api } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    nit: '',
    address: '',
    phone: '',
    email: '',
    is_active: true
  });

  // Cargar datos de la compañía
  useEffect(() => {
    if (!id) return;

    const fetchCompany = async () => {
      try {
        const response = await api.get(`companies/${id}/`);
        setFormData({
          name: response.data.name,
          nit: response.data.nit,
          address: response.data.address || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          is_active: response.data.is_active
        });
      } catch (error) {
        toast.error('Error al cargar compañía: ' + (error.response?.data?.message || error.message));
        router.push('/managment-companies');
      } finally {
        setInitialLoad(false);
      }
    };

    fetchCompany();
  }, [id]);

  // Manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (!formData.name.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (!formData.nit.trim()) {
        throw new Error('El NIT es requerido');
      }

      // Enviar a la API
      await api.put(`companies/${id}/`, formData);
      
      toast.success('Compañía actualizada correctamente');
      router.push('/managment-companies');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error al actualizar compañía');
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
        Editar Compañía
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Nombre */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* NIT */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="NIT *"
                name="nit"
                value={formData.nit}
                onChange={handleChange}
                required
              />
            </Grid>

            {/* Dirección */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </Grid>

            {/* Teléfono */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                type="tel"
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
              />
            </Grid>

            {/* Estado */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="Compañía activa"
              />
            </Grid>

            {/* Botones */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => router.push('/administrationPanel/company-management')}
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
                  Actualizar Compañía
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default EditCompany;