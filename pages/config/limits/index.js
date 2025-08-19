import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Chip
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Delete,
  Search,
  Clear
} from '@mui/icons-material';
import DataTable from '../../../shared/components/dataTableGen';

const LimitsTable = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [limits, setLimits] = useState([]);
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
      id: 'parametro', 
      label: 'Parámetro', 
      minWidth: 150,
      render: (row) => row.parametro?.nombre || '-'
    },
    { 
      id: 'equipo', 
      label: 'Equipo', 
      minWidth: 150,
      render: (row) => row.equipo?.nombre || 'Todos'
    },
    { 
      id: 'limite_inferior', 
      label: 'Límite Inferior', 
      align: 'center',
      render: (row) => row.limite_inferior || '-'
    },
    { 
      id: 'limite_superior', 
      label: 'Límite Superior', 
      align: 'center',
      render: (row) => row.limite_superior || '-'
    },
    { 
      id: 'unidad', 
      label: 'Unidad', 
      align: 'center',
      render: (row) => row.parametro?.unidad || '-'
    },
    { 
      id: 'severidad', 
      label: 'Severidad', 
      align: 'center',
      render: (row) => (
        <Chip 
          label={row.severidad} 
          color={
            row.severidad === 'Alto' ? 'error' : 
            row.severidad === 'Medio' ? 'warning' : 'success'
          } 
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
      handler: (row) => router.push(`/limites/${row.id}`)
    },
    {
      id: 'edit',
      icon: <Edit fontSize="small" />,
      tooltip: 'Editar',
      handler: (row) => router.push(`/limites/editar/${row.id}`)
    },
    {
      id: 'delete',
      icon: <Delete fontSize="small" />,
      tooltip: 'Eliminar',
      handler: async (row) => {
        if (window.confirm(`¿Estás seguro de eliminar el límite para ${row.parametro?.nombre}?`)) {
          try {
            await api.delete(`limites/${row.id}/`);
            toast.success('Límite eliminado correctamente');
            fetchLimits();
          } catch (error) {
            toast.error('Error al eliminar: ' + (error.response?.data?.message || error.message));
          }
        }
      }
    }
  ];

  // Obtener límites
  const fetchLimits = async () => {
    setLoading(true);
    try {
      const response = await api.get('limites/');
      setLimits(response.data);
    } catch (error) {
      toast.error('Error al cargar límites: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  // Filtrar datos
  const filteredData = limits.filter(limit => {
    return (
      !searchTerm ||
      (limit.parametro?.nombre && limit.parametro.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (limit.equipo?.nombre && limit.equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (limit.severidad && limit.severidad.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Límites
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          variant="outlined"
          placeholder="Buscar límites..."
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

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => router.push('/limites/crear')}
        >
          Nuevo Límite
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 2 }}>
        <DataTable
          columns={columns}
          data={filteredData}
          actions={actions}
          loading={loading}
          emptyMessage="No se encontraron límites"
          pagination
        />
      </Paper>
    </Box>
  );
};

export default LimitsTable;