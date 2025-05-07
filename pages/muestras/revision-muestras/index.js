import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Box,
  TextField,
  Chip,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { ExpandMore, Edit, Save, Cancel, PictureAsPdf } from '@mui/icons-material';
import { toast } from 'react-toastify';

const RevisionMuestra = () => {
  const { api } = useAuth();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSample, setEditingSample] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [results, setResults] = useState([]);
  const [sampleTests, setSampleTests] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [samplesRes, resultsRes, sampleTestsRes] = await Promise.all([
          api.get('lubrication/samples/'),
          api.get('lubrication/results/'),
          api.get('lubrication/sample-tests/')
        ]);

        setSamples(samplesRes.data);
        setResults(resultsRes.data);
        setSampleTests(sampleTestsRes.data);
        setLoading(false);
      } catch (error) {
        toast.error('Error al cargar datos: ' + (error.response?.data?.message || error.message));
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : null);
  };

  const handleEdit = (sample) => {
    setEditingSample({ ...sample });
  };

  const handleCancelEdit = () => {
    setEditingSample(null);
  };

  const handleSave = async () => {
    if (!editingSample) return;

    try {
      const response = await api.patch(`lubrication/samples/${editingSample.id}/`, editingSample);
      setSamples(prev => prev.map(s => 
        s.id === editingSample.id ? response.data : s
      ));
      setEditingSample(null);
      toast.success('Muestra actualizada correctamente');
    } catch (error) {
      toast.error('Error al guardar: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFieldChange = (field, value) => {
    setEditingSample(prev => ({ ...prev, [field]: value }));
  };

  const generateReport = async (sampleId) => {
    try {
      const response = await api.get(`lubrication/samples/${sampleId}/report/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_muestra_${sampleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error al generar reporte: ' + (error.response?.data?.message || error.message));
    }
  };

  const getTestsForSample = (sampleId) => {
    return sampleTests.filter(test => 
      test.muestra?.id === sampleId || test.muestra === sampleId
    );
  };

  const getResultsForSample = (sampleId) => {
    return results.filter(result => 
      result.prueba_muestra?.muestra?.id === sampleId || 
      result.prueba_muestra?.muestra === sampleId
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
  <Typography variant="h4" gutterBottom>
    Revisión de Muestras
  </Typography>

  {samples.length === 0 ? (
    <Typography variant="body1">No hay muestras disponibles</Typography>
  ) : (
    <Box>
      {samples.map((sample) => (
        <Accordion
          key={sample.id}
          expanded={expanded === sample.id}
          onChange={handleAccordionChange(sample.id)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {sample.id} - {sample.referencia_equipo?.codigo || sample.codigo_equipo || 'Sin referencia'}
              </Typography>
              <Chip 
                label={sample.is_aprobado ? 'Aprobado' : 'Pendiente'} 
                size="small" 
                color={sample.is_aprobado ? 'success' : 'default'}
              />
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            {editingSample?.id === sample.id ? (
              <Box>
                <TextField
                  fullWidth
                  label="Observaciones"
                  value={editingSample.observaciones || ''}
                  onChange={(e) => handleFieldChange('observaciones', e.target.value)}
                  multiline
                  rows={3}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<Cancel />}
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<Save />}
                    onClick={handleSave}
                  >
                    Guardar
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body1" paragraph>
                  <strong>Equipo:</strong> {sample.referencia_equipo?.nombre || sample.codigo_equipo} - {sample.referencia_equipo?.descripcion || sample.componente}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Lubricante:</strong> {sample.lubricante?.nombre_comercial} ({sample.lubricante?.grado_viscosidad})
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Fecha de toma:</strong> {new Date(sample.fecha_toma).toLocaleDateString()}
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>Observaciones:</strong> {sample.observaciones || 'Ninguna'}
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Tabs 
                    value={activeTab} 
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{ mb: 2 }}
                  >
                    <Tab label="Pruebas Asociadas" />
                    <Tab label="Resultados" />
                  </Tabs>
                  
                  {activeTab === 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Pruebas Asociadas
                      </Typography>
                      {getTestsForSample(sample.id).length > 0 ? (
                        <TableContainer component={Paper}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Código</TableCell>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell>Completada</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {getTestsForSample(sample.id).map(test => (
                                <TableRow key={test.id}>
                                  <TableCell>{test.prueba?.codigo}</TableCell>
                                  <TableCell>{test.prueba?.nombre}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={test.is_used ? 'Activa' : 'Inactiva'} 
                                      size="small" 
                                      color={test.is_used ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell>{test.completada ? 'Sí' : 'No'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2">No hay pruebas asociadas</Typography>
                      )}
                    </Box>
                  )}
                  
                  {activeTab === 1 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Resultados
                      </Typography>
                      {getResultsForSample(sample.id).length > 0 ? (
                        <TableContainer component={Paper}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Prueba</TableCell>
                                <TableCell>Resultado</TableCell>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Estado</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {getResultsForSample(sample.id).map(result => (
                                <TableRow key={result.id}>
                                  <TableCell>
                                    {result.prueba_muestra?.prueba?.codigo} - {result.prueba_muestra?.prueba?.nombre}
                                  </TableCell>
                                  <TableCell>
                                    {result.resultado} {result.prueba_muestra?.prueba?.unidad_medida || ''}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(result.fecha_medicion).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={result.estado || 'Sin estado'} 
                                      size="small" 
                                      color={result.estado === 'aprobado' ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2">No hay resultados disponibles</Typography>
                      )}
                    </Box>
                  )}
                </Box>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<PictureAsPdf />}
                    onClick={() => generateReport(sample.id)}
                    disabled={getResultsForSample(sample.id).length === 0}
                  >
                    Generar PDF
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<Edit />}
                    onClick={() => handleEdit(sample)}
                  >
                    Editar
                  </Button>
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  )}
</Box>

  );
};

export default RevisionMuestra;