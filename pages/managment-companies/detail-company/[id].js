import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  Edit,
  ArrowBack
} from '@mui/icons-material';

const CompanyDetail = () => {
  const { api } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  // Cargar datos de la compañía
  useEffect(() => {
    if (!id) return;

    const fetchCompany = async () => {
      try {
        const response = await api.get(`companies/${id}/`);
        setCompany(response.data);
      } catch (error) {
        toast.error('Error al cargar compañía: ' + (error.response?.data?.message || error.message));
        router.push('/managment-companies');
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!company) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Compañía no encontrada</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Detalle de Compañía</Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => router.push('/managment-companies')}
        >
          Volver
        </Button>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Información básica */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Información General</Typography>
            <Typography><strong>Nombre:</strong> {company.name || '-'}</Typography>
            <Typography><strong>NIT:</strong> {company.nit || '-'}</Typography>
            <Typography><strong>Estado:</strong> 
              <Chip 
                label={company.is_active ? 'Activo' : 'Inactivo'} 
                color={company.is_active ? 'success' : 'error'} 
                size="small"
                sx={{ ml: 1 }}
              />
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Información de Contacto</Typography>
            <Typography><strong>Dirección:</strong> {company.address || '-'}</Typography>
            <Typography><strong>Teléfono:</strong> {company.phone || '-'}</Typography>
            <Typography><strong>Email:</strong> {company.email || '-'}</Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Fechas importantes */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Fechas</Typography>
            <Typography><strong>Fecha de creación:</strong> {new Date(company.created_at).toLocaleDateString()}</Typography>
            {company.updated_at && (
              <Typography><strong>Última actualización:</strong> {new Date(company.updated_at).toLocaleDateString()}</Typography>
            )}
          </Grid>

          {/* Botones */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => router.push(`/managment-companies/edit-companies/${id}`)}
              >
                Editar Compañía
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default CompanyDetail;