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
  PlaylistAddCheck,
  Visibility,
  Science,
  Checklist,
  Edit,
  Search,
  Clear
} from '@mui/icons-material';
import DataTable from '../../shared/components/dataTableGen';

const MuestrasTable = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [muestras, setMuestras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    estado: 'todos',
    showInactive: false
  });

  // Columnas de la tabla
  const columns = [
    { 
      id: 'id', 
      label: 'ID Muestra', 
      minWidth: 120,
      render: (row) => <strong>{row.id}</strong>
    },
    { 
      id: 'fecha_toma', 
      label: 'Fecha Toma', 
      minWidth: 120,
      render: (row) => new Date(row.fecha_toma).toLocaleDateString()
    },
    { 
      id: 'lubricante', 
      label: 'Lubricante', 
      minWidth: 150,
      render: (row) => row.lubricante?.nombre || '-'
    },
    { 
      id: 'equipo_placa', 
      label: 'Equipo/Placa', 
      minWidth: 120,
      render: (row) => row.equipo_placa || '-'
    },
    { 
      id: 'periodo_servicio', 
      label: 'Periodo Servicio', 
      minWidth: 150,
      render: (row) => (
        <Box>
          {row.periodo_servicio_aceite ? 
            `${row.periodo_servicio_aceite} ${row.unidad_periodo_aceite}` : 
            '-'}
          {row.periodo_servicio_equipo && (
            <Typography variant="caption" display="block">
              Equipo: {row.periodo_servicio_equipo} {row.unidad_periodo_equipo}
            </Typography>
          )}
        </Box>
      )
    },
    { 
      id: 'estado', 
      label: 'Estado', 
      minWidth: 100,
      align: 'center',
      render: (row) => (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Chip 
            label={row.is_ingresado ? 'Ingresado' : 'Pendiente'} 
            color={row.is_ingresado ? 'success' : 'warning'} 
            size="small"
            sx={{ mb: 0.5 }}
          />
          {row.is_aprobado && (
            <Chip 
              label="Aprobado" 
              color="success" 
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )
    },
    {
      id: 'was_checked',
      label: 'Revisión',
      minWidth: 120,
      render: (row) => {
        const checkedDate = new Date(row.was_checked);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return (
          <Chip 
            label={checkedDate.toLocaleDateString()} 
            color={checkedDate >= today ? 'default' : 'error'} 
            size="small"
          />
        )
      }
    }
  ];

  // Acciones para cada fila
  const actions = [
    {
      id: 'asignar-ensayos',
      icon: <PlaylistAddCheck fontSize="small" />,
      tooltip: 'Ingresar ensayos',
      handler: (row) => router.push(`/muestras/ensayos-muestra?muestra=${row.id}`)
    },
    {
      id: 'ingresar-ensayos',
      icon: <Science fontSize="small" />,
      tooltip: 'Ingresar resultados',
      handler: (row) => router.push(`/muestras/ensayos-muestra/ingreso-ensayos?muestra=${row.id}`),
      disabled: (row) => !row.is_ingresado
    },
    {
      id: 'revision-ensayos',
      icon: <Checklist fontSize="small" />,
      tooltip: 'Revisar resultados',
      handler: (row) => router.push(`/muestras/revision-muestras/revision-muestra?muestra=${row.id}`),
      disabled: (row) => !row.is_ingresado
    },
    {
      id: 'view',
      icon: <Visibility fontSize="small" />,
      tooltip: 'Ver detalle',
      handler: (row) => router.push(`/muestras/muestra-details?muestra=${row.id}`)
    },
    {
      id: 'edit',
      icon: <Edit fontSize="small" />,
      tooltip: 'Editar',
      handler: (row) => router.push(`/muestras/editar/${row.id}`)
    }
  ];

  // Obtener muestras
  const fetchMuestras = async () => {
    setLoading(true);
    try {
      const response = await api.get('lubrication/samples/');
      setMuestras(response.data);
    } catch (error) {
      toast.error('Error al cargar muestras: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMuestras();
  }, []);
  console.log(muestras)
  // Aplicar filtros
  const filteredData = muestras.filter(muestra => {
    // Filtro de búsqueda general
    const matchesSearch = 
      !searchTerm ||
      (muestra.id && muestra.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (muestra.lubricante?.nombre && muestra.lubricante.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (muestra.equipo_placa && muestra.equipo_placa.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtros adicionales
    const matchesStatus = 
      filters.estado === 'todos' || 
      (filters.estado === 'ingresado' && muestra.is_ingresado) ||
      (filters.estado === 'pendiente' && !muestra.is_ingresado);

    // Filtro de revisión
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkedDate = new Date(muestra.was_checked);
    console.log(checkedDate,today)
   
    console.log(matchesSearch,matchesStatus)
    return matchesSearch && matchesStatus;
  });
  console.log(filteredData)
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestión de Muestras
      </Typography>

      {/* Barra de búsqueda y filtros */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar muestras..."
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
                <MenuItem value="ingresado">Ingresados</MenuItem>
                <MenuItem value="pendiente">Pendientes</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.showInactive}
                  onChange={(e) => setFilters({...filters, showInactive: e.target.checked})}
                />
              }
              label="Mostrar vencidos"
            />

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/muestras/crear')}
            >
              Nueva Muestra
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
        emptyMessage="No se encontraron muestras"
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

export default MuestrasTable;