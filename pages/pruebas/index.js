import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Chip, 
  Stack, 
  IconButton,
  Paper,
  InputAdornment
} from '@mui/material';
import { 
  Search, 
  FilterList, 
  Add, 
  Refresh, 
  Edit, 
  Visibility,
  Clear 
} from '@mui/icons-material';
import DataTable from '../../shared/components/dataTableGen';

const ListadoPruebas = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [pruebas, setPruebas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    activo: null,
    unidad: null
  });
  const [showFilters, setShowFilters] = useState(false);

  // Columnas de la tabla
  const columns = [
    { 
      id: 'codigo', 
      label: 'Código', 
      minWidth: 100,
      filterable: true,
      render: (row) => <strong>{row.codigo}</strong>
    },
    { 
      id: 'nombre', 
      label: 'Nombre', 
      minWidth: 200,
      filterable: true,
      render: (row) => row.nombre
    },
    { 
      id: 'unidad_medida', 
      label: 'Unidad', 
      minWidth: 100,
      filterable: true,
      render: (row) => row.unidad_medida || '-'
    },
    { 
      id: 'metodo_referencia', 
      label: 'Método', 
      minWidth: 150,
      filterable: true,
      render: (row) => row.metodo_referencia || '-'
    },
    { 
      id: 'activo', 
      label: 'Estado', 
      minWidth: 100,
      align: 'center',
      render: (row) => (
        <Chip 
          label={row.activo ? 'Activo' : 'Inactivo'} 
          color={row.activo ? 'success' : 'error'} 
          size="small" 
          variant="outlined"
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
      handler: (row) => router.push(`/pruebas/detalle-prueba/${row.id}`)
    },
    {
      id: 'edit',
      icon: <Edit fontSize="small" />,
      tooltip: 'Editar',
      handler: (row) => router.push(`/pruebas/edit-pruebas/${row.id}`)
    }
  ];

  // Obtener pruebas
  const fetchPruebas = async () => {
    setLoading(true);
    try {
      const response = await api.get('lubrication/tests/');
      setPruebas(response.data);
    } catch (error) {
      toast.error('Error al cargar pruebas: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPruebas();
  }, []);

  // Aplicar filtros
  const filteredData = pruebas.filter(prueba => {
    // Filtro de búsqueda general
    const matchesSearch = 
      !searchTerm ||
      prueba.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prueba.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prueba.metodo_referencia && prueba.metodo_referencia.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtros adicionales
    const matchesFilters = 
      (filters.activo === null || prueba.activo === filters.activo) &&
      (!filters.unidad || prueba.unidad_medida === filters.unidad);

    return matchesSearch && matchesFilters;
  });

  // Obtener unidades únicas para filtro
  const unidadesUnicas = [...new Set(pruebas.map(p => p.unidad_medida).filter(Boolean))];

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      activo: null,
      unidad: null
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mb={3}
        >
          <Typography variant="h4">Gestión de Pruebas</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/pruebas/create-pruebas')}
          >
            Nueva Prueba
          </Button>
        </Box>

        {/* Barra de búsqueda y filtros */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar pruebas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <Clear fontSize="small" />
                  </IconButton>
                )
              }}
              size="small"
            />
            <Button
              variant={showFilters ? "contained" : "outlined"}
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtros
            </Button>
            <IconButton onClick={fetchPruebas} title="Recargar">
              <Refresh />
            </IconButton>
          </Stack>

          {/* Panel de filtros avanzados */}
          {showFilters && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Stack direction="row" spacing={3} alignItems="center">
                <Typography variant="subtitle2">Filtros Avanzados:</Typography>
                
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">Estado:</Typography>
                  <Chip
                    label="Todos"
                    variant={filters.activo === null ? "filled" : "outlined"}
                    onClick={() => setFilters({...filters, activo: null})}
                  />
                  <Chip
                    label="Activas"
                    variant={filters.activo === true ? "filled" : "outlined"}
                    color="success"
                    onClick={() => setFilters({...filters, activo: true})}
                  />
                  <Chip
                    label="Inactivas"
                    variant={filters.activo === false ? "filled" : "outlined"}
                    color="error"
                    onClick={() => setFilters({...filters, activo: false})}
                  />
                </Stack>

                {unidadesUnicas.length > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">Unidad:</Typography>
                    <Chip
                      label="Todas"
                      variant={!filters.unidad ? "filled" : "outlined"}
                      onClick={() => setFilters({...filters, unidad: null})}
                    />
                    {unidadesUnicas.map(unidad => (
                      <Chip
                        key={unidad}
                        label={unidad}
                        variant={filters.unidad === unidad ? "filled" : "outlined"}
                        onClick={() => setFilters({...filters, unidad})}
                      />
                    ))}
                  </Stack>
                )}

                <Button 
                  size="small" 
                  onClick={clearFilters}
                  startIcon={<Clear />}
                >
                  Limpiar
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>

        {/* Tabla de resultados */}
        <DataTable
          columns={columns}
          data={filteredData}
          actions={actions}
          loading={loading}
          emptyMessage="No se encontraron pruebas"
          sx={{
            '& .MuiDataGrid-root': {
              border: 'none',
              minHeight: '400px'
            }
          }}
        />
      </Paper>

      {/* Resumen de resultados */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {filteredData.length} de {pruebas.length} pruebas
        </Typography>
        {filters.activo !== null || filters.unidad || searchTerm ? (
          <Typography variant="body2" color="text.secondary">
            Filtros aplicados: 
            {filters.activo !== null && (
              <Chip 
                label={`Estado: ${filters.activo ? 'Activo' : 'Inactivo'}`} 
                size="small" 
                sx={{ ml: 1 }}
                onDelete={() => setFilters({...filters, activo: null})}
              />
            )}
            {filters.unidad && (
              <Chip 
                label={`Unidad: ${filters.unidad}`} 
                size="small" 
                sx={{ ml: 1 }}
                onDelete={() => setFilters({...filters, unidad: null})}
              />
            )}
            {searchTerm && (
              <Chip 
                label={`Búsqueda: "${searchTerm}"`} 
                size="small" 
                sx={{ ml: 1 }}
                onDelete={() => setSearchTerm('')}
              />
            )}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default ListadoPruebas;