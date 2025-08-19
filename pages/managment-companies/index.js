import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Chip,
  IconButton
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Delete,
  Search,
  Clear,
  Refresh
} from '@mui/icons-material';
import DataTable from '../../shared/components/dataTableGen';

const CompanyTable = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Columnas de la tabla
  const columns = [
    { 
      id: 'id', 
      label: 'ID', 
      width: 80,
      render: (row) => <strong>{row.id}</strong>
    },
    { 
      id: 'nombre', 
      label: 'Nombre', 
      minWidth: 200,
      render: (row) => row.nombre || '-'
    },
   
    { 
      id: 'direccion', 
      label: 'Dirección', 
      minWidth: 200,
      render: (row) => row.direccion || '-'
    },
    { 
      id: 'telefono', 
      label: 'Teléfono', 
      minWidth: 120,
      render: (row) => row.telefono|| '-'
    },
    { 
      id: 'status', 
      label: 'Estado', 
      align: 'center',
      render: (row) => (
        <Chip 
          label={row.is_active ? 'Activo' : 'Inactivo'} 
          color={row.is_active ? 'success' : 'error'} 
          size="small"
        />
      )
    }
  ];

  // Acciones para cada fila
  const actions = [
    {
      id: 'view',
      icon: <Visibility fontSize="small" />,
      tooltip: 'Ver detalle',
      handler: (row) => router.push(`/managment-companies/detail-company/${row.id}`)
    },
    {
      id: 'edit',
      icon: <Edit fontSize="small" />,
      tooltip: 'Editar',
      handler: (row) => router.push(`/managment-companies/edit-companies/${row.id}`)
    },
    {
      id: 'delete',
      icon: <Delete fontSize="small" />,
      tooltip: 'Eliminar',
      handler: async (row) => {
        if (window.confirm(`¿Estás seguro de eliminar la compañía ${row.name}?`)) {
          try {
            await api.delete(`companies/${row.id}/`);
            toast.success('Compañía eliminada correctamente');
            fetchCompanies();
          } catch (error) {
            toast.error('Error al eliminar: ' + (error.response?.data?.message || error.message));
          }
        }
      },
      disabled: (row) => row.is_active === false
    }
  ];

  // Obtener compañías
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('companies/');
      setCompanies(response.data);
    } catch (error) {
      toast.error('Error al cargar compañías: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filtrar datos
  const filteredData = companies.filter(company => {
    return (
      !searchTerm ||
      (company.nombre && company.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.nit && company.nit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.direccion && company.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Compañías
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          variant="outlined"
          placeholder="Buscar compañías..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ width: 400 }}
          InputProps={{
            startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'action.active' }} />,
            endAdornment: searchTerm && (
              <IconButton size="small" onClick={() => setSearchTerm('')}>
                <Clear fontSize="small" />
              </IconButton>
            )
          }}
        />

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchCompanies}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/managment-companies/create-companies')}
          >
            Nueva Compañía
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: 2 }}>
        <DataTable
          columns={columns}
          data={filteredData}
          actions={actions}
          loading={loading}
          emptyMessage="No se encontraron compañías"
          pagination
        />
      </Paper>
    </Box>
  );
};

export default CompanyTable;