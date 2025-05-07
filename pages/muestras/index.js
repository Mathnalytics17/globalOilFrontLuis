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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import {
  Add,
  PlaylistAddCheck,
  Visibility,
  Science,
  Checklist,
  Edit,
  Search,
  Clear,
  DateRange,
  Download
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import DataTable from '../../shared/components/dataTableGen';

const MuestrasTable = () => {
  const { api } = useAuth();
  const router = useRouter();
  const [muestras, setMuestras] = useState([]);
  const [ensayos, setEnsayos] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    estado: 'todos',
    showInactive: false,
    fechaDesde: '',
    fechaHasta: '',
    idMuestra: '',
    equipoCodigo: '',
    lubricanteRef: ''
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
      render: (row) => row.lubricante?.referencia || '-'
    },
    { 
      id: 'machines', 
      label: 'Equipo', 
      minWidth: 120,
      render: (row) => row.Equipo?.codigo_equipo || '-'
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

  // Obtener datos
  const fetchData = async () => {
    setLoading(true);
    try {
      const [muestrasRes, ensayosRes, resultadosRes] = await Promise.all([
        api.get('lubrication/samples/'),
        api.get('lubrication/tests/'),
        api.get('lubrication/results/')
      ]);
      
      setMuestras(muestrasRes.data);
      setEnsayos(ensayosRes.data);
      setResultados(resultadosRes.data);
    } catch (error) {
      toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

 // Aplicar filtros
const filteredData = muestras.filter(muestra => {
  // Filtro de búsqueda general
  const matchesSearch = 
    !searchTerm ||
    (muestra.id && muestra.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (muestra.lubricante?.nombre_comercial && muestra.lubricante.nombre_comercial.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (muestra.Equipo?.codigo_equipo && muestra.Equipo.codigo_equipo.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // Filtros adicionales
  const matchesStatus = 
    filters.estado === 'todos' || 
    (filters.estado === 'ingresado' && muestra.is_ingresado) ||
    (filters.estado === 'pendiente' && !muestra.is_ingresado);

  // Filtro por ID de muestra
  const matchesId = !filters.idMuestra || (muestra.id && muestra.id.includes(filters.idMuestra));

  // Filtro por código de equipo
  const matchesEquipo = !filters.equipoCodigo || 
    (muestra.Equipo?.codigo_equipo && muestra.Equipo.codigo_equipo.includes(filters.equipoCodigo));

  // Filtro por referencia de lubricante
  const matchesLubricante = !filters.lubricanteRef || 
    (muestra.lubricante?.referencia && muestra.lubricante.referencia.includes(filters.lubricanteRef));

  // Filtro por fecha - versión corregida
  const fechaToma = new Date(muestra.fecha_toma);
  fechaToma.setHours(0, 0, 0, 0); // Normalizamos la fecha
  
  const filterFechaDesde = filters.fechaDesde ? new Date(filters.fechaDesde) : null;
  const filterFechaHasta = filters.fechaHasta ? new Date(filters.fechaHasta) : null;
  
  if (filterFechaDesde) filterFechaDesde.setHours(0, 0, 0, 0);
  if (filterFechaHasta) filterFechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
  
  const matchesFechaDesde = !filterFechaDesde || fechaToma >= filterFechaDesde;
  const matchesFechaHasta = !filterFechaHasta || fechaToma <= filterFechaHasta;

  return (
    matchesSearch && 
    matchesStatus && 
    matchesId && 
    matchesEquipo && 
    matchesLubricante && 
    matchesFechaDesde && 
    matchesFechaHasta
  );
});

  // Exportar a Excel
  const exportToExcel = () => {
    // Obtener todos los nombres de ensayos únicos
    const allTestNames = ensayos.map(test => test.nombre);
    
    // Crear matriz de datos para el Excel
    const dataForExport = filteredData.map(muestra => {
      const rowData = {
        'ID Muestra': muestra.id,
        'Fecha Toma': new Date(muestra.fecha_toma).toLocaleDateString(),
        'Lubricante': muestra.lubricante?.nombre_comercial || '',
        'Referencia Lubricante': muestra.lubricante?.referencia || '',
        'Equipo': muestra.Equipo?.nombre_equipo || '',
        'Código Equipo': muestra.Equipo?.codigo_equipo || '',
        'Periodo Servicio Aceite': muestra.periodo_servicio_aceite || '',
        'Unidad Periodo Aceite': muestra.unidad_periodo_aceite || '',
        'Periodo Servicio Equipo': muestra.periodo_servicio_equipo || '',
        'Unidad Periodo Equipo': muestra.unidad_periodo_equipo || '',
        'Estado': muestra.is_ingresado ? 'Ingresado' : 'Pendiente',
        'Aprobado': muestra.is_aprobado ? 'Sí' : 'No',
        'Fecha Revisión': new Date(muestra.was_checked).toLocaleDateString()
      };
  
      // Agregar resultados de ensayos
      allTestNames.forEach(testName => {
        const resultado = resultados.find(r => 
          r.prueba_muestra.muestra.id === muestra.id && 
          r.prueba_muestra.prueba.nombre === testName
        );
        rowData[testName] = resultado ? resultado.resultado : '';
      });
  
      return rowData;
    });
  
    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Convertir los datos a una hoja de trabajo incluyendo los headers
    const ws = XLSX.utils.json_to_sheet(dataForExport, {
      header: [
        'ID Muestra',
        'Fecha Toma',
        'Lubricante',
        'Referencia Lubricante',
        'Equipo',
        'Código Equipo',
        'Periodo Servicio Aceite',
        'Unidad Periodo Aceite',
        'Periodo Servicio Equipo',
        'Unidad Periodo Equipo',
        'Estado',
        'Aprobado',
        'Fecha Revisión',
        ...allTestNames
      ]
    });
  
    // Ajustar anchos de columnas
    const wscols = [
      {wch: 15}, {wch: 12}, {wch: 20}, {wch: 20}, 
      {wch: 20}, {wch: 15}, {wch: 20}, {wch: 20},
      {wch: 20}, {wch: 20}, {wch: 12}, {wch: 10},
      {wch: 12}, 
      ...allTestNames.map(() => ({wch: 15}))
    ];
    ws['!cols'] = wscols;
  
    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Muestras');
  
    // Generar archivo y descargar
    const fileName = `muestras_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  // Resetear filtros avanzados
  const resetAdvancedFilters = () => {
    setFilters({
      ...filters,
      fechaDesde: '',
      fechaHasta: '',
      idMuestra: '',
      equipoCodigo: '',
      lubricanteRef: ''
    });
  };

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

          <Box display="flex" gap={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<DateRange />}
              onClick={() => setAdvancedFilterOpen(true)}
            >
              Filtros Avanzados
            </Button>

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
              color="secondary"
              startIcon={<Download />}
              onClick={exportToExcel}
              disabled={filteredData.length === 0}
              sx={{ ml: 1 }}
            >
              Exportar Excel
            </Button>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/muestras/cliente-muestra')}
            >
              Nueva Muestra
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Diálogo de filtros avanzados */}
      <Dialog 
        open={advancedFilterOpen} 
        onClose={() => setAdvancedFilterOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filtros Avanzados</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha desde"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.fechaDesde}
                  onChange={(e) => setFilters({...filters, fechaDesde: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha hasta"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.fechaHasta}
                  onChange={(e) => setFilters({...filters, fechaHasta: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ID Muestra"
                  value={filters.idMuestra}
                  onChange={(e) => setFilters({...filters, idMuestra: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Código de Equipo"
                  value={filters.equipoCodigo}
                  onChange={(e) => setFilters({...filters, equipoCodigo: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Referencia de Lubricante"
                  value={filters.lubricanteRef}
                  onChange={(e) => setFilters({...filters, lubricanteRef: e.target.value})}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetAdvancedFilters}>Limpiar</Button>
          <Button onClick={() => setAdvancedFilterOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={() => setAdvancedFilterOpen(false)}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

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