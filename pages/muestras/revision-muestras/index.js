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
  Paper
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
  const [resultados,setResults]=useState([]);
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const response = await api.get('lubrication/samples/');
        setSamples(response.data);
        setLoading(false);
      } catch (error) {
        toast.error('Error al cargar muestras: ' + (error.response?.data?.message || error.message));
        setLoading(false);
      }
    };

    fetchSamples();
  }, [api]);
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.get('lubrication/results/');
        setResults(response.data);
        setLoading(false);
      } catch (error) {
        toast.error('Error al cargar resultados: ' + (error.response?.data?.message || error.message));
        setLoading(false);
      }
    };

    fetchResults();
  }, [api]);

  console.log(resultados)
  const fetchSampleTests = async (sampleId) => {
    try {
      const response = await api.get(`lubrication/sample-tests/?muestra=${sampleId}`);
      return response.data;
    } catch (error) {
      toast.error('Error al cargar pruebas: ' + (error.response?.data?.message || error.message));
      return [];
    }
  };

  const handleAccordionChange = (panel) => async (event, isExpanded) => {
    setExpanded(isExpanded ? panel : null);
    
    if (isExpanded) {
      const sample = samples.find(s => s.id === panel);
      if (!sample.tests) {
        const tests = await fetchSampleTests(panel);
        setSamples(prev => prev.map(s => 
          s.id === panel ? { ...s, tests } : s
        ));
      }
    }
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
                    {sample.id} - {sample.referencia_equipo?.codigo || 'Sin referencia'}
                  </Typography>
                  <Chip 
                                  label={sample.referencia_equipo?.codigo} 
                                  size="small" 
                                  sx={{ mt: 1 }}
                                  color={sample.referencia_equipo?.codigo === 'aprobado' ? 'success' : 'default'}
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
                      <strong>Equipo:</strong> {sample.referencia_equipo?.codigo} - {sample.referencia_equipo?.descripcion}
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
                    
                    {sample.tests && (
                      <Box sx={{ mt: 3 }}>
                        <Tabs 
                          value={activeTab} 
                          onChange={(e, newValue) => setActiveTab(newValue)}
                          sx={{ mb: 2 }}
                        >
                          <Tab label="Pruebas" />
                          <Tab label="Resultados" />
                        </Tabs>
                        
                        {activeTab === 0 && (
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              Pruebas Asociadas
                            </Typography>
                            {sample.tests.length > 0 ? (
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                                {sample.tests.map(test => (
                                  <Paper 
                                    key={test.id} 
                                    elevation={2}
                                    sx={{ 
                                      p: 2,
                                      backgroundColor: test.is_used ? 'black' : 'background.paper'
                                    }}
                                  >
                                    <Typography variant="subtitle1">
                                      {test.prueba.codigo} - {test.prueba.nombre}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Método: {test.prueba.metodo_referencia}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                      Estado: {test.completada ? 'Completada' : 'Pendiente'}
                                    </Typography>
                                    {test.estatus && (
                                      <Chip 
                                        label={test.estatus} 
                                        size="small" 
                                        sx={{ mt: 1 }}
                                        color={test.estatus === 'aprobado' ? 'success' : 'default'}
                                      />
                                    )}
                                  </Paper>
                                ))}
                              </Box>
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
                            {sample.tests.filter(t => t.completada).length > 0 ? (
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                                {resultados.filter(t => t.completada).map(test => (
                                  <Paper 
                                    key={test.id} 
                                    elevation={2}
                                    sx={{ p: 2 }}
                                  >
                                    <Typography variant="subtitle1">
                                      {test.prueba.codigo} - {test.prueba.nombre}
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                      <strong>Resultado:</strong> {test.resultado} {test.prueba.unidad_medida || ''}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                      <strong>Fecha medición:</strong> {new Date(test.fecha_medicion).toLocaleDateString()}
                                    </Typography>
                                    {test.observaciones && (
                                      <Typography variant="body2" sx={{ mt: 1 }}>
                                        <strong>Observaciones:</strong> {test.observaciones}
                                      </Typography>
                                    )}
                                    <Chip 
                                      label={test.estatus} 
                                      size="small" 
                                      sx={{ mt: 1 }}
                                      color={test.estatus === 'aprobado' ? 'success' : 'default'}
                                    />
                                  </Paper>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2">No hay resultados disponibles</Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<PictureAsPdf />}
                        onClick={() => generateReport(sample.id)}
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