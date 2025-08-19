import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Chip,
  TextField,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  IconButton
} from '@mui/material';
import {
  Add,
  Visibility,
  Settings,
  Build,
  Edit,
  Search,
  Clear,
  Refresh
} from '@mui/icons-material';
import DataTable from '../../shared/components/dataTableGen';

const MaquinasTable = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: 'todos',
    showInactive: false
  });

  // Columnas de la tabla para máquinas
  const columns = [
    { 
      id: 'id', 
      label: 'ID Máquina', 
      minWidth: 100,
      render: (row) => <strong>{row.id}</strong>
    },
    { 
      id: 'nombre', 
      label: 'Nombre', 
      minWidth: 150,
      render: (row) => row.nombre || '-'
    },
    { 
      id: 'codigo_equipo', 
      label: 'Código Equipo', 
      minWidth: 120,
      render: (row) => row.codigo_equipo || '-'
    },
    { 
      id: 'numero_serie', 
      label: 'Número de Serie', 
      minWidth: 120,
      render: (row) => row.numero_serie || '-'
    },
    { 
      id: 'componente', 
      label: 'Componente', 
      minWidth: 150,
      render: (row) => row.componente || '-'
    },
    { 
      id: 'tipoAceite', 
      label: 'Tipo de Aceite', 
      minWidth: 120,
      render: (row) => row.tipoAceite || '-'
    },
    { 
      id: 'frecuencias', 
      label: 'Frecuencias', 
      minWidth: 180,
      render: (row) => (
        <Box>
          <Typography variant="body2">
            Cambio: {row.frecuenciaCambio || '-'} hrs
          </Typography>
          <Typography variant="body2">
            Análisis: {row.frecuenciaAnalisis || '-'} hrs
          </Typography>
        </Box>
      )
    },
    { 
      id: 'estado', 
      label: 'Estado', 
      minWidth: 100,
      align: 'center',
      render: (row) => (
        <Chip 
          label={row.activo ? 'Activo' : 'Inactivo'} 
          color={row.activo ? 'success' : 'error'} 
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
      handler: (row) => router.push(`/machines/detail-machine?id=${row.id}`)
    },
    
 
    {
      id: 'edit',
      icon: <Edit fontSize="small" />,
      tooltip: 'Editar',
      handler: (row) => router.push(`/machines/edit-machine?id=${row.id}`)
    }
  ];

  // Obtener máquinas
  const fetchMaquinas = async () => {
    setLoading(true);
    try {
      const response = await api.get('machines/');
      setMaquinas(response.data);
    } catch (error) {
      toast.error('Error al cargar máquinas: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaquinas();
  }, []);

  // Aplicar filtros
  const filteredData = maquinas.filter(maquina => {
    // Filtro de búsqueda general
    const matchesSearch = 
      !searchTerm ||
      (maquina.id && maquina.id.toString().includes(searchTerm.toLowerCase())) ||
      (maquina.nombre && maquina.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (maquina.codigo_equipo && maquina.codigo_equipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (maquina.numero_serie && maquina.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtros adicionales
    const matchesStatus = 
      filters.estado === 'todos' || 
      (filters.estado === 'activo' && maquina.activo) ||
      (filters.estado === 'inactivo' && !maquina.activo);

    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Máquinas
      </Typography>

      {/* Barra de búsqueda y filtros */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar máquinas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ maxWidth: 400 }}
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.estado}
                label="Estado"
                onChange={(e) => setFilters({...filters, estado: e.target.value})}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="activo">Activas</MenuItem>
                <MenuItem value="inactivo">Inactivas</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.showInactive}
                  onChange={(e) => setFilters({...filters, showInactive: e.target.checked})}
                />
              }
              label="Mostrar inactivas"
            />

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/machines/create-machine')}
            >
              Nueva Máquina
            </Button>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchMaquinas}
            >
              Actualizar
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Tabla de resultados */}
      <DataTable
        columns={columns}
        data={filteredData}
        actions={actions}
        loading={loading}
        emptyMessage="No se encontraron máquinas"
        selectable
        pagination
        sx={{
          '& .MuiDataGrid-root': {
            border: 'none',
            minHeight: '500px'
          }
        }}
      />
    </Box>
  );
};

export default MaquinasTable;