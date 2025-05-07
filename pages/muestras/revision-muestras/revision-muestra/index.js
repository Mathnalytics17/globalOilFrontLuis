import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { Edit, Save, Cancel, PictureAsPdf, ArrowBack, CheckCircle, Warning } from '@mui/icons-material';
import { toast } from 'react-toastify';

const VistaMuestraIndividual = () => {
  const { api, user } = useAuth();
  const router = useRouter();
  const { muestra } = router.query;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [resultValue, setResultValue] = useState('');
  const [openDocModal, setOpenDocModal] = useState(false);
  const [docUrl, setDocUrl] = useState('');

  const handleOpenDocModal = () => {
    console.log(process.env.NEXT_PUBLIC_FRONTEND_URL)
    setDocUrl(`${process.env.NEXT_PUBLIC_FRONTEND_URL}documents-list/template-report?muestra=${muestra}`);
    setOpenDocModal(true);
  };
  // Cargar todos los resultados
  useEffect(() => {
    const fetchData = async () => {
      if (!muestra) return;

      try {
        setLoading(true);
        const resultsRes = await api.get('lubrication/results/');
        
        // Filtrar resultados para esta muestra
        const filteredResults = resultsRes.data.filter(
          result => result.prueba_muestra?.muestra?.id === muestra
        );

        if (filteredResults.length === 0) {
          throw new Error('No se encontraron resultados para esta muestra');
        }

        setResults(filteredResults);
        
        // Extraer datos de la muestra del primer resultado
        const sampleData = filteredResults[0].prueba_muestra.muestra;
        setEditData({
          nombre: sampleData.lubricante.nombre_comercial,
          descripcion: `Muestra ${sampleData.id} - ${sampleData.referencia_equipo.codigo}`

        });
      } catch (error) {
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api, muestra]);

  // Obtener datos consolidados de la muestra
  const getSampleData = () => {
    if (results.length === 0) return null;
    
    const firstResult = results[0];
    return {
      id: firstResult.prueba_muestra.muestra.id,
      codigo: firstResult.prueba_muestra.muestra.id,
      estado: firstResult.estatus,
      lubricante: firstResult.prueba_muestra.muestra.lubricante,
      equipo: firstResult.prueba_muestra.muestra.referencia_equipo,
      fecha_creacion: firstResult.prueba_muestra.muestra.fecha_registro,
      fecha_actualizacion: firstResult.fecha_actualizacion,
      ...editData
    };
  };

  // Obtener pruebas con sus resultados
  const getTestsWithResults = () => {
    return results.map(result => ({
      id: result.prueba_muestra.id,
      prueba: {
        ...result.prueba_muestra.prueba, // Copiamos todas las propiedades de la prueba
        codigo: result.prueba_muestra.prueba?.codigo || 'N/A',
        nombre: result.prueba_muestra.prueba?.nombre || 'Desconocido',
        descripcion: result.prueba_muestra.prueba?.descripcion || '',
        unidad_medida: result.prueba_muestra.prueba?.unidad_medida || ''
      },
      resultado: result.resultado,
      fecha_medicion: result.fecha_medicion,
      usuario_medicion: result.usuario_medicion,
      completada: result.prueba_muestra.completada,
      muestra: result.prueba_muestra.muestra
    }));
  };
  // Manejar edición
  const handleEditToggle = () => {
    setEditing(!editing);
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      // Aquí puedes agregar lógica para guardar datos editados si es necesario
      setEditing(false);
      toast.success('Información actualizada correctamente');
    } catch (error) {
      toast.error('Error al guardar: ' + (error.response?.data?.message || error.message));
    }
  };

  // Manejar resultados
  const openAddResult = (test) => {
    console.log(test)
    setCurrentTest(test);
    setResultValue(test.resultado || '');
    setOpenResultDialog(true);
  };

  const handleSaveResult = async () => {
    try {
      if (currentTest) {
        // Encontrar el resultado completo correspondiente a esta prueba
        const resultToUpdate = results.find(r => r.prueba_muestra.id === currentTest.id);
        
        if (!resultToUpdate) {
          throw new Error('No se encontró el resultado correspondiente');
        }
  
        // Crear el objeto actualizado manteniendo todas las propiedades existentes
        const updatedData = {
          ...resultToUpdate, // Mantenemos todas las propiedades existentes
          resultado: resultValue,
          fecha_medicion: new Date().toISOString(),
          usuario_medicion: user.id,
          estatus:"Completada",prueba_muestra: {
            ...resultToUpdate.prueba_muestra,
           // Marcamos como completada al guardar
          }
        };
        console.log(resultToUpdate)
        // Actualizar en el backend
        const updatedResult = await api.patch(
          `lubrication/results/${resultToUpdate.id}/`,
          {
            resultado: resultValue,
            fecha_medicion: updatedData.fecha_medicion,
            usuario_medicion: user.id,
            estatus:"aprobado",
          }
        );

         // Actualizar en el backend
         const updateSampledResult = await api.patch(
          `lubrication/sample-tests/${resultToUpdate.prueba_muestra.id}/`,
          {
            completada:true
          }
        );
  
        // Actualizar estado local manteniendo toda la estructura
        setResults(prev => prev.map(r => 
          r.id === resultToUpdate.id ? {
            ...r,
            ...updatedResult.data,
            prueba_muestra: {
              ...r.prueba_muestra,
              completada: true
            }
          } : r
        ));
  
        setOpenResultDialog(false);
        toast.success('Resultado actualizado correctamente');
      }
    } catch (error) {
      toast.error('Error al guardar resultado: ' + (error.response?.data?.message || error.message));
    }
  };
  // Generar reporte PDF
  const generateReport = async () => {
    try {
      const response = await api.get(`lubrication/samples/${muestra}/report/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${muestra}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error al generar reporte: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (results.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>No se encontraron resultados para esta muestra</Typography>
      </Box>
    );
  }

  const sample = getSampleData();
  const testsWithResults = getTestsWithResults();
  console.log(testsWithResults)
  const completedTests = testsWithResults.filter(t => t.completada);
  console.log(completedTests)
  const pendingTests = testsWithResults.filter(t => !t.completada);
  console.log(sample)
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => router.push('/muestras')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          Muestra: {sample.codigo}
        </Typography>
        <Chip 
          label={sample.estado} 
          color={
            sample.estado === 'pendiente' ? 'warning' : 
            sample.estado === 'aprobado' ? 'success' : 'default'
          } 
          sx={{ ml: 2 }}
        />
      </Box>

      {/* Información básica */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Información de la Muestra</Typography>
          <Button 
            variant="contained" 
            startIcon={<PictureAsPdf />}
            onClick={handleOpenDocModal}
            sx={{ ml: 1 }}
          >
            Ver Documento
          </Button>
          <Button
            variant="contained"
            startIcon={editing ? <Save /> : <Edit />}
            onClick={editing ? handleSave : handleEditToggle}
          >
            {editing ? 'Guardar' : 'Editar'}
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            {editing ? (
              <TextField
                fullWidth
                label="Nombre"
                value={editData.nombre || ''}
                onChange={(e) => handleEditChange('nombre', e.target.value)}
              />
            ) : (
              <Typography><strong>Lubricante:</strong> {sample.lubricante.nombre_comercial}</Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Código:</strong> {sample.codigo}</Typography>
          </Grid>
          <Grid item xs={12}>
            {editing ? (
              <TextField
                fullWidth
                label="Descripción"
                value={editData.descripcion || ''}
                onChange={(e) => handleEditChange('descripcion', e.target.value)}
                multiline
                rows={3}
              />
            ) : (
              <Typography><strong>Equipo:</strong> {sample.equipo.codigo} - {sample.equipo.descripcion}</Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Fecha creación:</strong> {new Date(sample.fecha_creacion).toLocaleDateString()}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography><strong>Última actualización:</strong> {new Date(sample.fecha_actualizacion).toLocaleDateString()}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Pruebas y resultados */}
      <Paper sx={{ p: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label={`Pruebas (${testsWithResults.length})`} />
          <Tab label={`Completadas (${completedTests.length})`} />
          <Tab label={`Pendientes (${pendingTests.length})`} />
          <Tab label="Resumen" />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Todas las Pruebas
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Resultado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testsWithResults.map(test => (
                    <TableRow key={test.id}>
                      <TableCell>{test?.prueba?.codigo}</TableCell>
                      <TableCell>{test?.prueba?.nombre}</TableCell>
                      <TableCell>
                        {test.completada ? (
                          <Chip 
                            icon={<CheckCircle fontSize="small" />}
                            label="Completada" 
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip 
                            icon={<Warning fontSize="small" />}
                            label="Pendiente" 
                            color="warning"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {test.resultado ? (
                          <Typography>
                            {test.resultado} {test?.prueba?.unidad_medida || ''}
                          </Typography>
                        ) : (
                          <Typography color="textSecondary">No registrado</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openAddResult(test)}
                        >
                          {test.completada ? 'Editar' : 'Agregar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Pruebas Completadas
            </Typography>
            {completedTests.length > 0 ? (
              <Grid container spacing={2}>
                {completedTests.map(test => (
                  <Grid item xs={12} sm={6} md={4} key={test.id}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle1">
                        {test.prueba.codigo} - {test.prueba.nombre}
                      </Typography>
                      <Typography variant="h6" sx={{ my: 1 }}>
                        {test.resultado} {test.prueba.unidad_medida || ''}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Fecha: {new Date(test.fecha_medicion).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Responsable: {test.usuario_medicion?.username || 'Desconocido'}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openAddResult(test)}
                        >
                          Editar Resultado
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography>No hay pruebas completadas</Typography>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Pruebas Pendientes
            </Typography>
            {pendingTests.length > 0 ? (
              <Grid container spacing={2}>
                {pendingTests.map(test => (
                  <Grid item xs={12} sm={6} md={4} key={test.id}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle1">
                        {test.prueba.codigo} - {test.prueba.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {test.prueba.descripcion}
                      </Typography>
                      {test.prueba.unidad_medida && (
                        <Chip label={test.prueba.unidad_medida} size="small" variant="outlined" />
                      )}
                      <Box sx={{ mt: 2 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => openAddResult(test)}
                        >
                          Agregar Resultado
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography>Todas las pruebas están completadas</Typography>
            )}
          </Box>
        )}

        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Resumen de la Muestra
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h5">{testsWithResults.length}</Typography>
                  <Typography variant="body2">Total de Pruebas</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h5" color="success.main">
                    {completedTests.length}
                  </Typography>
                  <Typography variant="body2">Completadas</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h5" color="warning.main">
                    {pendingTests.length}
                  </Typography>
                  <Typography variant="body2">Pendientes</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h5">
                    {testsWithResults.length > 0 
                      ? `${Math.round((completedTests.length / testsWithResults.length) * 100)}%` 
                      : '0%'}
                  </Typography>
                  <Typography variant="body2">Progreso</Typography>
                </Paper>
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title="Generar reporte en PDF">
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdf />}
                  onClick={generateReport}
                >
                  Exportar Reporte
                </Button>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Paper>

         {/* Diálogo para editar resultado */}
         <Dialog open={openResultDialog} onClose={() => setOpenResultDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Resultado</DialogTitle>
        <DialogContent>
  {currentTest && (
    <Box sx={{ pt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {currentTest.prueba?.codigo || 'N/A'} - {currentTest.prueba?.nombre || 'Desconocido'}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {currentTest.prueba?.descripcion || 'Sin descripción'}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <TextField
        fullWidth
        label="Resultado"
        value={resultValue}
        onChange={(e) => setResultValue(e.target.value)}
        sx={{ mb: 2 }}
        type="number"
        inputProps={{ step: "0.01" }}
        InputProps={{
          endAdornment: currentTest.prueba?.unidad_medida && (
            <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
              {currentTest.prueba.unidad_medida}
            </Typography>
          )
        }}
      />
      {currentTest.fecha_medicion && (
        <Typography variant="caption" display="block">
          Última medición: {new Date(currentTest.fecha_medicion).toLocaleString()}
        </Typography>
      )}
    </Box>
  )}
</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResultDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveResult}>Guardar</Button>
        </DialogActions>
      </Dialog>
      {/* Modal para visualizar el documento */}
<Dialog 
  open={openDocModal} 
  onClose={() => setOpenDocModal(false)}
  maxWidth="lg"
  fullWidth
  sx={{
    '& .MuiDialog-paper': {
      height: '90vh'
    }
  }}
>
  <DialogTitle>
    Documento de la Muestra {muestra}
    <IconButton
      aria-label="close"
      onClick={() => setOpenDocModal(false)}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
        color: (theme) => theme.palette.grey[500],
      }}
    >
      <Close />
    </IconButton>
  </DialogTitle>
  <DialogContent dividers>
    <Box sx={{ height: '100%', width: '100%' }}>
      {docUrl && (
        <iframe
          src={docUrl}
          title="Documento de la muestra"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      )}
    </Box>
  </DialogContent>
  <DialogActions>
    <Button 
      variant="contained"
      onClick={() => {
        window.open(docUrl, '_blank');
        setOpenDocModal(false);
      }}
    >
      Abrir en nueva pestaña
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
};

export default VistaMuestraIndividual;